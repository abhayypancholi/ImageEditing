from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import json

from app.database import get_database

router = APIRouter()

class Annotation(BaseModel):
    id: str
    type: str
    points: List[float]
    label: str
    color: str
    opacity: float
    strokeWidth: float
    filled: bool
    createdAt: float
    metadata: Dict[str, str]

class SaveAnnotationsRequest(BaseModel):
    session_id: str
    annotations: List[Annotation]

class ExportAnnotationsRequest(BaseModel):
    session_id: str
    annotations: List[Annotation]
    format: str  # 'json' | 'coco' | 'yolo'
    image_width: int
    image_height: int
    filename: str

@router.post("/save")
async def save_annotations(request: SaveAnnotationsRequest):
    """Save annotations to session"""
    try:
        db = get_database()
        
        # Convert annotations to dict
        annotations_data = [ann.model_dump() for ann in request.annotations]
        
        # Update session document
        result = await db.sessions.update_one(
            {"sessionId": request.session_id},
            {"$set": {"annotations": annotations_data}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "success": True,
            "message": f"Saved {len(annotations_data)} annotations"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")

@router.get("/{session_id}")
async def get_annotations(session_id: str):
    """Get annotations for session"""
    try:
        db = get_database()
        
        session = await db.sessions.find_one({"sessionId": session_id})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        annotations = session.get("annotations", [])
        
        return {
            "success": True,
            "data": {
                "annotations": annotations
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get failed: {str(e)}")

@router.post("/export")
async def export_annotations(request: ExportAnnotationsRequest):
    """Export annotations in various formats"""
    try:
        annotations = [ann.model_dump() for ann in request.annotations]
        
        if request.format == "json":
            # Simple JSON format
            export_data = {
                "image": {
                    "width": request.image_width,
                    "height": request.image_height,
                    "filename": request.filename
                },
                "annotations": annotations
            }
            
        elif request.format == "coco":
            # COCO dataset format
            categories = {}
            cat_id = 1
            for ann in annotations:
                label = ann["label"]
                if label not in categories:
                    categories[label] = cat_id
                    cat_id += 1
            
            coco_annotations = []
            for i, ann in enumerate(annotations):
                # Convert to bbox format
                points = ann["points"]
                if ann["type"] == "rectangle" and len(points) >= 4:
                    x1, y1, x2, y2 = points[0], points[1], points[2], points[3]
                    x = min(x1, x2)
                    y = min(y1, y2)
                    w = abs(x2 - x1)
                    h = abs(y2 - y1)
                    
                    coco_annotations.append({
                        "id": i + 1,
                        "image_id": 1,
                        "category_id": categories[ann["label"]],
                        "bbox": [x, y, w, h],
                        "area": w * h,
                        "segmentation": [],
                        "iscrowd": 0
                    })
            
            export_data = {
                "images": [{
                    "id": 1,
                    "width": request.image_width,
                    "height": request.image_height,
                    "file_name": request.filename
                }],
                "annotations": coco_annotations,
                "categories": [
                    {"id": cat_id, "name": label, "supercategory": "object"}
                    for label, cat_id in categories.items()
                ]
            }
            
        elif request.format == "yolo":
            # YOLO format (text lines)
            categories = {}
            cat_id = 0
            for ann in annotations:
                label = ann["label"]
                if label not in categories:
                    categories[label] = cat_id
                    cat_id += 1
            
            yolo_lines = []
            for ann in annotations:
                if ann["type"] == "rectangle" and len(ann["points"]) >= 4:
                    points = ann["points"]
                    x1, y1, x2, y2 = points[0], points[1], points[2], points[3]
                    
                    # Normalize to 0-1
                    cx = ((x1 + x2) / 2) / request.image_width
                    cy = ((y1 + y2) / 2) / request.image_height
                    w = abs(x2 - x1) / request.image_width
                    h = abs(y2 - y1) / request.image_height
                    
                    class_id = categories[ann["label"]]
                    yolo_lines.append(f"{class_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
            
            export_data = {
                "content": "\n".join(yolo_lines),
                "classes": categories
            }
        
        else:
            raise HTTPException(status_code=400, detail="Invalid format")
        
        return {
            "success": True,
            "data": export_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")