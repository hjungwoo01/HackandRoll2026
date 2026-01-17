/**
 * Converts any image file to JPEG format
 * - Resizes to max 1600px on longer side
 * - Fills transparent backgrounds with white
 * - Outputs JPEG with 0.85 quality
 * - Preserves aspect ratio
 */

export async function imageToJpeg(file: File, quality: number = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions (max 1600px on longer side)
      const maxDimension = 1600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Fill white background (handles transparency)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image to JPEG'));
            return;
          }

          // Create new File with JPEG extension
          const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const jpegFile = new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(jpegFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Validates that a file is a JPEG image
 */
export function isJpegFile(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/jpg';
}
