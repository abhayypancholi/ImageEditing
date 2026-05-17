from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Tuple
import numpy as np
from PIL import Image
import io
import base64
from collections import deque
import asyncio
import cv2

from app.services.file_service import get_working_image_path
from app.services.history_service import save_history_snapshot
from app.database import get_database

router = APIRouter()

class CountObjectsRequest(BaseModel):
    session_id: str
    x: int
    y: int
    tolerance: int = 30

class PickColorRequest(BaseModel):
    session_id: str
    x: int
    y: int

def rgb_distance(c1: Tuple[int, int, int], c2: Tuple[int, int, int]) -> float:
    """Calculate Euclidean distance between two RGB colors"""
    return np.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def flood_fill_count(image_array: np.ndarray, start_x: int, start_y: int, tolerance: int) -> int:
    """
    Count connected pixels using BFS flood fill algorithm
    Returns the number of pixels in the connected region
    """
    height, width = image_array.shape[:2]
    
    # Bounds check
    if start_x < 0 or start_x >= width or start_y < 0 or start_y >= height:
        return 0
    
    # Get target color
    target_color = tuple(image_array[start_y, start_x][:3])
    
    # Visited set
    visited = set()
    queue = deque([(start_x, start_y)])
    visited.add((start_x, start_y))
    
    count = 0
    
    while queue:
        x, y = queue.popleft()
        count += 1
        
        # Check 4-connected neighbors
        for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
            nx, ny = x + dx, y + dy
            
            # Bounds check
            if nx < 0 or nx >= width or ny < 0 or ny >= height:
                continue
            
            # Skip if already visited
            if (nx, ny) in visited:
                continue
            
            # Check color similarity
            neighbor_color = tuple(image_array[ny, nx][:3])
            if rgb_distance(target_color, neighbor_color) <= tolerance:
                visited.add((nx, ny))
                queue.append((nx, ny))
    
    return count

def find_all_objects(image_array: np.ndarray, tolerance: int) -> List[dict]:
    """
    Find all distinct objects in the image using connected component analysis
    Returns list of objects with their pixel counts and bounding boxes
    """
    height, width = image_array.shape[:2]
    visited = np.zeros((height, width), dtype=bool)
    objects = []
    
    for y in range(height):
        for x in range(width):
            if not visited[y, x]:
                # Start flood fill from this pixel
                target_color = tuple(image_array[y, x][:3])
                
                # BFS to find connected component
                queue = deque([(x, y)])
                visited[y, x] = True
                pixels = [(x, y)]
                
                min_x, max_x = x, x
                min_y, max_y = y, y
                
                while queue:
                    cx, cy = queue.popleft()
                    
                    # Check 4-connected neighbors
                    for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                        nx, ny = cx + dx, cy + dy
                        
                        if (0 <= nx < width and 0 <= ny < height and 
                            not visited[ny, nx]):
                            
                            neighbor_color = tuple(image_array[ny, nx][:3])
                            if rgb_distance(target_color, neighbor_color) <= tolerance:
                                visited[ny, nx] = True
                                queue.append((nx, ny))
                                pixels.append((nx, ny))
                                
                                # Update bounding box
                                min_x = min(min_x, nx)
                                max_x = max(max_x, nx)
                                min_y = min(min_y, ny)
                                max_y = max(max_y, ny)
                
                # Only include objects with more than 10 pixels (filter noise)
                if len(pixels) > 10:
                    objects.append({
                        'count': len(pixels),
                        'color': target_color,
                        'bbox': {
                            'x': int(min_x),
                            'y': int(min_y),
                            'width': int(max_x - min_x + 1),
                            'height': int(max_y - min_y + 1)
                        },
                        'centroid': {
                            'x': int(sum(p[0] for p in pixels) / len(pixels)),
                            'y': int(sum(p[1] for p in pixels) / len(pixels))
                        }
                    })
    
    # Sort by pixel count (largest first)
    objects.sort(key=lambda obj: obj['count'], reverse=True)
    
    return objects

