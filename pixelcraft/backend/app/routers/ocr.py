from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Tuple
import numpy as np
from PIL import Image
import cv2
import base64
from io import BytesIO
import os
import asyncio

from app.services.file_service import get_working_image_path
from app.services.history_service import save_history_snapshot
from app.database import get_database

router = APIRouter()

# EasyOCR reader cache (lazy loaded)
_reader_cache = {}

def get_reader(langs: List[str]):
    """Get or create EasyOCR reader for specified languages"""
    import easyocr
    key = tuple(sorted(langs))
    if key not in _reader_cache:
        _reader_cache[key] = easyocr.Reader(
            list(langs),
            gpu=False,  # CPU mode for deployment compatibility
            verbose=False
        )
    return _reader_cache[key]

# Trie implementation for dictionary correction
class TrieNode:
    def __init__(self):
        self.children: dict = {}
        self.is_end = False
        self.word = ""

class Trie:
    def __init__(self):
        self.root = TrieNode()
    
    def insert(self, word: str):
        """Insert a word into the Trie"""
        node = self.root
        for char in word.lower():
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True
        node.word = word
    
    def search_nearest(self, word: str, max_distance: int = 2) -> List[Tuple[str, int]]:
        """
        Find all dictionary words within edit distance of `word`
        using BFS/DFS traversal of the Trie + dynamic programming
        """
        word = word.lower()
        current_row = list(range(len(word) + 1))
        results = []
        
        for char, child_node in self.root.children.items():
            self._search_recursive(child_node, char, word, current_row, results, max_distance)
        
        results.sort(key=lambda x: x[1])
        return results[:5]  # top 5 suggestions
    
    def _search_recursive(self, node: TrieNode, char: str, word: str, 
                         prev_row: List[int], results: List[Tuple[str, int]], 
                         max_dist: int):
        """Recursive helper for edit distance search"""
        n = len(word)
        current_row = [prev_row[0] + 1]
        
        for col in range(1, n + 1):
            insert_cost = current_row[col - 1] + 1
            delete_cost = prev_row[col] + 1
            replace_cost = prev_row[col - 1] + (0 if word[col - 1] == char else 1)
            current_row.append(min(insert_cost, delete_cost, replace_cost))
        
        if current_row[-1] <= max_dist and node.is_end:
            results.append((node.word, current_row[-1]))
        
        if min(current_row) <= max_dist:
            for next_char, child in node.children.items():
                self._search_recursive(child, next_char, word, current_row, results, max_dist)

# Dictionary tries (lazy loaded)
_en_trie = None
_hi_trie = None

def get_english_trie():
    """Load English dictionary Trie"""
    global _en_trie
    if _en_trie is None:
        _en_trie = Trie()
        dict_path = os.path.join(os.path.dirname(__file__), '../data/english_words.txt')
        if os.path.exists(dict_path):
            with open(dict_path, encoding='utf-8') as f:
                for line in f:
                    word = line.strip()
                    if word:
                        _en_trie.insert(word)
    return _en_trie

def get_hindi_trie():
    """Load Hindi dictionary Trie"""
    global _hi_trie
    if _hi_trie is None:
        _hi_trie = Trie()
        dict_path = os.path.join(os.path.dirname(__file__), '../data/hindi_words.txt')
        if os.path.exists(dict_path):
            with open(dict_path, encoding='utf-8') as f:
                for line in f:
                    word = line.strip()
                    if word:
                        _hi_trie.insert(word)
    return _hi_trie

