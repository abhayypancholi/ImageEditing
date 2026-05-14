import shutil
import base64
from io import BytesIO
from pathlib import Path
from datetime import datetime
from uuid import uuid4
from PIL import Image
from app.config import HISTORY_DIR

async def save_history_snapshot(
    session_id: str,
    operation_name: str,
    working_image_path: Path,
    db
) -> dict:
    """
    Save a history snapshot after an operation
    Returns a HistoryEntry dict
    """
    entry_id = str(uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    # Create destination path
    dest = HISTORY_DIR / session_id / f"{entry_id}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    
    # Copy working image to history
    shutil.copy2(working_image_path, dest)
    
    # Generate 80x80 thumbnail
    with Image.open(dest) as img:
        img.thumbnail((80, 80), Image.LANCZOS)
        buf = BytesIO()
        img.save(buf, format='PNG')
        thumb_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    # Create history entry
    entry = {
        "id": entry_id,
        "timestamp": timestamp,
        "operationName": operation_name,
        "imagePath": str(dest),
        "thumbnailBase64": thumb_b64
    }
    
    # Update MongoDB session document
    await db.sessions.update_one(
        {"sessionId": session_id},
        {
            "$push": {"history": entry},
            "$set": {"lastModified": timestamp}
        }
    )
    
    return entry
