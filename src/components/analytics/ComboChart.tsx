import { memo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

  const formatValue = (value: number, key: string) => {
    if (key === 'conversions') return value.toLocaleString();
    if (key === 'impressions') return value.toLocaleString();
    if (key === 'ctr') return `${value}%`;
    return value.toLocaleString();
  };

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
                {entry.name}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {formatValue(entry.value, entry.dataKey)}
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
  barColor = '#6366F1',
  lineColor = '#059669'
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={barColor} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={barColor} stopOpacity={0.1}/>
              </linearGradient>
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
              dataKey="period" 
              stroke="currentColor"
              fontSize={12}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dy={10}
              className="text-gray-600 dark:text-gray-400"
            />
            
            <YAxis 
              yAxisId="left"
              stroke="currentColor"
              fontSize={12}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dx={-10}
              className="text-gray-600 dark:text-gray-400"
            />
            
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="currentColor"
              fontSize={12}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dx={10}
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

            <Bar 
              yAxisId="left"
              dataKey={barKey} 
              fill="url(#barGradient)"
              name={barName}
              animationDuration={animated ? 1500 : 0}
              radius={[4, 4, 0, 0]}
            />
            
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey={lineKey} 
              stroke={lineColor}
              strokeWidth={3}
              name={lineName}
              dot={{ 
                fill: lineColor, 
                strokeWidth: 3, 
                r: 5,
                stroke: '#fff'
              }}
              activeDot={{ 
                r: 8, 
                stroke: lineColor,
                strokeWidth: 4,
                fill: '#fff'
              }}
              animationDuration={animated ? 1500 : 0}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

ComboChart.displayName = 'ComboChart'; 