def correct_word(word: str, lang: str, threshold: float) -> str:
    """Returns corrected word or original if no good match"""
    if not word.strip():
        return word
    
    try:
        trie = get_english_trie() if lang == 'en' else get_hindi_trie()
        matches = trie.search_nearest(word, max_distance=2)
        
        if matches and matches[0][1] <= int(threshold * 3):
            # Only correct if edit distance is small relative to word length
            if matches[0][1] <= max(1, len(word) // 4):
                return matches[0][0]
    except Exception as e:
        print(f"Correction error: {e}")
    
    return word

def detect_language(text: str) -> str:
    """Detect if text is Hindi (Devanagari script) or English"""
    devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    return 'hi' if devanagari_count > len(text) * 0.3 else 'en'

def preprocess_for_ocr(img_cv: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    FIX B6: Improve OCR accuracy with adaptive binarization.
    Returns a preprocessed image suitable for EasyOCR.
    """
    # Upscale if too small (OCR needs at least 32px text height)
    h, w = img_cv.shape[:2]
    if w < 800:
        scale = 800 / w
        img_cv = cv2.resize(img_cv, None, fx=scale, fy=scale,
                          interpolation=cv2.INTER_CUBIC)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    
    # Denoise
    gray = cv2.fastNlMeansDenoising(gray, h=10,
                                    templateWindowSize=7,
                                    searchWindowSize=21)
    
    # Deskew (small skew correction before OCR)
    coords = np.column_stack(np.where(gray > 0))
    if len(coords) > 100:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45: angle = 90 + angle
        if abs(angle) > 0.5:  # only correct if skew > 0.5 degrees
            (bh, bw) = gray.shape
            M = cv2.getRotationMatrix2D((bw//2, bh//2), angle, 1.0)
            gray = cv2.warpAffine(gray, M, (bw, bh),
                                flags=cv2.INTER_CUBIC,
                                borderMode=cv2.BORDER_REPLICATE)
            img_cv = cv2.warpAffine(img_cv, M, (bw, bh),
                                   flags=cv2.INTER_CUBIC,
                                   borderMode=cv2.BORDER_REPLICATE)
    
    # Adaptive threshold for binarization
    binary = cv2.adaptiveThreshold(gray, 255,
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY,
                                   blockSize=11, C=2)
    
    # Morphological cleanup to connect broken characters
    kernel = np.ones((2, 2), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    
    # Convert binary back to 3-channel for EasyOCR
    binary_3ch = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
    
    # Return BOTH: original (for color accuracy) and binary (for OCR)
    # EasyOCR works better on the binarized version
    return binary_3ch, img_cv

class OCRRequest(BaseModel):
    session_id: str
    mode: str = "auto"  # auto, english, hindi, mixed
    region: Optional[List[int]] = None  # [x, y, w, h]
    use_correction: bool = False
    correction_threshold: float = 0.7

@router.post("/extract")
async def extract_text(request: OCRRequest):
    """Extract text from image using EasyOCR with FIX B6 preprocessing"""
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_ocr():
            # Load image
            image_path = get_working_image_path(request.session_id)
            img = Image.open(image_path)
            
            # Crop to region if specified
            if request.region:
                x, y, w, h = request.region
                img = img.crop((x, y, x + w, y + h))
            
            # Convert to OpenCV format
            img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
            
            # FIX B6: Apply preprocessing for better OCR accuracy
            binary_img, color_img = preprocess_for_ocr(img_cv)
            
            # Language mapping
            lang_map = {
                "auto": ["en", "hi"],
                "english": ["en"],
                "hindi": ["hi"],
                "mixed": ["en", "hi"]
            }
            langs = lang_map.get(request.mode, ["en", "hi"])
            
            # Get EasyOCR reader
            reader = get_reader(langs)
            
            # Perform OCR on the binarized image
            results = reader.readtext(
                binary_img,
                paragraph=True,
                decoder='beamsearch',
                beamWidth=10,
                contrast_ths=0.1,
                adjust_contrast=0.5
            )
            
            # Format results with correction
            formatted_blocks = []
            h_img, w_img = img_cv.shape[:2]
            scale_factor = 800 / w_img if w_img < 800 else 1.0
            
            for bbox, text, confidence in results:
                # Scale coordinates back if image was upscaled
                offset_x = request.region[0] if request.region else 0
                offset_y = request.region[1] if request.region else 0
                
                # Detect language
                lang = detect_language(text)
                
                # Apply correction if enabled
                if request.use_correction:
                    words = text.split()
                    corrected = ' '.join(
                        correct_word(w, lang, request.correction_threshold) 
                        for w in words
                    )
                else:
                    corrected = text
                
                # Calculate bounding box
                x1 = int(bbox[0][0] / scale_factor + offset_x)
                y1 = int(bbox[0][1] / scale_factor + offset_y)
                x2 = int(bbox[2][0] / scale_factor + offset_x)
                y2 = int(bbox[2][1] / scale_factor + offset_y)
                
                formatted_blocks.append({
                    "original": text,
                    "corrected": corrected,
                    "confidence": round(confidence * 100, 1),
                    "language": lang,
                    "bbox": [x1, y1, x2 - x1, y2 - y1]
                })
            
            # Generate full text
            full_text = '\n'.join(b['corrected'] for b in formatted_blocks)
            
            # Language summary
            lang_counts = {"en": 0, "hi": 0}
            for block in formatted_blocks:
                lang_counts[block['language']] += 1
            
            if lang_counts['hi'] > lang_counts['en']:
                language_summary = "Hindi"
            elif lang_counts['en'] > lang_counts['hi']:
                language_summary = "English"
            else:
                language_summary = "Mixed"
            
            return formatted_blocks, full_text, language_summary
        
        formatted_blocks, full_text, language_summary = await asyncio.to_thread(_blocking_ocr)
        
        # Save history snapshot (OCR is read-only, snapshot the current working image)
        working_path = get_working_image_path(request.session_id)
        db = get_database()
        await save_history_snapshot(
            request.session_id,
            "OCR Text Extraction",
            working_path,
            db
        )
        
        return {
            "success": True,
            "data": {
                "blocks": formatted_blocks,
                "full_text": full_text,
                "language_summary": language_summary,
                "total_blocks": len(formatted_blocks)
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")