from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import numpy as np
from PIL import Image
import cv2

from app.services.file_service import get_working_image_path, save_working_image
from app.services.history_service import save_history_snapshot

router = APIRouter()

class ExtendRequest(BaseModel):
    session_id: str
    extend_left: int = 0
    extend_right: int = 0
    extend_top: int = 0
    extend_bottom: int = 0

@router.post("/")
async def extend_image(request: ExtendRequest):
    """Extend image using pattern-based extrapolation"""
    try:
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            "Image Extension",
            {
                "left": request.extend_left,
                "right": request.extend_right,
                "top": request.extend_top,
                "bottom": request.extend_bottom
            }
        )
        
        # Load image
        image_path = get_working_image_path(request.session_id)
        img = np.array(Image.open(image_path).convert('RGB'))
        h, w = img.shape[:2]
        
        new_h = h + request.extend_top + request.extend_bottom
        new_w = w + request.extend_left + request.extend_right
        
        result = np.zeros((new_h, new_w, 3), dtype=np.uint8)
        
        # Place original image in center
        result[request.extend_top:request.extend_top + h, 
               request.extend_left:request.extend_left + w] = img
        
        # FILL LEFT EXTENSION
        if request.extend_left > 0:
            sample_w = min(80, w)
            strip = img[:, :sample_w, :]
            
            for col in range(request.extend_left - 1, -1, -1):
                dist = request.extend_left - col
                src_col = min(dist - 1, sample_w - 1)
                base_pixel = strip[:, src_col, :]
                
                # Add subtle noise for texture continuity
                noise = np.random.normal(0, 3, base_pixel.shape).astype(np.float32)
                blended = np.clip(base_pixel.astype(np.float32) + noise, 0, 255).astype(np.uint8)
                
                # Smooth transition weight
                weight = np.exp(-dist * 0.03)
                gray_val = np.mean(base_pixel, axis=1, keepdims=True)
                final = (blended * weight + gray_val * (1 - weight)).astype(np.uint8)
                
                result[request.extend_top:request.extend_top + h, col] = final
        
        # FILL RIGHT EXTENSION
        if request.extend_right > 0:
            sample_w = min(80, w)
            strip = img[:, -sample_w:, :]
            
            for col in range(request.extend_left + w, new_w):
                dist = col - (request.extend_left + w) + 1
                src_col = min(dist - 1, sample_w - 1)
                base_pixel = strip[:, -src_col - 1, :]
                
                noise = np.random.normal(0, 3, base_pixel.shape).astype(np.float32)
                blended = np.clip(base_pixel.astype(np.float32) + noise, 0, 255).astype(np.uint8)
                
                weight = np.exp(-dist * 0.03)
                gray_val = np.mean(base_pixel, axis=1, keepdims=True)
                final = (blended * weight + gray_val * (1 - weight)).astype(np.uint8)
                
                result[request.extend_top:request.extend_top + h, col] = final
        
        # FILL TOP EXTENSION
        if request.extend_top > 0:
            sample_h = min(80, h)
            strip = img[:sample_h, :, :]
            
            for row in range(request.extend_top - 1, -1, -1):
                dist = request.extend_top - row
                src_row = min(dist - 1, sample_h - 1)
                base_pixel = strip[src_row, :, :]
                
                noise = np.random.normal(0, 3, base_pixel.shape).astype(np.float32)
                blended = np.clip(base_pixel.astype(np.float32) + noise, 0, 255).astype(np.uint8)
                
                weight = np.exp(-dist * 0.03)
                gray_val = np.mean(base_pixel, axis=1, keepdims=True)
                final = (blended * weight + gray_val * (1 - weight)).astype(np.uint8)
                
                result[row, request.extend_left:request.extend_left + w] = final
        
        # FILL BOTTOM EXTENSION
        if request.extend_bottom > 0:
            sample_h = min(80, h)
            strip = img[-sample_h:, :, :]
            
            for row in range(request.extend_top + h, new_h):
                dist = row - (request.extend_top + h) + 1
                src_row = min(dist - 1, sample_h - 1)
                base_pixel = strip[-src_row - 1, :, :]
                
                noise = np.random.normal(0, 3, base_pixel.shape).astype(np.float32)
                blended = np.clip(base_pixel.astype(np.float32) + noise, 0, 255).astype(np.uint8)
                
                weight = np.exp(-dist * 0.03)
                gray_val = np.mean(base_pixel, axis=1, keepdims=True)
                final = (blended * weight + gray_val * (1 - weight)).astype(np.uint8)
                
                result[row, request.extend_left:request.extend_left + w] = final
        
        # Gaussian blur the extended regions to smooth seams
        mask = np.zeros((new_h, new_w), dtype=np.uint8)
        
        # Mark extended regions in mask
        if request.extend_top > 0:
            mask[:request.extend_top, :] = 255
        if request.extend_bottom > 0:
            mask[request.extend_top + h:, :] = 255
        if request.extend_left > 0:
            mask[:, :request.extend_left] = 255
        if request.extend_right > 0:
            mask[:, request.extend_left + w:] = 255
        
        # Feather the seam boundary
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))
        feather = cv2.dilate(mask, kernel)
        feather_f = feather.astype(np.float32) / 255.0
        
        blurred_result = cv2.GaussianBlur(result, (15, 15), 0)
        feather_3ch = feather_f[:, :, np.newaxis]
        result = (result * (1 - feather_3ch * 0.3) + blurred_result * (feather_3ch * 0.3)).astype(np.uint8)
        
        # Save result
        result_img = Image.fromarray(result)
        save_working_image(request.session_id, result_img)
        
        return {
            "success": True,
            "message": f"Image extended by {request.extend_left}+{request.extend_right}+{request.extend_top}+{request.extend_bottom}px"
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image extension failed: {str(e)}")
