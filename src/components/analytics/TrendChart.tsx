import { memo, useMemo, useState, useEffect, Fragment } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendDataPoint, TrendChartSeries } from '@/types';
import { Badge } from '@/components/ui/badge';


interface TrendChartProps {
  series: TrendChartSeries[];
  title: string;
  dataKey?: 'impressions' | 'clicks' | 'ctr';
  yAxisLabel?: string;
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
  period?: '1d' | '7d' | '30d'; // The original data period from API
  enableSeriesFilters?: boolean;
  enablePlatformFilter?: boolean;
}

// View periods available for display toggle
type ViewPeriod = '1d' | '7d' | '30d';

// Helper function to group data by view period
const groupDataByPeriod = (data: TrendDataPoint[], viewPeriod: ViewPeriod): TrendDataPoint[] => {
  if (!data.length) return data;

  const grouped = new Map<string, TrendDataPoint>();

  data.forEach(point => {
    const date = new Date(point.date);
    if (isNaN(date.getTime())) return;

    let groupKey: string;

    switch (viewPeriod) {
      case '1d': // Daily - keep individual days
        groupKey = point.date;
        break;

      case '7d': // Weekly - group by week starting Sunday
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        groupKey = weekStart.toISOString().split('T')[0];
        break;

      case '30d': // Monthly - group by first day of month
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthStart = new Date(year, month, 1);
        groupKey = monthStart.toISOString().split('T')[0];
        break;
    }

    if (grouped.has(groupKey)) {
      // Aggregate the data
      const existing = grouped.get(groupKey)!;
      existing.impressions += point.impressions;
      existing.clicks += point.clicks;
      existing.conversions += point.conversions;
      existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
      existing.conversionRate = existing.clicks > 0 ? (existing.conversions / existing.clicks) * 100 : 0;
    } else {
      // Create new group
      grouped.set(groupKey, {
        date: groupKey,
        impressions: point.impressions,
        clicks: point.clicks,
        conversions: point.conversions,
        ctr: point.impressions > 0 ? (point.clicks / point.impressions) * 100 : 0,
        conversionRate: point.clicks > 0 ? (point.conversions / point.clicks) * 100 : 0
      });
    }
  });

  // Convert back to array and sort
  return Array.from(grouped.values()).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
};

const PALETTE = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];
const COMBINED_TOTAL_COLOR = '#ec4899'; // pink-500
const COMBINED_TOTAL_GREY = '#94a3b8';  // slate-400 — base layer for grey+pink dash effect

const getSeriesPlatform = (seriesName: string): string | null => {
  const parts = seriesName.split(' • ').map((part) => part.trim()).filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const platformPart = parts[1];
  return platformPart.startsWith('#') ? null : platformPart;
};

const getSeriesShortLabel = (seriesName: string): string => {
  const [label] = seriesName.split(' • ');
  return label?.trim() || seriesName;
};

const getFilterChipClasses = (active: boolean) => {
  return active
    ? 'border-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 hover:opacity-95'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700';
};

const getSeriesChipClasses = (active: boolean) => {
  return active
    ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 text-indigo-900 shadow-sm ring-2 ring-indigo-100 dark:border-indigo-700 dark:from-indigo-950/60 dark:via-slate-900 dark:to-violet-950/50 dark:text-indigo-100 dark:ring-indigo-900/40'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700';
};

const formatDisplayDate = (dateStr: string, viewPeriod?: ViewPeriod) => {
  try {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      return dateStr;
    }

    switch (viewPeriod) {
      case '1d':
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      case '7d': {
        const weekStart = new Date(date);
        const weekEnd = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekEnd.setDate(weekStart.getDate() + 6);
        return `Week of ${weekStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })} - ${weekEnd.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}`;
      }
      case '30d':
        return date.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });
      default:
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
    }
  } catch (error) {
    console.warn('Error formatting display date:', dateStr, error);
    return dateStr;
  }
};

const formatMetricValue = (value: number, dataKey: 'impressions' | 'clicks' | 'ctr') => {
  if (dataKey === 'ctr') {
    return Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  }

  return Math.round(Number(value || 0)).toLocaleString();
};

