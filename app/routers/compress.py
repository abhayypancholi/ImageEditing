from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
import numpy as np
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
import io

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
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            "JPEG Compression",
            {"quality": request.quality}
        )
        
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
    """Compress image using PCA (Principal Component Analysis)"""
    try:
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            "PCA Compression",
            {"components": request.components}
        )
        
        # Load working image
        image_path = get_working_image_path(request.session_id)
        image = Image.open(image_path).convert('RGB')
        
        # Convert to numpy array
        image_array = np.array(image)
        height, width = image_array.shape[:2]
        
        # Reshape for PCA (flatten spatial dimensions)
        reshaped = image_array.reshape(-1, 3)
        
        # Apply PCA to each channel separately for better results
        compressed_channels = []
        
        for channel_idx in range(3):
            channel_data = image_array[:, :, channel_idx].astype(np.float32)
            
            # Apply PCA
            n_components = min(request.components, min(height, width))
            pca = PCA(n_components=n_components)
            
            # Transform
            transformed = pca.fit_transform(channel_data)
            
            # Inverse transform
            reconstructed = pca.inverse_transform(transformed)
            
            # Clip to valid range
            reconstructed = np.clip(reconstructed, 0, 255).astype(np.uint8)
            compressed_channels.append(reconstructed)
        
        # Stack channels
        compressed_array = np.stack(compressed_channels, axis=-1)
        
        # Convert back to image
        compressed_image = Image.fromarray(compressed_array)
        
        # Save result
        save_working_image(request.session_id, compressed_image)
        
        return {
            "success": True,
            "message": f"Compressed using PCA with {request.components} components"
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PCA compression failed: {str(e)}")

@router.post("/palette")
async def compress_palette(request: CompressPaletteRequest):
    """Compress image by reducing color palette using K-means clustering"""
    try:
        # Save history snapshot
        await save_history_snapshot(
            request.session_id,
            "Palette Reduction",
            {"colors": request.colors}
        )
        
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
        
        return {
            "success": True,
            "message": f"Reduced to {n_colors} colors",
            "data": {
                "colors_used": n_colors,
                "palette": palette.tolist()
            }
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Palette reduction failed: {str(e)}")
