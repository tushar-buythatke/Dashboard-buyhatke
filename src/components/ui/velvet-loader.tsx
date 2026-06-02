import * as React from 'react';
import { cn } from '@/lib/utils';

interface VelvetLoaderProps {
  /** Optional label — small caps, text-3, below the spinner. */
  label?: string;
  /** Size of the spinner in px. Defaults to 28. */
  size?: number;
  /** Show only the spinner without any label or container. */
  bare?: boolean;
  className?: string;
}

/**
 * VelvetLoader — the only loading state you should ever see.
 * A conic-gradient ring with a soft inner glow and a pulsing core dot.
 * No more 3 rainbow bouncing dots.
 */
export function VelvetLoader({ label, size = 28, bare = false, className }: VelvetLoaderProps) {
  const spinner = (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label || 'Loading'}
    >
      {/* Outer gradient ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, var(--violet-500) 80deg, var(--pink-500) 200deg, var(--indigo-500) 300deg, transparent 360deg)',
          mask: 'radial-gradient(circle, transparent 50%, black 51%)',
          WebkitMask: 'radial-gradient(circle, transparent 50%, black 51%)',
          animation: 'velvet-spin 1s linear infinite',
        }}
      />
      {/* Inner soft glow */}
      <div
        className="absolute rounded-full"
        style={{
          inset: size * 0.18,
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--violet-500) 30%, transparent) 0%, transparent 70%)',
          animation: 'velvet-pulse 1.6s ease-in-out infinite',
        }}
      />
      {/* Core dot */}
      <div
        className="rounded-full"
        style={{
          width: size * 0.18,
          height: size * 0.18,
          background: 'var(--g-accent)',
          boxShadow: '0 0 8px color-mix(in srgb, var(--violet-500) 50%, transparent)',
        }}
      />
    </div>
  );

  if (bare) return spinner;

  return (
    <div className="flex flex-col items-center justify-center gap-2.5">
      {spinner}
      {label && (
        <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)]">
          {label}
        </p>
      )}
    </div>
  );
}
