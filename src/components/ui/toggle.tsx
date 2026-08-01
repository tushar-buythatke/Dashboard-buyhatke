import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-[var(--h-r-pill)] text-sm font-medium text-[var(--h-ink-2)] transition-colors hover:bg-[var(--h-tint)] hover:text-[var(--h-iris-600)] focus-visible:outline-none focus-visible:shadow-[var(--h-ring)] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--h-tint-2)] data-[state=on]:text-[var(--h-iris-600)]',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-[var(--h-line-2)] bg-[var(--h-surface)] shadow-[var(--h-sh-1)] hover:bg-[var(--h-tint)] hover:text-[var(--h-iris-600)]',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2',
        lg: 'h-10 px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
