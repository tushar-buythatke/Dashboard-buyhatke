import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VelvetBackButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Label text shown next to the icon. */
  label?: string;
  /** Optional click handler — when omitted, behaves as a span. */
  onClick?: () => void;
  className?: string;
}

export const VelvetBackButton = React.forwardRef<
  HTMLButtonElement,
  VelvetBackButtonProps
>(({ label = 'Back', onClick, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      type="button"
      className={cn('velvet-back', className)}
      {...props}
    >
      <span className="velvet-back-icon" aria-hidden>
        <ArrowLeft className="h-3 w-3" strokeWidth={2.25} />
      </span>
      <span className="velvet-back-label">
        <span className="velvet-back-label-text">{label}</span>
      </span>
    </button>
  );
});
VelvetBackButton.displayName = 'VelvetBackButton';
