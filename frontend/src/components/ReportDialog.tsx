import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { ReportReason } from '../api/types';
import { AlertTriangle } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: ReportReason, details?: string) => void;
  itemLabel: string;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'incorrect_label',
    label: 'Incorrect label',
    description: 'The item is mislabeled',
  },
  {
    value: 'spam',
    label: 'Spam',
    description: 'This appears to be spam or irrelevant content',
  },
  {
    value: 'low_quality',
    label: 'Low quality photo',
    description: 'The image is too blurry or unclear',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Something else (please specify)',
  },
];

export function ReportDialog({ open, onOpenChange, onSubmit, itemLabel }: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!selectedReason) return;
    if (selectedReason === 'other' && !details.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(selectedReason, selectedReason === 'other' ? details : undefined);
      setSelectedReason(null);
      setDetails('');
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Report submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Report Post
          </DialogTitle>
          <DialogDescription>
            Help keep RareDex clean by reporting content that violates our guidelines. This post
            claims to be: <span className="font-semibold">{itemLabel}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label className="text-base font-semibold mb-3 block">Reason for reporting</Label>
          <RadioGroup 
            value={selectedReason || ''} 
            onValueChange={(v: string) => {
              if (!isSubmitting) {
                setSelectedReason(v as ReportReason);
              }
            }}
          >
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.value;
              return (
                <div 
                  key={reason.value} 
                  className="flex items-start space-x-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                  onClick={() => {
                    if (!isSubmitting) {
                      setSelectedReason(reason.value as ReportReason);
                    }
                  }}
                >
                  <RadioGroupItem 
                    value={reason.value} 
                    id={reason.value} 
                    className="mt-1 flex-shrink-0"
                    disabled={isSubmitting}
                    checked={isSelected}
                    onCheckedChange={() => {
                      if (!isSubmitting) {
                        setSelectedReason(reason.value as ReportReason);
                      }
                    }}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={reason.value}
                      className="text-sm font-medium leading-none cursor-pointer block"
                    >
                      {reason.label}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">{reason.description}</p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
          {selectedReason === 'other' && (
            <div className="mt-4">
              <Label htmlFor="details">Please provide details</Label>
              <Textarea
                id="details"
                placeholder="Tell us more about the issue..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="mt-2"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason || (selectedReason === 'other' && !details.trim())}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
