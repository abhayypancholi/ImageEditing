import base64
from io import BytesIO
from PIL import Image
import numpy as np
import cv2

def pil_to_base64(image: Image.Image, format: str = "PNG") -> str:
    """Convert PIL Image to base64 string"""
    buffer = BytesIO()
    image.save(buffer, format=format)
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def base64_to_pil(base64_string: str) -> Image.Image:
    """Convert base64 string to PIL Image"""
    image_data = base64.b64decode(base64_string)
    return Image.open(BytesIO(image_data))

def pil_to_cv2(image: Image.Image) -> np.ndarray:
    """Convert PIL Image to OpenCV format (numpy array)"""
    # Convert PIL image to RGB if not already
    if image.mode != 'RGB':
        image = image.convert('RGB')
    # Convert to numpy array and change color space from RGB to BGR
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

def cv2_to_pil(image: np.ndarray) -> Image.Image:
    """Convert OpenCV image (numpy array) to PIL Image"""
    # Convert from BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return Image.fromarray(image_rgb)

def get_image_metadata(image: Image.Image, file_path: str, file_name: str) -> dict:
    """Extract metadata from PIL Image"""
    import os
    
    width, height = image.size
    format_name = image.format or "PNG"
    mode = image.mode
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    has_alpha = mode in ('RGBA', 'LA', 'PA')
    
    return {
        "width": width,
        "height": height,
        "fileSizeBytes": file_size,
        "format": format_name,
        "colorMode": mode,
        "fileName": file_name,
        "hasAlpha": has_alpha
    }
