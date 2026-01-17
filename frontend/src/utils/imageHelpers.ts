export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Please upload a JPEG, PNG, or WebP image' };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 10MB' };
  }

  return { valid: true };
}

export function checkImageDimensions(file: File): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const minWidth = 200;
      const minHeight = 200;
      
      if (img.width < minWidth || img.height < minHeight) {
        resolve({
          valid: false,
          error: `Image must be at least ${minWidth}x${minHeight} pixels`,
          width: img.width,
          height: img.height,
        });
      } else {
        resolve({ valid: true, width: img.width, height: img.height });
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: 'Failed to load image' });
    };
    
    img.src = url;
  });
}
