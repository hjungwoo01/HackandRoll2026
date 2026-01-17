import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { useAuth } from '../contexts/AuthContext';
import { supabaseApi } from '../lib/supabaseApi';
import { CameraCapture } from '../components/CameraCapture';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { LabelSelect } from '../components/LabelSelect';
import { validateImageFile, checkImageDimensions } from '../utils/imageHelpers';
import { isJpegFile } from '../utils/imageToJpeg';
import { Camera, Sparkles, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { labels, fetchLabels, isLoading } = useStore();
  const [uploading, setUploading] = useState(false);
  const [jpegFile, setJpegFile] = useState<File | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fileSize, setFileSize] = useState<number | null>(null);

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

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const confirmSubmit = async () => {
    if (!jpegFile || !selectedLabelId || !user) return;

    setUploading(true);
    try {
      await supabaseApi.createSubmission(user.id, jpegFile, selectedLabelId);
      toast.success('Added to RareDex!', {
        description: 'Your submission is now in the feed.',
      });
      
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
      setJpegFile(null);
      setCapturedImageUrl(null);
      setSelectedLabelId(null);
      setFileSize(null);
      setShowConfirmDialog(false);
      
      // Refresh feed and navigate
      setTimeout(() => {
        navigate('/feed');
      }, 1500);
    } catch (err) {
      toast.error('Failed to submit', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setUploading(false);
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
                Take a photo with your camera to add to RareDex
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CameraCapture
                onCapture={handleCapture}
                capturedImage={capturedImageUrl}
                disabled={isLoading}
              />

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
            disabled={isLoading || !jpegFile || !selectedLabelId}
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
            <Button onClick={confirmSubmit} disabled={uploading}>
              {isLoading ? 'Submitting...' : 'Confirm & Add to RareDex'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
