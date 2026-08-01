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
      className={cn('btn-halo-ghost btn-halo-sm', className)}
      {...props}
    >
      <span aria-hidden className="inline-flex items-center justify-center">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <span>{label}</span>
    </button>
  );
});
VelvetBackButton.displayName = 'VelvetBackButton';
