import { memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendDataPoint, TrendChartSeries } from '@/types';

interface TrendChartProps {
  series: TrendChartSeries[];
  title: string;
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
}

const PALETTE = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return label;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-[200px]">
      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
        {formatDate(label)}
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
  animated = true
}) => {
  const { combinedData, seriesNames } = useMemo(() => {
    if (!series || series.length === 0) {
      return { combinedData: [], seriesNames: [] };
    }

    const seriesNames = series.map(s => s.name);
    const dataMap = new Map<string, any>();

    series.forEach(s => {
      s.data.forEach(dataPoint => {
        if (!dataMap.has(dataPoint.date)) {
          dataMap.set(dataPoint.date, { date: dataPoint.date });
        }
        const entry = dataMap.get(dataPoint.date);
        entry[s.name] = dataPoint.impressions; // Assuming 'impressions' for now
      });
    });

    const combinedData = Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { combinedData, seriesNames };
  }, [series]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
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

            <Tooltip content={<CustomTooltip />} />

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