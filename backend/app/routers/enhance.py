from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
import numpy as np
import cv2
import collections
import asyncio

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
        
        # Wrap all blocking operations in asyncio.to_thread (FIX B9)
        def _blocking_enhance():
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
            
            # G. REGION-BASED ENHANCEMENT - FIX B2: Complete rewrite with proper flood fill
            if request.region_bbox and request.region_strength > 0:
                img_cv = apply_region_enhancement(img_cv, request.region_bbox, request.region_strength)
                operations.append(f"Region Enhance {request.region_strength:.0f}")
            
            # Save result
            cv2.imwrite(str(working_path), img_cv)
            
            # Load with PIL for metadata
            img = Image.open(working_path)
            metadata = get_image_metadata(img, str(working_path), "enhanced.png")
            
            # Return base64 image
            image_base64 = pil_to_base64(img, format="PNG")
            
            return operations, image_base64, metadata
        
        # Execute blocking work in thread pool
        operations, image_base64, metadata = await asyncio.to_thread(_blocking_enhance)
        
        # Save history
        db = get_database()
        operation_name = " + ".join(operations) if operations else "Enhance"
        await save_history_snapshot(
            request.session_id,
            operation_name,
            working_path,
            db
        )
        
        return {
            "success": True,
            "data": {
                "workingImageBase64": image_base64,
                "metadata": metadata
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


def apply_region_enhancement(img_cv: np.ndarray, region_bbox: list, region_strength: float) -> np.ndarray:
    """
    FIX B2: BFS flood fill from center of region_bbox.
    Finds pixels within color tolerance, applies CLAHE to matched region.
    """
    if not region_bbox or region_strength <= 0:
        return img_cv
    
    x, y, w_r, h_r = [int(v) for v in region_bbox]
    img_h, img_w = img_cv.shape[:2]
    
    # Clamp bbox to image bounds — prevents IndexError at edges
    x  = max(0, min(x, img_w - 1))
    y  = max(0, min(y, img_h - 1))
    w_r = max(1, min(w_r, img_w - x))
    h_r = max(1, min(h_r, img_h - y))
    
    seed_x = x + w_r // 2
    seed_y = y + h_r // 2
    
    # Ensure seed is within image
    seed_x = max(0, min(seed_x, img_w - 1))
    seed_y = max(0, min(seed_y, img_h - 1))
    
    seed_color = img_cv[seed_y, seed_x].astype(np.float32)
    tolerance = 35.0 * (region_strength / 100.0)
    
    # BFS using deque — O(1) popleft
    visited = np.zeros((img_h, img_w), dtype=bool)
    mask    = np.zeros((img_h, img_w), dtype=np.uint8)
    queue   = collections.deque()
    
    visited[seed_y, seed_x] = True
    queue.append((seed_x, seed_y))
    
    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    
    while queue:
        cx, cy = queue.popleft()
        
        # Bounds check — CRITICAL: must happen before any array access
        if not (0 <= cx < img_w and 0 <= cy < img_h):
            continue
        
        # Region bounds check
        if not (x <= cx < x + w_r and y <= cy < y + h_r):
            continue
        
        pixel_color = img_cv[cy, cx].astype(np.float32)
        if np.linalg.norm(pixel_color - seed_color) <= tolerance:
            mask[cy, cx] = 255
            
            for dx, dy in directions:
                nx, ny = cx + dx, cy + dy
                # BOUNDS CHECK BEFORE QUEUE APPEND
                if (0 <= nx < img_w and 0 <= ny < img_h and not visited[ny, nx]):
                    visited[ny, nx] = True
                    queue.append((nx, ny))
    
    # Apply CLAHE only to flood-filled region
    if mask.sum() == 0:
        return img_cv  # No pixels matched — return unchanged
    
    lab = cv2.cvtColor(img_cv, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    
    clip_limit = 2.0 + (region_strength / 100.0) * 3.0
    clahe = cv2.createCLAHE(clipLimit=float(clip_limit), tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_ch)
    
    enhanced_lab = cv2.merge([l_enhanced, a_ch, b_ch])
    enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    
    # Blend using mask
    mask_3ch = np.stack([mask, mask, mask], axis=2).astype(np.float32) / 255.0
    result = (enhanced_bgr.astype(np.float32) * mask_3ch +
              img_cv.astype(np.float32)       * (1.0 - mask_3ch)).astype(np.uint8)
    
    return result