from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from PIL import Image, ImageFilter
import cv2
from collections import deque

from app.services.file_service import get_working_image_path, save_working_image
from app.services.history_service import save_history_snapshot

router = APIRouter()

class RemoveBackgroundRequest(BaseModel):
    session_id: str
    mode: str = "auto"  # auto, color_select, object_select
    seed_color: Optional[List[int]] = None  # [r, g, b]
    selection_bbox: Optional[List[int]] = None  # [x, y, w, h]
    replace_mode: str = "transparent"  # transparent, color, blur
    replace_color: Optional[List[int]] = None  # [r, g, b]

@router.post("/remove")
async def remove_background(request: RemoveBackgroundRequest):
    """Remove background from image"""
    try:
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            f"Background Removal ({request.mode})",
            {"mode": request.mode, "replace": request.replace_mode}
        )
        
        # Load image
        image_path = get_working_image_path(request.session_id)
        input_img = Image.open(image_path)
        
        if request.mode == "auto":
            # AUTO MODE: Use rembg (AI-based background removal)
            from rembg import remove as rembg_remove
            
            output_img = rembg_remove(input_img)  # Returns RGBA
            
        elif request.mode == "color_select":
            # COLOR SELECT MODE: Flood fill from border pixels
            img_cv = cv2.imread(str(image_path))
            h, w = img_cv.shape[:2]
            
            seed = np.array(request.seed_color[::-1], dtype=np.float32)  # RGB→BGR
            tolerance = 35.0
            
            mask = np.zeros((h, w), dtype=np.uint8)
            visited = np.zeros((h, w), dtype=bool)
            queue = deque()
            
            # Start flood fill from all 4 border edges
            for x in range(w):
                for y in [0, h - 1]:
                    if not visited[y, x]:
                        pix = img_cv[y, x].astype(np.float32)
                        if np.linalg.norm(pix - seed) < tolerance:
                            queue.append((x, y))
                            visited[y, x] = True
            
            for y in range(h):
                for x in [0, w - 1]:
                    if not visited[y, x]:
                        pix = img_cv[y, x].astype(np.float32)
                        if np.linalg.norm(pix - seed) < tolerance:
                            queue.append((x, y))
                            visited[y, x] = True
            
            directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
            while queue:
                cx, cy = queue.popleft()
                mask[cy, cx] = 255
                
                for dx, dy in directions:
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                        pix = img_cv[ny, nx].astype(np.float32)
                        if np.linalg.norm(pix - seed) < tolerance:
                            visited[ny, nx] = True
                            queue.append((nx, ny))
            
            # Feather edges for natural look
            mask = cv2.GaussianBlur(mask, (5, 5), 0)
            
            # Convert to RGBA with alpha channel
            img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
            alpha = 255 - mask
            output_img = Image.fromarray(
                np.dstack([img_rgb, alpha]).astype(np.uint8)
            )
        
        elif request.mode == "object_select":
            # OBJECT SELECT MODE: Keep only selected region
            if not request.selection_bbox:
                raise HTTPException(status_code=400, detail="Selection bbox required")
            
            img_cv = cv2.imread(str(image_path))
            h, w = img_cv.shape[:2]
            
            x, y, bw, bh = request.selection_bbox
            
            # Create mask (selected region = keep, rest = remove)
            mask = np.zeros((h, w), dtype=np.uint8)
            mask[y:y+bh, x:x+bw] = 255
            
            # Feather edges
            mask = cv2.GaussianBlur(mask, (15, 15), 0)
            
            # Convert to RGBA
            img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
            output_img = Image.fromarray(
                np.dstack([img_rgb, mask]).astype(np.uint8)
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid mode")
        
        # Apply replacement mode
        if request.replace_mode == "transparent":
            # Save as PNG with transparency
            save_working_image(request.session_id, output_img)
        
        elif request.replace_mode == "color":
            # Replace transparent areas with solid color
            if not request.replace_color:
                request.replace_color = [255, 255, 255]
            
            bg = Image.new('RGBA', output_img.size, (*request.replace_color, 255))
            bg.paste(output_img, mask=output_img.split()[3])
            save_working_image(request.session_id, bg.convert('RGB'))
        
        elif request.replace_mode == "blur":
            # Replace transparent areas with blurred original
            orig = Image.open(image_path).convert('RGB')
            blurred_bg = orig.filter(ImageFilter.GaussianBlur(radius=20))
            bg = blurred_bg.convert('RGBA')
            bg.paste(output_img, mask=output_img.split()[3])
            save_working_image(request.session_id, bg.convert('RGB'))
        
        return {
            "success": True,
            "message": f"Background removed using {request.mode} mode"
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Background removal failed: {str(e)}")
