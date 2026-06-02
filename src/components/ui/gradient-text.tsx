import * as React from 'react';
import { cn } from '@/lib/utils';

interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Render with Instrument Serif italic (the brand "moment"). Defaults true. */
  serif?: boolean;
}

/**
 * The iridescent BuyHatke brand-moment text.
 * Animated multi-stop gradient (pink → indigo → blue) clipped to text.
 */
export const GradientText = React.forwardRef<HTMLSpanElement, GradientTextProps>(
  ({ className, serif = true, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'gradient-text',
        serif && 'gradient-text-serif',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
);
GradientText.displayName = 'GradientText';
