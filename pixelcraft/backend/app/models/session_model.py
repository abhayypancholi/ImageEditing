from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ImageMetadata(BaseModel):
    width: int
    height: int
    fileSizeBytes: int
    format: str
    colorMode: str
    fileName: str
    hasAlpha: bool

class HistoryEntry(BaseModel):
    id: str
    timestamp: str
    operationName: str
    imagePath: str
    thumbnailBase64: str

class SessionDocument(BaseModel):
    session_id: str = Field(alias="sessionId")
    original_path: str = Field(alias="originalPath")
    working_path: str = Field(alias="workingPath")
    metadata: ImageMetadata
    created_at: str = Field(alias="createdAt")
    last_modified: str = Field(alias="lastModified")
    history: List[HistoryEntry] = []

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "sessionId": "123e4567-e89b-12d3-a456-426614174000",
                "originalPath": "storage/originals/session_id/original.png",
                "workingPath": "storage/working/session_id/current.png",
                "metadata": {
                    "width": 1920,
                    "height": 1080,
                    "fileSizeBytes": 2457600,
                    "format": "PNG",
                    "colorMode": "RGB",
                    "fileName": "example.png",
                    "hasAlpha": False
                },
                "createdAt": "2024-01-01T00:00:00Z",
                "lastModified": "2024-01-01T00:00:00Z",
                "history": []
            }
        }
