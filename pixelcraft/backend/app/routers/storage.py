from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
from PIL import Image, ImageDraw, ImageFont
import time
import zipfile
import io
from pathlib import Path
import shutil

from app.services.file_service import get_working_image_path, get_history_image_path
from app.database import get_database

router = APIRouter()

class WatermarkConfig(BaseModel):
    text: str
    position: str = "BR"  # TL/TC/TR/ML/MC/MR/BL/BC/BR
    opacity: float = 0.5
    font_size: int = 24

class ResizeConfig(BaseModel):
    width: int
    height: int

class ExportRequest(BaseModel):
    session_id: str
    format: str = "png"  # png, jpeg, webp, bmp, tiff
    quality: int = 90
    resize: Optional[ResizeConfig] = None
    dpi: Optional[int] = None
    strip_exif: bool = False
    watermark: Optional[WatermarkConfig] = None

class BatchExportRequest(BaseModel):
    session_id: str
    include_history: bool = False

@router.post("/export")
async def export_image(request: ExportRequest):
    """Export image with advanced options"""
    try:
        # Load working image
        image_path = get_working_image_path(request.session_id)
        
        # Convert based on format
        if request.format == 'png':
            img = Image.open(image_path).convert('RGBA')
        else:
            img = Image.open(image_path).convert('RGB')
        
        # Resize if requested
        if request.resize:
            img = img.resize(
                (request.resize.width, request.resize.height),
                Image.LANCZOS
            )
        
        # Add watermark if specified
        if request.watermark and request.watermark.text:
            # Create a transparent overlay for watermark
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            overlay = Image.new('RGBA', img.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(overlay)
            
            font_size = request.watermark.font_size
            try:
                # Try to load a system font
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
                except:
                    font = ImageFont.load_default()
            
            text = request.watermark.text
            bbox = draw.textbbox((0, 0), text, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            w, h = img.size
            
            # Position mapping
            positions = {
                'TL': (10, 10),
                'TC': ((w - tw) // 2, 10),
                'TR': (w - tw - 10, 10),
                'ML': (10, (h - th) // 2),
                'MC': ((w - tw) // 2, (h - th) // 2),
                'MR': (w - tw - 10, (h - th) // 2),
                'BL': (10, h - th - 10),
                'BC': ((w - tw) // 2, h - th - 10),
                'BR': (w - tw - 10, h - th - 10)
            }
            pos = positions.get(request.watermark.position, (10, 10))
            
            alpha = int(255 * request.watermark.opacity)
            draw.text(pos, text, fill=(255, 255, 255, alpha), font=font)
            
            # Composite watermark onto image
            img = Image.alpha_composite(img, overlay)
        
        # Convert back to RGB if needed for non-PNG formats
        if request.format != 'png' and img.mode == 'RGBA':
            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])
            else:
                background.paste(img)
            img = background
        
        # Save to exports folder
        export_dir = Path("storage/exports")
        export_dir.mkdir(parents=True, exist_ok=True)
        
        export_filename = f"{request.session_id}_{int(time.time())}.{request.format}"
        export_path = export_dir / export_filename
        
        # Prepare save kwargs
        save_kwargs = {}
        if request.format == 'jpeg':
            save_kwargs['quality'] = request.quality
            save_kwargs['optimize'] = True
        elif request.format == 'webp':
            save_kwargs['quality'] = request.quality
        
        if request.dpi:
            save_kwargs['dpi'] = (request.dpi, request.dpi)
        
        # Save image
        img.save(str(export_path), format=request.format.upper(), **save_kwargs)
        
        # Return file
        return FileResponse(
            str(export_path),
            media_type=f"image/{request.format}",
            headers={
                "Content-Disposition": f'attachment; filename="{export_filename}"'
            }
        )
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/export/zip")
async def export_zip(request: BatchExportRequest):
    """Export current image and optionally all history as ZIP"""
    try:
        # Create in-memory ZIP file
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add current working image
            working_path = get_working_image_path(request.session_id)
            if working_path.exists():
                zip_file.write(
                    str(working_path),
                    f"current.{working_path.suffix[1:]}"
                )
            
            # Add history snapshots if requested
            if request.include_history:
                db = get_database()
                session = await db.sessions.find_one({"sessionId": request.session_id})
                
                if session and "history" in session:
                    for i, entry in enumerate(session["history"]):
                        snapshot_id = entry.get("snapshotId")
                        if snapshot_id:
                            history_path = get_history_image_path(
                                request.session_id,
                                snapshot_id
                            )
                            if history_path.exists():
                                operation_name = entry.get("operationName", f"step_{i}")
                                # Sanitize filename
                                safe_name = "".join(
                                    c for c in operation_name 
                                    if c.isalnum() or c in (' ', '-', '_')
                                ).strip()
                                zip_file.write(
                                    str(history_path),
                                    f"history/{i+1:03d}_{safe_name}.png"
                                )
        
        zip_buffer.seek(0)
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="pixelcraft_export_{int(time.time())}.zip"'
            }
        )
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ZIP export failed: {str(e)}")

@router.get("/sessions/recent")
async def get_recent_sessions(limit: int = 10):
    """Get recent sessions"""
    try:
        db = get_database()
        
        sessions = await db.sessions.find().sort("lastModified", -1).limit(limit).to_list(length=limit)
        
        result = []
        for session in sessions:
            result.append({
                "sessionId": session.get("sessionId"),
                "fileName": session.get("originalFileName"),
                "lastModified": session.get("lastModified"),
                "metadata": session.get("metadata", {}),
                "thumbnail": None  # TODO: Generate thumbnail
            })
        
        return {
            "success": True,
            "data": {
                "sessions": result
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(e)}")

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and all its files"""
    try:
        db = get_database()
        
        # Delete from database
        result = await db.sessions.delete_one({"sessionId": session_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete storage folders
        base_path = Path("storage")
        for folder in ["originals", "working", "history", "exports"]:
            folder_path = base_path / folder / session_id
            if folder_path.exists():
                shutil.rmtree(folder_path, ignore_errors=True)
        
        return {
            "success": True,
            "message": "Session deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

@router.post("/session/{session_id}/save-project")
async def save_project(session_id: str):
    """Save session as .pixelcraft project file"""
    try:
        db = get_database()
        
        session = await db.sessions.find_one({"sessionId": session_id})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Create project data
        project_data = {
            "version": "1.0",
            "sessionId": session_id,
            "metadata": session.get("metadata", {}),
            "annotations": session.get("annotations", []),
            "history": session.get("history", []),
            "createdAt": session.get("createdAt"),
            "lastModified": session.get("lastModified")
        }
        
        # Convert to JSON
        import json
        json_data = json.dumps(project_data, indent=2)
        
        # Return as downloadable file
        return StreamingResponse(
            io.BytesIO(json_data.encode()),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="pixelcraft_project_{session_id}.pixelcraft"'
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save project: {str(e)}")
