import React, { memo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendDataPoint } from '@/types';

interface TrendChartProps {
  data: TrendDataPoint[];
  title: string;
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
}

const METRICS_CONFIG = {
  impressions: {
    color: '#6366F1',
    gradient: 'url(#impressionsGradient)',
    name: 'Impressions'
  },
  clicks: {
    color: '#059669',
    gradient: 'url(#clicksGradient)',
    name: 'Clicks'
  },
  conversions: {
    color: '#D97706',
    gradient: 'url(#conversionsGradient)',
    name: 'Conversions'
  },
  revenue: {
    color: '#7C3AED',
    gradient: 'url(#revenueGradient)',
    name: 'Revenue'
  }
};

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatValue = (value: number, dataKey: string) => {
    if (dataKey === 'revenue') return `₹${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 min-w-[200px]">
      <div className="text-sm font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-100">
        {formatDate(label)}
      </div>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full shadow-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-slate-700">
                {METRICS_CONFIG[entry.dataKey as keyof typeof METRICS_CONFIG]?.name || entry.dataKey}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-900">
              {formatValue(entry.value, entry.dataKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

export const TrendChart = memo<TrendChartProps>(({ 
  data, 
  title, 
  height = 450,
  showGrid = true,
  animated = true 
}) => {
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const renderGradients = () => (
    <defs>
      {Object.entries(METRICS_CONFIG).map(([key, config]) => (
        <linearGradient key={key} id={`${key}Gradient`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={config.color} stopOpacity={0.8}/>
          <stop offset="95%" stopColor={config.color} stopOpacity={0.1}/>
        </linearGradient>
      ))}
    </defs>
  );

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-white to-slate-50/50 border-0 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            {renderGradients()}
            
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="2 4" 
                stroke="#e2e8f0" 
                strokeOpacity={0.6}
                vertical={false}
              />
            )}
            
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#64748b"
              fontSize={12}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              dx={-10}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend 
              wrapperStyle={{
                paddingTop: '24px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            />

            {Object.entries(METRICS_CONFIG).map(([dataKey, config]) => (
              <Line
                key={dataKey}
                type="monotone"
                dataKey={dataKey}
                stroke={config.color}
                strokeWidth={3}
                fill={config.gradient}
                dot={{ 
                  fill: config.color, 
                  strokeWidth: 3, 
                  r: 5,
                  stroke: '#fff',
                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))'
                }}
                activeDot={{ 
                  r: 8, 
                  stroke: config.color,
                  strokeWidth: 4,
                  fill: '#fff',
                  filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15))'
                }}
                animationDuration={animated ? 1500 : 0}
                animationEasing="ease-in-out"
                className="drop-shadow-sm"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

TrendChart.displayName = 'TrendChart';