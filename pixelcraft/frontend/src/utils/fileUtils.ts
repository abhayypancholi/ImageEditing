export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export const isValidImageExtension = (filename: string): boolean => {
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(ext);
};

export const getFileExtension = (filename: string): string => {
  return filename.substring(filename.lastIndexOf('.') + 1).toUpperCase();
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check extension
  if (!isValidImageExtension(file.name)) {
    return {
      valid: false,
      error: 'Invalid file type. Supported formats: PNG, JPEG, WebP, BMP, TIFF',
    };
  }

  // Check size (50MB max)
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is 50MB (file is ${formatFileSize(file.size)})`,
    };
  }

  return { valid: true };
};
