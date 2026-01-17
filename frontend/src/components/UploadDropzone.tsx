import { useRef, useState, DragEvent } from 'react';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function UploadDropzone({ onFileSelect, selectedFile, disabled }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : selectedFile
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
      {selectedFile ? (
        <div className="space-y-2">
          <div className="text-4xl">✓</div>
          <div className="font-medium text-green-700">{selectedFile.name}</div>
          <div className="text-sm text-gray-500">Click to change</div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-4xl">📷</div>
          <div className="font-medium text-gray-700">
            {isDragging ? 'Drop image here' : 'Drag & drop or click to upload'}
          </div>
          <div className="text-sm text-gray-500">JPEG, PNG, or WebP (max 10MB)</div>
        </div>
      )}
    </div>
  );
}
