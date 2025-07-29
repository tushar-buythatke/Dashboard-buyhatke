import { memo, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendDataPoint, TrendChartSeries } from '@/types';
import { Button } from '@/components/ui/button';

interface TrendChartProps {
  series: TrendChartSeries[];
  title: string;
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
  period?: '1d' | '7d' | '30d'; // The original data period from API
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

const CustomTooltip = memo(({ active, payload, label, viewPeriod }: any) => {
  if (!active || !payload?.length) return null;

  const formatTooltipDate = (dateStr: string, viewPeriod?: ViewPeriod) => {
    try {
      const date = new Date(dateStr);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date in tooltip:', dateStr);
        return dateStr; // Return original string if date is invalid
      }
      
      // Format dates based on the view period for tooltip
      switch (viewPeriod) {
        case '1d': // Daily
          return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        case '7d': // Weekly - show week range
          const weekStart = new Date(date);
          const weekEnd = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Sunday
          weekEnd.setDate(weekStart.getDate() + 6); // Saturday
          return `Week of ${weekStart.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })} - ${weekEnd.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}`;
        case '30d': // Monthly
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
      console.warn('Error formatting date in tooltip:', dateStr, error);
      return dateStr; // Return original string on error
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-[200px]">
      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
        {formatTooltipDate(label, viewPeriod)}
      </div>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {entry.name}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {entry.value.toLocaleString()}
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
  showGrid = true,
  animated = true,
  period = '7d'
}) => {
  // Local state for view period toggle (independent of the main data grouping filter)
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>(period || '1d');
  
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

  const { combinedData, seriesNames } = useMemo(() => {
    if (!series || series.length === 0) {
      return { combinedData: [], seriesNames: [] };
    }

    const seriesNames = series.map(s => s.name);
    const dataMap = new Map<string, any>();

    // For each series (campaign), apply the view period grouping to its individual data
    const processedSeries = series.map(s => ({
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
        entry[s.name] = dataPoint.impressions; // Use each campaign's impressions
      });
    });

    const combinedData = Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { combinedData, seriesNames };
  }, [series, viewPeriod]);

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
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          return `Week of ${weekStart.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          })}`;
        case '30d': // Monthly - show month/year only
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
      return dateStr; // Return original string on error
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
        
        {/* View Period Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            {availableViews.map((view) => (
              <Button
                key={view}
                variant={viewPeriod === view ? "default" : "ghost"}
                size="sm"
                className={`px-3 py-1 text-xs rounded-none ${
                  viewPeriod === view 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => setViewPeriod(view)}
              >
                {view === '1d' ? 'Daily' : view === '7d' ? 'Weekly' : 'Monthly'}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="h-[450px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={combinedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
            />

            <Tooltip content={<CustomTooltip viewPeriod={viewPeriod} />} />

            <Legend
              wrapperStyle={{
                paddingTop: '24px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            />

            {seriesNames.map((seriesName, index) => (
              <Line
                key={seriesName}
                type="monotone"
                dataKey={seriesName}
                stroke={PALETTE[index % PALETTE.length]}
                strokeWidth={3}
                dot={{
                  fill: PALETTE[index % PALETTE.length],
                  strokeWidth: 2,
                  r: 4,
                  stroke: '#fff'
                }}
                activeDot={{
                  r: 7,
                  stroke: PALETTE[index % PALETTE.length],
                  strokeWidth: 3,
                  fill: '#fff'
                }}
                animationDuration={animated ? 1500 : 0}
                animationEasing="ease-in-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';