import { memo, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { formatChartValue, formatChartAxis } from '@/lib/format';

const formatComboDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

interface ComboChartProps {
  data: any[];
  title: string;
  barKey: string;
  lineKey: string;
  barName: string;
  lineName: string;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
  barColor?: string;
  lineColor?: string;
}

const CustomTooltip = memo(({ active, payload, label, colors }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-panel)]/98 backdrop-blur-2xl shadow-[var(--shadow-velvet)] px-3 py-2.5 min-w-[190px] max-w-[260px]">
      <div className="text-[11px] font-semibold text-[var(--text-1)] mb-2 pb-1.5 border-b border-[var(--line)]">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => {
          const color = colors?.[entry.dataKey] || entry.color || '#888';
          return (
            <div key={i} className="flex items-center justify-between gap-3 leading-none py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}50`,
                  }}
                />
                <span className="text-[11px] text-[var(--text-2)] truncate">
                  {entry.name}
                </span>
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-[var(--text-1)]">
                {formatChartValue(entry.value, entry.dataKey || entry.name)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'ComboTooltip';

export const ComboChart = memo<ComboChartProps>(({
  data,
  title,
  barKey,
  lineKey,
  barName,
  lineName,
  xAxisKey = 'date',
  height = 400,
  showGrid = true,
  animated = true,
  barColor = '#7c6feb',
  lineColor = '#c462a0',
}) => {
  const uniqueId = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  const colorMap = useMemo(() => ({
    [barKey]: barColor,
    [lineKey]: lineColor,
  }), [barKey, lineKey, barColor, lineColor]);

  /* Compute average for reference line */
  const avgLine = useMemo(() => {
    if (!data.length) return null;
    const vals = data.map(d => Number(d[lineKey]) || 0).filter(v => v > 0);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [data, lineKey]);

  return (
    <div className="space-y-3">
      <div className="velvet-section-title">{title}</div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -8, bottom: 8 }}>
            <defs>
              <linearGradient id={`cbar-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={barColor} stopOpacity={0.92} />
                <stop offset="50%" stopColor={barColor} stopOpacity={0.72} />
                <stop offset="100%" stopColor={barColor} stopOpacity={0.45} />
              </linearGradient>
              <filter id={`cglow-${uniqueId}`}>
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {showGrid && (
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--line)"
                strokeOpacity={0.5}
                vertical={false}
              />
            )}

            {avgLine !== null && (
              <ReferenceLine
                yAxisId="right"
                y={avgLine}
                stroke={lineColor}
                strokeDasharray="4 4"
                strokeOpacity={0.35}
                label={{
                  value: 'avg',
                  position: 'right',
                  fill: lineColor,
                  fontSize: 9,
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              />
            )}

            <XAxis
              dataKey={xAxisKey}
              tickFormatter={formatComboDate}
              stroke="var(--line)"
              fontSize={10}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dy={6}
              tick={{ fill: 'var(--text-3)' }}
            />

            <YAxis
              yAxisId="left"
              stroke="var(--line)"
              fontSize={10}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dx={-6}
              tickFormatter={(v) => formatChartAxis(v)}
              tick={{ fill: 'var(--text-3)' }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--line)"
              fontSize={10}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dx={6}
              tickFormatter={(v) => formatChartValue(v, lineKey)}
              tick={{ fill: 'var(--text-3)' }}
            />

            <Tooltip
              content={<CustomTooltip colors={colorMap} />}
              cursor={{ fill: 'var(--bg-tint)', opacity: 0.5, radius: 6 }}
              wrapperStyle={{ outline: 'none' }}
            />

            <Bar
              yAxisId="left"
              dataKey={barKey}
              fill={`url(#cbar-${uniqueId})`}
              name={barName}
              animationDuration={animated ? 900 : 0}
              animationEasing="ease-out"
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey={lineKey}
              stroke={lineColor}
              strokeWidth={2.5}
              name={lineName}
              dot={false}
              activeDot={{
                r: 5,
                fill: lineColor,
                stroke: 'var(--bg-panel)',
                strokeWidth: 2.5,
                filter: `url(#cglow-${uniqueId})`,
              }}
              animationDuration={animated ? 900 : 0}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

ComboChart.displayName = 'ComboChart';
