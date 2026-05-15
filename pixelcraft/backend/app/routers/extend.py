from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np
from PIL import Image
import cv2
import asyncio

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
    """
    FIX B4: Extend image using pattern-based extrapolation
    with proper dtype, bounds, and kernel handling
    """
    try:
        working_path = get_working_image_path(request.session_id)
        
        result = await apply_extend(
            str(working_path),
            request.session_id,
            request.extend_left,
            request.extend_right,
            request.extend_top,
            request.extend_bottom
        )
        
        if not result.get("success"):
            return JSONResponse(
                status_code=500,
                content=result
            )
        
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
        
        return {
            "success": True,
            "message": f"Image extended by {request.extend_left}+{request.extend_right}+{request.extend_top}+{request.extend_bottom}px",
            "data": {
                "new_width": result["new_width"],
                "new_height": result["new_height"]
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image extension failed: {str(e)}")

async def apply_extend(working_path: str, session_id: str,
                      extend_left: int, extend_right: int,
                      extend_top: int, extend_bottom: int) -> dict:
    """FIX B4: Apply image extension with proper dtype and bounds handling"""
    def _run_extend():
        img = Image.open(working_path).convert('RGB')
        img_arr = np.array(img, dtype=np.uint8)  # EXPLICIT uint8
        H, W, C = img_arr.shape
        
        new_H = H + extend_top  + extend_bottom
        new_W = W + extend_left + extend_right
        
        # Initialize with edge-replicated border — uses CV2 copyMakeBorder
        # This gives much better results than hand-rolled extrapolation
        result = cv2.copyMakeBorder(
            img_arr,
            top    = extend_top,
            bottom = extend_bottom,
            left   = extend_left,
            right  = extend_right,
            borderType = cv2.BORDER_REFLECT_101  # reflects edge pixels, no seam
        )
        # cv2 returns uint8 — no dtype issue
        
        # Feather the seam boundary using Gaussian blur on ONLY the extended region
        # Create a feather mask: 1.0 in extended areas, 0.0 in original
        feather_mask = np.zeros((new_H, new_W), dtype=np.float32)
        if extend_top    > 0: feather_mask[:extend_top, :]             = 1.0
        if extend_bottom > 0: feather_mask[extend_top+H:, :]           = 1.0
        if extend_left   > 0: feather_mask[extend_top:extend_top+H, :extend_left]  = 1.0
        if extend_right  > 0: feather_mask[extend_top:extend_top+H, extend_left+W:] = 1.0
        
        # Kernel must be odd and at least 1
        max_ext = max(extend_top, extend_bottom, extend_left, extend_right, 1)
        k = min(max_ext * 2 + 1, 51)
        k = k if k % 2 == 1 else k + 1  # ensure odd
        
        blurred_mask  = cv2.GaussianBlur(feather_mask, (k, k), 0)
        blurred_result = cv2.GaussianBlur(result.astype(np.float32), (k, k), 0)
        blurred_mask_3 = blurred_mask[:, :, np.newaxis]
        
        # Blend: original area stays sharp, extended area is blurred to hide seam
        final = (result.astype(np.float32) * (1.0 - blurred_mask_3 * 0.4) +
                 blurred_result            *        blurred_mask_3 * 0.4).clip(0, 255).astype(np.uint8)
        
        Image.fromarray(final, 'RGB').save(working_path, 'PNG')
        return {"new_width": new_W, "new_height": new_H}
    
    try:
        info = await asyncio.to_thread(_run_extend)
        return {"success": True, **info}
    except Exception as e:
        return {"success": False, "error": f"Extend failed: {type(e).__name__}: {e}"}
