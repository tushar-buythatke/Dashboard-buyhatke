import * as React from 'react';
import { cn } from '@/lib/utils';

interface VelvetLoaderProps {
  label?: string;
  size?: number;
  bare?: boolean;
  className?: string;
}

/**
 * VelvetLoader — orbital gradient ring with trailing glow and pulsing core.
 * Smooth, premium, no cheap spinners.
 */
export function VelvetLoader({ label, size = 40, bare = false, className }: VelvetLoaderProps) {
  const spinner = (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label || 'Loading'}
    >
      <div
        className="halo-spinner"
        style={{ width: size * 0.68, height: size * 0.68, borderWidth: Math.max(2, size * 0.06) }}
      />
    </div>
  );

  if (bare) return spinner;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {spinner}
      {label && (
        <p className="halo-eyebrow">
          {label}
        </p>
      )}
    </div>
  );
}
