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
    // Mint tint + bright pulsing dot
    wrap: 'bg-[var(--h-pos-soft)] text-[var(--h-mint)] border-[var(--h-mint)]/25',
    dot: 'bg-[var(--h-mint)] shadow-[0_0_8px_rgba(16,199,143,0.55)]',
  },
  paused: {
    // Soft amber tint
    wrap: 'bg-[var(--h-warn-soft)] text-[var(--h-amber)] border-[var(--h-amber)]/25',
    dot: 'bg-[var(--h-amber)]',
  },
  test: {
    wrap: 'bg-[var(--h-tint-2)] text-[var(--h-iris-600)] dark:text-[var(--h-iris-300)] border-[var(--h-line-accent)]',
    dot: 'bg-[var(--h-iris-500)]',
  },
  draft: {
    // Translucent muted ink
    wrap: 'bg-[var(--h-surface-3)] text-[var(--h-ink-2)] border-[var(--h-line-2)]',
    dot: 'bg-[var(--h-ink-3)]',
  },
  archived: {
    wrap: 'bg-[var(--h-surface-3)] text-[var(--h-ink-3)] border-[var(--h-line)]',
    dot: 'bg-[var(--h-ink-3)]',
  },
  muted: {
    wrap: 'bg-[var(--h-surface-3)] text-[var(--h-ink-3)] border-[var(--h-line)]',
    dot: 'bg-[var(--h-ink-3)]',
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
