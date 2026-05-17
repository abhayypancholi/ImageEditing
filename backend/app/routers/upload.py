import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from uuid import uuid4
from datetime import datetime
from PIL import Image

from app.database import get_database
from app.config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE
from app.services.file_service import (
    save_uploaded_file,
    copy_to_working,
    create_history_directory,
    get_working_image_path
)
from app.utils.image_utils import get_image_metadata, pil_to_base64

router = APIRouter()

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image file and create a new session
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    file_content = await file.read()
    
    # Validate file size
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 50MB"
        )
    
    # Generate session ID
    session_id = str(uuid4())
    
    # Add 1 second delay for testing processing spinner
    await asyncio.sleep(1)
    
    try:
        # Save original file
        original_filename = f"original{file_ext}"
        original_path = await save_uploaded_file(file_content, session_id, original_filename)
        
        # Copy to working directory as PNG
        working_path = copy_to_working(original_path, session_id)
        
        # Create history directory
        create_history_directory(session_id)
        
        # Extract metadata
        with Image.open(working_path) as img:
            metadata = get_image_metadata(img, str(working_path), file.filename)
        
        # Create session document
        session_doc = {
            "sessionId": session_id,
            "originalPath": str(original_path),
            "workingPath": str(working_path),
            "metadata": metadata,
            "createdAt": datetime.utcnow().isoformat(),
            "lastModified": datetime.utcnow().isoformat(),
            "history": []
        }
        
        # Save to MongoDB
        db = get_database()
        await db.sessions.insert_one(session_doc)
        
        return {
            "success": True,
            "data": {
                "sessionId": session_id,
                "metadata": metadata
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/session/{session_id}/image")
async def get_session_image(session_id: str):
    """
    Get the current working image as base64
    """
    try:
        working_path = get_working_image_path(session_id)
        
        if not working_path.exists():
            raise HTTPException(status_code=404, detail="Session not found")
        
        with Image.open(working_path) as img:
            image_base64 = pil_to_base64(img, format="PNG")
        
        return {
            "imageBase64": image_base64
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load image: {str(e)}")

@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """
    Get session information from MongoDB
    """
    try:
        db = get_database()
        session = await db.sessions.find_one({"sessionId": session_id})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Remove MongoDB _id field
        session.pop("_id", None)
        
        return session
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")
