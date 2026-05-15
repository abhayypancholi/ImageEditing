import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Environment
    environment: str = "development"
    
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "pixelcraft"
    
    # Frontend
    frontend_url: str = "http://localhost:5173"
    
    # File upload settings
    max_file_size: int = 52428800  # 50MB in bytes
    
    # Session cleanup
    session_retention_days: int = 7
    cleanup_interval_hours: int = 1

# Create settings instance
settings = Settings()

# Storage paths
BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
ORIGINALS_DIR = STORAGE_DIR / "originals"
WORKING_DIR = STORAGE_DIR / "working"
HISTORY_DIR = STORAGE_DIR / "history"
EXPORTS_DIR = STORAGE_DIR / "exports"

# Create storage directories if they don't exist
for directory in [ORIGINALS_DIR, WORKING_DIR, HISTORY_DIR, EXPORTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# File upload settings
MAX_FILE_SIZE = settings.max_file_size
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}

# CORS settings
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://*.vercel.app",
    settings.frontend_url,
]

# MongoDB settings
MONGODB_URI = settings.mongodb_uri
DATABASE_NAME = settings.database_name
