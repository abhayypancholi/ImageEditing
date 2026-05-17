from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
import io
import asyncio

from app.services.file_service import get_working_image_path, save_working_image
from app.services.history_service import save_history_snapshot

router = APIRouter()

class CompressJPEGRequest(BaseModel):
    session_id: str
    quality: int = 85

class CompressPCARequest(BaseModel):
    session_id: str
    components: int = 50

class CompressPaletteRequest(BaseModel):
    session_id: str
    colors: int = 256

@router.post("/jpeg")
async def compress_jpeg(request: CompressJPEGRequest):
    """Compress image using JPEG quality reduction"""
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_jpeg():
            # Load working image
            image_path = get_working_image_path(request.session_id)
            image = Image.open(image_path)
            
            # Convert RGBA to RGB if needed
            if image.mode == 'RGBA':
                # Create white background
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[3])
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Compress using JPEG
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=request.quality, optimize=True)
            buffer.seek(0)
            
            # Load compressed image
            compressed_image = Image.open(buffer)
            
            # Save result
            save_working_image(request.session_id, compressed_image)
            
            # Get file sizes for comparison
            original_size = len(open(image_path, 'rb').read())
            buffer.seek(0)
            compressed_size = len(buffer.read())
            compression_ratio = (1 - compressed_size / original_size) * 100
            
            return original_size, compressed_size, compression_ratio
        
        original_size, compressed_size, compression_ratio = await asyncio.to_thread(_blocking_jpeg)
        
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            "JPEG Compression",
            {"quality": request.quality}
        )
        
        return {
            "success": True,
            "message": f"Compressed with JPEG quality {request.quality}",
            "data": {
                "original_size": original_size,
                "compressed_size": compressed_size,
                "compression_ratio": round(compression_ratio, 2)
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JPEG compression failed: {str(e)}")

@router.post("/pca")
async def compress_pca(request: CompressPCARequest):
    """
    FIX B3: PCA compression on each RGB channel independently.
    Handles RGBA images, memory limits, and rank constraints.
    """
    try:
        working_path = get_working_image_path(request.session_id)
        pca_components_ratio = request.components / 100.0  # Convert to 0.0-1.0
        
        result = await apply_pca_compression(str(working_path), pca_components_ratio)
        
        if not result.get("success"):
            return JSONResponse(
                status_code=500,
                content=result
            )
        
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            "PCA Compression",
            {"components": request.components}
        )
        
        return {
            "success": True,
            "message": f"Compressed using PCA with {request.components}% components",
            "data": {
                "psnr": result.get("psnr"),
                "original_size": result.get("original_size"),
                "compressed_size": result.get("compressed_size"),
                "ratio": result.get("ratio")
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PCA compression failed: {str(e)}")

async def apply_pca_compression(working_path: str, pca_components_ratio: float) -> dict:
    """
    FIX B3: PCA compression on each RGB channel independently.
    Handles RGBA images, memory limits, and rank constraints.
    """
    def _run_pca():
        # STEP 1: Always convert to RGB — strips alpha channel
        img = Image.open(working_path).convert('RGB')
        img_arr = np.array(img, dtype=np.float32)   # shape: (H, W, 3)
        H, W, C = img_arr.shape
        
        # Safety cap: don't PCA images larger than 4MP on free tier
        if H * W > 4_000_000:
            raise MemoryError(f"Image too large for PCA ({H}×{W}). "
                            "Use Quality Reduction instead.")
        
        compressed_channels = []
        original_size_bytes = H * W * 3
        
        for ch_idx in range(C):
            channel = img_arr[:, :, ch_idx]     # shape: (H, W), float32
            
            # Center data
            mean = channel.mean(axis=1, keepdims=True)  # (H, 1)
            centered = channel - mean                    # (H, W)
            
            # Choose axis for covariance (always use smaller dimension for speed)
            if H <= W:
                # Covariance over rows: (H, H) matrix
                cov = (centered @ centered.T) / max(1, W - 1)
                max_components = H
            else:
                # Covariance over cols: (W, W) matrix
                cov = (centered.T @ centered) / max(1, H - 1)
                max_components = W
            
            # CRITICAL: clamp n_components to matrix rank
            n_components = max(1, int(max_components * pca_components_ratio))
            n_components = min(n_components, max_components)
            
            try:
                # eigh is faster and numerically stable for symmetric matrices
                eigvals, eigvecs = np.linalg.eigh(cov)
            except np.linalg.LinAlgError:
                # Fallback: return channel unchanged
                compressed_channels.append(channel)
                continue
            
            # Sort descending and take top k
            idx = np.argsort(eigvals)[::-1]
            eigvecs = eigvecs[:, idx]
            components = eigvecs[:, :n_components]  # (D, k)
            
            # Project and reconstruct
            if H <= W:
                scores = components.T @ centered     # (k, W)
                reconstructed = components @ scores + mean  # (H, W)
            else:
                scores = centered @ components       # (H, k)
                reconstructed = (scores @ components.T) + mean  # (H, W)
            
            compressed_channels.append(np.clip(reconstructed, 0, 255))
        
        result_arr = np.stack(compressed_channels, axis=2).astype(np.uint8)
        
        # PSNR calculation
        orig_arr = np.array(img, dtype=np.float32)
        mse = float(np.mean((orig_arr - result_arr.astype(np.float32)) ** 2))
        psnr = (10 * np.log10(255**2 / mse)) if mse > 0 else 100.0
        
        result_img = Image.fromarray(result_arr, 'RGB')
        result_img.save(working_path, format='PNG')
        
        buf = io.BytesIO()
        result_img.save(buf, format='PNG')
        compressed_size = buf.tell()
        
        return {
            "psnr": round(psnr, 2),
            "original_size": original_size_bytes,
            "compressed_size": compressed_size,
            "ratio": round(original_size_bytes / max(1, compressed_size), 2)
        }
    
    try:
        stats = await asyncio.to_thread(_run_pca)
        return {"success": True, **stats}
    except MemoryError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"PCA failed: {type(e).__name__}: {e}"}

@router.post("/palette")
async def compress_palette(request: CompressPaletteRequest):
    """Compress image by reducing color palette using K-means clustering"""
    try:
        # Wrap blocking operations (FIX B9)
        def _blocking_palette():
            # Load working image
            image_path = get_working_image_path(request.session_id)
            image = Image.open(image_path).convert('RGB')
            
            # Convert to numpy array
            image_array = np.array(image)
            height, width = image_array.shape[:2]
            
            # Reshape to list of pixels
            pixels = image_array.reshape(-1, 3).astype(np.float32)
            
            # Apply K-means clustering
            n_colors = min(request.colors, len(np.unique(pixels, axis=0)))
            kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10)
            labels = kmeans.fit_predict(pixels)
            
            # Get cluster centers (palette colors)
            palette = kmeans.cluster_centers_.astype(np.uint8)
            
            # Map each pixel to its cluster center
            compressed_pixels = palette[labels]
            
            # Reshape back to image
            compressed_array = compressed_pixels.reshape(height, width, 3)
            
            # Convert back to image
            compressed_image = Image.fromarray(compressed_array)
            
            # Save result
            save_working_image(request.session_id, compressed_image)
            
            return n_colors, palette.tolist()
        
        n_colors, palette = await asyncio.to_thread(_blocking_palette)
        
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            "Palette Reduction",
            {"colors": request.colors}
        )
        
        return {
            "success": True,
            "message": f"Reduced to {n_colors} colors",
            "data": {
                "colors_used": n_colors,
                "palette": palette
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Palette reduction failed: {str(e)}")
