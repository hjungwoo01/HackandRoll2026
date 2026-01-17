import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { CameraCapture } from '../components/CameraCapture';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { LabelSelect } from '../components/LabelSelect';
import { validateImageFile, checkImageDimensions } from '../utils/imageHelpers';
import { imageToJpeg, isJpegFile } from '../utils/imageToJpeg';
import { Camera, Sparkles, ChevronDown, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function Upload() {
  const navigate = useNavigate();
  const { labels, submitImage, isLoading } = useStore();
  const [jpegFile, setJpegFile] = useState<File | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsConverting(true);

    try {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        setIsConverting(false);
        return;
      }

      // Convert to JPEG
      const convertedFile = await imageToJpeg(file);
      
      // Validate it's actually JPEG
      if (!isJpegFile(convertedFile)) {
        throw new Error('Failed to convert image to JPEG');
      }

      const dimensionCheck = await checkImageDimensions(convertedFile);
      if (!dimensionCheck.valid) {
        toast.warning(dimensionCheck.error || 'Image dimensions may be too small');
      }

      const imageUrl = URL.createObjectURL(convertedFile);
      setCapturedImageUrl(imageUrl);
      setJpegFile(convertedFile); // Use JPEG for submission
      setFileSize(convertedFile.size);
      setIsConverting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
      setIsConverting(false);
    }
  };

  const handleCapture = async (file: File) => {
    setError(null);

    if (file.size === 0) {
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
      setJpegFile(null);
      setCapturedImageUrl(null);
      setFileSize(null);
      return;
    }

    // Camera already outputs JPEG, but validate
    if (!isJpegFile(file)) {
      setError('Camera capture must output JPEG format');
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    const dimensionCheck = await checkImageDimensions(file);
    if (!dimensionCheck.valid) {
      toast.warning(dimensionCheck.error || 'Image dimensions may be too small');
    }

    const imageUrl = URL.createObjectURL(file);
    setCapturedImageUrl(imageUrl);
    setJpegFile(file);
    setFileSize(file.size);
  };

  const handleSubmit = async () => {
    if (!jpegFile) {
      setError('Please capture or select a photo first');
      return;
    }

    if (!selectedLabelId) {
      setError('Please select a category');
      return;
    }

    // Final validation - must be JPEG
    if (!isJpegFile(jpegFile)) {
      toast.error('Image must be in JPEG format');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    if (!jpegFile || !selectedLabelId) return;

    try {
      await submitImage(jpegFile, selectedLabelId);
      toast.success('Added to RareDex!', {
        description: 'Your submission is now in the verification queue.',
      });
      
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
      setJpegFile(null);
      setCapturedImageUrl(null);
      setSelectedLabelId(null);
      setFileSize(null);
      setShowConfirmDialog(false);
      
      setTimeout(() => {
        navigate('/collection');
      }, 1500);
    } catch (err) {
      toast.error('Failed to submit', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const selectedLabel = labels.find((l) => l.id === selectedLabelId);
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Add to RareDex"
        subtitle="Capture a rare item and propose its category. The community will verify it."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary-600" />
                Take Photo
              </CardTitle>
              <CardDescription>
                Use your camera or choose from library (all images converted to JPEG)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CameraCapture
                onCapture={handleCapture}
                capturedImage={capturedImageUrl}
                disabled={isLoading || isConverting}
              />
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isConverting}
                  className="w-full"
                >
                  <FileImage className="h-4 w-4 mr-2" />
                  Choose from Library
                </Button>
              </div>

              {isConverting && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-2"></div>
                  <p className="text-sm text-gray-600">Converting to JPEG...</p>
                </div>
              )}

              {jpegFile && fileSize && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Badge variant="success" className="text-xs">
                    JPEG Optimized
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {formatFileSize(fileSize)}
                  </span>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
              <CardDescription>
                What type of rare item is this?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LabelSelect
                labels={labels}
                value={selectedLabelId}
                onChange={setSelectedLabelId}
                disabled={isLoading}
              />
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !jpegFile || !selectedLabelId || isConverting}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              'Adding to RareDex...'
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Add to RareDex
              </>
            )}
          </Button>
        </div>

        {/* Tips Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips for Great Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => setShowTips(!showTips)}
                className="flex items-center justify-between w-full text-left"
              >
                <span className="text-sm text-gray-600">
                  {showTips ? 'Hide tips' : 'Show tips'}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    showTips ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showTips && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-3 text-sm text-gray-600"
                >
                  <div className="flex gap-2">
                    <span className="font-medium">✓</span>
                    <span>Use good lighting</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium">✓</span>
                    <span>Keep the item centered</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium">✓</span>
                    <span>Capture unique details</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium">✓</span>
                    <span>Ensure the image is in focus</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Review your submission before adding it to RareDex
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {capturedImageUrl && (
              <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={capturedImageUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Category:</span>
              <span className="font-semibold text-gray-900">
                {selectedLabel?.name || 'Not selected'}
              </span>
            </div>
            {fileSize && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Format:</span>
                <Badge variant="success" className="text-xs">
                  JPEG • {formatFileSize(fileSize)}
                </Badge>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmSubmit} disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Confirm & Add to RareDex'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
