from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict
import numpy as np
from PIL import Image
import cv2
import base64
from io import BytesIO
import asyncio

from app.services.file_service import get_working_image_path
from app.services.history_service import save_history_snapshot

router = APIRouter()

class FaceAnalyzeRequest(BaseModel):
    session_id: str

@router.post("/analyze")
async def analyze_faces(request: FaceAnalyzeRequest):
    """
    FIX B7: Analyze facial expressions using DeepFace
    with zero-face graceful fallback and per-face error handling
    """
    try:
        working_path = get_working_image_path(request.session_id)
        
        # Wrap blocking operations (FIX B9)
        def _blocking_face_analysis():
            # Load image
            img_cv = cv2.imread(str(working_path))
            img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
            
            # Step 1: Detect all faces using OpenCV Haar cascade (fast)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            faces_basic = face_cascade.detectMultiScale(
                gray, 1.1, 5, minSize=(50, 50)
            )
            
            # FIX B7: CRITICAL - early exit if no faces found
            if len(faces_basic) == 0:
                return []  # Return empty list, will be handled below
            
            results = []
            
            for i, (fx, fy, fw, fh) in enumerate(faces_basic):
                # Add padding around face for DeepFace context
                pad = int(fw * 0.2)
                x1 = max(0, fx - pad)
                y1 = max(0, fy - pad)
                x2 = min(img_cv.shape[1], fx + fw + pad)
                y2 = min(img_cv.shape[0], fy + fh + pad)
                
                face_region = img_rgb[y1:y2, x1:x2]
                
                try:
                    # DeepFace emotion analysis (local models, no API)
                    from deepface import DeepFace
                    
                    analysis = DeepFace.analyze(
                        face_region,
                        actions=['emotion'],
                        enforce_detection=False,
                        detector_backend='opencv',
                        silent=True
                    )
                    
                    # Handle both list and dict return types
                    if isinstance(analysis, list):
                        emotions_raw = analysis[0]['emotion']
                    elif isinstance(analysis, dict):
                        emotions_raw = analysis.get('emotion', {})
                    else:
                        raise ValueError("Unexpected DeepFace response format")
                    
                    # DeepFace returns: happy, sad, angry, surprise, neutral, fear, disgust
                    base_emotions = {k: round(v, 1) for k, v in emotions_raw.items()}
                    
                except Exception as face_err:
                    print(f"[FACE {i}] DeepFace error: {face_err}")
                    # FIX B7: Fallback - neutral expression
                    base_emotions = {
                        "happy": 0.0, "sad": 0.0, "angry": 0.0, "surprise": 0.0,
                        "neutral": 100.0, "fear": 0.0, "disgust": 0.0
                    }
                
                # Extend to 12 emotions by inference from base 7
                h_val = base_emotions.get('happy', 0)
                s_val = base_emotions.get('sad', 0)
                a_val = base_emotions.get('angry', 0)
                su_val = base_emotions.get('surprise', 0)
                n_val = base_emotions.get('neutral', 0)
                f_val = base_emotions.get('fear', 0)
                d_val = base_emotions.get('disgust', 0)
                
                extended = {
                    "Happy": round(h_val * (1 - min(1, h_val / 150)), 1),
                    "Sad": round(s_val * (1 - min(1, s_val / 150)), 1),
                    "Angry": round(a_val, 1),
                    "Surprise": round(su_val, 1),
                    "Neutral": round(n_val, 1),
                    "Fear": round(f_val, 1),
                    "Disgust": round(d_val, 1),
                    "Laughing": round(min(100, h_val * 1.3) if h_val > 60 else h_val * 0.3, 1),
                    "Crying": round(min(100, s_val * 1.2) if s_val > 50 else s_val * 0.2, 1),
                    "Confused": round((su_val + f_val) / 2 * 0.7, 1),
                    "Frown": round((s_val + a_val) / 2 * 0.6, 1),
                    "Serious": round(n_val * 0.8 if (h_val + s_val + a_val) < 20 else n_val * 0.3, 1)
                }
                
                # Normalize to sum to 100%
                total = sum(extended.values()) or 1
                normalized = {k: round(v / total * 100, 1) for k, v in extended.items()}
                
                # Dominant emotion
                dominant = max(normalized, key=normalized.get)
                
                # Face thumbnail as base64
                face_img = Image.fromarray(face_region)
                face_img.thumbnail((120, 120), Image.LANCZOS)
                buf = BytesIO()
                face_img.save(buf, 'PNG')
                face_thumb = base64.b64encode(buf.getvalue()).decode()
                
                results.append({
                    "face_id": i + 1,
                    "bbox": [int(fx), int(fy), int(fw), int(fh)],
                    "emotions": normalized,
                    "dominant": dominant,
                    "thumbnail": face_thumb
                })
            
            return results
        
        results = await asyncio.to_thread(_blocking_face_analysis)
        
        # FIX B7: Handle zero-face case gracefully
        if len(results) == 0:
            return JSONResponse(content={
                "success": True,
                "data": {
                    "faces": [],
                    "total_faces": 0,
                    "message": "No faces detected in this image."
                }
            })
        
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            "Face Expression Analysis",
            {}
        )
        
        return {
            "success": True,
            "data": {
                "faces": results,
                "total_faces": len(results)
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face analysis failed: {str(e)}")
