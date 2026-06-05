import { memo, useMemo, useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ComposedChart, ReferenceLine,
} from 'recharts';
import { Plane, TrendingUp, CheckSquare, Square } from 'lucide-react';
import { TrendChartSeries } from '@/types';
import { formatChartValue, formatChartAxis } from '@/lib/format';

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

const PALETTE = [
  '#7c6feb', '#d94684', '#38bdf8', '#2dd4bf',
  '#fbbf24', '#a99df5', '#f472b6', '#60a5fa',
];
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

const formatFullDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

/* ── Premium Tooltip ── */
const CustomTooltip = memo(({ active, payload, label, dataKey, colorMap }: any) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  const visible = sorted.slice(0, 8);
  const overflow = sorted.length - visible.length;
  const total = sorted.reduce((sum: number, e: any) => sum + (e.value || 0), 0);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-panel)]/98 backdrop-blur-2xl shadow-[var(--shadow-velvet)] px-3 py-2.5 min-w-[210px] max-w-[300px]">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--line)]">
        <span className="text-[11px] font-semibold text-[var(--text-1)]">
          {formatFullDate(label)}
        </span>
        {sorted.length > 1 && dataKey !== 'ctr' && (
          <span className="text-[9.5px] font-medium text-[var(--text-3)] tabular-nums">
            Σ {formatChartValue(total, dataKey)}
          </span>
        )}
      </div>
      <div className={`space-y-1 ${sorted.length > 6 ? 'max-h-[160px] overflow-y-auto scrollbar-thin pr-1' : ''}`}>
        {visible.map((entry: any, i: number) => {
          const pct = total > 0 ? ((entry.value || 0) / total * 100).toFixed(1) : '0';
          const dotColor = colorMap?.[entry.name] || entry.color || '#888';
          return (
            <div key={i} className="flex items-center justify-between gap-3 leading-none py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: dotColor,
                    boxShadow: `0 0 6px ${dotColor}50`,
                  }}
                />
                <span className="text-[11px] text-[var(--text-2)] truncate">
                  {entry.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {dataKey !== 'ctr' && (
                  <span className="text-[9.5px] text-[var(--text-3)] tabular-nums w-8 text-right">
                    {pct}%
                  </span>
                )}
                <span className="text-[11px] font-semibold tabular-nums text-[var(--text-1)] min-w-[52px] text-right">
                  {formatChartValue(entry.value, dataKey)}
                </span>
              </div>
            </div>
          );
        })}
        {overflow > 0 && (
          <div className="text-[9.5px] text-[var(--text-3)] text-center pt-1 border-t border-[var(--line)]">
            +{overflow} more series
          </div>
        )}
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

