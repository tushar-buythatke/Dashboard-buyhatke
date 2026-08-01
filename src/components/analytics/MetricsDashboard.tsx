import { memo, useId } from 'react';
import { Eye, MousePointerClick, TrendingUp, Target, ArrowDownToLine, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { MetricsData } from '@/types';
import { formatCount, formatSmartPercent } from '@/lib/format';
import { useCountUp } from '@/hooks/useCountUp';
import { useSpotlight } from '@/hooks/useSpotlight';

interface MetricsDashboardProps {
  data: MetricsData;
  comparisonData?: MetricsData;
  period?: '1d' | '7d' | '30d';
  /** Daily impression values, oldest first. Draws the hero card's watermark sparkline. */
  trend?: number[];
}

type MetricChange = { delta: string; direction: 'up' | 'down' | 'flat' };
type Family = 'iris' | 'cyan' | 'mint' | 'amber' | 'violet';

const calculateChange = (
  current: number,
  previous: number,
  hasComparison: boolean
): MetricChange | undefined => {
  if (!hasComparison || previous === 0) return undefined;
  const percentChange = ((current - previous) / previous) * 100;
  const direction: MetricChange['direction'] = percentChange > 0.05 ? 'up' : percentChange < -0.05 ? 'down' : 'flat';
  return { delta: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`, direction };
};

const DeltaIcon = { up: ArrowUp, down: ArrowDown, flat: Minus } as const;

/** Full-width watermark area behind the hero number — felt, not read. */
const HeroSparkline = memo(function HeroSparkline({ values, light = false }: { values: number[]; light?: boolean }) {
  const gradientId = useId();
  if (values.length < 2) return null;
  const stroke = light ? '#ffffff' : 'var(--h-iris-400)';
  const fill = light ? '#ffffff' : 'var(--h-iris-500)';

  const w = 400;
  const h = 90;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[72px] w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={light ? 0.22 : 0.16} />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points.join(' ')} ${w},${h}`} fill={`url(#${gradientId})`} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={light ? 0.4 : 0.55}
      />
    </svg>
  );
});

/** The primary metric — wide, weighted, the thing your eye lands on first. */
const HeroCard = memo(function HeroCard({
  label,
  raw,
  formatter,
  change,
  trend,
}: {
  label: string;
  raw: number;
  formatter: (v: number) => string;
  change?: MetricChange;
  trend: number[];
}) {
  const spotlight = useSpotlight();
  const animatedValue = useCountUp(raw, 900);
  const Delta = change ? DeltaIcon[change.direction] : null;

  return (
    <div
      className="halo-mesh halo-mesh-iris halo-spotlight halo-rise relative flex w-full flex-col justify-between overflow-hidden rounded-[var(--h-r-card)] p-6"
      style={{ '--i': 0 } as React.CSSProperties}
      {...spotlight}
    >
      <div className="halo-mesh-grain" aria-hidden="true" />
      <HeroSparkline values={trend} light />
      <div className="relative flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-white/75">{label}</span>
        {change && Delta && (
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
            <Delta className="h-3 w-3" strokeWidth={2.5} />
            {change.delta}
          </span>
        )}
      </div>
      <div className="relative">
        <p className="num text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-white">
          {formatter(animatedValue)}
        </p>
        <p className="mt-2 text-[12.5px] text-white/60">Last 7 days, all live campaigns</p>
      </div>
    </div>
  );
});

/** A single row inside the secondary metrics list. */
const MetricRow = memo(function MetricRow({
  label,
  raw,
  formatter,
  icon: Icon,
  family,
  change,
}: {
  label: string;
  raw: number;
  formatter: (v: number) => string;
  icon: typeof Eye;
  family: Family;
  change?: MetricChange;
}) {
  const animatedValue = useCountUp(raw, 800);
  const Delta = change ? DeltaIcon[change.direction] : null;

  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`halo-chip halo-chip-${family} h-8 w-8 rounded-[10px]`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="truncate text-[13px] font-medium text-[var(--h-ink-2)]">{label}</span>
      </div>
      <div className="flex flex-none items-baseline gap-2">
        {change && Delta && (
          <span className={`halo-delta halo-delta-bare halo-delta-${change.direction}`}>
            <Delta className="h-2.5 w-2.5" strokeWidth={2.5} />
            {change.delta}
          </span>
        )}
        <span className="num text-[15px] font-semibold text-[var(--h-ink)]">{formatter(animatedValue)}</span>
      </div>
    </div>
  );
});

export const MetricsDashboard = memo(function MetricsDashboard({
  data,
  comparisonData,
  trend = [],
}: MetricsDashboardProps) {
  const hasComparison = !!comparisonData;

  const rest: Array<{
    label: string;
    raw: number;
    key: keyof MetricsData;
    icon: typeof Eye;
    family: Family;
    formatter: (value: number) => string;
  }> = [
    { label: 'Clicks', raw: data.clicks, key: 'clicks', icon: MousePointerClick, family: 'cyan', formatter: formatCount },
    { label: 'CTR', raw: data.ctr, key: 'ctr', icon: TrendingUp, family: 'violet', formatter: (v) => formatSmartPercent(v) },
    { label: 'Live landings', raw: data.landingCount, key: 'landingCount', icon: ArrowDownToLine, family: 'amber', formatter: formatCount },
    { label: 'Conversions', raw: data.conversions, key: 'conversions', icon: Target, family: 'mint', formatter: formatCount },
  ];

  const impressionsChange = calculateChange(data.impressions, comparisonData?.impressions || 0, hasComparison);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 items-stretch">
      <div className="flex lg:col-span-2">
        <HeroCard
          label="Impressions"
          raw={data.impressions}
          formatter={formatCount}
          change={impressionsChange}
          trend={trend}
        />
      </div>

      <div className="halo-card halo-rise flex flex-col justify-center p-5 lg:col-span-3" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="divide-y divide-[var(--h-line)]">
          {rest.map((item) => (
            <MetricRow
              key={item.label}
              label={item.label}
              raw={item.raw}
              formatter={item.formatter}
              icon={item.icon}
              family={item.family}
              change={calculateChange(item.raw, (comparisonData?.[item.key] as number) || 0, hasComparison)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
