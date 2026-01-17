import { useState } from 'react';
import { Label } from '../api/types';
import { Search, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { cn } from '../lib/utils';

interface LabelSelectProps {
  labels: Label[];
  value: number | null;
  onChange: (labelId: number) => void;
  disabled?: boolean;
}

export function LabelSelect({ labels, value, onChange, disabled }: LabelSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = labels.find((l) => l.id === value);
  const filteredLabels = labels.filter((label) =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Button
        variant="outline"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className="w-full justify-between h-11"
      >
        <span className={cn(value ? 'text-gray-900' : 'text-gray-500')}>
          {selectedLabel ? selectedLabel.name : 'Select a category...'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Category</DialogTitle>
            <DialogDescription>
              Choose the category that best describes this item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredLabels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No categories found
                </div>
              ) : (
                filteredLabels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => {
                      onChange(label.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg transition-colors",
                      value === label.id
                        ? "bg-primary-100 text-primary-900 font-medium"
                        : "hover:bg-gray-100 text-gray-900"
                    )}
                  >
                    {label.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
