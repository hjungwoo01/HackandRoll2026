import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "../../lib/utils"

// Simple radio group implementation (for hackathon demo)
interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onValueChange, className, children, disabled, ...props }, ref) => {
    // Recursively find and update RadioGroupItems
    const updateRadioItems = (element: React.ReactNode): React.ReactNode => {
      if (!React.isValidElement(element)) {
        // If it's a RadioGroupItem, update its props
        if (element.type === RadioGroupItem) {
          const itemValue = (element.props as any).value;
          return React.cloneElement(element as React.ReactElement<any>, {
            checked: itemValue === value,
            onCheckedChange: () => onValueChange?.(itemValue),
            disabled: disabled || element.props.disabled,
          });
        }
        // Otherwise, recursively update children
        if (element.props.children) {
          return React.cloneElement(element as React.ReactElement<any>, {
            children: React.Children.map(element.props.children, updateRadioItems),
          });
        }
      }
      return element;
    };

    return (
      <div ref={ref} className={cn("grid gap-2", className)} {...props}>
        {React.Children.map(children, updateRadioItems)}
      </div>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  checked?: boolean;
  onCheckedChange?: () => void;
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ value, checked, onCheckedChange, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onCheckedChange}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border-2 ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-all",
          checked 
            ? "border-primary-600 bg-primary-50" 
            : "border-gray-300 bg-white hover:border-gray-400",
          className
        )}
        {...props}
      >
        {checked && (
          <div className="h-2 w-2 rounded-full bg-primary-600" />
        )}
      </button>
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem }
