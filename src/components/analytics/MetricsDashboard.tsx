import { memo } from 'react';
import { Eye, MousePointerClick, TrendingUp, Target, ArrowDownToLine } from 'lucide-react';
import { MetricsData } from '@/types';
import { CometCard } from '@/components/ui/comet-card';
import { MetricCard, MetricTone } from '@/components/ui/metric-card';
import { formatCount, formatSmartPercent } from '@/lib/format';

interface MetricsDashboardProps {
  data: MetricsData;
  comparisonData?: MetricsData;
  period?: '1d' | '7d' | '30d';
}

const calculateChange = (
  current: number,
  previous: number,
  hasComparison: boolean
): { delta: string; up: boolean } | undefined => {
  if (!hasComparison || previous === 0) return undefined;
  const percentChange = ((current - previous) / previous) * 100;
  const up = percentChange >= 0;
  return { delta: `${up ? '+' : ''}${percentChange.toFixed(1)}% vs prior`, up };
};

export const MetricsDashboard = memo(function MetricsDashboard({
  data,
  comparisonData,
}: MetricsDashboardProps) {
  const hasComparison = !!comparisonData;

  const items: Array<{
    label: string;
    value: number | string;
    unit?: string;
    raw: number;
    key: keyof MetricsData;
    icon: typeof Eye;
    tone: MetricTone;
    isPercent?: boolean;
  }> = [
    { label: 'Impressions', value: data.impressions, raw: data.impressions, key: 'impressions', icon: Eye, tone: 'violet' },
    { label: 'Clicks', value: data.clicks, raw: data.clicks, key: 'clicks', icon: MousePointerClick, tone: 'accent' },
    { label: 'CTR', value: formatSmartPercent(data.ctr), raw: data.ctr, key: 'ctr', icon: TrendingUp, tone: 'plum', isPercent: true },
    { label: 'Live Landings', value: data.landingCount, raw: data.landingCount, key: 'landingCount', icon: ArrowDownToLine, tone: 'accent' },
    { label: 'Conversions', value: data.conversions, raw: data.conversions, key: 'conversions', icon: Target, tone: 'violet' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => {
        const change = calculateChange(
          item.raw,
          (comparisonData?.[item.key] as number) || 0,
          hasComparison
        );
        const Icon = item.icon;
        return (
          <CometCard key={item.label}>
            <MetricCard
              label={item.label}
              value={item.value}
              unit={item.unit}
              tone={item.tone}
              icon={<Icon className="h-3.5 w-3.5" />}
              formatter={item.isPercent ? undefined : formatCount}
              animateValue={!item.isPercent}
              delta={change?.delta}
              deltaDirection={change ? (change.up ? 'up' : 'down') : undefined}
            />
          </CometCard>
        );
      })}
    </div>
  );
});
