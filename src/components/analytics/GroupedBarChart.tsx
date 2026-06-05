import { memo, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatChartValue, formatChartAxis } from '@/lib/format';

interface GroupedBarChartProps {
  data: any[];
  title: string;
  xAxisKey: string;
  seriesKeys: string[];
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
}

const COLORS = [
  '#7c6feb', '#c462a0', '#38bdf8', '#2dd4bf',
  '#fbbf24', '#a99df5', '#e879a0', '#634ce6',
];

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  const total = sorted.reduce((sum: number, e: any) => sum + (e.value || 0), 0);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-panel)]/98 backdrop-blur-2xl shadow-[var(--shadow-velvet)] px-3 py-2.5 min-w-[190px] max-w-[260px]">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--line)]">
        <span className="text-[11px] font-semibold text-[var(--text-1)]">{label}</span>
        <span className="text-[9.5px] font-medium text-[var(--text-3)] tabular-nums">
          Σ {formatChartValue(total)}
        </span>
      </div>
      <div className="space-y-1">
        {sorted.slice(0, 6).map((entry: any, i: number) => {
          const pct = total > 0 ? ((entry.value || 0) / total * 100).toFixed(1) : '0';
          return (
            <div key={i} className="flex items-center justify-between gap-3 leading-none py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: entry.color,
                    boxShadow: `0 0 5px ${entry.color}40`,
                  }}
                />
                <span className="text-[11px] text-[var(--text-2)] truncate">
                  {entry.dataKey || entry.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] text-[var(--text-3)] tabular-nums w-8 text-right">
                  {pct}%
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-[var(--text-1)] min-w-[48px] text-right">
                  {formatChartValue(entry.value, entry.dataKey)}
                </span>
              </div>
            </div>
          );
        })}
        {sorted.length > 6 && (
          <div className="text-[9.5px] text-[var(--text-3)] text-center pt-1 border-t border-[var(--line)]">
            +{sorted.length - 6} more
          </div>
        )}
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'GroupedBarTooltip';

const COMBINED_COLOR = '#6b5ce7';

export const GroupedBarChart = memo<GroupedBarChartProps>(({
  data,
  title,
  xAxisKey,
  seriesKeys,
  height = 400,
  showGrid = true,
  animated = true
}) => {
  const [showCombined, setShowCombined] = useState(false);
  const uniqueId = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  /* Combined data: sum of all series at each point */
  const chartData = useMemo(() => {
    if (!showCombined) return data;
    return data.map(d => {
      const combined = seriesKeys.reduce((sum, key) => sum + (Number(d[key]) || 0), 0);
      return { ...d, __combined: combined };
    });
  }, [data, showCombined, seriesKeys]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="velvet-section-title flex-shrink-0">{title}</div>
        <button
          onClick={() => setShowCombined(prev => !prev)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 flex-shrink-0 ${
            showCombined
              ? 'bg-[var(--violet-500)] text-white shadow-[0_0_8px_rgba(99,76,230,0.3)]'
              : 'text-[var(--violet-500)] hover:bg-[var(--bg-tint)]'
          }`}
        >
          <span className="inline-block h-1.5 w-3 rounded-sm" style={{
            background: showCombined
              ? 'white'
              : 'linear-gradient(90deg, var(--violet-400), var(--pink-400))',
          }} />
          Combined
        </button>
      </div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -8, bottom: 8 }}>
            <defs>
              {seriesKeys.map((key, index) => (
                <linearGradient key={key} id={`gb-${uniqueId}-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.92} />
                  <stop offset="50%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.72} />
                  <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.45} />
                </linearGradient>
              ))}
              <linearGradient id={`combined-gb-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COMBINED_COLOR} stopOpacity={0.92} />
                <stop offset="50%" stopColor={COMBINED_COLOR} stopOpacity={0.72} />
                <stop offset="100%" stopColor={COMBINED_COLOR} stopOpacity={0.45} />
              </linearGradient>
            </defs>

            {showGrid && (
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--line)"
                strokeOpacity={0.5}
                vertical={false}
              />
            )}

            <XAxis
              dataKey={xAxisKey}
              stroke="var(--line)"
              fontSize={10}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dy={6}
              tick={{ fill: 'var(--text-3)' }}
            />

            <YAxis
              stroke="var(--line)"
              fontSize={10}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dx={-6}
              tickFormatter={(v) => formatChartAxis(v)}
              tick={{ fill: 'var(--text-3)' }}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--bg-tint)', opacity: 0.5, radius: 6 }}
              wrapperStyle={{ outline: 'none' }}
            />

            {seriesKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`url(#gb-${uniqueId}-${index})`}
                animationDuration={animated ? 900 : 0}
                animationEasing="ease-out"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
              />
            ))}
            {showCombined && (
              <Bar
                dataKey="__combined"
                fill={`url(#combined-gb-${uniqueId})`}
                name="Combined Total"
                animationDuration={animated ? 900 : 0}
                animationEasing="ease-out"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
                opacity={0.6}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

GroupedBarChart.displayName = 'GroupedBarChart';
