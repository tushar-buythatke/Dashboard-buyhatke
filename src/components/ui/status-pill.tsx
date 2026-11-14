import * as React from 'react';
import { Archive, CircleDashed, FlaskConical, Pause, PenLine, type LucideIcon } from 'lucide-react';
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

const styleMap: Record<StatusKind, string> = {
  live: 'bg-[var(--h-pos-soft)] text-[color-mix(in_srgb,var(--h-mint)_75%,var(--h-ink))] dark:text-[var(--h-mint)]',
  paused: 'bg-[var(--h-warn-soft)] text-[color-mix(in_srgb,var(--h-amber)_70%,var(--h-ink))]',
  test: 'bg-[var(--h-tint-2)] text-[var(--h-iris-600)] dark:text-[var(--h-iris-300)]',
  draft: 'border border-dashed border-[var(--h-line-2)] text-[var(--h-ink-2)]',
  archived: 'bg-[var(--h-surface-3)] text-[var(--h-ink-3)]',
  muted: 'bg-[var(--h-surface-3)] text-[var(--h-ink-3)]',
};

const iconMap: Partial<Record<StatusKind, LucideIcon>> = {
  paused: Pause,
  test: FlaskConical,
  draft: PenLine,
  archived: Archive,
  muted: CircleDashed,
};

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ status, label, dot = true, trailing, className, size = 'md', ...props }, ref) => {
    const Icon = iconMap[status];
    const sm = size === 'sm';
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-bold tracking-[-0.005em] whitespace-nowrap',
          sm ? 'h-6 gap-1.5 px-2.5 text-[11px]' : 'h-7 gap-1.5 px-3 text-[12px]',
          styleMap[status],
          className
        )}
        {...props}
      >
        {dot && status === 'live' && (
          <span className="relative flex h-2 w-2 flex-none" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--h-mint)] opacity-70" />
            <span className="relative h-2 w-2 rounded-full bg-[var(--h-mint)]" />
          </span>
        )}
        {dot && Icon && <Icon className={sm ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.5} />}
        <span>{label ?? labelMap[status]}</span>
        {trailing}
      </span>
    );
  }
);
StatusPill.displayName = 'StatusPill';
