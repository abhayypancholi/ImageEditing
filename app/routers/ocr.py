from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Tuple
import numpy as np
from PIL import Image
import cv2
import base64
from io import BytesIO
import os

from app.services.file_service import get_working_image_path
from app.services.history_service import save_history_snapshot

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

class OCRRequest(BaseModel):
    session_id: str
    mode: str = "auto"  # auto, english, hindi, mixed
    region: Optional[List[int]] = None  # [x, y, w, h]
    use_correction: bool = False
    correction_threshold: float = 0.7

@router.post("/extract")
async def extract_text(request: OCRRequest):
    """Extract text from image using EasyOCR"""
    try:
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            "OCR Text Extraction",
            {"mode": request.mode, "correction": request.use_correction}
        )
        
        # Load image
        image_path = get_working_image_path(request.session_id)
        img = Image.open(image_path)
        
        # Crop to region if specified
        if request.region:
            x, y, w, h = request.region
            img = img.crop((x, y, x + w, y + h))
        
        # Convert to OpenCV format
        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # Preprocessing for better OCR accuracy
        h_img, w_img = img_cv.shape[:2]
        
        # Upscale small images (OCR works better on larger text)
        if w_img < 1000:
            scale = 1000 / w_img
            img_cv = cv2.resize(img_cv, None, fx=scale, fy=scale, 
                              interpolation=cv2.INTER_CUBIC)
        
        # Convert to grayscale + enhance contrast
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        gray = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
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
        
        # Perform OCR
        results = reader.readtext(
            img_cv,
            paragraph=True,
            decoder='beamsearch',
            beamWidth=10,
            contrast_ths=0.1,
            adjust_contrast=0.5
        )
        
        # Format results with correction
        formatted_blocks = []
        scale_factor = 1000 / w_img if w_img < 1000 else 1.0
        
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
