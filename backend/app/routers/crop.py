from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
import numpy as np
import cv2

from app.database import get_database
from app.services.file_service import get_working_image_path
from app.services.history_service import save_history_snapshot
from app.utils.image_utils import pil_to_base64, get_image_metadata

router = APIRouter()

class CropRequest(BaseModel):
    session_id: str
    x: int
    y: int
    width: int
    height: int

class RotateRequest(BaseModel):
    session_id: str
    angle: float
    flip_h: bool = False
    flip_v: bool = False

class PerspectiveRequest(BaseModel):
    session_id: str
    src_points: list[list[float]]  # 4 points [[x,y], ...]
    dst_points: list[list[float]]  # 4 points [[x,y], ...]

@router.post("/crop")
async def crop_image(request: CropRequest):
    """Crop image to specified rectangle"""
    try:
        working_path = get_working_image_path(request.session_id)
        
        if not working_path.exists():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Load image
        img = Image.open(working_path)
        
        # Validate and clamp crop box within image bounds
        x = max(0, request.x)
        y = max(0, request.y)
        w = min(request.width, img.width - x)
        h = min(request.height, img.height - y)
        
        if w <= 0 or h <= 0:
            raise HTTPException(status_code=400, detail="Invalid crop dimensions")
        
        # Crop image
        cropped = img.crop((x, y, x + w, y + h))
        
        # Save
        cropped.save(working_path, format='PNG')
        
        # Get metadata
        metadata = get_image_metadata(cropped, str(working_path), "cropped.png")
        
        # Save history
        db = get_database()
        await save_history_snapshot(
            request.session_id,
            f"Crop ({w}×{h})",
            working_path,
            db
        )
        
        # Return base64 image
        image_base64 = pil_to_base64(cropped, format="PNG")
        
        return {
            "success": True,
            "data": {
                "workingImageBase64": image_base64,
                "metadata": metadata
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crop failed: {str(e)}")

@router.post("/rotate")
async def rotate_image(request: RotateRequest):
    """Rotate and/or flip image"""
    try:
        working_path = get_working_image_path(request.session_id)
        
        if not working_path.exists():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Load image
        img = Image.open(working_path)
        
        # Apply flips
        if request.flip_h:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        if request.flip_v:
            img = img.transpose(Image.FLIP_TOP_BOTTOM)
        
        # Apply rotation
        if request.angle != 0:
            # Negative angle because PIL rotates counter-clockwise
            img = img.rotate(-request.angle, expand=True, resample=Image.BICUBIC)
        
        # Save
        img.save(working_path, format='PNG')
        
        # Get metadata
        metadata = get_image_metadata(img, str(working_path), "rotated.png")
        
        # Save history
        db = get_database()
        operation_name = []
        if request.angle != 0:
            operation_name.append(f"Rotate {request.angle}°")
        if request.flip_h:
            operation_name.append("Flip H")
        if request.flip_v:
            operation_name.append("Flip V")
        
        await save_history_snapshot(
            request.session_id,
            " + ".join(operation_name) if operation_name else "Rotate",
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
        raise HTTPException(status_code=500, detail=f"Rotate failed: {str(e)}")

@router.post("/perspective")
async def perspective_transform(request: PerspectiveRequest):
    """Apply perspective transformation"""
    try:
        working_path = get_working_image_path(request.session_id)
        
        if not working_path.exists():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Load image with OpenCV
        img_cv = cv2.imread(str(working_path))
        h, w = img_cv.shape[:2]
        
        # Convert points to numpy arrays
        src = np.float32(request.src_points)
        dst = np.float32(request.dst_points)
        
        # Calculate perspective transformation matrix
        M = cv2.getPerspectiveTransform(src, dst)
        
        # Apply transformation
        warped = cv2.warpPerspective(
            img_cv, M, (w, h),
            flags=cv2.INTER_LANCZOS4,
            borderMode=cv2.BORDER_REPLICATE
        )
        
        # Save
        cv2.imwrite(str(working_path), warped)
        
        # Load with PIL for metadata
        img = Image.open(working_path)
        metadata = get_image_metadata(img, str(working_path), "perspective.png")
        
        # Save history
        db = get_database()
        await save_history_snapshot(
            request.session_id,
            "Perspective Warp",
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
        raise HTTPException(status_code=500, detail=f"Perspective transform failed: {str(e)}")
