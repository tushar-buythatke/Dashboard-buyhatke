import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  '#6366F1', '#059669', '#DC2626', '#D97706', 
  '#7C3AED', '#0891B2', '#EA580C', '#65A30D'
];

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-[200px]">
      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
        {label}
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
                {entry.dataKey}
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
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              {seriesKeys.map((key, index) => (
                <linearGradient key={key} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6}/>
                </linearGradient>
              ))}
            </defs>
            
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
              dataKey={xAxisKey}
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

            {seriesKeys.map((key, index) => (
              <Bar 
                key={key}
                dataKey={key} 
                fill={`url(#gradient-${index})`}
                animationDuration={animated ? 1500 : 0}
                radius={[2, 2, 0, 0]}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={1}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

GroupedBarChart.displayName = 'GroupedBarChart'; 