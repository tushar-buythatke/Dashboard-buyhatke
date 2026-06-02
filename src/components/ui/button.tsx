import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'btn-velvet',
        destructive:
          'inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--neg-soft)] text-[var(--neg)] border border-[var(--neg)]/30 font-medium text-[12.5px] px-3.5 h-9 hover:bg-[var(--neg)] hover:text-white transition-all',
        outline:
          'btn-velvet-ghost',
        secondary:
          'inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--bg-panel-2)] text-[var(--text-1)] border border-[var(--line)] font-medium text-[12.5px] px-3.5 h-9 hover:border-[var(--line-violet)] hover:bg-[var(--bg-panel)] transition-all',
        ghost:
          'inline-flex items-center justify-center gap-2 rounded-[10px] bg-transparent text-[var(--text-2)] font-medium text-[12.5px] px-3.5 h-9 hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)] transition-all',
        link:
          'inline-flex items-center gap-1.5 text-[var(--indigo-500)] font-medium text-[12.5px] underline-offset-4 hover:underline transition-all',
        backGhost:
          'velvet-back',
        // Velvet accent — purple/pink gradient pill, used for primary actions
        velvet:
          'btn-velvet',
      },
      size: {
        default: 'h-9 px-3.5',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-5',
        icon: 'h-9 w-9',
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
