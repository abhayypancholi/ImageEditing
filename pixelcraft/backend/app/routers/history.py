from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
import shutil
import base64
import io
import os
import asyncio

from app.services.file_service import get_working_image_path, get_history_image_path
from app.database import get_database, get_db

router = APIRouter()

class RestoreRequest(BaseModel):
    session_id: str
    snapshot_id: str

@router.post("/restore")
async def restore_snapshot(body: dict, db = Depends(get_db)):
    """
    FIX B8: Restore history endpoint with proper original/history handling
    """
    session_id      = body.get("session_id")
    history_entry_id = body.get("history_entry_id")  # None = restore original
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_restore():
            session = db.sessions.find_one({"session_id": session_id})
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            working_path = session["working_path"]
            
            if history_entry_id is None:
                # Restore to original upload
                original_path = session["original_path"]
                source_path = original_path
            else:
                # Find the history entry
                history = session.get("history", [])
                entry = next((h for h in history if h["id"] == history_entry_id), None)
                if not entry:
                    raise HTTPException(status_code=404, detail="History entry not found")
                source_path = entry["image_path"]
            
            # Copy source to working path
            shutil.copy2(source_path, working_path)
            
            # Return the restored image as base64
            img = Image.open(working_path).convert('RGB')
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            img_b64 = base64.b64encode(buf.getvalue()).decode()
            
            metadata = {
                "width": img.width,
                "height": img.height,
                "format": "PNG",
                "colorMode": img.mode,
                "fileSizeBytes": os.path.getsize(working_path),
                "fileName": session.get("filename", "image.png"),
                "hasAlpha": False
            }
            
            return img_b64, metadata
        
        img_b64, metadata = await asyncio.to_thread(_blocking_restore)
        
        return JSONResponse(content={
            "success": True,
            "workingImageBase64": img_b64,
            "metadata": metadata
        })
    
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@router.get("/list/{session_id}")
async def list_snapshots(session_id: str):
    """List all history snapshots for a session"""
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_list():
            db = get_database()
            session = db.sessions.find_one({"sessionId": session_id})
            
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            history = session.get("history", [])
            return history
        
        history = await asyncio.to_thread(_blocking_list)
        
        return {
            "success": True,
            "data": {
                "snapshots": history
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"List failed: {str(e)}")

@router.delete("/{session_id}/{snapshot_id}")
async def delete_snapshot(session_id: str, snapshot_id: str):
    """Delete a specific history snapshot"""
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_delete():
            # Get history image path
            history_path = get_history_image_path(session_id, snapshot_id)
            
            # Delete file if exists
            if history_path.exists():
                history_path.unlink()
            
            # Remove from database
            db = get_database()
            db.sessions.update_one(
                {"sessionId": session_id},
                {"$pull": {"history": {"snapshotId": snapshot_id}}}
            )
        
        await asyncio.to_thread(_blocking_delete)
        
        return {
            "success": True,
            "message": "Snapshot deleted successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
