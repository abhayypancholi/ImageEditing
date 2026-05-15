from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
import cv2
import os

from app.database import get_database
from app.services.file_service import get_working_image_path
from app.services.history_service import save_history_snapshot
from app.utils.image_utils import pil_to_base64, get_image_metadata, pil_to_cv2, cv2_to_pil
from app.config import BASE_DIR

router = APIRouter()

class ZoomEnhanceRequest(BaseModel):
    session_id: str
    scale: int  # 1, 2, or 4
    algorithm: str  # "lanczos", "bicubic", or "edsr"

@router.post("/enhance")
async def enhance_resolution(request: ZoomEnhanceRequest):
    """Enhance image resolution using various algorithms"""
    try:
        working_path = get_working_image_path(request.session_id)
        
        if not working_path.exists():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Load image
        img = Image.open(working_path)
        w, h = img.size
        new_w, new_h = w * request.scale, h * request.scale
        
        # Check output size limit
        if new_w > 8000 or new_h > 8000:
            raise HTTPException(
                status_code=400,
                detail=f"Output size ({new_w}×{new_h}) exceeds maximum (8000×8000)"
            )
        
        # Apply enhancement based on algorithm
        if request.algorithm == "lanczos":
            enhanced = img.resize((new_w, new_h), Image.LANCZOS)
        
        elif request.algorithm == "bicubic":
            enhanced = img.resize((new_w, new_h), Image.BICUBIC)
        
        elif request.algorithm == "edsr":
            # Try to use EDSR model if available, fallback to Lanczos
            models_dir = BASE_DIR / "models"
            model_path = models_dir / f"EDSR_x{request.scale}.pb"
            
            if model_path.exists():
                try:
                    # Use OpenCV DNN Super Resolution
                    sr = cv2.dnn_superres.DnnSuperResImpl_create()
                    sr.readModel(str(model_path))
                    sr.setModel("edsr", request.scale)
                    
                    img_cv = cv2.imread(str(working_path))
                    enhanced_cv = sr.upsample(img_cv)
                    cv2.imwrite(str(working_path), enhanced_cv)
                    
                    # Reload as PIL
                    enhanced = Image.open(working_path)
                except Exception as e:
                    print(f"EDSR failed, falling back to Lanczos: {e}")
                    enhanced = img.resize((new_w, new_h), Image.LANCZOS)
            else:
                # Fallback to Lanczos if model not available
                print(f"EDSR model not found at {model_path}, using Lanczos")
                enhanced = img.resize((new_w, new_h), Image.LANCZOS)
        
        else:
            raise HTTPException(status_code=400, detail="Invalid algorithm")
        
        # Save
        enhanced.save(working_path, format='PNG')
        
        # Get metadata
        metadata = get_image_metadata(enhanced, str(working_path), "enhanced.png")
        
        # Save history
        db = get_database()
        await save_history_snapshot(
            request.session_id,
            f"Enhance {request.scale}× ({request.algorithm})",
            working_path,
            db
        )
        
        # Return base64 image
        image_base64 = pil_to_base64(enhanced, format="PNG")
        
        return {
            "success": True,
            "data": {
                "workingImageBase64": image_base64,
                "metadata": metadata
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")
