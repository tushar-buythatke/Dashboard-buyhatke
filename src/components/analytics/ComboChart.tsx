import { memo, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { formatChartValue, formatChartAxis } from '@/lib/format';
import { useTheme } from '@/context/ThemeContext';
import {
  useHaloChartPalette, haloGradientId, haloGridProps, haloXAxisProps, haloYAxisProps,
  haloBarProps, haloLineProps, haloBarCursor, HaloBarGradient, HaloTooltip, HaloChartEmpty,
} from './chartTheme';

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
  barColor,
  lineColor,
}) => {
  const { theme } = useTheme();
  const palette = useHaloChartPalette(theme);
  const uniqueId = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  const resolvedBarColor = barColor || palette.series[0];
  const resolvedLineColor = lineColor || palette.series[1];

  const colorMap = useMemo(() => ({
    [barKey]: resolvedBarColor,
    [lineKey]: resolvedLineColor,
  }), [barKey, lineKey, resolvedBarColor, resolvedLineColor]);

  /* Compute average for reference line */
  const avgLine = useMemo(() => {
    if (!data.length) return null;
    const vals = data.map(d => Number(d[lineKey]) || 0).filter(v => v > 0);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [data, lineKey]);

  if (!data || data.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="halo-heading">{title}</h3>
        <HaloChartEmpty height={height} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="halo-heading">{title}</h3>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -8, bottom: 8 }}>
            <defs>
              <HaloBarGradient id={haloGradientId('combo-bar', uniqueId)} color={resolvedBarColor} />
            </defs>

            {showGrid && <CartesianGrid {...haloGridProps} />}

            {avgLine !== null && (
              <ReferenceLine
                yAxisId="right"
                y={avgLine}
                stroke={resolvedLineColor}
                strokeDasharray="4 4"
                strokeOpacity={0.4}
                label={{
                  value: 'avg',
                  position: 'right',
                  fill: resolvedLineColor,
                  fontSize: 9,
                  fontWeight: 500,
                  opacity: 0.8,
                }}
              />
            )}

            <XAxis dataKey={xAxisKey} tickFormatter={formatComboDate} {...haloXAxisProps} />

            <YAxis yAxisId="left" tickFormatter={(v) => formatChartAxis(v)} {...haloYAxisProps} />

            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => formatChartValue(v, lineKey)}
              {...haloAxisPropsRight()}
            />

            <Tooltip
              content={(props) => (
                <HaloTooltip
                  {...props}
                  valueFormatter={(value, entry) => formatChartValue(value as number, String(entry.dataKey))}
                  colorForEntry={(entry) => colorMap[String(entry.dataKey)] || resolvedBarColor}
                />
              )}
              cursor={haloBarCursor}
              wrapperStyle={{ outline: 'none' }}
            />

            <Bar
              yAxisId="left"
              dataKey={barKey}
              fill={`url(#${haloGradientId('combo-bar', uniqueId)})`}
              name={barName}
              animationDuration={animated ? 600 : 0}
              isAnimationActive={animated}
              {...haloBarProps}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey={lineKey}
              stroke={resolvedLineColor}
              name={lineName}
              animationDuration={animated ? 600 : 0}
              isAnimationActive={animated}
              {...haloLineProps(resolvedLineColor, palette)}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

// Right-side axis needs its own dx (mirrors haloYAxisProps but flips the offset).
function haloAxisPropsRight() {
  return {
    axisLine: false,
    tickLine: false,
    tick: { fontSize: 11, fill: 'var(--h-ink-3)' },
    dx: 4,
  } as const;
}

ComboChart.displayName = 'ComboChart';
