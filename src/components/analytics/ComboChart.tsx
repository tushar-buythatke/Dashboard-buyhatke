import { memo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatChartValue } from '@/lib/format';

interface ComboChartProps {
  data: any[];
  title: string;
  barKey: string;
  lineKey: string;
  barName: string;
  lineName: string;
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
  barColor?: string;
  lineColor?: string;
}

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-panel)]/95 backdrop-blur-xl shadow-[var(--shadow-3)] px-2.5 py-1.5 min-w-[170px] max-w-[230px]">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] mb-1 leading-tight">
        {label}
      </div>
      <div className="space-y-0.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-2 leading-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className="text-[10.5px] text-[var(--text-2)] truncate">
                {entry.name}
              </span>
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-[var(--text-1)]">
              {formatChartValue(entry.value, entry.dataKey || entry.name)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

export const ComboChart = memo<ComboChartProps>(({
  data,
  title,
  barKey,
  lineKey,
  barName,
  lineName,
  height = 400,
  showGrid = true,
  animated = true,
  barColor = '#7c6feb',
  lineColor = '#c462a0',
}) => {
  return (
    <div className="space-y-3">
      <div className="velvet-section-title">{title}</div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={barColor} stopOpacity={0.85} />
                <stop offset="100%" stopColor={barColor} stopOpacity={0.45} />
              </linearGradient>
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
              dataKey="period"
              stroke="currentColor"
              fontSize={10.5}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dy={6}
              className="text-[var(--text-3)]"
            />

            <YAxis
              yAxisId="left"
              stroke="currentColor"
              fontSize={10.5}
              axisLine={false}
              tickLine={false}
              dx={-6}
              tickFormatter={(v) => formatChartValue(v)}
              className="text-[var(--text-3)]"
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="currentColor"
              fontSize={10.5}
              axisLine={false}
              tickLine={false}
              dx={6}
              tickFormatter={(v) => formatChartValue(v, lineKey)}
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

            <Bar
              yAxisId="left"
              dataKey={barKey}
              fill="url(#barGradient)"
              name={barName}
              animationDuration={animated ? 800 : 0}
              radius={[8, 8, 0, 0]}
              maxBarSize={32}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey={lineKey}
              stroke={lineColor}
              strokeWidth={2}
              name={lineName}
              dot={false}
              activeDot={{
                r: 4,
                fill: lineColor,
                stroke: 'var(--bg-panel)',
                strokeWidth: 2,
              }}
              animationDuration={animated ? 800 : 0}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

ComboChart.displayName = 'ComboChart';
