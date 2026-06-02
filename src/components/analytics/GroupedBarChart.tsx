import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatChartValue } from '@/lib/format';

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
  const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-panel)]/95 backdrop-blur-xl shadow-[var(--shadow-3)] px-2.5 py-1.5 min-w-[160px] max-w-[220px]">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] mb-1 leading-tight">
        {label}
      </div>
      <div className="space-y-0.5">
        {sorted.slice(0, 5).map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-2 leading-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[10.5px] text-[var(--text-2)] truncate">
                {entry.dataKey || entry.name}
              </span>
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-[var(--text-1)]">
              {formatChartValue(entry.value, entry.dataKey)}
            </span>
          </div>
        ))}
        {sorted.length > 5 && (
          <div className="text-[9.5px] text-[var(--text-3)] text-center pt-0.5">
            +{sorted.length - 5} more
          </div>
        )}
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

export const GroupedBarChart = memo<GroupedBarChartProps>(({
  data,
  title,
  xAxisKey,
  seriesKeys,
  height = 400,
  showGrid = true,
  animated = true
}) => {
  return (
    <div className="space-y-3">
      <div className="velvet-section-title">{title}</div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
            <defs>
              {seriesKeys.map((key, index) => (
                <linearGradient key={key} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.92} />
                  <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>

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
              dataKey={xAxisKey}
              stroke="currentColor"
              fontSize={10.5}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dy={6}
              className="text-[var(--text-3)]"
            />

            <YAxis
              stroke="currentColor"
              fontSize={10.5}
              axisLine={false}
              tickLine={false}
              dx={-6}
              tickFormatter={(v) => formatChartValue(v)}
              className="text-[var(--text-3)]"
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--bg-tint)', opacity: 0.6 }}
              wrapperStyle={{ outline: 'none' }}
            />

            <Legend
              wrapperStyle={{
                paddingTop: '12px',
                fontSize: '10.5px',
                fontWeight: 500,
                color: 'var(--text-2)',
              }}
              iconType="circle"
              iconSize={6}
            />

            {seriesKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`url(#gradient-${index})`}
                animationDuration={animated ? 800 : 0}
                radius={[8, 8, 0, 0]}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

GroupedBarChart.displayName = 'GroupedBarChart';
