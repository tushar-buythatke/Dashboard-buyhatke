import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'focus-visible:outline-none focus-visible:shadow-[var(--h-ring)] disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'btn-halo',
        destructive: 'btn-halo-danger',
        outline: 'btn-halo-outline',
        secondary: 'btn-halo-soft',
        ghost: 'btn-halo-ghost',
        link:
          'inline-flex items-center gap-1.5 text-[var(--h-iris-600)] font-medium text-[0.8125rem] underline-offset-4 hover:underline transition-all',
        backGhost: 'velvet-back',
        // Velvet accent — primary iris pill, used for primary actions
        velvet: 'btn-halo',
      },
      size: {
        default: '',
        sm: 'btn-halo-sm',
        lg: 'btn-halo-lg',
        icon: 'btn-halo-icon',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
