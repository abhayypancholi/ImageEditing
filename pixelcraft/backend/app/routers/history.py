from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
import shutil

from app.services.file_service import get_working_image_path, get_history_image_path
from app.database import get_database

router = APIRouter()

class RestoreRequest(BaseModel):
    session_id: str
    snapshot_id: str

@router.post("/restore")
async def restore_snapshot(request: RestoreRequest):
    """Restore image from a history snapshot"""
    try:
        # Get history image path
        history_path = get_history_image_path(request.session_id, request.snapshot_id)
        
        # Check if history file exists
        if not history_path.exists():
            raise HTTPException(status_code=404, detail="Snapshot not found")
        
        # Get working image path
        working_path = get_working_image_path(request.session_id)
        
        # Copy history image to working image
        shutil.copy2(history_path, working_path)
        
        # Update session metadata
        db = get_database()
        image = Image.open(working_path)
        
        await db.sessions.update_one(
            {"sessionId": request.session_id},
            {"$set": {
                "currentWidth": image.width,
                "currentHeight": image.height,
                "format": image.format or "PNG"
            }}
        )
        
        return {
            "success": True,
            "message": "Snapshot restored successfully"
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Snapshot file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

@router.get("/list/{session_id}")
async def list_snapshots(session_id: str):
    """List all history snapshots for a session"""
    try:
        db = get_database()
        
        session = await db.sessions.find_one({"sessionId": session_id})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        history = session.get("history", [])
        
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
        # Get history image path
        history_path = get_history_image_path(session_id, snapshot_id)
        
        # Delete file if exists
        if history_path.exists():
            history_path.unlink()
        
        # Remove from database
        db = get_database()
        await db.sessions.update_one(
            {"sessionId": session_id},
            {"$pull": {"history": {"snapshotId": snapshot_id}}}
        )
        
        return {
            "success": True,
            "message": "Snapshot deleted successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