const CustomTooltip = memo(({ active, payload, label, viewPeriod, dataKey }: any) => {
  if (!active || !payload?.length) return null;

  // Sort entries by value in descending order
  const sortedPayload = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-4 min-w-[220px] max-w-[350px] max-h-[400px] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {formatDisplayDate(label, viewPeriod)}
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
          {sortedPayload.length} Series
        </Badge>
      </div>
      <div className="space-y-2.5">
        {sortedPayload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 group">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {entry.name}
              </span>
            </div>
            <span className="text-xs font-black text-gray-900 dark:text-white pl-2 tabular-nums">
              {formatMetricValue(entry.value, dataKey)}
            </span>
          </div>
        ))}
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
  showGrid = true,
  animated = true,
  period = '7d',
  enableSeriesFilters = false,
  enablePlatformFilter = false
}) => {
  // Local state for view period toggle (independent of the main data grouping filter)
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>(period || '1d');
  const [showCombined, setShowCombined] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [focusedSeries, setFocusedSeries] = useState<string | null>(null);
  const [selectedPointLabel, setSelectedPointLabel] = useState<string | null>(null);

  // Sync viewPeriod with period prop when it changes
  useEffect(() => {
    setViewPeriod(period || '1d');
  }, [period]);

  // Determine available view options based on the fetched data period
  const getAvailableViewOptions = (dataPeriod: string): ViewPeriod[] => {
    switch (dataPeriod) {
      case '1d': // Daily data can be viewed as daily, weekly, or monthly
        return ['1d', '7d', '30d'];
      case '7d': // Weekly data can be viewed as weekly or monthly
        return ['7d', '30d'];
      case '30d': // Monthly data can only be viewed as monthly
        return ['30d'];
      default:
        return ['1d', '7d', '30d'];
    }
  };

  const availableViews = getAvailableViewOptions(period);

  const seriesColorMap = useMemo(() => {
    const map = new Map(series.map((item, index) => [item.name, PALETTE[index % PALETTE.length]]));
    map.set('Combined Total', COMBINED_TOTAL_COLOR);
    return map;
  }, [series]);

  const platformOptions = useMemo(() => {
    const platforms = Array.from(
      new Set(
        series
          .map((item) => getSeriesPlatform(item.name))
          .filter((platform): platform is string => Boolean(platform))
      )
    );

    return platforms.sort((left, right) => left.localeCompare(right));
  }, [series]);

  const platformFilteredSeries = useMemo(() => {
    if (!enablePlatformFilter || selectedPlatform === 'All') {
      return series;
    }

    return series.filter((item) => getSeriesPlatform(item.name) === selectedPlatform);
  }, [enablePlatformFilter, selectedPlatform, series]);

  const visibleSeries = useMemo(() => {
    if (!focusedSeries) {
      return platformFilteredSeries;
    }

    return platformFilteredSeries.filter((item) => item.name === focusedSeries);
  }, [focusedSeries, platformFilteredSeries]);

  useEffect(() => {
    if (selectedPlatform !== 'All' && !platformOptions.includes(selectedPlatform)) {
      setSelectedPlatform('All');
    }
  }, [platformOptions, selectedPlatform]);

  useEffect(() => {
    if (focusedSeries && !platformFilteredSeries.some((item) => item.name === focusedSeries)) {
      setFocusedSeries(null);
    }
  }, [focusedSeries, platformFilteredSeries]);

  useEffect(() => {
    if (visibleSeries.length <= 1 && showCombined) {
      setShowCombined(false);
    }
  }, [showCombined, visibleSeries.length]);

  const { combinedData, seriesNames } = useMemo(() => {
    if (!visibleSeries || visibleSeries.length === 0) {
      return { combinedData: [], seriesNames: [] };
    }

    const seriesNames = visibleSeries.map(s => s.name);
    const dataMap = new Map<string, any>();

    // For each series (campaign), apply the view period grouping to its individual data
    const processedSeries = visibleSeries.map(s => ({
      ...s,
      data: groupDataByPeriod(s.data, viewPeriod)
    }));

    // Combine all processed series data
    processedSeries.forEach(s => {
      s.data.forEach(dataPoint => {
        if (!dataMap.has(dataPoint.date)) {
          dataMap.set(dataPoint.date, {
            date: dataPoint.date,
            __period: viewPeriod // Add period info for tooltip
          });
        }
        const entry = dataMap.get(dataPoint.date);
        entry[s.name] = dataPoint[dataKey] || 0; // Use the specified dataKey
        // Always store raw clicks/impressions so combined CTR can be calculated correctly
        entry[`__clicks__${s.name}`] = dataPoint.clicks || 0;
        entry[`__impressions__${s.name}`] = dataPoint.impressions || 0;
      });
    });

    const combinedData = Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Inject Combined Total series if enabled and multiple series exist
    let finalSeriesNames = [...seriesNames];
    if (showCombined && visibleSeries.length > 1) {
      finalSeriesNames.push('Combined Total');
      combinedData.forEach(point => {
        if (dataKey === 'ctr') {
          // CTR must be recalculated from raw totals — summing individual CTRs is wrong
          let totalClicks = 0;
          let totalImpressions = 0;
          seriesNames.forEach(name => {
            totalClicks += (point[`__clicks__${name}`] || 0);
            totalImpressions += (point[`__impressions__${name}`] || 0);
          });
          point['Combined Total'] = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        } else {
          let total = 0;
          seriesNames.forEach(name => { total += (point[name] || 0); });
          point['Combined Total'] = total;
        }
      });
    }

    return { combinedData, seriesNames: finalSeriesNames };
  }, [visibleSeries, viewPeriod, dataKey, showCombined]);

  useEffect(() => {
    if (selectedPointLabel && !combinedData.some((point) => point.date === selectedPointLabel)) {
      setSelectedPointLabel(null);
    }
  }, [combinedData, selectedPointLabel]);

  const selectedPointDetails = useMemo(() => {
    if (!selectedPointLabel) {
      return [] as Array<{ name: string; value: number; color: string }>;
    }

    const matchingPoint = combinedData.find((point) => point.date === selectedPointLabel);

    if (!matchingPoint) {
      return [];
    }

    return seriesNames
      .filter((name) => matchingPoint[name] !== undefined)
      .map((name) => ({
        name,
        value: Number(matchingPoint[name] || 0),
        color: seriesColorMap.get(name) || PALETTE[0]
      }))
      .sort((left, right) => right.value - left.value);
  }, [combinedData, selectedPointLabel, seriesColorMap, seriesNames]);

  const handleChartClick = (state: any) => {
    if (state?.activeLabel) {
      setSelectedPointLabel(state.activeLabel);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date in TrendChart:', dateStr);
        return dateStr; // Return original string if date is invalid
      }

      // Format dates based on the selected period
      switch (period) {
        case '1d': // Daily - show month/day
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
        case '7d': // Weekly - show week range (start date of week)
          {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            return `Week of ${weekStart.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}`;
          }
        case '30d':
          return date.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          });
        default:
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
      }
    } catch (error) {
      console.warn('Error formatting date in TrendChart:', dateStr, error);
      return dateStr;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          {visibleSeries.length > 1 && (
            <label className="flex h-10 items-center space-x-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <input
                type="checkbox"
                id={`combined-${title}`}
                checked={showCombined}
                onChange={(e) => setShowCombined(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Combined Total</span>
            </label>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
            <span className="pl-2 text-sm text-slate-500 dark:text-slate-400">View</span>
            <div className="flex items-center gap-1">
              {availableViews.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition-all ${viewPeriod === view
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  onClick={() => setViewPeriod(view)}
                >
                  {view === '1d' ? 'Daily' : view === '7d' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {(enablePlatformFilter && platformOptions.length > 0) && (
          <div className="w-full rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 dark:border-slate-700 dark:from-slate-900/70 dark:to-slate-900/40">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="border-slate-300 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                Platform
              </Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Filter slot lines by platform
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`h-10 rounded-full border px-5 text-sm font-semibold transition-all ${getFilterChipClasses(selectedPlatform === 'All')}`}
                onClick={() => setSelectedPlatform('All')}
              >
                All
              </button>
              {platformOptions.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  className={`h-10 rounded-full border px-5 text-sm font-semibold transition-all ${getFilterChipClasses(selectedPlatform === platform)}`}
                  onClick={() => setSelectedPlatform(platform)}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>
        )}

        {enableSeriesFilters && platformFilteredSeries.length > 0 && (
          <div className="w-full rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50/90 to-white p-4 shadow-sm dark:border-slate-700 dark:from-slate-900/70 dark:to-slate-900/40">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-slate-300 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                    Slots
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Click a slot chip to focus on one line
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Showing {platformFilteredSeries.length} slot{platformFilteredSeries.length === 1 ? '' : 's'}
                  {focusedSeries ? ` • Focused: ${getSeriesShortLabel(focusedSeries)}` : ''}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                onClick={() => setFocusedSeries(null)}
                disabled={!focusedSeries}
              >
                Show all
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {platformFilteredSeries.map((item) => {
                  const isActive = focusedSeries === item.name;
                  const color = seriesColorMap.get(item.name) || PALETTE[0];
                  const platform = getSeriesPlatform(item.name);

                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setFocusedSeries((current) => current === item.name ? null : item.name)}
                      className={`group inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all ${getSeriesChipClasses(isActive)}`}
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold">{getSeriesShortLabel(item.name)}</span>
                      {platform && (
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                          {platform}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}



        {selectedPointDetails.length > 0 && (
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-slate-300 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                  Selected point
                </Badge>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {formatDisplayDate(selectedPointLabel || '', viewPeriod)}
                </span>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                onClick={() => setSelectedPointLabel(null)}
              >
                Clear
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto pr-1">
              <div className="space-y-2">
                {selectedPointDetails.map((item) => (
                  <div
                    key={`${selectedPointLabel}-${item.name}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatMetricValue(item.value, dataKey)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-[450px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={combinedData}
            margin={{ top: 20, right: 30, left: 20, bottom: enableSeriesFilters ? 12 : 20 }}
            onClick={handleChartClick}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="currentColor"
                strokeOpacity={0.2}
                vertical={false}
                className="text-gray-300 dark:text-gray-600"
              />
            )}

            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="currentColor"
              fontSize={12}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dy={10}
              className="text-gray-600 dark:text-gray-400"
            />

            <YAxis
              stroke="currentColor"
              fontSize={12}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dx={-10}
              className="text-gray-600 dark:text-gray-400"
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 12, fontWeight: 500 }, dy: 40 } : undefined}
            />

            <Tooltip content={<CustomTooltip viewPeriod={viewPeriod} dataKey={dataKey} />} />

            {seriesNames.map((seriesName, index) => {
              const isCombined = seriesName === 'Combined Total';
              const isCtrCombined = isCombined && dataKey === 'ctr';
              const color = seriesColorMap.get(seriesName) || PALETTE[index % PALETTE.length];
              return (
                <Fragment key={seriesName}>
                  {/* Grey base layer — only for CTR combined, creates the grey gaps in the dash */}
                  {isCtrCombined && (
                    <Line
                      key={`${seriesName}__grey`}
                      type="monotone"
                      dataKey={seriesName}
                      stroke={COMBINED_TOTAL_GREY}
                      strokeWidth={3}
                      strokeDasharray="8 8"
                      dot={false}
                      activeDot={false}
                      animationDuration={0}
                      legendType="none"
                      tooltipType="none"
                    />
                  )}
                  {/* Main line */}
                  <Line
                    key={seriesName}
                    type="monotone"
                    dataKey={seriesName}
                    stroke={isCtrCombined ? color : color}
                    strokeWidth={isCombined ? 3 : 2}
                    strokeDasharray={isCtrCombined ? '8 8' : undefined}
                    strokeDashoffset={isCtrCombined ? -8 : undefined}
                    dot={isCombined
                      ? { fill: color, strokeWidth: 2, r: 5, stroke: '#fff' }
                      : { fill: color, strokeWidth: 2, r: 3, stroke: '#fff' }
                    }
                    activeDot={isCombined
                      ? { r: 8, stroke: color, strokeWidth: 3, fill: '#fff' }
                      : { r: 6, stroke: color, strokeWidth: 2, fill: '#fff' }
                    }
                    animationDuration={animated ? 1500 : 0}
                    animationEasing="ease-in-out"
                    cursor="pointer"
                  />
                </Fragment>
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';