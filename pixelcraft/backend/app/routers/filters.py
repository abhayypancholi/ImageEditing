from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
import numpy as np
import cv2
from io import BytesIO
import base64

from app.database import get_database
from app.services.file_service import get_working_image_path
from app.services.history_service import save_history_snapshot
from app.utils.image_utils import pil_to_base64, get_image_metadata

router = APIRouter()

class FilterPreviewRequest(BaseModel):
    session_id: str

class FilterApplyRequest(BaseModel):
    session_id: str
    filter_name: str
    intensity: float = 1.0  # 0 to 1

def apply_filter(img_cv: np.ndarray, filter_name: str, intensity: float) -> np.ndarray:
    """Apply a specific filter to the image"""
    
    if filter_name == "vivid":
        # Boost saturation and contrast
        img_hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV).astype(np.float32)
        img_hsv[:, :, 1] = np.clip(img_hsv[:, :, 1] * (1 + 0.5 * intensity), 0, 255)
        img_hsv[:, :, 2] = np.clip(img_hsv[:, :, 2] * (1 + 0.2 * intensity), 0, 255)
        result = cv2.cvtColor(img_hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        
        # Boost contrast
        lab = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab = cv2.merge([clahe.apply(l), a, b])
        result = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        return result
    
    elif filter_name == "fair":
        # Brighten skin tones
        img_hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)
        lower_skin = np.array([0, 30, 50], dtype=np.uint8)
        upper_skin = np.array([25, 170, 255], dtype=np.uint8)
        skin_mask = cv2.inRange(img_hsv, lower_skin, upper_skin)
        skin_mask = cv2.GaussianBlur(skin_mask, (21, 21), 0)
        
        img_float = img_cv.astype(np.float32)
        brighten_factor = 1 + (0.2 * intensity)
        img_bright = np.clip(img_float * brighten_factor, 0, 255).astype(np.uint8)
        skin_w = skin_mask[:, :, np.newaxis].astype(np.float32) / 255.0
        result = (img_bright * skin_w + img_cv * (1 - skin_w)).astype(np.uint8)
        return result
    
    elif filter_name == "soft_gray":
        # Soft grayscale
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        gray_3ch = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        gray_3ch = cv2.GaussianBlur(gray_3ch, (3, 3), 0)
        
        # Reduce contrast
        lut = np.array([int(20 + i * (220 / 255)) for i in range(256)], dtype=np.uint8)
        result = cv2.LUT(gray_3ch, lut)
        result = cv2.addWeighted(gray_3ch, intensity, img_cv, 1 - intensity, 0)
        return result
    
    elif filter_name == "background_blur":
        # Center-weighted blur
        h, w = img_cv.shape[:2]
        Y, X = np.ogrid[:h, :w]
        cx, cy = w // 2, h // 2
        dist = np.sqrt(((X - cx) / cx) ** 2 + ((Y - cy) / cy) ** 2)
        blur_mask = np.clip(dist * intensity, 0, 1)
        blurred = cv2.GaussianBlur(img_cv, (51, 51), 0)
        blur_3ch = blur_mask[:, :, np.newaxis]
        result = (blurred * blur_3ch + img_cv * (1 - blur_3ch)).astype(np.uint8)
        return result
    
    elif filter_name == "hdr":
        # HDR effect
        lab = cv2.cvtColor(img_cv, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0 * intensity, tileGridSize=(8, 8))
        l_eq = clahe.apply(l)
        
        # Detail enhancement
        l_float = l.astype(np.float32) / 255.0
        blurred_l = cv2.GaussianBlur(l_float, (0, 0), 3)
        detail = l_float - blurred_l
        l_hdr = np.clip(l_float + detail * 2 * intensity, 0, 1)
        l_hdr = (l_hdr * 255).astype(np.uint8)
        
        lab_hdr = cv2.merge([l_hdr, a, b])
        result = cv2.cvtColor(lab_hdr, cv2.COLOR_LAB2BGR)
        
        # Saturation boost
        hsv = cv2.cvtColor(result, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * (1 + 0.3 * intensity), 0, 255)
        result = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        return result
    
    elif filter_name == "vintage":
        # Vintage/retro look
        img_float = img_cv.astype(np.float32) / 255.0
        
        # Lift shadows
        img_float = img_float * 0.85 + 0.07
        
        # Warm toning
        img_float[:, :, 2] = np.clip(img_float[:, :, 2] * 1.1, 0, 1)  # R boost
        img_float[:, :, 0] = np.clip(img_float[:, :, 0] * 0.85, 0, 1)  # B reduce
        img_float[:, :, 1] = np.clip(img_float[:, :, 1] * 0.95, 0, 1)  # G slight reduce
        
        # Vignette
        h, w = img_cv.shape[:2]
        Y, X = np.ogrid[:h, :w]
        cx, cy = w // 2, h // 2
        vignette = 1 - np.sqrt(((X - cx) / cx) ** 2 + ((Y - cy) / cy) ** 2) * 0.5 * intensity
        vignette = np.clip(vignette, 0, 1)[:, :, np.newaxis]
        img_float = img_float * vignette
        
        # Film grain
        noise = np.random.normal(0, 0.04 * intensity, img_float.shape)
        result = np.clip((img_float + noise) * 255, 0, 255).astype(np.uint8)
        return result
    
    elif filter_name == "portrait":
        # Portrait mode (depth-of-field)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        h, w = img_cv.shape[:2]
        focus_mask = np.zeros((h, w), dtype=np.float32)
        
        if len(faces) > 0:
            for (fx, fy, fw, fh) in faces:
                cx_f, cy_f = fx + fw // 2, fy + fh // 2
                cv2.ellipse(
                    focus_mask, (cx_f, cy_f),
                    (int(fw * 0.8), int(fh * 1.2)), 0, 0, 360, 1.0, -1
                )
        else:
            Y, X = np.ogrid[:h, :w]
            focus_mask = np.clip(
                1 - np.sqrt(((X - w // 2) / (w // 3)) ** 2 + ((Y - h // 2) / (h // 3)) ** 2),
                0, 1
            )
        
        focus_mask = cv2.GaussianBlur(focus_mask, (151, 151), 0)
        blur_strength = int(21 * intensity)
        if blur_strength % 2 == 0:
            blur_strength += 1
        blurred = cv2.GaussianBlur(img_cv, (blur_strength, blur_strength), 0)
        focus_3ch = focus_mask[:, :, np.newaxis]
        result = (img_cv * focus_3ch + blurred * (1 - focus_3ch)).astype(np.uint8)
        return result
    
    elif filter_name == "sepia":
        # Sepia tone
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        r_lut = np.array([min(255, int(i * 1.189)) for i in range(256)], dtype=np.uint8)
        g_lut = np.array([min(255, int(i * 1.059)) for i in range(256)], dtype=np.uint8)
        b_lut = np.array([min(255, int(i * 0.825)) for i in range(256)], dtype=np.uint8)
        
        sepia_r = cv2.LUT(gray, r_lut)
        sepia_g = cv2.LUT(gray, g_lut)
        sepia_b = cv2.LUT(gray, b_lut)
        sepia_img = cv2.merge([sepia_b, sepia_g, sepia_r])
        result = cv2.addWeighted(sepia_img, intensity, img_cv, 1 - intensity, 0)
        return result
    
    elif filter_name == "cinematic":
        # Teal-orange cinematic look
        img_float = img_cv.astype(np.float32) / 255.0
        
        # Teal shadows
        shadow_mask = 1 - img_float
        img_float[:, :, 0] += shadow_mask[:, :, 0] * 0.1 * intensity  # B+
        img_float[:, :, 1] += shadow_mask[:, :, 1] * 0.05 * intensity  # G+
        
        # Orange highlights
        highlight_mask = img_float
        img_float[:, :, 2] += highlight_mask[:, :, 2] * 0.1 * intensity  # R+
        img_float[:, :, 0] -= highlight_mask[:, :, 0] * 0.05 * intensity  # B-
        
        # S-curve contrast
        x = np.linspace(0, 1, 256)
        s_curve = 0.5 + 0.5 * np.tanh(4 * (x - 0.5))
        lut_s = (s_curve * 255).astype(np.uint8)
        result = cv2.LUT(np.clip(img_float * 255, 0, 255).astype(np.uint8), lut_s)
        
        # Crush blacks
        result = np.clip(result.astype(np.int32) - int(10 * intensity), 0, 255).astype(np.uint8)
        return result
    
    elif filter_name == "bokeh":
        # Bokeh effect
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        _, bright_mask = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))
        bokeh_mask = cv2.dilate(bright_mask, kernel, iterations=int(3 * intensity))
        bokeh_mask_blur = cv2.GaussianBlur(bokeh_mask, (101, 101), 0)
        bokeh_mask_float = bokeh_mask_blur.astype(np.float32) / 255.0
        
        blurred = cv2.GaussianBlur(img_cv, (51, 51), 0)
        bokeh_3ch = bokeh_mask_float[:, :, np.newaxis] * intensity
        result = np.clip(
            img_cv.astype(np.float32) + blurred.astype(np.float32) * bokeh_3ch * 0.5,
            0, 255
        ).astype(np.uint8)
        return result
    
    elif filter_name == "ai_enhance":
        # AI-style enhancement (no external API)
        # Denoise
        result = cv2.fastNlMeansDenoisingColored(img_cv, None, 5, 5, 7, 21)
        
        # Sharpen
        blur = cv2.GaussianBlur(result, (0, 0), 3)
        result = cv2.addWeighted(result, 1.5 * intensity, blur, -0.5 * intensity, 0)
        
        # CLAHE contrast
        lab = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        result = cv2.cvtColor(cv2.merge([clahe.apply(l), a, b]), cv2.COLOR_LAB2BGR)
        
        # Saturation
        hsv = cv2.cvtColor(result, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * (1 + 0.15 * intensity), 0, 255)
        result = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        return result
    
    elif filter_name == "smooth_skin":
        # Smooth skin filter
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        result = img_cv.copy()
        if len(faces) > 0:
            for (fx, fy, fw, fh) in faces:
                face_roi = img_cv[fy:fy + fh, fx:fx + fw]
                d = int(9 + 6 * intensity)
                sigma = 75 * intensity
                smoothed = cv2.bilateralFilter(face_roi, d, sigma, sigma)
                
                # Apply on skin pixels only
                face_hsv = cv2.cvtColor(face_roi, cv2.COLOR_BGR2HSV)
                skin_mask = cv2.inRange(
                    face_hsv,
                    np.array([0, 30, 50]),
                    np.array([25, 170, 255])
                )
                skin_mask_f = skin_mask.astype(np.float32)[:, :, np.newaxis] / 255.0
                face_result = (smoothed * skin_mask_f + face_roi * (1 - skin_mask_f)).astype(np.uint8)
                result[fy:fy + fh, fx:fx + fw] = face_result
        else:
            # Fallback: smooth entire image
            result = cv2.bilateralFilter(img_cv, 9, 50 * intensity, 50 * intensity)
        
        return result
    
    else:
        return img_cv

@router.post("/preview_all")
async def preview_all_filters(request: FilterPreviewRequest):
    """Generate thumbnails for all filters"""
    try:
        working_path = get_working_image_path(request.session_id)
        
        if not working_path.exists():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Load image and create thumbnail
        img = Image.open(working_path)
        img.thumbnail((200, 200), Image.LANCZOS)
        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # Generate previews for all filters
        filter_names = [
            "vivid", "fair", "soft_gray", "background_blur", "hdr", "vintage",
            "portrait", "sepia", "cinematic", "bokeh", "ai_enhance", "smooth_skin"
        ]
        
        previews = {}
        for filter_name in filter_names:
            filtered = apply_filter(img_cv.copy(), filter_name, 1.0)
            filtered_rgb = cv2.cvtColor(filtered, cv2.COLOR_BGR2RGB)
            filtered_pil = Image.fromarray(filtered_rgb)
            filtered_pil.thumbnail((100, 100), Image.LANCZOS)
            
            # Convert to base64
            buffer = BytesIO()
            filtered_pil.save(buffer, format='PNG')
            buffer.seek(0)
            preview_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            previews[filter_name] = preview_base64
        
        return {
            "success": True,
            "data": {
                "previews": previews
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")

@router.post("/apply")
async def apply_filter_to_image(request: FilterApplyRequest):
    """Apply selected filter to full-resolution image"""
    try:
        working_path = get_working_image_path(request.session_id)
        
        if not working_path.exists():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Load image
        img_cv = cv2.imread(str(working_path))
        
        # Apply filter
        filtered = apply_filter(img_cv, request.filter_name, request.intensity)
        
        # Save
        cv2.imwrite(str(working_path), filtered)
        
        # Load with PIL for metadata
        img = Image.open(working_path)
        metadata = get_image_metadata(img, str(working_path), "filtered.png")
        
        # Save history
        db = get_database()
        filter_display_name = request.filter_name.replace("_", " ").title()
        await save_history_snapshot(
            request.session_id,
            f"Filter: {filter_display_name}",
            working_path,
            db
        )
        
        # Return base64 image
        image_base64 = pil_to_base64(img, format="PNG")
        
        return {
            "success": True,
            "data": {
                "workingImageBase64": image_base64,
                "metadata": metadata
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filter application failed: {str(e)}")
