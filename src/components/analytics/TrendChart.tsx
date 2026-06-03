import { memo, useMemo, useState, useEffect, Fragment } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { Plane, TrendingUp } from 'lucide-react';
import { TrendDataPoint, TrendChartSeries } from '@/types';
import { formatChartValue } from '@/lib/format';

interface TrendChartProps {
  series: TrendChartSeries[];
  title: string;
  dataKey?: 'impressions' | 'clicks' | 'ctr' | 'landingCount';
  yAxisLabel?: string;
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
  period?: '1d' | '7d' | '30d';
  enableSeriesFilters?: boolean;
  enablePlatformFilter?: boolean;
}

const PALETTE = ['#7c6feb', '#d94684', '#38bdf8', '#2dd4bf', '#fbbf24', '#a99df5'];
const COMBINED_TOTAL_COLOR = '#6b5ce7';

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const CustomTooltip = memo(({ active, payload, label, dataKey }: any) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
  const visible = sorted.slice(0, 5);
  const overflow = sorted.length - visible.length;
  const date = label ? formatDate(label) : '';
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-panel)]/95 backdrop-blur-xl shadow-[var(--shadow-3)] px-2.5 py-1.5 min-w-[170px] max-w-[240px]">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] mb-1 leading-tight">
        {date}
      </div>
      <div className={`space-y-0.5 ${sorted.length > 5 ? 'max-h-[120px] overflow-y-auto scrollbar-thin pr-1' : ''}`}>
        {visible.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-2 leading-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[10.5px] text-[var(--text-2)] truncate">
                {entry.name}
              </span>
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-[var(--text-1)]">
              {formatChartValue(entry.value, dataKey)}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="text-[9.5px] text-[var(--text-3)] text-center pt-0.5">
            +{overflow} more
          </div>
        )}
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

export const TrendChart = memo<TrendChartProps>(({
  series,
  title,
  dataKey = 'impressions',
  yAxisLabel,
  height = 260,
  showGrid = true,
  animated = true,
  period = '7d',
  enableSeriesFilters = false,
  enablePlatformFilter = false,
}) => {
  const seriesColorMap = useMemo(() => {
    const map = new Map(series.map((item, index) => [item.name, PALETTE[index % PALETTE.length]]));
    map.set('Combined Total', COMBINED_TOTAL_COLOR);
    return map;
  }, [series]);

  const { combinedData, seriesNames } = useMemo(() => {
    if (!series || series.length === 0) return { combinedData: [], seriesNames: [] };

    const dataMap = new Map<string, any>();
    const names: string[] = [];

    series.forEach(s => {
      names.push(s.name);
      s.data.forEach(point => {
        if (!dataMap.has(point.date)) {
          dataMap.set(point.date, { date: point.date });
        }
        const entry = dataMap.get(point.date);
        entry[s.name] = point[dataKey] || 0;
      });
    });

    const data = Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return { combinedData: data, seriesNames: names };
  }, [series, dataKey]);

  if (!combinedData.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-2.5" style={{ height }}>
        <div className="h-10 w-10 rounded-xl bg-[var(--bg-panel-2)] border border-[var(--line)] flex items-center justify-center">
          {/landing/i.test(title) ? (
            <Plane className="h-4 w-4 text-[var(--text-3)]" strokeWidth={1.5} />
          ) : (
            <TrendingUp className="h-4 w-4 text-[var(--text-3)]" strokeWidth={1.5} />
          )}
        </div>
        <div>
          <p className="text-[12px] font-medium text-[var(--text-2)]">No trend data available</p>
          <p className="text-[10.5px] text-[var(--text-3)] mt-0.5">
            Try a different date range or campaign
          </p>
        </div>
      </div>
    );
  }

  const useArea = seriesNames.length === 1;
  const singleColor = useArea ? (seriesColorMap.get(seriesNames[0]) || PALETTE[0]) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="velvet-section-title">{title}</div>
        {seriesNames.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap justify-end max-w-[60%]">
            {seriesNames.slice(0, 4).map((name) => (
              <div key={name} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: seriesColorMap.get(name) || PALETTE[0] }}
                />
                <span className="text-[10.5px] text-[var(--text-3)] truncate max-w-[8rem]">
                  {name}
                </span>
              </div>
            ))}
            {seriesNames.length > 4 && (
              <span className="text-[10.5px] text-[var(--text-3)]">+{seriesNames.length - 4}</span>
            )}
          </div>
        )}
      </div>

      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          {useArea ? (
            <ComposedChart data={combinedData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              {showGrid && (
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  vertical={false}
                  className="text-[var(--text-3)]"
                />
              )}
              <defs>
                <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={singleColor!} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={singleColor!} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="currentColor"
                fontSize={10.5}
                axisLine={false}
                tickLine={false}
                dy={4}
                className="text-[var(--text-3)]"
              />
              <YAxis
                stroke="currentColor"
                fontSize={10.5}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatChartValue(v, dataKey)}
                className="text-[var(--text-3)]"
              />
              <Tooltip content={<CustomTooltip dataKey={dataKey} />} cursor={{ stroke: 'var(--line-violet)', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey={seriesNames[0]}
                stroke={singleColor!}
                strokeWidth={2}
                fill="url(#trend-area)"
                animationDuration={animated ? 800 : 0}
                activeDot={{ r: 4, fill: singleColor!, stroke: 'var(--bg-panel)', strokeWidth: 2 }}
              />
            </ComposedChart>
          ) : (
            <LineChart data={combinedData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              {showGrid && (
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  vertical={false}
                  className="text-[var(--text-3)]"
                />
              )}
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="currentColor"
                fontSize={10.5}
                axisLine={false}
                tickLine={false}
                dy={4}
                className="text-[var(--text-3)]"
              />
              <YAxis
                stroke="currentColor"
                fontSize={10.5}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatChartValue(v, dataKey)}
                className="text-[var(--text-3)]"
              />
              <Tooltip content={<CustomTooltip dataKey={dataKey} />} cursor={{ stroke: 'var(--line-violet)', strokeWidth: 1 }} />
              {seriesNames.map((seriesName) => {
                const color = seriesColorMap.get(seriesName) || PALETTE[0];
                return (
                  <Line
                    key={seriesName}
                    type="monotone"
                    dataKey={seriesName}
                    stroke={color}
                    strokeWidth={1.75}
                    dot={false}
                    activeDot={{ r: 3.5, fill: color, stroke: 'var(--bg-panel)', strokeWidth: 2 }}
                    animationDuration={animated ? 800 : 0}
                  />
                );
              })}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';
