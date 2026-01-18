import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface FineEntrySelectProps {
  coarseLabelId: number | null;
  versionId?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// Helper function to capitalize first letter (preserve rest of string)
function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function FineEntrySelect({
  coarseLabelId,
  versionId = 'v0',
  value,
  onChange,
  disabled,
}: FineEntrySelectProps) {
  const [inputValue, setInputValue] = useState(() => {
    // Safely initialize with value or empty string
    try {
      return value || '';
    } catch {
      return '';
    }
  });

  // Update local state when value prop changes
  useEffect(() => {
    try {
      setInputValue(value || '');
    } catch (error) {
      console.error('Error updating input value:', error);
      setInputValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newValue = e.target.value || '';
      setInputValue(newValue);
      onChange(newValue);
    } catch (error) {
      console.error('Error handling input change:', error);
    }
  };

  const handleBlur = () => {
    // On blur, ensure first letter is capitalized
    if (inputValue.length > 0 && inputValue.charAt(0) !== inputValue.charAt(0).toUpperCase()) {
      const formatted = capitalizeFirstLetter(inputValue.trim());
      setInputValue(formatted);
      onChange(formatted);
    } else if (inputValue.length > 0) {
      // Trim whitespace
      const trimmed = inputValue.trim();
      if (trimmed !== inputValue) {
        setInputValue(trimmed);
        onChange(trimmed);
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="fine-entry-input">Specific Item Name</Label>
      <Input
        id="fine-entry-input"
        type="text"
        placeholder="Enter the specific item name (e.g., Vintage Camera)"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-full"
        autoFocus
      />
      <p className="text-xs text-gray-500">
        The first letter will be automatically capitalized.
      </p>
    </div>
  );
}
