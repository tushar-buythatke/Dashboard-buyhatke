import { memo, useMemo, useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ComposedChart, ReferenceLine,
} from 'recharts';
import { Plane, TrendingUp, CheckSquare, Square } from 'lucide-react';
import { TrendChartSeries } from '@/types';
import { formatChartValue, formatChartAxis } from '@/lib/format';
import { useTheme } from '@/context/ThemeContext';
import {
  useHaloChartPalette, seriesColor, haloGradientId,
  haloGridProps, haloXAxisProps, haloYAxisProps, haloBarProps, haloLineProps,
  haloBarCursor, haloLineCursor, HaloBarGradient, HaloAreaGradient, HaloTooltip,
  HaloChartEmpty,
} from './chartTheme';

export type ChartType = 'line' | 'bar' | 'area';

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
  chartType?: ChartType;
}

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatFullDate = (dateStr: string | number) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
};

/* ── Main Chart ── */
export const TrendChart = memo<TrendChartProps>(({
  series,
  title,
  dataKey = 'impressions',
  height = 380,
  showGrid = true,
  animated = true,
  enableSeriesFilters: _enableSeriesFilters = false,
  enablePlatformFilter: _enablePlatformFilter = false,
  chartType = 'line',
}) => {
  const { theme } = useTheme();
  const palette = useHaloChartPalette(theme);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [showCombined, setShowCombined] = useState(false);
  const uniqueId = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  const isCTR = dataKey === 'ctr';

  const seriesColorMap = useMemo(() => {
    const map = new Map(series.map((item, index) => [item.name, seriesColor(palette, index)]));
    map.set('Combined Total', palette.series[0]);
    return map;
  }, [series, palette]);

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
        if (isCTR) {
          entry[`${s.name}__imp`] = point.impressions || 0;
          entry[`${s.name}__clk`] = point.clicks || 0;
        }
      });
    });

    const data = Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return { combinedData: data, seriesNames: names };
  }, [series, dataKey, isCTR]);

  const toggleSeries = useCallback((name: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setHiddenSeries(new Set()), []);
  const hideAll = useCallback(() => {
    setHiddenSeries(new Set(seriesNames));
  }, [seriesNames]);

  const visibleNames = useMemo(
    () => seriesNames.filter(n => !hiddenSeries.has(n)),
    [seriesNames, hiddenSeries]
  );

  /* ── Combined total data ── */
  const chartData = useMemo(() => {
    if (!showCombined || visibleNames.length < 2) return combinedData;
    return combinedData.map((point: any) => {
      if (isCTR) {
        const totalImp = visibleNames.reduce((sum, name) => sum + (point[`${name}__imp`] || 0), 0);
        const totalClk = visibleNames.reduce((sum, name) => sum + (point[`${name}__clk`] || 0), 0);
        return { ...point, __combined: totalImp > 0 ? (totalClk / totalImp) * 100 : 0 };
      }
      const combined = visibleNames.reduce((sum, name) => sum + (point[name] || 0), 0);
      return { ...point, __combined: combined };
    });
  }, [combinedData, showCombined, visibleNames, isCTR]);

  const useArea = visibleNames.length === 1;
  const singleColor = useArea ? (seriesColorMap.get(visibleNames[0]) || palette.series[0]) : null;

  /* ── Dynamic Y-axis domain for CTR ── */
  const yDomain = useMemo(() => {
    if (!isCTR || !chartData.length) return undefined;
    let min = Infinity;
    let max = -Infinity;
    visibleNames.forEach(name => {
      chartData.forEach((d: any) => {
        const v = d[name];
        if (v != null && v > 0) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });
    if (showCombined) {
      chartData.forEach((d: any) => {
        const v = d.__combined;
        if (v != null && v > 0) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    }
    if (min === Infinity || max === -Infinity) return undefined;
    const padding = Math.max((max - min) * 0.15, 0.5);
    return [Math.max(0, min - padding), max + padding];
  }, [isCTR, chartData, visibleNames, showCombined]);

  const avgValue = useMemo(() => {
    if (!chartData.length || !visibleNames.length) return null;
    const primaryName = visibleNames[0];
    const vals = chartData.map((d: any) => d[primaryName] || 0).filter((v: number) => v > 0);
    if (!vals.length) return null;
    return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
  }, [chartData, visibleNames]);

  const formatYAxis = (v: any) => {
    if (isCTR) return `${Number(v).toFixed(1)}%`;
    return formatChartAxis(v);
  };

  const tooltipContent = useCallback(
    (props: any) => (
      <HaloTooltip
        {...props}
        labelFormatter={formatFullDate}
        valueFormatter={(value) => formatChartValue(value as number, isCTR ? 'ctr' : dataKey)}
        colorForEntry={(entry) => seriesColorMap.get(String(entry.name)) || palette.series[0]}
      />
    ),
    [seriesColorMap, palette, dataKey, isCTR]
  );

  /* ── Empty state ── */
  if (!combinedData.length) {
    return (
      <div className="space-y-3">
        <h3 className="halo-heading">{title}</h3>
        <HaloChartEmpty
          height={height}
          icon={/landing/i.test(title) ? Plane : TrendingUp}
          title="No trend data available"
          subtitle="Try a different date range or campaign"
        />
      </div>
    );
  }

  const allVisible = hiddenSeries.size === 0;
  const noneVisible = visibleNames.length === 0;

  return (
    <div className="space-y-3">
      {/* Header + Interactive Legend */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="halo-heading flex-shrink-0">{title}</h3>
        {seriesNames.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap justify-end min-w-0">
            <button
              onClick={allVisible ? hideAll : selectAll}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold text-[var(--h-iris-600)] hover:bg-[var(--h-tint)] transition-all mr-1 flex-shrink-0"
            >
              {allVisible ? (
                <CheckSquare className="h-3 w-3" strokeWidth={1.75} />
              ) : (
                <Square className="h-3 w-3" strokeWidth={1.75} />
              )}
              {allVisible ? 'Hide all' : 'Show all'}
            </button>

            <div className="w-px h-3 bg-[var(--h-line)] mx-0.5 flex-shrink-0" />

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
            <div className="w-px h-3 bg-[var(--h-line)] mx-0.5 flex-shrink-0" />

            {seriesNames.map((name) => {
              const color = seriesColorMap.get(name) || palette.series[0];
              const isHidden = hiddenSeries.has(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleSeries(name)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-200 flex-shrink-0 ${
                    isHidden ? 'opacity-40 hover:opacity-70' : 'hover:bg-[var(--h-tint)]'
                  }`}
                  title={isHidden ? `Show ${name}` : `Hide ${name}`}
                >
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0 transition-transform duration-200"
                    style={{
                      backgroundColor: isHidden ? 'var(--h-ink-3)' : color,
                      transform: isHidden ? 'scale(0.7)' : 'scale(1)',
                    }}
                  />
                  <span className={`truncate max-w-[6.5rem] ${isHidden ? 'text-[var(--h-ink-3)] line-through decoration-1' : 'text-[var(--h-ink-2)]'}`}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ height, width: '100%' }}>
        {noneVisible ? (
          <div className="flex items-center justify-center h-full text-[12px] text-[var(--h-ink-3)]">
            Select at least one series to display
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              /* ── Bar Chart ── */
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  {visibleNames.map((name, idx) => (
                    <HaloBarGradient
                      key={`bg${idx}`}
                      id={haloGradientId('bar', uniqueId, idx)}
                      color={seriesColorMap.get(name) || palette.series[0]}
                    />
                  ))}
                  <HaloBarGradient id={haloGradientId('bar-c', uniqueId)} color={palette.series[0]} />
                </defs>

                {showGrid && <CartesianGrid {...haloGridProps} />}

                {avgValue !== null && (
                  <ReferenceLine
                    y={avgValue}
                    stroke="var(--h-ink-3)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{ value: 'avg', position: 'insideTopRight', offset: 6, fill: 'var(--h-ink-3)', fontSize: 9, fontWeight: 500 }}
                  />
                )}

                <XAxis dataKey="date" tickFormatter={formatDate} {...haloXAxisProps} />
                <YAxis domain={yDomain} tickFormatter={formatYAxis} {...haloYAxisProps} />
                <Tooltip content={tooltipContent} cursor={haloBarCursor} wrapperStyle={{ outline: 'none' }} />

                {visibleNames.map((name, idx) => (
                  <Bar
                    key={`b-${idx}`}
                    dataKey={name}
                    fill={`url(#${haloGradientId('bar', uniqueId, idx)})`}
                    animationDuration={animated ? 600 : 0}
                    isAnimationActive={animated}
                    {...haloBarProps}
                  />
                ))}
                {showCombined && (
                  <Bar
                    dataKey="__combined"
                    fill={`url(#${haloGradientId('bar-c', uniqueId)})`}
                    name="Combined Total"
                    animationDuration={animated ? 600 : 0}
                    isAnimationActive={animated}
                    {...haloBarProps}
                  />
                )}
              </BarChart>
            ) : chartType === 'area' ? (
              /* ── Area Chart ── */
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  {visibleNames.map((name, idx) => (
                    <HaloAreaGradient
                      key={`af${idx}`}
                      id={haloGradientId('area', uniqueId, idx)}
                      color={seriesColorMap.get(name) || palette.series[0]}
                    />
                  ))}
                  <HaloAreaGradient id={haloGradientId('area-c', uniqueId)} color={palette.series[0]} />
                </defs>

                {showGrid && <CartesianGrid {...haloGridProps} />}

                {avgValue !== null && (
                  <ReferenceLine
                    y={avgValue}
                    stroke="var(--h-ink-3)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{ value: 'avg', position: 'insideTopRight', offset: 6, fill: 'var(--h-ink-3)', fontSize: 9, fontWeight: 500 }}
                  />
                )}

                <XAxis dataKey="date" tickFormatter={formatDate} {...haloXAxisProps} />
                <YAxis domain={yDomain} tickFormatter={formatYAxis} {...haloYAxisProps} />
                <Tooltip content={tooltipContent} cursor={haloLineCursor} />

                {visibleNames.map((name, idx) => {
                  const color = seriesColorMap.get(name) || palette.series[0];
                  return (
                    <Area
                      key={`a-${idx}`}
                      type="monotone"
                      dataKey={name}
                      stroke={color}
                      fill={`url(#${haloGradientId('area', uniqueId, idx)})`}
                      animationDuration={animated ? 600 : 0}
                      isAnimationActive={animated}
                      {...haloLineProps(color, palette)}
                    />
                  );
                })}
                {showCombined && (
                  <Area
                    type="monotone"
                    dataKey="__combined"
                    stroke={palette.series[0]}
                    strokeDasharray="6 3"
                    fill={`url(#${haloGradientId('area-c', uniqueId)})`}
                    animationDuration={animated ? 600 : 0}
                    isAnimationActive={animated}
                    name="Combined Total"
                    {...haloLineProps(palette.series[0], palette)}
                  />
                )}
              </ComposedChart>
            ) : useArea ? (
              /* ── Single-series Line → Area ── */
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <HaloAreaGradient id={haloGradientId('single-area', uniqueId)} color={singleColor!} />
                  <HaloAreaGradient id={haloGradientId('single-area-c', uniqueId)} color={palette.series[0]} />
                </defs>

                {showGrid && <CartesianGrid {...haloGridProps} />}

                {avgValue !== null && (
                  <ReferenceLine
                    y={avgValue}
                    stroke="var(--h-ink-3)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{ value: 'avg', position: 'insideTopRight', offset: 6, fill: 'var(--h-ink-3)', fontSize: 9, fontWeight: 500 }}
                  />
                )}

                <XAxis dataKey="date" tickFormatter={formatDate} {...haloXAxisProps} />
                <YAxis domain={yDomain} tickFormatter={formatYAxis} {...haloYAxisProps} />
                <Tooltip content={tooltipContent} cursor={haloLineCursor} />

                <Area
                  type="monotone"
                  dataKey={visibleNames[0]}
                  stroke={singleColor!}
                  fill={`url(#${haloGradientId('single-area', uniqueId)})`}
                  animationDuration={animated ? 600 : 0}
                  isAnimationActive={animated}
                  {...haloLineProps(singleColor!, palette)}
                />
                {showCombined && (
                  <Line
                    type="monotone"
                    dataKey="__combined"
                    stroke={palette.series[0]}
                    strokeDasharray="6 3"
                    animationDuration={animated ? 600 : 0}
                    isAnimationActive={animated}
                    name="Combined Total"
                    {...haloLineProps(palette.series[0], palette)}
                  />
                )}
              </ComposedChart>
            ) : (
              /* ── Multi-series Line ── */
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                {showGrid && <CartesianGrid {...haloGridProps} />}

                <XAxis dataKey="date" tickFormatter={formatDate} {...haloXAxisProps} />
                <YAxis domain={yDomain} tickFormatter={formatYAxis} {...haloYAxisProps} />
                <Tooltip content={tooltipContent} cursor={haloLineCursor} />

                {visibleNames.map((seriesName) => {
                  const color = seriesColorMap.get(seriesName) || palette.series[0];
                  // With many series, every line rendering its own hover dot at
                  // once piles up into an unreadable stack near the axis. The
                  // tooltip already lists every series by value, so past a
                  // handful of lines the per-line dot adds noise, not information.
                  const tooManySeriesForDots = visibleNames.length > 8;
                  return (
                    <Line
                      key={seriesName}
                      type="monotone"
                      dataKey={seriesName}
                      stroke={color}
                      animationDuration={animated ? 600 : 0}
                      isAnimationActive={animated}
                      {...haloLineProps(color, palette)}
                      activeDot={tooManySeriesForDots ? false : haloLineProps(color, palette).activeDot}
                    />
                  );
                })}
                {showCombined && (
                  <Line
                    type="monotone"
                    dataKey="__combined"
                    stroke={palette.series[0]}
                    strokeDasharray="6 3"
                    animationDuration={animated ? 600 : 0}
                    isAnimationActive={animated}
                    name="Combined Total"
                    {...haloLineProps(palette.series[0], palette)}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';
