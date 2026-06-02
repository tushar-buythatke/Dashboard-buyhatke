import * as React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';

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

const defaultFormatter = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`
    : Math.abs(n) >= 1_000
    ? n.toLocaleString('en-US')
    : n.toLocaleString('en-US');

function AnimatedNumber({
  to,
  formatter,
  enabled,
}: {
  to: number;
  formatter: (n: number) => string;
  enabled: boolean;
}) {
  const mv = useMotionValue(enabled ? 0 : to);
  const text = useTransform(mv, (v) => formatter(Math.round(v)));

  React.useEffect(() => {
    if (!enabled) {
      mv.set(to);
      return;
    }
    const controls = animate(mv, to, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [to, enabled, mv]);

  return <motion.span>{text}</motion.span>;
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
    accent: 'var(--indigo-400)',
    violet: 'var(--violet-500)',
    plum: 'var(--plum-500)',
    teal: 'var(--pos)',
    pink: 'var(--pink-500)',
    sky: 'var(--blue-400)',
    amber: 'var(--gold-500)',
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

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        whileHover={onClick ? { y: -2 } : undefined}
        onClick={onClick}
        className={cn(
          'metric-card',
          `metric-card--${tone}`,
          onClick && 'cursor-pointer',
          className
        )}
      >
        <div className="relative z-[1]">
          <div className="metric-label">{label}</div>
          <div className="flex items-baseline gap-1.5">
            <span className="metric-value">
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
              <span className="text-base font-medium text-[var(--text-3)]">
                {unit}
              </span>
            )}
          </div>
          {delta && (
            <div
              className={cn(
                'num-delta mt-2 inline-flex items-center gap-1',
                direction === 'up' && 'up text-[var(--pos)]',
                direction === 'down' && 'down text-[var(--neg)]'
              )}
            >
              {delta}
            </div>
          )}
        </div>

        {icon && (
          <div className={cn('metric-icon-tone', `metric-icon-tone--${tone}`)}>
            {icon}
          </div>
        )}

        {sparkline && <MiniSparkline values={sparkline} tone={tone} />}
      </motion.div>
    );
  }
);
MetricCard.displayName = 'MetricCard';
