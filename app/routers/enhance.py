from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
import numpy as np
import cv2
from collections import deque

from app.database import get_database
from app.services.file_service import get_working_image_path
from app.services.history_service import save_history_snapshot
from app.utils.image_utils import pil_to_base64, get_image_metadata

router = APIRouter()

class EnhanceRequest(BaseModel):
    session_id: str
    brightness: float = 0  # -100 to 100
    contrast: float = 0  # -100 to 100
    sharpness: float = 0  # 0 to 100
    noise_removal: float = 0  # 0 to 100
    saturation: float = 0  # -100 to 100
    hue_shift: float = 0  # -180 to 180
    edge_mode: str = "off"  # "off" | "subtle" | "strong"
    region_bbox: list[int] | None = None  # [x, y, w, h]
    region_strength: float = 0  # 0 to 100

@router.post("/apply")
async def apply_enhancements(request: EnhanceRequest):
    """Apply all enhancement operations"""
    try:
        working_path = get_working_image_path(request.session_id)
        
        if not working_path.exists():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Load image
        img = Image.open(working_path)
        img_cv = cv2.imread(str(working_path))
        
        operations = []
        
        # A. BRIGHTNESS
        if request.brightness != 0:
            img_arr = np.array(img).astype(np.float32)
            delta = (request.brightness / 100.0) * 127.0
            img_arr = np.clip(img_arr + delta, 0, 255).astype(np.uint8)
            img_cv = img_arr
            operations.append(f"Brightness {request.brightness:+.0f}")
        
        # B. CONTRAST - Histogram Equalization
        if request.contrast != 0:
            img_gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Build histogram
            histogram = np.zeros(256, dtype=np.int64)
            for pixel_val in img_gray.flatten():
                histogram[pixel_val] += 1
            
            # CDF
            cdf = np.cumsum(histogram)
            cdf_min = cdf[cdf > 0][0] if len(cdf[cdf > 0]) > 0 else 0
            total_pixels = img_gray.size
            
            # Equalization mapping
            lut = np.round((cdf - cdf_min) / (total_pixels - cdf_min) * 255).astype(np.uint8)
            
            # Apply contrast factor
            factor = request.contrast / 100.0
            if factor > 0:
                # Blend toward equalized
                identity = np.arange(256, dtype=np.float32)
                blended_lut = (identity * (1 - factor) + lut * factor).astype(np.uint8)
            else:
                # Compress tonal range
                mid = 127
                blended_lut = np.clip(
                    mid + (np.arange(256) - mid) * (1 + factor), 0, 255
                ).astype(np.uint8)
            
            # Apply LUT to each channel
            result_channels = []
            for ch in cv2.split(img_cv):
                result_channels.append(cv2.LUT(ch, blended_lut))
            img_cv = cv2.merge(result_channels)
            operations.append(f"Contrast {request.contrast:+.0f}")
        
        # C. SHARPNESS - Unsharp Masking
        if request.sharpness > 0:
            strength = request.sharpness / 100.0
            blur_radius = max(1, int(strength * 5)) * 2 + 1
            blurred = cv2.GaussianBlur(img_cv, (blur_radius, blur_radius), 0)
            amount = strength * 2.5
            sharpened = cv2.addWeighted(img_cv, 1 + amount, blurred, -amount, 0)
            img_cv = np.clip(sharpened, 0, 255).astype(np.uint8)
            operations.append(f"Sharpen {request.sharpness:.0f}")
        
        # D. NOISE REMOVAL - Median Filter
        if request.noise_removal > 0:
            strength = request.noise_removal / 100.0
            kernel_size = 3 + int(strength * 4) * 2
            kernel_size = min(kernel_size, 11)
            img_cv = cv2.medianBlur(img_cv, kernel_size)
            
            # Bilateral filter for color noise
            if strength > 0.5:
                d = int(strength * 15)
                sigma = strength * 75
                img_cv = cv2.bilateralFilter(img_cv, d, sigma, sigma)
            
            operations.append(f"Denoise {request.noise_removal:.0f}")
        
        # E. COLOR ENHANCEMENT - HSV
        if request.saturation != 0 or request.hue_shift != 0:
            img_hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV).astype(np.float32)
            h_channel, s_channel, v_channel = cv2.split(img_hsv)
            
            # Hue shift
            if request.hue_shift != 0:
                h_channel = (h_channel + request.hue_shift / 2.0) % 180.0
                operations.append(f"Hue {request.hue_shift:+.0f}°")
            
            # Saturation
            if request.saturation != 0:
                sat_factor = 1.0 + (request.saturation / 100.0)
                s_channel = np.clip(s_channel * sat_factor, 0, 255)
                operations.append(f"Saturation {request.saturation:+.0f}")
            
            img_hsv = cv2.merge([h_channel, s_channel, v_channel])
            img_cv = cv2.cvtColor(img_hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        
        # F. EDGE DETECTION
        if request.edge_mode != "off":
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            low_thresh = 50 if request.edge_mode == "subtle" else 100
            high_thresh = 150 if request.edge_mode == "subtle" else 200
            edges = cv2.Canny(gray, low_thresh, high_thresh)
            
            # Connected components
            num_labels, labels = cv2.connectedComponents(edges, connectivity=8)
            
            # Overlay edges
            edge_color = (0, 200, 200) if request.edge_mode == "subtle" else (255, 255, 255)
            edge_mask = edges > 0
            
            if request.edge_mode == "subtle":
                overlay = img_cv.copy()
                overlay[edge_mask] = edge_color
                img_cv = cv2.addWeighted(img_cv, 0.6, overlay, 0.4, 0)
            else:
                img_cv[edge_mask] = edge_color
            
            operations.append(f"Edges ({request.edge_mode})")
        
        # G. REGION-BASED ENHANCEMENT - Flood Fill
        if request.region_bbox and request.region_strength > 0:
            x, y, w_r, h_r = request.region_bbox
            h, w = img_cv.shape[:2]
            x, y = max(0, x), max(0, y)
            w_r = min(w_r, w - x)
            h_r = min(h_r, h - y)
            
            if w_r > 0 and h_r > 0:
                # Flood fill from center
                seed_x, seed_y = x + w_r // 2, y + h_r // 2
                seed_color = img_cv[seed_y, seed_x].astype(np.float32)
                tolerance = 30.0 * (request.region_strength / 100.0)
                
                # BFS flood fill
                visited = np.zeros(img_cv.shape[:2], dtype=bool)
                mask = np.zeros(img_cv.shape[:2], dtype=np.uint8)
                queue = deque()
                queue.append((seed_x, seed_y))
                visited[seed_y, seed_x] = True
                directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
                
                while queue:
                    cx, cy = queue.popleft()
                    
                    if not (x <= cx < x + w_r and y <= cy < y + h_r):
                        continue
                    
                    pixel_color = img_cv[cy, cx].astype(np.float32)
                    if np.linalg.norm(pixel_color - seed_color) <= tolerance:
                        mask[cy, cx] = 255
                        for dx, dy in directions:
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h:
                                if not visited[ny, nx]:
                                    visited[ny, nx] = True
                                    queue.append((nx, ny))
                
                # Apply CLAHE on region
                mask_3ch = np.stack([mask] * 3, axis=2)
                region = img_cv.copy()
                lab = cv2.cvtColor(region, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                clahe = cv2.createCLAHE(
                    clipLimit=2.0 + request.region_strength * 0.03,
                    tileGridSize=(8, 8)
                )
                l = clahe.apply(l)
                enhanced_region = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
                
                # Blend
                img_cv = np.where(mask_3ch > 0, enhanced_region, img_cv)
                operations.append(f"Region Enhance {request.region_strength:.0f}")
        
        # Save result
        cv2.imwrite(str(working_path), img_cv)
        
        # Load with PIL for metadata
        img = Image.open(working_path)
        metadata = get_image_metadata(img, str(working_path), "enhanced.png")
        
        # Save history
        db = get_database()
        operation_name = " + ".join(operations) if operations else "Enhance"
        await save_history_snapshot(
            request.session_id,
            operation_name,
            working_path,
            db
        )
        
        # Return base64 image
        image_base64 = pil_to_base64(img, format="PNG")
        
        return {
            "success": True,
            "data": {
                "workingImageBase64": image_base64,
                "metadata": metadata
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")