@router.post("/count")
async def count_objects(request: CountObjectsRequest):
    """Count connected pixels starting from a point"""
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_count():
            # Load working image
            image_path = get_working_image_path(request.session_id)
            image = Image.open(image_path)
            
            # Convert to numpy array
            image_array = np.array(image)
            
            # Perform flood fill count
            pixel_count = flood_fill_count(image_array, request.x, request.y, request.tolerance)
            
            # Get the color at the clicked point
            if 0 <= request.y < image_array.shape[0] and 0 <= request.x < image_array.shape[1]:
                clicked_color = tuple(int(c) for c in image_array[request.y, request.x][:3])
            else:
                clicked_color = (0, 0, 0)
            
            return pixel_count, clicked_color
        
        pixel_count, clicked_color = await asyncio.to_thread(_blocking_count)
        
        # FIX B5: Explicit int() cast to prevent numpy.int32 serialization issues
        return {
            "success": True,
            "data": {
                "count": int(pixel_count),  # EXPLICIT int() cast
                "color": clicked_color,
                "position": {"x": int(request.x), "y": int(request.y)}
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Count failed: {str(e)}")

@router.post("/count-all")
async def count_all_objects(session_id: str, tolerance: int = 30):
    """Find and count all distinct objects in the image"""
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_count_all():
            # Load working image
            image_path = get_working_image_path(session_id)
            image = Image.open(image_path)
            
            # Convert to numpy array
            image_array = np.array(image)
            
            # Find all objects
            objects = find_all_objects(image_array, tolerance)
            
            return objects
        
        objects = await asyncio.to_thread(_blocking_count_all)
        
        # FIX B5: Explicit int() casts for all numeric values
        return JSONResponse(content={
            "success": True,
            "data": {
                "total_objects": int(len(objects)),
                "objects": [
                    {
                        "count": int(obj["count"]),
                        "color": tuple(int(c) for c in obj["color"]),
                        "bbox": {
                            "x": int(obj["bbox"]["x"]),
                            "y": int(obj["bbox"]["y"]),
                            "width": int(obj["bbox"]["width"]),
                            "height": int(obj["bbox"]["height"])
                        },
                        "centroid": {
                            "x": int(obj["centroid"]["x"]),
                            "y": int(obj["centroid"]["y"])
                        }
                    }
                    for obj in objects[:100]  # Limit to top 100 objects
                ]
            }
        })
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Count all failed: {str(e)}")

@router.post("/pick-color")
async def pick_color(request: PickColorRequest):
    """Pick color at a specific point"""
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_pick():
            # Load working image
            image_path = get_working_image_path(request.session_id)
            image = Image.open(image_path)
            
            # Convert to numpy array
            image_array = np.array(image)
            
            # Get color at point
            if 0 <= request.y < image_array.shape[0] and 0 <= request.x < image_array.shape[1]:
                if len(image_array.shape) == 3:
                    color = tuple(int(c) for c in image_array[request.y, request.x][:3])
                else:
                    # Grayscale
                    gray = int(image_array[request.y, request.x])
                    color = (gray, gray, gray)
            else:
                raise HTTPException(status_code=400, detail="Coordinates out of bounds")
            
            # Convert to hex
            hex_color = '#{:02x}{:02x}{:02x}'.format(*color)
            
            return color, hex_color
        
        color, hex_color = await asyncio.to_thread(_blocking_pick)
        
        return {
            "success": True,
            "data": {
                "rgb": color,
                "hex": hex_color,
                "position": {"x": int(request.x), "y": int(request.y)}
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pick color failed: {str(e)}")


class RemoveObjectRequest(BaseModel):
    session_id: str
    mask_points: List[float]  # Flat array [x, y, x, y, ...]
    brush_size: int = 20
    fill_mode: str = "inpaint"  # inpaint, blur, solid
    fill_color: List[int] = [255, 255, 255]

@router.post("/remove")
async def remove_object(request: RemoveObjectRequest):
    """Remove object from image using inpainting"""
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_remove():
            # Load image
            image_path = get_working_image_path(request.session_id)
            img_cv = cv2.imread(str(image_path))
            h, w = img_cv.shape[:2]
            
            # Build mask from brush strokes
            mask = np.zeros((h, w), dtype=np.uint8)
            points = np.array(request.mask_points).reshape(-1, 2).astype(np.int32)
            
            # Draw thick polyline on mask (simulates brush)
            cv2.polylines(mask, [points], False, 255, thickness=request.brush_size)
            
            # Fill convex hull of selection for solid region
            if len(points) >= 3:
                hull = cv2.convexHull(points)
                cv2.fillConvexPoly(mask, hull, 255)
            
            # Dilate mask slightly (remove any edges of object)
            kernel = np.ones((5, 5), np.uint8)
            mask = cv2.dilate(mask, kernel, iterations=2)
            
            if request.fill_mode == "inpaint":
                # OpenCV Telea inpainting (content-aware, no API)
                result = cv2.inpaint(img_cv, mask, inpaintRadius=7, flags=cv2.INPAINT_TELEA)
            
            elif request.fill_mode == "blur":
                blurred = cv2.GaussianBlur(img_cv, (51, 51), 0)
                mask_3ch = np.stack([mask] * 3, axis=2).astype(float) / 255
                result = (img_cv * (1 - mask_3ch) + blurred * mask_3ch).astype(np.uint8)
            
            elif request.fill_mode == "solid":
                result = img_cv.copy()
                result[mask > 0] = request.fill_color[::-1]  # RGB→BGR
            
            else:
                raise HTTPException(status_code=400, detail="Invalid fill mode")
            
            # Save result
            cv2.imwrite(str(image_path), result)
        
        await asyncio.to_thread(_blocking_remove)
        
        # Save history snapshot
        working_path = get_working_image_path(request.session_id)
        db = get_database()
        await save_history_snapshot(
            request.session_id,
            f"Object Removal ({request.fill_mode})",
            working_path,
            db
        )
        
        return {
            "success": True,
            "message": f"Object removed using {request.fill_mode} fill"
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Object removal failed: {str(e)}")