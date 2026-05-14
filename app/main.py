from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import connect_to_mongo, close_mongo_connection
from app.config import ALLOWED_ORIGINS
from app.routers import upload, crop, zoom, enhance, filters, annotations, objects, compress, history, ocr, face, background, extend, straighten, storage
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import shutil

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    
    # Start background cleanup task
    cleanup_task = asyncio.create_task(cleanup_old_sessions())
    
    yield
    
    # Shutdown
    cleanup_task.cancel()
    await close_mongo_connection()

async def cleanup_old_sessions():
    """Background task to cleanup sessions older than 7 days"""
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            
            from app.database import get_database
            db = get_database()
            
            # Find sessions older than 7 days
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            old_sessions = await db.sessions.find({
                "lastModified": {"$lt": cutoff_date.isoformat()}
            }).to_list(length=None)
            
            for session in old_sessions:
                session_id = session.get("sessionId")
                if session_id:
                    # Delete from database
                    await db.sessions.delete_one({"sessionId": session_id})
                    
                    # Delete storage folders
                    base_path = Path("storage")
                    for folder in ["originals", "working", "history", "exports"]:
                        folder_path = base_path / folder / session_id
                        if folder_path.exists():
                            shutil.rmtree(folder_path, ignore_errors=True)
            
            if old_sessions:
                print(f"Cleaned up {len(old_sessions)} old sessions")
        
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Cleanup error: {e}")
            await asyncio.sleep(60)  # Wait a minute before retrying

app = FastAPI(
    title="PixelCraft API",
    description="Professional Image Editing API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(crop.router, prefix="/api", tags=["crop"])
app.include_router(zoom.router, prefix="/api/zoom", tags=["zoom"])
app.include_router(enhance.router, prefix="/api/enhance", tags=["enhance"])
app.include_router(filters.router, prefix="/api/filters", tags=["filters"])
app.include_router(annotations.router, prefix="/api/annotations", tags=["annotations"])
app.include_router(objects.router, prefix="/api/objects", tags=["objects"])
app.include_router(compress.router, prefix="/api/compress", tags=["compress"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])
app.include_router(face.router, prefix="/api/face", tags=["face"])
app.include_router(background.router, prefix="/api/background", tags=["background"])
app.include_router(extend.router, prefix="/api/extend", tags=["extend"])
app.include_router(straighten.router, prefix="/api/straighten", tags=["straighten"])
app.include_router(storage.router, prefix="/api/storage", tags=["storage"])

@app.get("/")
async def root():
    return {
        "message": "PixelCraft API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
