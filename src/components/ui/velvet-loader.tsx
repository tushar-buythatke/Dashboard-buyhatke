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
      {/* Soft ambient glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background: 'radial-gradient(circle, rgba(99,76,230,0.15) 0%, transparent 70%)',
          animation: 'velvet-breathe 2.4s ease-in-out infinite',
        }}
      />

      {/* SVG orbital ring + dot */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="absolute inset-0 w-full h-full"
        style={{ animation: 'velvet-orbit 2s linear infinite' }}
      >
        {/* Track ring */}
        <circle
          cx="24" cy="24" r="18"
          stroke="rgba(99,76,230,0.12)"
          strokeWidth="2.5"
        />
        {/* Gradient definition for the trailing arc */}
        <defs>
          <linearGradient id="orb-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c6feb" />
            <stop offset="50%" stopColor="#d94684" />
            <stop offset="100%" stopColor="#634ce6" />
          </linearGradient>
        </defs>
        {/* Trailing arc */}
        <circle
          cx="24" cy="24" r="18"
          stroke="url(#orb-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="28 84"
          style={{ filter: 'drop-shadow(0 0 4px rgba(99,76,230,0.4))' }}
        />
        {/* Leading dot */}
        <circle
          cx="24" cy="6"
          r="3"
          fill="#7c6feb"
          style={{ filter: 'drop-shadow(0 0 6px rgba(99,76,230,0.6))' }}
        />
      </svg>

      {/* Center pulsing core */}
      <div
        className="rounded-full z-10"
        style={{
          width: size * 0.16,
          height: size * 0.16,
          background: 'linear-gradient(135deg, #7c6feb, #d94684)',
          boxShadow: '0 0 12px rgba(99,76,230,0.4), 0 0 24px rgba(99,76,230,0.15)',
          animation: 'velvet-breathe-dot 1.6s ease-in-out infinite',
        }}
      />
    </div>
  );

  if (bare) return spinner;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {spinner}
      {label && (
        <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)]">
          {label}
        </p>
      )}
    </div>
  );
}
