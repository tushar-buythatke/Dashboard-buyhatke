import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NoiseBackgroundProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  gradientColors?: string[];
}

/** Animated gradient border — CSS-only (no WebGL) for performance */
export function NoiseBackground({
  children,
  className,
  containerClassName,
  gradientColors = [
    'rgb(255, 100, 150)',
    'rgb(100, 150, 255)',
    'rgb(255, 200, 100)',
  ],
}: NoiseBackgroundProps) {
  const gradient = `linear-gradient(90deg, ${gradientColors.join(', ')})`;

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-90 animate-noise-gradient"
        style={{
          background: gradient,
          backgroundSize: '200% 200%',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.15] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className={cn('relative', className)}>{children}</div>
    </div>
  );
}
