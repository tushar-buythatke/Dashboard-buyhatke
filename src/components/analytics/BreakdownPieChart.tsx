import { useState, useCallback, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BreakdownData } from '@/types';

interface BreakdownPieChartProps {
  data: BreakdownData[];
  title: string;
  height?: number;
  showAnimation?: boolean;
  showInnerRadius?: boolean;
}

const COLORS = [
  '#4F46E5', '#059669', '#DC2626', '#D97706', 
  '#7C3AED', '#0891B2', '#EA580C', '#65A30D'
];

const CustomTooltip = memo(({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  
  const { name, value, percentage } = payload[0].payload;
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[140px]">
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: payload[0].fill }}
        />
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{name}</p>
      </div>
      <div className="pl-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </p>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {percentage}%
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          of total
        </p>
      </div>
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

export const BreakdownPieChart = memo<BreakdownPieChartProps>(({ 
  data, 
  title, 
  height = 400,
  showAnimation = true,
  showInnerRadius = true 
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const renderLabel = useCallback((entry: BreakdownData) => {
    return ''; // Disable labels completely to prevent overflow
  }, []);

  const handleMouseEnter = (_: any, index: number) => {
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const enrichedData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 80 }}>
            <Pie
              data={enrichedData}
              cx="50%"
              cy="40%"
              labelLine={false}
              label={renderLabel}
              outerRadius={Math.min(height * 0.25, 100)}
              innerRadius={showInnerRadius ? Math.min(height * 0.12, 45) : 0}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={showAnimation ? 1200 : 0}
              animationEasing="ease-out"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {enrichedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  stroke={hoveredIndex === index ? '#ffffff' : 'transparent'}
                  strokeWidth={hoveredIndex === index ? 4 : 0}
                  style={{
                    transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </Pie>
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend 
              verticalAlign="bottom" 
              height={70}
              iconType="circle"
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '13px',
                fontWeight: '600'
              }}
              formatter={(value, entry, index) => {
                const dataEntry = enrichedData[index];
                return (
                  <span style={{ color: entry.color, fontWeight: 'bold' }}>
                    {value} ({dataEntry?.percentage}%)
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

BreakdownPieChart.displayName = 'BreakdownPieChart';