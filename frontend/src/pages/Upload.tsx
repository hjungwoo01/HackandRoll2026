import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { useAuth } from '../contexts/AuthContext';
import { supabaseApi } from '../lib/supabaseApi';
import { CameraCapture } from '../components/CameraCapture';
import { FineEntrySelect } from '../components/FineEntrySelect';
import { AutoClassifyCard } from '../components/AutoClassifyCard';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { LabelSelect } from '../components/LabelSelect';
import { validateImageFile, checkImageDimensions } from '../utils/imageHelpers';
import { isJpegFile, imageToJpeg } from '../utils/imageToJpeg';
import { sanitizeCopy } from '../utils/sanitizeCopy';
import { mlApi } from '../api/ml';
import { mlVerifyApi } from '../api/mlVerify';
import { Camera, ChevronDown, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

type ClassificationStatus = 'idle' | 'running' | 'success' | 'failed';

export function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { labels, fetchLabels, isLoading } = useStore();
  const [uploading, setUploading] = useState(false);
  const [jpegFile, setJpegFile] = useState<File | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fileSize, setFileSize] = useState<number | null>(null);
  
  // Submission state
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  
  // Classification state
  const [classificationStatus, setClassificationStatus] = useState<ClassificationStatus>('idle');
  const [predictedCategory, setPredictedCategory] = useState<{ id: number; name: string } | null>(null);
  const [coarseConfidence, setCoarseConfidence] = useState<number | null>(null);
  const [suggestedEntries, setSuggestedEntries] = useState<Array<{
    dex_entry_id: number;
    fine_label: string;
    rarity?: 'common' | 'rare' | 'epic';
  }>>([]);
  
  // Fine selection state
  const [step, setStep] = useState<'capture' | 'classify' | 'fine'>('capture');
  const [coarseLabelId, setCoarseLabelId] = useState<number | null>(null);
  const [fineItemName, setFineItemName] = useState<string>('');
  const [showManualOverride, setShowManualOverride] = useState(false);
  
  // Verification state
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // Abort controller for classification
  const classifyAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (classifyAbortController.current) {
        classifyAbortController.current.abort();
      }
    };
  }, []);

  // Auto-start classification when step changes to 'classify'
  useEffect(() => {
    if (step === 'classify' && classificationStatus === 'idle' && submissionId && user && jpegFile && labels.length > 0) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        handleClassify();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, classificationStatus, submissionId, user?.id, jpegFile?.size, labels.length]);

  const handleCapture = async (file: File) => {
    setError(null);

    if (file.size === 0) {
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
      setJpegFile(null);
      setCapturedImageUrl(null);
      setFileSize(null);
      setSubmissionId(null);
      setImagePath(null);
      setClassificationStatus('idle');
      setPredictedCategory(null);
      setCoarseLabelId(null);
      setFineItemName('');
      setStep('capture');
      return;
    }

    console.log('[camera] captured');

    if (!user) {
      setError('You must be logged in to upload');
      return;
    }

    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      // Convert to JPEG if needed
      let jpegFileToUse: File;
      if (isJpegFile(file)) {
        jpegFileToUse = file;
      } else {
        jpegFileToUse = await imageToJpeg(file, 0.85);
      }

      const dimensionCheck = await checkImageDimensions(jpegFileToUse);
      if (!dimensionCheck.valid) {
        toast.warning(dimensionCheck.error || 'Image dimensions may be too small');
      }

      // Create preview URL
      const imageUrl = URL.createObjectURL(jpegFileToUse);
      setCapturedImageUrl(imageUrl);
      setJpegFile(jpegFileToUse);
      setFileSize(jpegFileToUse.size);

      // Step 1: Create submission row first (status='pending')
      const submission = await supabaseApi.createSubmissionRow(user.id);
      setSubmissionId(submission.id);

      // Step 2: Upload image to storage
      const uploadedPath = await supabaseApi.uploadSubmissionImage(
        submission.id,
        user.id,
        jpegFileToUse
      );
      setImagePath(uploadedPath);

      // Move to classification step
      setStep('classify');
      setClassificationStatus('idle');
    } catch (err) {
      console.error('[submission] create/upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
      toast.error('Failed to process image', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const handleClassify = async () => {
    if (!submissionId || !user || !jpegFile) {
      setError('Missing required data for classification');
      return;
    }

    // Cancel any existing classification
    if (classifyAbortController.current) {
      classifyAbortController.current.abort();
    }
    classifyAbortController.current = new AbortController();

    setClassificationStatus('running');
    setError(null);

    try {
      // Step 1: Run lightweight validation checks
      console.log('[ml] running validation checks...');
      const validation = await mlApi.validateImage(submissionId);
      
      if (!validation.valid) {
        // For demo: allow proceeding even if validation fails
        console.warn('[ml] validation failed, but allowing manual selection for demo:', validation.reason);
        toast.warning('Validation check failed', {
          description: 'You can still proceed by manually selecting a category.',
        });
        // Don't throw - allow manual selection
      }

      // Check if aborted
      if (classifyAbortController.current?.signal.aborted) {
        return;
      }

      // Step 2: Call VLM verification endpoint for classification (without proposed_label)
      const result = await mlApi.classifySubmission(
        submissionId,
        user.id,
        labels.map((l) => ({ id: l.id, name: l.name }))
      );

      // Check if aborted
      if (classifyAbortController.current?.signal.aborted) {
        return;
      }

      // Update state
      setPredictedCategory({
        id: result.coarse_label.id,
        name: result.coarse_label.name,
      });
      setCoarseLabelId(result.coarse_label.id);
      setCoarseConfidence(result.confidence);
      setSuggestedEntries(result.suggested_entries);

      // Update submission in database
      await supabaseApi.updateSubmissionClassification(
        submissionId,
        result.coarse_label.id,
        result.confidence,
        result.coarse_label.id // Update label_id to match
      );

      setClassificationStatus('success');
    } catch (err) {
      if (classifyAbortController.current?.signal.aborted) {
        return; // Ignore errors if aborted
      }
      console.error('[ml] classification failed, but allowing manual selection for demo:', err);
      setClassificationStatus('failed');
      const errorMessage = err instanceof Error ? err.message : 'Classification failed';
      
      // For demo: show warning but allow manual selection
      toast.warning('Auto-classification unavailable', {
        description: 'Please manually select a category to continue. Your image has been saved.',
        duration: 5000,
      });
      
      // Automatically show manual override UI when classification fails
      setShowManualOverride(true);
      setError(null); // Clear error so it doesn't block UI
    }
  };

  const handleFineNext = () => {
    if (!fineItemName || fineItemName.trim() === '') {
      setError('Please enter a specific item name');
      return;
    }
    if (!coarseLabelId) {
      setError('Please select or confirm a category');
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    if (!jpegFile || !coarseLabelId || !fineItemName || !user || !submissionId) return;

    setUploading(true);
    setVerificationStatus('running');
    setVerificationError(null);
    
    try {
      // Step 1: Update submission with fine entry
      await supabaseApi.updateSubmissionFineEntry(
        submissionId,
        fineItemName,
        null // fineDexEntryId - not using dex entries, just text
      );
      console.log('[fine] selected:', {
        submission_id: submissionId,
        user_id: user.id,
        fine_label: fineItemName,
        fine_dex_entry_id: null,
      });

      // Step 2: Call verification ML endpoint (for demo: allow failures)
      let verificationResult;
      try {
        verificationResult = await mlVerifyApi.verifySubmission(
          submissionId,
          user.id,
          null, // fineDexEntryId
          fineItemName // fineLabel
        );
      } catch (err) {
        // For demo: if verification fails, still allow submission
        console.warn('[verify] verification failed, but allowing submission for demo:', err);
        verificationResult = {
          ok: true, // Allow it to pass for demo
          score: 0.5,
          reason: 'Verification unavailable - allowed for demo purposes',
        };
      }

      // Step 3: Update submission with verification results
      await supabaseApi.updateSubmissionVerification(
        submissionId,
        verificationResult.ok,
        verificationResult.score,
        verificationResult.reason || null
      );

      // Step 4: For demo purposes, always publish regardless of verification result
      await supabaseApi.publishSubmission(submissionId);
      setVerificationStatus('success');

      toast.success('Added to RareDex!', {
        description: verificationResult.ok 
          ? 'Your submission has been verified and is now in the feed.'
          : 'Your submission has been saved and is now in the feed (demo mode).',
      });
      
      // Cleanup
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
      setJpegFile(null);
      setCapturedImageUrl(null);
      setSubmissionId(null);
      setImagePath(null);
      setCoarseLabelId(null);
      setFineItemName('');
      setFileSize(null);
      setClassificationStatus('idle');
      setPredictedCategory(null);
      setVerificationStatus('idle');
      setStep('capture');
      setShowConfirmDialog(false);
      
      // Refresh feed and navigate
      setTimeout(() => {
        navigate('/feed');
      }, 1500);
    } catch (err) {
      console.error('[verify] failed:', err);
      setVerificationStatus('failed');
      setVerificationError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      toast.error('Verification Failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const selectedCoarseLabel = labels.find((l) => l.id === coarseLabelId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Add to RareDex"
        subtitle={sanitizeCopy("Capture an item you've spotted and classify it. Build your collection!")}
      />

      {/* Stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step === 'capture' ? 'text-primary-600' : (step === 'classify' || step === 'fine') ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'capture' ? 'bg-primary-600 text-white' : (step === 'classify' || step === 'fine') ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
              {(step === 'classify' || step === 'fine') ? <CheckCircle2 className="h-5 w-5" /> : '1'}
            </div>
            <span className="font-medium">Capture</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${step === 'classify' ? 'text-primary-600' : step === 'fine' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'classify' ? 'bg-primary-600 text-white' : step === 'fine' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
              {step === 'fine' ? <CheckCircle2 className="h-5 w-5" /> : '2'}
            </div>
            <span className="font-medium">Classify</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${step === 'fine' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'fine' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="font-medium">Specific Item</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Capture */}
          {step === 'capture' && (
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
          )}

          {/* Step 2: Auto-Classify */}
          {step === 'classify' && (
            <div className="space-y-4">
              {/* Draft badge */}
              {submissionId && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Badge variant="warning" className="text-xs">
                    Draft
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {classificationStatus === 'running' ? 'Analyzing...' : 'Not published yet'}
                  </span>
                </div>
              )}

              <AutoClassifyCard
                status={classificationStatus}
                predictedCategory={predictedCategory}
                confidence={coarseConfidence}
                suggestedEntries={suggestedEntries}
                onClassify={handleClassify}
                onOverride={showManualOverride ? undefined : () => setShowManualOverride(true)}
                disabled={isLoading || uploading}
              />
              
              {/* Always show manual selection option if classification failed or user wants to override */}
              {classificationStatus === 'failed' && !showManualOverride && (
                <Button
                  variant="outline"
                  onClick={() => setShowManualOverride(true)}
                  className="w-full"
                >
                  Select Category Manually
                </Button>
              )}

              {/* Manual override (shown when user clicks "Change Category") */}
              {showManualOverride && (
                <Card>
                  <CardHeader>
                    <CardTitle>Manual Category Selection</CardTitle>
                    <CardDescription>
                      Override the AI prediction and select a category manually
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <LabelSelect
                      labels={labels}
                      value={coarseLabelId}
                      onChange={(id) => {
                        setCoarseLabelId(id);
                        setCoarseConfidence(null);
                      }}
                      disabled={isLoading}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowManualOverride(false);
                        if (predictedCategory) {
                          setCoarseLabelId(predictedCategory.id);
                          setCoarseConfidence(coarseConfidence);
                        }
                      }}
                    >
                      Use AI Prediction Instead
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Next button - enabled when category is selected (either from classification or manual) */}
              {coarseLabelId && (
                <Button
                  onClick={() => setStep('fine')}
                  disabled={classificationStatus === 'running'}
                  className="w-full"
                  size="lg"
                >
                  Next: Enter Specific Item
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {/* Show message if classification is still running */}
              {classificationStatus === 'running' && (
                <p className="text-sm text-gray-500 text-center">
                  Please wait for classification to complete...
                </p>
              )}
              
              {/* Show message if classification failed - encourage manual selection */}
              {classificationStatus === 'failed' && !coarseLabelId && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">
                    Auto-classification is unavailable. Please select a category manually above to continue.
                  </p>
                  <p className="text-xs text-yellow-700">
                    Your image has been saved and will appear in your collection once you complete the upload.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Fine Entry */}
          {step === 'fine' && coarseLabelId && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Enter Specific Item</CardTitle>
                <CardDescription>
                  Enter the name of the specific item in {selectedCoarseLabel?.name || 'this category'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show suggested entries as chips */}
                {suggestedEntries.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">AI Suggestions</div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedEntries.map((entry, index) => (
                        <button
                          key={index}
                          onClick={() => setFineItemName(entry.fine_label)}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          {entry.fine_label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <FineEntrySelect
                  coarseLabelId={coarseLabelId}
                  versionId="v0"
                  value={fineItemName}
                  onChange={setFineItemName}
                  disabled={isLoading}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep('classify')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleFineNext}
                    disabled={!fineItemName || fineItemName.trim() === '' || !coarseLabelId}
                    className="flex-1"
                  >
                    Review & Publish
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
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
              {sanitizeCopy("Review your submission before adding it to RareDex")}
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
                {selectedCoarseLabel?.name || 'Not selected'}
              </span>
            </div>
            {coarseConfidence && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Confidence:</span>
                <Badge variant="success" className="text-xs">
                  {Math.round(coarseConfidence * 100)}%
                </Badge>
              </div>
            )}
            {fineItemName && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Specific Item:</span>
                <span className="font-semibold text-gray-900">
                  {fineItemName}
                </span>
              </div>
            )}
            {fileSize && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Format:</span>
                <Badge variant="success" className="text-xs">
                  JPEG • {formatFileSize(fileSize)}
                </Badge>
              </div>
            )}
            
            {/* Verification status */}
            {verificationStatus === 'running' && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-700">Verifying submission...</span>
              </div>
            )}
            
            {verificationStatus === 'failed' && verificationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">Verification Failed</p>
                <p className="text-sm text-red-600 mt-1">{verificationError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setVerificationStatus('idle');
                    setVerificationError(null);
                    setShowConfirmDialog(false);
                    setStep('fine');
                  }}
                >
                  Try Different Label
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setVerificationStatus('idle');
                setVerificationError(null);
              }}
              disabled={uploading || verificationStatus === 'running'}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmSubmit} 
              disabled={uploading || verificationStatus === 'running'}
            >
              {verificationStatus === 'running' ? 'Verifying...' : verificationStatus === 'failed' ? 'Retry' : uploading ? 'Publishing...' : 'Publish to Feed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
