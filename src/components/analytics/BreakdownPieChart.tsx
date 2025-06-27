import React, { memo, useCallback, useState } from 'react';
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
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl blur-xl"></div>
      <div className="relative bg-white/90 backdrop-blur-2xl border border-white/30 rounded-2xl p-4 shadow-2xl min-w-[180px]">
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-4 h-4 rounded-full shadow-lg" 
            style={{ backgroundColor: payload[0].fill }}
          />
          <p className="font-bold text-slate-900 text-base">{name}</p>
        </div>
        <div className="pl-7">
          <p className="text-2xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {value.toLocaleString()}
          </p>
          <p className="text-lg font-bold text-indigo-600 mt-1">
            {percentage}%
          </p>
          <p className="text-xs font-medium text-slate-500">
            of total
          </p>
        </div>
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

  const renderGradients = () => (
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  );

  const handleMouseEnter = (_, index: number) => {
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
    <Card className="overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 border-0 shadow-2xl backdrop-blur-sm">
      <CardHeader className="pb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
        <CardTitle className="relative text-2xl font-black bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-indigo-50/20 to-purple-50/20 rounded-lg"></div>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 80 }}>
            {renderGradients()}
            
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
                  filter={hoveredIndex === index ? 'url(#glow)' : 'none'}
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
                fontWeight: '600',
                color: '#374151'
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
      </CardContent>
    </Card>
  );
});

BreakdownPieChart.displayName = 'BreakdownPieChart';