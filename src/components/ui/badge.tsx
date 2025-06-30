import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-default',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary hover:shadow-lg hover:scale-105 hover:-translate-y-0.5',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5',
        outline: 'text-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:scale-105 hover:-translate-y-0.5',
        success:
          'border-transparent bg-green-500 text-white shadow hover:bg-green-600 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5',
        warning:
          'border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5',
        info:
          'border-transparent bg-blue-500 text-white shadow hover:bg-blue-600 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
