import * as React from 'react';
import { cn } from '@/lib/utils';

export type StatusKind = 'live' | 'paused' | 'draft' | 'archived' | 'test' | 'muted';

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Determines the visual tone and the icon dot behavior. */
  status: StatusKind;
  /** Visible label. Defaults to a humanized variant of `status`. */
  label?: string;
  /** Show the pulsing micro-dot in front of the label. */
  dot?: boolean;
  /** Right-side adornment (e.g. an action chevron). */
  trailing?: React.ReactNode;
  className?: string;
  /** Smaller variant for use in tight tables. */
  size?: 'sm' | 'md';
}

const labelMap: Record<StatusKind, string> = {
  live: 'Live',
  paused: 'Paused',
  draft: 'Draft',
  archived: 'Archived',
  test: 'Test',
  muted: 'Inactive',
};

const styleMap: Record<StatusKind, { wrap: string; dot: string }> = {
  live: {
    // Glassy emerald: transparent emerald tint + bright pulsing dot
    wrap: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/14 dark:text-emerald-300 border-emerald-500/25 dark:border-emerald-400/30',
    dot: 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.55)]',
  },
  paused: {
    // Soft amber/purple twilight slate tint
    wrap: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/12 dark:text-amber-300 border-amber-500/25 dark:border-amber-400/28',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  test: {
    wrap: 'bg-pink-500/10 text-pink-600 dark:bg-pink-400/14 dark:text-pink-300 border-pink-500/25 dark:border-pink-400/30',
    dot: 'bg-pink-500 dark:bg-pink-400',
  },
  draft: {
    // Translucent muted slate
    wrap: 'bg-slate-500/10 text-slate-600 dark:bg-slate-400/12 dark:text-slate-300 border-slate-500/20 dark:border-slate-400/22',
    dot: 'bg-slate-500 dark:bg-slate-400',
  },
  archived: {
    wrap: 'bg-slate-400/8 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400 border-slate-400/15 dark:border-slate-500/20',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },
  muted: {
    wrap: 'bg-slate-400/8 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400 border-slate-400/15 dark:border-slate-500/20',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },
};

/**
 * The unified status indicator for campaigns, ads, and slots.
 * Glassy capsule, single-color font + border tint, optional pulsing micro-dot.
 *
 * Usage:
 *   <StatusPill status="live" />           // Live  (emerald + pulsing dot)
 *   <StatusPill status="paused" />         // Paused (amber)
 *   <StatusPill status="draft" dot={false} />
 *   <StatusPill status="archived" label="Off" />
 */
export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ status, label, dot = true, trailing, className, size = 'md', ...props }, ref) => {
    const s = styleMap[status];
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-medium tracking-tight backdrop-blur-[2px] whitespace-nowrap',
          size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
          s.wrap,
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full flex-shrink-0',
              s.dot,
              status === 'live' && 'animate-pulse'
            )}
            aria-hidden
          />
        )}
        <span>{label ?? labelMap[status]}</span>
        {trailing}
      </span>
    );
  }
);
StatusPill.displayName = 'StatusPill';
