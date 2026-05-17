import shutil
import aiofiles
import uuid
import os
from pathlib import Path
from PIL import Image
from app.config import ORIGINALS_DIR, WORKING_DIR, HISTORY_DIR, EXPORTS_DIR

# Ensure all base directories exist
for directory in [ORIGINALS_DIR, WORKING_DIR, HISTORY_DIR, EXPORTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

async def save_uploaded_file(file_content: bytes, session_id: str, filename: str) -> Path:
    """Save uploaded file to originals directory"""
    session_dir = ORIGINALS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    file_path = session_dir / filename
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_content)
    return file_path

def copy_to_working(original_path: Path, session_id: str) -> Path:
    """Copy original image to working directory as PNG"""
    session_dir = WORKING_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    working_path = session_dir / "current.png"
    with Image.open(original_path) as img:
        img.save(working_path, format='PNG')
    return working_path

def create_history_directory(session_id: str) -> Path:
    """FIX for upload.py: Create history directory for session"""
    history_dir = HISTORY_DIR / session_id
    history_dir.mkdir(parents=True, exist_ok=True)
    return history_dir

async def read_image_as_bytes(file_path: Path) -> bytes:
    """Read image file as bytes"""
    async with aiofiles.open(file_path, 'rb') as f:
        return await f.read()

def get_working_image_path(session_id: str) -> Path:
    """Get path to current working image"""
    return WORKING_DIR / session_id / "current.png"

def get_history_image_path(session_id: str, filename: str = "current.png") -> Path:
    """Get path for history images"""
    return HISTORY_DIR / session_id / filename

def get_export_path(session_id: str, filename: str) -> Path:
    """Get path for exported image"""
    session_dir = EXPORTS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir / filename

def save_working_image(image_bytes: bytes, session_id: str, extension: str = "png") -> Path:
    """Saves raw bytes to the working folder"""
    session_dir = WORKING_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    file_path = session_dir / f"current.{extension}"
    with open(file_path, "wb") as f:
        f.write(image_bytes)
    return file_path