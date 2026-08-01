import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCount } from '@/lib/format';
import { useCountUp } from '@/hooks/useCountUp';
import { useSpotlight } from '@/hooks/useSpotlight';

export type MetricTone = 'accent' | 'violet' | 'plum' | 'teal' | 'pink' | 'sky' | 'amber';

interface MetricCardProps {
  label: string;
  /** The metric value. Can be a number (will animate from 0) or a pre-formatted string. */
  value: number | string;
  /** Optional unit suffix shown smaller and muted (e.g. "%", "ms"). */
  unit?: string;
  /** Delta string. Use `+` / `↑` for positive, `-` / `↓` for negative. */
  delta?: string;
  /** Force delta direction; auto-detected from `delta` string otherwise. */
  deltaDirection?: 'up' | 'down';
  /** Icon element (typically lucide). */
  icon?: React.ReactNode;
  /** Visual tone (drives icon tint + corner glow color). */
  tone?: MetricTone;
  /** Numeric series for a faint background sparkline. */
  sparkline?: number[];
  /** Number formatter — defaults to en-US comma locale. */
  formatter?: (n: number) => string;
  className?: string;
  /** Optional onClick — when set, the card becomes interactive (hover lift, cursor). */
  onClick?: () => void;
  /** Animate the value on first render. Default true. */
  animateValue?: boolean;
}

const defaultFormatter = formatCount;

function AnimatedNumber({
  to,
  formatter,
  enabled,
}: {
  to: number;
  formatter: (n: number) => string;
  enabled: boolean;
}) {
  const display = useCountUp(to, 750);
  return <>{formatter(Math.round(enabled ? display : to))}</>;
}

function MiniSparkline({ values, tone }: { values: number[]; tone: MetricTone }) {
  if (!values || values.length < 2) return null;
  const w = 100;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const linePath = `M${pts.join(' L')}`;
  const areaPath = `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
  const colorMap: Record<MetricTone, string> = {
    accent: 'var(--h-iris-500)',
    violet: 'var(--h-violet)',
    plum: 'var(--h-iris-400)',
    teal: 'var(--h-mint)',
    pink: 'var(--h-coral)',
    sky: 'var(--h-cyan)',
    amber: 'var(--h-amber)',
  };
  const stroke = colorMap[tone];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute bottom-0 left-0 right-0 h-7 w-full opacity-40"
      aria-hidden
    >
      <path d={areaPath} fill={stroke} fillOpacity="0.10" />
      <path d={linePath} stroke={stroke} strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      label,
      value,
      unit,
      delta,
      deltaDirection,
      icon,
      tone = 'accent',
      sparkline,
      formatter = defaultFormatter,
      className,
      onClick,
      animateValue = true,
    },
    ref
  ) => {
    const isNumeric = typeof value === 'number';
    const direction =
      deltaDirection ??
      (delta && /^[+↑]|positive/i.test(delta.trim())
        ? 'up'
        : delta && /^[-↓−]|negative/i.test(delta.trim())
        ? 'down'
        : undefined);
    const spotlight = useSpotlight();
    const toneColor: Record<MetricTone, string> = {
      accent: 'var(--h-iris-500)',
      violet: 'var(--h-violet)',
      plum: 'var(--h-iris-400)',
      teal: 'var(--h-mint)',
      pink: 'var(--h-coral)',
      sky: 'var(--h-cyan)',
      amber: 'var(--h-amber)',
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        whileHover={onClick ? { y: -2 } : undefined}
        onClick={onClick}
        onPointerMove={spotlight.onPointerMove}
        onPointerLeave={spotlight.onPointerLeave}
        className={cn(
          'halo-card halo-rail halo-spotlight p-5',
          onClick && 'halo-card-interactive',
          className
        )}
      >
        <div className="relative z-[1] flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {icon && (
                <div
                  className="halo-chip"
                  style={{ color: toneColor[tone] }}
                >
                  {icon}
                </div>
              )}
              <div className="halo-eyebrow truncate">{label}</div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="halo-metric num">
                {isNumeric ? (
                  <AnimatedNumber
                    to={value as number}
                    formatter={formatter}
                    enabled={animateValue}
                  />
                ) : (
                  value
                )}
              </span>
              {unit && (
                <span className="text-base font-medium text-[var(--h-ink-3)]">
                  {unit}
                </span>
              )}
            </div>
          </div>
          {delta && (
            <div
              className={cn(
                'halo-delta',
                direction === 'up' && 'halo-delta-up',
                direction === 'down' && 'halo-delta-down',
                !direction && 'halo-delta-flat'
              )}
            >
              {delta}
            </div>
          )}
        </div>

        {sparkline && <MiniSparkline values={sparkline} tone={tone} />}
      </motion.div>
    );
  }
);
MetricCard.displayName = 'MetricCard';
