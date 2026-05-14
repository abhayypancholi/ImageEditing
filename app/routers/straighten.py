from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import numpy as np
from PIL import Image
import cv2

from app.services.file_service import get_working_image_path, save_working_image
from app.services.history_service import save_history_snapshot

router = APIRouter()

class StraightenRequest(BaseModel):
    session_id: str
    manual_override: Optional[float] = None

@router.post("/")
async def straighten_image(request: StraightenRequest):
    """Auto-straighten image using Hough line detection"""
    try:
        # Load image
        image_path = get_working_image_path(request.session_id)
        img_cv = cv2.imread(str(image_path))
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # Step 1: Detect dominant lines using Hough Transform
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
        
        skew_angle = 0.0
        
        if lines is not None:
            angles = []
            for line in lines:
                rho, theta = line[0]
                # Convert theta to angle from horizontal
                angle_deg = np.degrees(theta) - 90
                # Filter: only near-horizontal lines (within ±20° of horizontal)
                if abs(angle_deg) <= 20:
                    angles.append(angle_deg)
            
            if angles:
                # Robust mean (trim outliers)
                angles_arr = np.array(angles)
                q25, q75 = np.percentile(angles_arr, [25, 75])
                iqr = q75 - q25
                filtered = angles_arr[
                    (angles_arr >= q25 - 1.5 * iqr) & 
                    (angles_arr <= q75 + 1.5 * iqr)
                ]
                skew_angle = float(np.mean(filtered)) if len(filtered) > 0 else 0.0
        
        # Correct the skew
        correction = request.manual_override if request.manual_override is not None else -skew_angle
        
        h_img, w_img = img_cv.shape[:2]
        center = (w_img // 2, h_img // 2)
        M = cv2.getRotationMatrix2D(center, correction, 1.0)
        
        # Expand canvas to avoid cropping corners
        cos = abs(M[0, 0])
        sin = abs(M[0, 1])
        new_w = int(h_img * sin + w_img * cos)
        new_h = int(h_img * cos + w_img * sin)
        M[0, 2] += (new_w - w_img) / 2
        M[1, 2] += (new_h - h_img) / 2
        
        rotated = cv2.warpAffine(
            img_cv, M, (new_w, new_h),
            flags=cv2.INTER_LANCZOS4,
            borderMode=cv2.BORDER_REPLICATE
        )
        
        # Step 2: Auto-crop to remove border artifacts
        border_pct = abs(np.radians(correction)) * 0.8
        crop_x = int(new_w * border_pct)
        crop_y = int(new_h * border_pct)
        
        if crop_x > 0 or crop_y > 0:
            rotated = rotated[crop_y:new_h - crop_y, crop_x:new_w - crop_x]
        
        # Save result
        result_img = Image.fromarray(cv2.cvtColor(rotated, cv2.COLOR_BGR2RGB))
        save_working_image(request.session_id, result_img)
        
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            f"Auto Straighten ({-skew_angle:.1f}°)",
            {"detected_angle": skew_angle, "correction": correction}
        )
        
        return {
            "success": True,
            "message": f"Image straightened by {correction:.1f}°",
            "data": {
                "detected_angle": round(skew_angle, 2),
                "correction_applied": round(correction, 2)
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-straighten failed: {str(e)}")
