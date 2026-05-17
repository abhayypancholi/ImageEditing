import React, { useState, useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { validateImageFile } from '../../utils/fileUtils';
import { uploadImage, getSessionImage } from '../../api/endpoints/upload';
import { useImageStore } from '../../store/imageStore';
import toast from 'react-hot-toast';

export const UploadZone: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { initSession, setProcessing } = useImageStore();

  const handleFile = async (file: File) => {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    try {
      setProcessing(true, 'Uploading...');

      // Upload file
      const response = await uploadImage(file);

      if (response.success && response.data) {
        const { sessionId, metadata } = response.data;

        // Fetch the image as base64
        const imageBase64 = await getSessionImage(sessionId);

        // Initialize session
        initSession(
          {
            sessionId,
            originalPath: '',
            workingPath: '',
            metadata,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          },
          imageBase64
        );

        toast.success(
          `Image loaded: ${metadata.fileName} (${metadata.width}×${metadata.height})`
        );
      } else {
        toast.error(response.error || 'Upload failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast.error(message);
      console.error('Upload error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          w-full max-w-2xl h-96 
          border-2 border-dashed rounded-[var(--radius-lg)]
          flex flex-col items-center justify-center
          cursor-pointer transition-all duration-200
          ${
            isDragOver
              ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
              : 'border-[var(--border)] bg-[var(--bg-panel)]'
          }
          hover:border-[var(--accent)] hover:bg-[var(--accent-glow)]
        `}
      >
        <div
          className={`
            w-20 h-20 rounded-full flex items-center justify-center mb-4
            transition-all duration-200
            ${isDragOver ? 'bg-[var(--accent)] scale-110' : 'bg-[var(--bg-card)]'}
          `}
        >
          <ImagePlus
            size={48}
            className={isDragOver ? 'text-white' : 'text-[var(--accent)]'}
          />
        </div>

        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-2">
          Drop an image here
        </h3>
        <p className="text-sm text-[var(--text-2)] mb-1">or click to browse</p>
        <p className="text-xs text-[var(--text-3)]">
          Supports PNG, JPEG, WebP, BMP, TIFF · Max 50MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </div>
  );
};
