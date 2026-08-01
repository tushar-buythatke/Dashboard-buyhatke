import { memo, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatChartValue, formatChartAxis } from '@/lib/format';
import { useTheme } from '@/context/ThemeContext';
import {
  useHaloChartPalette, seriesColor, haloGradientId, haloGridProps, haloXAxisProps,
  haloYAxisProps, haloBarProps, haloBarCursor, HaloBarGradient, HaloTooltip, HaloChartEmpty,
} from './chartTheme';

interface GroupedBarChartProps {
  data: any[];
  title: string;
  xAxisKey: string;
  seriesKeys: string[];
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
}

export const GroupedBarChart = memo<GroupedBarChartProps>(({
  data,
  title,
  xAxisKey,
  seriesKeys,
  height = 400,
  showGrid = true,
  animated = true
}) => {
  const { theme } = useTheme();
  const palette = useHaloChartPalette(theme);
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

  const colorMap = useMemo(
    () => new Map(seriesKeys.map((key, index) => [key, seriesColor(palette, index)])),
    [seriesKeys, palette]
  );

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
      <div className="flex items-center justify-between gap-3">
        <h3 className="halo-heading flex-shrink-0">{title}</h3>
        <button
          onClick={() => setShowCombined(prev => !prev)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 flex-shrink-0 ${
            showCombined
              ? 'bg-[var(--h-iris-500)] text-white'
              : 'text-[var(--h-iris-600)] hover:bg-[var(--h-tint)]'
          }`}
        >
          <span className="inline-block h-1.5 w-3 rounded-sm" style={{
            background: showCombined ? '#fff' : 'var(--h-g-spectrum)',
          }} />
          Combined
        </button>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -8, bottom: 8 }}>
            <defs>
              {seriesKeys.map((key, index) => (
                <HaloBarGradient
                  key={key}
                  id={haloGradientId('gbar', uniqueId, index)}
                  color={seriesColor(palette, index)}
                />
              ))}
              <HaloBarGradient id={haloGradientId('gbar-c', uniqueId)} color={palette.series[0]} />
            </defs>

            {showGrid && <CartesianGrid {...haloGridProps} />}

            <XAxis dataKey={xAxisKey} {...haloXAxisProps} />
            <YAxis tickFormatter={(v) => formatChartAxis(v)} {...haloYAxisProps} />

            <Tooltip
              content={(props) => (
                <HaloTooltip
                  {...props}
                  valueFormatter={(value, entry) => formatChartValue(value as number, String(entry.dataKey))}
                  colorForEntry={(entry) => colorMap.get(String(entry.dataKey)) || palette.series[0]}
                />
              )}
              cursor={haloBarCursor}
              wrapperStyle={{ outline: 'none' }}
            />

            {seriesKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`url(#${haloGradientId('gbar', uniqueId, index)})`}
                animationDuration={animated ? 600 : 0}
                isAnimationActive={animated}
                {...haloBarProps}
              />
            ))}
            {showCombined && (
              <Bar
                dataKey="__combined"
                fill={`url(#${haloGradientId('gbar-c', uniqueId)})`}
                name="Combined Total"
                animationDuration={animated ? 600 : 0}
                isAnimationActive={animated}
                opacity={0.6}
                {...haloBarProps}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

GroupedBarChart.displayName = 'GroupedBarChart';
