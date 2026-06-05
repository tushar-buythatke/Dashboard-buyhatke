import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-[var(--line)] bg-[var(--bg-panel)] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[var(--text-3)] placeholder:opacity-60 focus-visible:outline-none focus-visible:border-[var(--violet-400)] focus-visible:shadow-[0_0_0_3px_rgba(99,76,230,0.12)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
