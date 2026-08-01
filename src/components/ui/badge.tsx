import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva('halo-badge cursor-default focus:outline-none', {
  variants: {
    variant: {
      default: 'halo-badge-iris',
      secondary: '',
      destructive: 'halo-badge-neg',
      outline: 'bg-transparent border border-[var(--h-line-2)] text-[var(--h-ink-2)]',
      success: 'halo-badge-pos',
      warning: 'halo-badge-warn',
      info: 'halo-badge-info',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