/* ── Main Chart ── */
export const TrendChart = memo<TrendChartProps>(({
  series,
  title,
  dataKey = 'impressions',
  height = 380,
  showGrid = true,
  animated = true,
  period = '7d',
  enableSeriesFilters = false,
  enablePlatformFilter = false,
  chartType = 'line',
}) => {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [showCombined, setShowCombined] = useState(false);
  const uniqueId = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  const isCTR = dataKey === 'ctr';

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
        // Store raw impressions & clicks for correct CTR combination
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
        // Correct CTR: total clicks / total impressions
        const totalImp = visibleNames.reduce((sum, name) => sum + (point[`${name}__imp`] || 0), 0);
        const totalClk = visibleNames.reduce((sum, name) => sum + (point[`${name}__clk`] || 0), 0);
        return { ...point, __combined: totalImp > 0 ? (totalClk / totalImp) * 100 : 0 };
      }
      const combined = visibleNames.reduce((sum, name) => sum + (point[name] || 0), 0);
      return { ...point, __combined: combined };
    });
  }, [combinedData, showCombined, visibleNames, isCTR]);

  const useArea = visibleNames.length === 1;
  const singleColor = useArea ? (seriesColorMap.get(visibleNames[0]) || PALETTE[0]) : null;

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

  /* ── Empty state ── */
  if (!combinedData.length) {
    return (
      <div className="space-y-3">
        <div className="velvet-section-title">{title}</div>
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
      </div>
    );
  }

  const allVisible = hiddenSeries.size === 0;
  const noneVisible = visibleNames.length === 0;

  const gridProps = showGrid ? { strokeDasharray: '0', stroke: 'var(--line)', strokeOpacity: 0.5, vertical: false } : undefined;

  return (
    <div className="space-y-3">
      {/* Header + Interactive Legend */}
      <div className="flex items-center justify-between gap-3">
        <div className="velvet-section-title flex-shrink-0">{title}</div>
        {seriesNames.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap justify-end min-w-0">
            <button
              onClick={allVisible ? hideAll : selectAll}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-[var(--violet-500)] hover:bg-[var(--bg-tint)] transition-all mr-1 flex-shrink-0"
            >
              {allVisible ? (
                <CheckSquare className="h-3 w-3" />
              ) : (
                <Square className="h-3 w-3" />
              )}
              {allVisible ? 'Hide all' : 'Show all'}
            </button>

            <div className="w-px h-3 bg-[var(--line)] mx-0.5 flex-shrink-0" />

            {seriesNames.length > 1 && (
              <>
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
                <div className="w-px h-3 bg-[var(--line)] mx-0.5 flex-shrink-0" />
              </>
            )}

            {seriesNames.map((name) => {
              const color = seriesColorMap.get(name) || PALETTE[0];
              const isHidden = hiddenSeries.has(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleSeries(name)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 flex-shrink-0 ${
                    isHidden
                      ? 'opacity-35 hover:opacity-60'
                      : 'hover:bg-[var(--bg-tint)]'
                  }`}
                  title={isHidden ? `Show ${name}` : `Hide ${name}`}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all duration-200"
                    style={{
                      backgroundColor: isHidden ? 'var(--text-3)' : color,
                      boxShadow: isHidden ? 'none' : `0 0 6px ${color}50`,
                      transform: isHidden ? 'scale(0.65)' : 'scale(1)',
                    }}
                  />
                  <span className={`truncate max-w-[6.5rem] ${isHidden ? 'text-[var(--text-3)] line-through decoration-1' : 'text-[var(--text-2)]'}`}>
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
        <ResponsiveContainer width="100%" height="100%">
          {noneVisible ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-3)]">
              Select at least one series to display
            </div>
          ) : chartType === 'bar' ? (
            /* ── Bar Chart ── */
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {visibleNames.map((name, idx) => {
                  const color = seriesColorMap.get(name) || PALETTE[0];
                  return (
                    <linearGradient key={`bg${idx}`} id={`bar-g-${uniqueId}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.92} />
                      <stop offset="50%" stopColor={color} stopOpacity={0.72} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.45} />
                    </linearGradient>
                  );
                })}
                <linearGradient id={`bar-c-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COMBINED_TOTAL_COLOR} stopOpacity={0.92} />
                  <stop offset="50%" stopColor={COMBINED_TOTAL_COLOR} stopOpacity={0.72} />
                  <stop offset="100%" stopColor={COMBINED_TOTAL_COLOR} stopOpacity={0.45} />
                </linearGradient>
              </defs>

              {gridProps && <CartesianGrid {...gridProps} />}

              {avgValue !== null && (
                <ReferenceLine
                  y={avgValue}
                  stroke="var(--text-3)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.3}
                  label={{ value: 'avg', position: 'right', fill: 'var(--text-3)', fontSize: 9, fontWeight: 500 }}
                />
              )}

              <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--line)" fontSize={10} fontWeight={500} axisLine={false} tickLine={false} dy={6} tick={{ fill: 'var(--text-3)' }} />
              <YAxis domain={yDomain} stroke="var(--line)" fontSize={10} fontWeight={500} axisLine={false} tickLine={false} tickFormatter={formatYAxis} tick={{ fill: 'var(--text-3)' }} />
              <Tooltip content={<CustomTooltip dataKey={dataKey} colorMap={Object.fromEntries(seriesColorMap)} />} cursor={{ fill: 'var(--bg-tint)', opacity: 0.5, radius: 6 }} wrapperStyle={{ outline: 'none' }} />

              {visibleNames.map((name, idx) => (
                <Bar
                  key={`b-${idx}`}
                  dataKey={name}
                  fill={`url(#bar-g-${uniqueId}-${idx})`}
                  animationDuration={animated ? 900 : 0}
                  animationEasing="ease-out"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
              ))}
              {showCombined && (
                <Bar
                  dataKey="__combined"
                  fill={`url(#bar-c-${uniqueId})`}
                  name="Combined Total"
                  animationDuration={animated ? 900 : 0}
                  animationEasing="ease-out"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
              )}
            </BarChart>
          ) : chartType === 'area' ? (
            /* ── Area Chart ── */
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {visibleNames.map((name, idx) => {
                  const color = seriesColorMap.get(name) || PALETTE[0];
                  return (
                    <linearGradient key={`af${idx}`} id={`af-${uniqueId}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
                <linearGradient id={`af-c-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COMBINED_TOTAL_COLOR} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={COMBINED_TOTAL_COLOR} stopOpacity={0} />
                </linearGradient>
                <filter id={`ag-${uniqueId}`}>
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {gridProps && <CartesianGrid {...gridProps} />}

              {avgValue !== null && (
                <ReferenceLine
                  y={avgValue}
                  stroke="var(--text-3)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.3}
                  label={{ value: 'avg', position: 'right', fill: 'var(--text-3)', fontSize: 9, fontWeight: 500 }}
                />
              )}

              <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--line)" fontSize={10} fontWeight={500} axisLine={false} tickLine={false} dy={6} tick={{ fill: 'var(--text-3)' }} />
              <YAxis domain={yDomain} stroke="var(--line)" fontSize={10} fontWeight={500} axisLine={false} tickLine={false} tickFormatter={formatYAxis} tick={{ fill: 'var(--text-3)' }} />
              <Tooltip content={<CustomTooltip dataKey={dataKey} colorMap={Object.fromEntries(seriesColorMap)} />} cursor={{ stroke: 'var(--violet-400)', strokeWidth: 1.5, strokeDasharray: '4 3', strokeOpacity: 0.5 }} />

              {visibleNames.map((name, idx) => {
                const color = seriesColorMap.get(name) || PALETTE[0];
                return (
                  <Area
                    key={`a-${idx}`}
                    type="monotone"
                    dataKey={name}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#af-${uniqueId}-${idx})`}
                    animationDuration={animated ? 1000 : 0}
                    animationEasing="ease-out"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: color,
                      stroke: 'var(--bg-panel)',
                      strokeWidth: 2.5,
                      filter: `url(#ag-${uniqueId})`,
                    }}
                  />
                );
              })}
              {showCombined && (
                <Area
                  type="monotone"
                  dataKey="__combined"
                  stroke={COMBINED_TOTAL_COLOR}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  fill={`url(#af-c-${uniqueId})`}
                  animationDuration={animated ? 1000 : 0}
                  animationEasing="ease-out"
                  dot={false}
                  activeDot={{ r: 5, fill: COMBINED_TOTAL_COLOR, stroke: 'var(--bg-panel)', strokeWidth: 2.5 }}
                  name="Combined Total"
                />
              )}
            </ComposedChart>
          ) : useArea ? (
            /* ── Single-series Line → Area ── */
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`area-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={singleColor!} stopOpacity={0.35} />
                  <stop offset="40%" stopColor={singleColor!} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={singleColor!} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`combined-area-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COMBINED_TOTAL_COLOR} stopOpacity={0.25} />
                  <stop offset="50%" stopColor={COMBINED_TOTAL_COLOR} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={COMBINED_TOTAL_COLOR} stopOpacity={0} />
                </linearGradient>
                <filter id={`glow-${uniqueId}`}>
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {gridProps && <CartesianGrid {...gridProps} />}

              {avgValue !== null && (
                <ReferenceLine
                  y={avgValue}
                  stroke="var(--text-3)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.3}
                  label={{ value: 'avg', position: 'right', fill: 'var(--text-3)', fontSize: 9, fontWeight: 500 }}
                />
              )}

              <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--line)" fontSize={10} fontWeight={500} axisLine={false} tickLine={false} dy={6} tick={{ fill: 'var(--text-3)' }} />
              <YAxis domain={yDomain} stroke="var(--line)" fontSize={10} fontWeight={500} axisLine={false} tickLine={false} tickFormatter={formatYAxis} tick={{ fill: 'var(--text-3)' }} />
              <Tooltip content={<CustomTooltip dataKey={dataKey} colorMap={Object.fromEntries(seriesColorMap)} />} cursor={{ stroke: 'var(--violet-400)', strokeWidth: 1.5, strokeDasharray: '4 3', strokeOpacity: 0.5 }} />

              <Area
                type="monotone"
                dataKey={visibleNames[0]}
                stroke={singleColor!}
                strokeWidth={3}
                fill={`url(#area-${uniqueId})`}
                animationDuration={animated ? 1000 : 0}
                animationEasing="ease-out"
                dot={false}
                activeDot={{
                  r: 6,
                  fill: singleColor!,
                  stroke: 'var(--bg-panel)',
                  strokeWidth: 3,
                  filter: `url(#glow-${uniqueId})`,
                }}
              />
              {showCombined && (
                <Line
                  type="monotone"
                  dataKey="__combined"
                  stroke={COMBINED_TOTAL_COLOR}
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={{ r: 5.5, fill: COMBINED_TOTAL_COLOR, stroke: 'var(--bg-panel)', strokeWidth: 3 }}
                  animationDuration={animated ? 1000 : 0}
                  animationEasing="ease-out"
                  name="Combined Total"
                />
              )}
            </ComposedChart>
          ) : (
            /* ── Multi-series Line ── */
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <filter id={`line-glow-${uniqueId}`}>
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {gridProps && <CartesianGrid {...gridProps} />}

              <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--line)" fontSize={10} fontWeight={500} axisLine={false} tickLine={false} dy={6} tick={{ fill: 'var(--text-3)' }} />
              <YAxis domain={yDomain} stroke="var(--line)" fontSize={10} fontWeight={500} axisLine={false} tickLine={false} tickFormatter={formatYAxis} tick={{ fill: 'var(--text-3)' }} />
              <Tooltip content={<CustomTooltip dataKey={dataKey} colorMap={Object.fromEntries(seriesColorMap)} />} cursor={{ stroke: 'var(--violet-400)', strokeWidth: 1.5, strokeDasharray: '4 3', strokeOpacity: 0.5 }} />

              {visibleNames.map((seriesName) => {
                const color = seriesColorMap.get(seriesName) || PALETTE[0];
                return (
                  <Line
                    key={seriesName}
                    type="monotone"
                    dataKey={seriesName}
                    stroke={color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 5.5,
                      fill: color,
                      stroke: 'var(--bg-panel)',
                      strokeWidth: 3,
                      filter: `url(#line-glow-${uniqueId})`,
                    }}
                    animationDuration={animated ? 1000 : 0}
                    animationEasing="ease-out"
                  />
                );
              })}
              {showCombined && (
                <Line
                  type="monotone"
                  dataKey="__combined"
                  stroke={COMBINED_TOTAL_COLOR}
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={{ r: 5.5, fill: COMBINED_TOTAL_COLOR, stroke: 'var(--bg-panel)', strokeWidth: 3 }}
                  animationDuration={animated ? 1000 : 0}
                  animationEasing="ease-out"
                  name="Combined Total"
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';
