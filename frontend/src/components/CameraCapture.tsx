import { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Camera, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  capturedImage: string | null;
  disabled?: boolean;
}

interface CameraError {
  name: string;
  message: string;
  userMessage: string;
  actionable: string;
}

interface DebugInfo {
  isSecureContext: boolean;
  inIframe: boolean;
  userAgent: string;
  streamExists: boolean;
  streamId?: string;
  trackReadyState?: string;
  trackEnabled?: boolean;
  videoWidth: number;
  videoHeight: number;
  videoClientWidth: number;
  videoClientHeight: number;
  videoPaused: boolean;
  videoReadyState: number;
  hasSrcObject: boolean;
}

// Utility to stop stream tracks
function stopStream(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
      console.log('Stopped track:', track.kind, track.label);
    });
  }
}

// Map error names to friendly messages
function getCameraError(err: any): CameraError {
  const errorName = err?.name || 'UnknownError';
  const errorMessage = err?.message || 'Unknown error occurred';

  const errorMap: Record<string, Omit<CameraError, 'name' | 'message'>> = {
    NotAllowedError: {
      userMessage: 'Camera permission denied',
      actionable: 'Enable camera access in your browser settings. Look for a camera icon in the address bar, or go to Settings > Privacy > Camera.',
    },
    PermissionDeniedError: {
      userMessage: 'Camera permission denied',
      actionable: 'Enable camera access in your browser settings. Look for a camera icon in the address bar, or go to Settings > Privacy > Camera.',
    },
    NotFoundError: {
      userMessage: 'No camera device found',
      actionable: 'Please connect a camera device and try again.',
    },
    DevicesNotFoundError: {
      userMessage: 'No camera device found',
      actionable: 'Please connect a camera device and try again.',
    },
    NotReadableError: {
      userMessage: 'Camera is already in use',
      actionable: 'Close other applications using the camera (video calls, other browser tabs) and try again.',
    },
    TrackStartError: {
      userMessage: 'Camera is already in use',
      actionable: 'Close other applications using the camera (video calls, other browser tabs) and try again.',
    },
    OverconstrainedError: {
      userMessage: 'Camera constraints not supported',
      actionable: 'Trying fallback settings...',
    },
    ConstraintNotSatisfiedError: {
      userMessage: 'Camera constraints not supported',
      actionable: 'Trying fallback settings...',
    },
    SecurityError: {
      userMessage: 'Camera requires HTTPS',
      actionable: 'Open the https:// URL (not http://). Camera access is only available on secure connections.',
    },
  };

  const mapped = errorMap[errorName] || {
    userMessage: 'Failed to access camera',
    actionable: 'Please ensure you have granted camera permissions and try again.',
  };

  return {
    name: errorName,
    message: errorMessage,
    ...mapped,
  };
}

// Constraint fallback ladder
const CONSTRAINT_FALLBACKS = [
  { video: { facingMode: { ideal: 'environment' } }, audio: false },
  { video: { facingMode: { ideal: 'user' } }, audio: false },
  { video: true, audio: false },
];

