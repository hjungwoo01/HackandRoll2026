import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { UploadDropzone } from '../components/UploadDropzone';
import { LabelSelect } from '../components/LabelSelect';
import { Card } from '../components/Card';
import { Toast } from '../components/Toast';
import { validateImageFile, checkImageDimensions } from '../utils/imageHelpers';

export function Upload() {
  const navigate = useNavigate();
  const { labels, submitImage, isLoading } = useStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [imageWarning, setImageWarning] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setImageWarning(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    const dimensionCheck = await checkImageDimensions(file);
    if (!dimensionCheck.valid) {
      setImageWarning(dimensionCheck.error || 'Image dimensions too small');
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    if (!selectedLabelId) {
      setError('Please select a category');
      return;
    }

    try {
      await submitImage(selectedFile, selectedLabelId);
      setShowToast(true);
      setSelectedFile(null);
      setSelectedLabelId(null);
      setTimeout(() => {
        navigate('/collection');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Upload Rare Item</h1>

      <Card className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image
          </label>
          <UploadDropzone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            disabled={isLoading}
          />
          {imageWarning && (
            <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              ⚠️ {imageWarning}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <LabelSelect
            labels={labels}
            value={selectedLabelId}
            onChange={setSelectedLabelId}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading || !selectedFile || !selectedLabelId}
          className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Submitting...' : 'Submit for Verification'}
        </button>
      </Card>

      {showToast && (
        <Toast
          message="Submitted to verification queue!"
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
