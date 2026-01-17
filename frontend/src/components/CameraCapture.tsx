import { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Camera, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  capturedImage: string | null;
  disabled?: boolean;
}

export function CameraCapture({ onCapture, capturedImage, disabled }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    // Cleanup stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setError(null);
    setIsInitializing(true);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsInitializing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access camera. Please ensure you have granted camera permissions.'
      );
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert canvas to blob, then to File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          onCapture(file);
          stopCamera();
        }
      },
      'image/jpeg',
      0.85
    );
  };

  const retakePhoto = async () => {
    // Stop any existing stream first
    stopCamera();
    // Clear captured image
    onCapture(new File([], '')); 
    // Small delay to ensure state updates before restarting camera
    await new Promise((resolve) => setTimeout(resolve, 100));
    await startCamera();
  };

  // Auto-start camera when component mounts (if not disabled and no captured image)
  useEffect(() => {
    if (!disabled && !capturedImage && !stream && !isInitializing) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={capturedImage}
            alt="Captured photo"
            className="w-full h-full object-contain"
          />
        </div>
        <button
          onClick={retakePhoto}
          disabled={disabled}
          className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Retake Photo
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div>
              <div className="font-medium text-red-700 mb-2">Camera Access Required</div>
              <div className="text-sm text-red-600 mb-4">{error}</div>
            </div>
            <Button
              onClick={startCamera}
              disabled={disabled || isInitializing}
            >
              {isInitializing ? 'Initializing...' : 'Enable Camera'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stream && !isInitializing) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary-100">
                <Camera className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-2">Camera Required</div>
              <div className="text-sm text-gray-500 mb-4">
                You must take a photo using your device camera
              </div>
            </div>
            <Button
              onClick={startCamera}
              disabled={disabled || isInitializing}
            >
              {isInitializing ? 'Starting Camera...' : 'Open Camera'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {isInitializing ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
              <div className="text-sm">Starting camera...</div>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {stream && !isInitializing && (
        <Button
          onClick={capturePhoto}
          disabled={disabled}
          className="w-full"
          size="lg"
        >
          <Camera className="h-5 w-5 mr-2" />
          Capture Photo
        </Button>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
