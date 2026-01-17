import { Label } from '../api/types';

interface LabelSelectProps {
  labels: Label[];
  value: number | null;
  onChange: (labelId: number) => void;
  disabled?: boolean;
}

export function LabelSelect({ labels, value, onChange, disabled }: LabelSelectProps) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">Select a category...</option>
      {labels.map((label) => (
        <option key={label.id} value={label.id}>
          {label.name}
        </option>
      ))}
    </select>
  );
}