export function CameraCapture({ onCapture, capturedImage, disabled }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [constraintIndex, setConstraintIndex] = useState(0);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // Check for debug mode
  const isDebugMode = typeof window !== 'undefined' && 
    window.location.search.includes('debugCamera=1');

  // Check secure context and iframe on mount
  useEffect(() => {
    const checkEnvironment = () => {
      const info = {
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        href: window.location.href,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia),
        userAgent: navigator.userAgent,
        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
        inIframe: window.self !== window.top,
      };

      // Log debug info to console only
      console.log('Camera environment check:', info);

      // Block if not secure context
      if (!window.isSecureContext) {
        setError({
          name: 'SecurityError',
          message: 'Not a secure context',
          userMessage: 'Camera requires HTTPS',
          actionable: 'Open the https:// URL (not http://).',
        });
        return;
      }

      // Block if in iframe
      if (info.inIframe) {
        setError({
          name: 'SecurityError',
          message: 'Camera blocked in iframe',
          userMessage: 'Camera won\'t work inside embedded views',
          actionable: 'Open in a new tab to use the camera.',
        });
        return;
      }

      // Check API availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError({
          name: 'NotFoundError',
          message: 'MediaDevices API not available',
          userMessage: 'Camera API not available',
          actionable: 'Please use a modern browser with camera support (Chrome, Safari, Firefox).',
        });
        return;
      }
    };

    checkEnvironment();
  }, []);

  // CRITICAL: Always attach srcObject and play when stream changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) {
      // Cleanup: clear srcObject if no stream
      if (video && video.srcObject) {
        video.srcObject = null;
      }
      return;
    }

    console.log('[camera] Attaching stream to video element', {
      streamId: stream.id,
      videoTracks: stream.getVideoTracks().length,
    });

    // Always set srcObject
    video.srcObject = stream;

    // Always attempt to play
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[camera] Video playing successfully');
          
          // Log diagnostic info after successful play
          const videoTrack = stream.getVideoTracks()[0];
          console.log('[camera]', {
            streamId: stream.id,
            trackState: videoTrack?.readyState,
            trackEnabled: videoTrack?.enabled,
            videoW: video.videoWidth,
            videoH: video.videoHeight,
            clientW: video.clientWidth,
            clientH: video.clientHeight,
            paused: video.paused,
            readyState: video.readyState,
            hasSrcObject: !!video.srcObject,
          });
        })
        .catch((playErr) => {
          console.warn('[camera] Autoplay blocked, user interaction may be required:', playErr);
        });
    }

    // Update debug info
    const updateDebugInfo = () => {
      const videoTrack = stream.getVideoTracks()[0];
      setDebugInfo({
        isSecureContext: window.isSecureContext,
        inIframe: window.self !== window.top,
        userAgent: navigator.userAgent,
        streamExists: !!stream,
        streamId: stream.id,
        trackReadyState: videoTrack?.readyState,
        trackEnabled: videoTrack?.enabled,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        videoClientWidth: video.clientWidth,
        videoClientHeight: video.clientHeight,
        videoPaused: video.paused,
        videoReadyState: video.readyState,
        hasSrcObject: !!video.srcObject,
      });
    };

    // Update debug info on various events
    const events = ['loadedmetadata', 'loadeddata', 'canplay', 'playing', 'resize'];
    events.forEach((event) => {
      video.addEventListener(event, updateDebugInfo);
    });

    // Initial update
    updateDebugInfo();

    // Cleanup
    return () => {
      events.forEach((event) => {
        video.removeEventListener(event, updateDebugInfo);
      });
    };
  }, [stream, isDebugMode]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  // Start camera with constraint fallback
  const startCamera = async (constraintIdx: number = 0) => {
    setError(null);
    setIsInitializing(true);
    setConstraintIndex(constraintIdx);

    // Stop any existing stream first
    const oldStream = stream;
    stopStream(oldStream);
    setStream(null);

    // Small delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const constraints = CONSTRAINT_FALLBACKS[constraintIdx];
      console.log(`[camera] Attempting camera with constraint ${constraintIdx}:`, constraints);

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('[camera] Camera stream obtained:', {
        streamId: mediaStream.id,
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        videoTrackSettings: mediaStream.getVideoTracks()[0]?.getSettings(),
      });

      setStream(mediaStream);
      setIsInitializing(false);
    } catch (err: any) {
      console.error('[camera] Camera error:', err);
      
      const cameraError = getCameraError(err);
      
      // Handle OverconstrainedError with fallback
      if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        const nextIndex = constraintIdx + 1;
        if (nextIndex < CONSTRAINT_FALLBACKS.length) {
          console.log(`[camera] Retrying with fallback constraint ${nextIndex}...`);
          setIsInitializing(false);
          // Retry with next constraint
          setTimeout(() => startCamera(nextIndex), 100);
          return;
        }
      }

      setError(cameraError);
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    stopStream(stream);
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      setError({
        name: 'UnknownError',
        message: 'Canvas context not available',
        userMessage: 'Failed to capture photo',
        actionable: 'Please try again.',
      });
      return;
    }

    try {
      // Set canvas to video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (videoWidth === 0 || videoHeight === 0) {
        throw new Error('Video not ready');
      }

      // Scale to max 1600px on long edge
      const maxDimension = 1600;
      let width = videoWidth;
      let height = videoHeight;

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

      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, width, height);

      // Convert to JPEG blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85);
      });

      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      const file = new File([blob], `photo-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      onCapture(file);
      stopCamera();
    } catch (err: any) {
      console.error('[camera] Capture error:', err);
      setError({
        name: 'CaptureError',
        message: err.message || 'Failed to capture photo',
        userMessage: 'Failed to capture photo',
        actionable: 'Please try again.',
      });
    }
  };

  const retakePhoto = async () => {
    stopCamera();
    onCapture(new File([], ''));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await startCamera(0);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('Link copied to clipboard');
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = window.location.href;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Link copied to clipboard');
    });
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  // Show captured image
  if (capturedImage) {
    return (
      <div className="space-y-4">
        <div 
          className="relative w-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            maxHeight: 'calc(100vh - 300px)',
            minHeight: '250px',
          }}
        >
          <img
            src={capturedImage}
            alt="Captured photo"
            className="w-full h-auto"
            style={{
              objectFit: 'contain',
              maxHeight: 'calc(100vh - 300px)',
              maxWidth: '100%',
            }}
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

  // Show error state
  if (error) {
    const isSecurityError = error.name === 'SecurityError';
    const isIframeError = window.self !== window.top;
    const isHttpsError = error.userMessage.includes('HTTPS');

    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div>
            <div className="font-medium text-red-700 mb-2">{error.userMessage}</div>
            <div className="text-sm text-red-600 mb-4">{error.actionable}</div>
            
            {isHttpsError && (
              <div className="text-xs text-gray-500 mt-2 p-3 bg-gray-50 rounded space-y-2">
                <div><strong>Current URL:</strong> {window.location.href}</div>
                <Button
                  onClick={copyLink}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            )}

            {isIframeError && (
              <Button
                onClick={openInNewTab}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            )}
          </div>
          <Button
            onClick={() => startCamera(0)}
            disabled={disabled || isInitializing || isSecurityError}
          >
            {isInitializing ? 'Initializing...' : 'Try Again'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ALWAYS render video element - never conditionally unmount it
  return (
    <div className="space-y-4">
      {/* Fixed aspect-ratio container - prevents 0-height */}
      <div className="w-full max-w-xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden relative">
        {/* Video element - always rendered */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          disablePictureInPicture
          className="w-full h-full object-cover"
          style={{
            minHeight: '250px',
          }}
          onClick={async (e) => {
            // Allow user to tap to play if autoplay was blocked
            const video = e.currentTarget;
            if (video.paused && video.srcObject) {
              try {
                await video.play();
                console.log('[camera] Video started via user interaction');
              } catch (err) {
                console.error('[camera] Manual play failed:', err);
              }
            }
          }}
        />
        
        {/* Overlay UI - shown conditionally but video stays mounted */}
        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
            <div className="text-center text-white">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
              <div className="text-sm">Starting camera...</div>
            </div>
          </div>
        )}

        {!stream && !isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-center text-white p-4">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">Camera Ready</div>
              <div className="text-sm opacity-75 mb-4">
                Click below to start your camera
              </div>
              <Button
                onClick={() => startCamera(0)}
                disabled={disabled || isInitializing}
                size="lg"
              >
                Start Camera
              </Button>
            </div>
          </div>
        )}

        {/* Debug panel overlay */}
        {isDebugMode && debugInfo && (
          <div className="absolute top-2 left-2 right-2 bg-black bg-opacity-90 text-white text-xs p-3 rounded z-10 max-h-64 overflow-y-auto">
            <div className="font-bold mb-2">Camera Debug Info</div>
            <div className="space-y-1">
              <div>Secure Context: {debugInfo.isSecureContext ? '✓' : '✗'}</div>
              <div>In Iframe: {debugInfo.inIframe ? '✗' : '✓'}</div>
              <div>Stream Exists: {debugInfo.streamExists ? '✓' : '✗'}</div>
              {debugInfo.streamId && <div>Stream ID: {debugInfo.streamId.slice(0, 8)}...</div>}
              {debugInfo.trackReadyState && <div>Track State: {debugInfo.trackReadyState}</div>}
              {debugInfo.trackEnabled !== undefined && <div>Track Enabled: {debugInfo.trackEnabled ? '✓' : '✗'}</div>}
              <div>Video Size: {debugInfo.videoWidth} × {debugInfo.videoHeight}</div>
              <div>Client Size: {debugInfo.videoClientWidth} × {debugInfo.videoClientHeight}</div>
              {debugInfo.videoClientHeight === 0 && (
                <div className="text-yellow-400 font-bold">⚠️ WARNING: Preview height is 0!</div>
              )}
              <div>Paused: {debugInfo.videoPaused ? 'Yes' : 'No'}</div>
              <div>Ready State: {debugInfo.videoReadyState} ({['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][debugInfo.videoReadyState] || 'UNKNOWN'})</div>
              <div>Has srcObject: {debugInfo.hasSrcObject ? '✓' : '✗'}</div>
              <div className="text-xs opacity-75 mt-2">User Agent: {debugInfo.userAgent}</div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
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
