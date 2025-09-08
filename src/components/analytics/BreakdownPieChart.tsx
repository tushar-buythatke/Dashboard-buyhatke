import { useState, useCallback, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BreakdownData } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Monitor, MapPin, Calendar } from 'lucide-react';
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';

interface BreakdownPieChartProps {
  data: Array<{ name: string; value: number; percentage?: number }>;
  title: string;
  showInnerRadius?: boolean;
  showAnimation?: boolean;
}

// Material Design inspired palette with high contrast and accessibility
const COLORS = [
  '#4285F4', '#DB4437', '#F4B400', '#0F9D58', 
  '#AB47BC', '#66c2a5', '#fc8d62', '#8da0cb',
  '#e78ac3', '#a6d854', '#0D47A1', '#1976D2'
];

const GRADIENT_COLORS = [
  { from: '#4285F4', to: '#1976D2' }, // Blue gradient
  { from: '#DB4437', to: '#C62828' }, // Red gradient
  { from: '#F4B400', to: '#F57F17' }, // Yellow/Amber gradient
  { from: '#0F9D58', to: '#388E3C' }, // Green gradient
  { from: '#AB47BC', to: '#7B1FA2' }, // Purple gradient
  { from: '#66c2a5', to: '#4CAF50' }, // Pastel green
  { from: '#fc8d62', to: '#FF7043' }, // Pastel orange
  { from: '#8da0cb', to: '#5C6BC0' }  // Pastel blue
];

// Helper function to map platform IDs to proper names
const getPlatformName = (platformId: number | string): string => {
  const id = Number(platformId);
  switch (id) {
    case 0:
      return 'Web Extension';
    case 1:
      return 'Mobile Extension';
    case 2:
      return 'Desktop Site';
    case 3:
      return 'Mobile Site';
    case 4:
      return 'Mobile App Overlay';
    case 5:
      return 'Mobile App';
    default:
      return typeof platformId === 'string' ? platformId : 'Unknown Platform';
  }
};

// Helper function to get appropriate icon for different chart types
const getChartIcon = (title: string) => {
  if (title.toLowerCase().includes('gender')) return Users;
  if (title.toLowerCase().includes('platform')) return Monitor;
  if (title.toLowerCase().includes('location')) return MapPin;
  if (title.toLowerCase().includes('age')) return Calendar;
  return TrendingUp;
};

// Format percentage to always show 1 decimal place
const formatPercentage = (value: number) => {
  return value.toFixed(1);
};

const CustomTooltip = memo(({ active, payload, title }: any) => {
  // Enhanced safety checks to prevent errors during scroll/re-render
  if (!active || !payload || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }
  
  // Safely extract data with fallbacks
  const payloadItem = payload[0];
  if (!payloadItem || !payloadItem.payload) {
    return null;
  }
  
  const { name = 'Unknown', value = 0, percentage = 0 } = payloadItem.payload;
  const fillColor = payloadItem.fill || '#4285F4';
  
  // Safely get icon component with fallback
  let IconComponent;
  try {
    IconComponent = getChartIcon(title || '');
  } catch (error) {
    IconComponent = TrendingUp; // Fallback icon
  }
  
  return (
    <div 
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 min-w-[160px] backdrop-blur-sm z-50"
      style={{ 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
        boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full shadow-sm" 
          style={{ backgroundColor: fillColor }}
        />
        <IconComponent className="w-3 h-3 text-gray-600 dark:text-gray-300" />
        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
          {String(name)}
        </p>
      </div>
      <div className="pl-5 space-y-1">
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-black text-gray-900 dark:text-white">
            {Number(value).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            events
          </p>
        </div>
        <p className="text-sm font-bold" style={{ color: fillColor }}>
          {formatPercentage(Number(percentage))}%
        </p>
      </div>
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

export const BreakdownPieChart: React.FC<BreakdownPieChartProps> = ({ 
  data, 
  title, 
  showInnerRadius = true, 
  showAnimation = true 
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  // Early safety checks
  if (!data || !Array.isArray(data)) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }
  
  const IconComponent = getChartIcon(title);

  const renderLabel = useCallback(() => {
    return ''; // Disable labels to prevent overflow
  }, []);

  // Process data with proper platform mapping and enhanced styling
  const enrichedData = data.map((item, index) => {
    let mappedName = item.name;
    
    // Apply platform mapping if this is a platform chart
    if (title.toLowerCase().includes('platform')) {
      mappedName = getPlatformName(item.name);
    }
    
    return {
      ...item,
      name: mappedName,
      color: COLORS[index % COLORS.length],
      gradientFrom: GRADIENT_COLORS[index % GRADIENT_COLORS.length]?.from || COLORS[index % COLORS.length],
      gradientTo: GRADIENT_COLORS[index % GRADIENT_COLORS.length]?.to || COLORS[index % COLORS.length]
    };
  });

  // Filter out items with zero or very low values for cleaner display
  const filteredData = enrichedData.filter(item => item.value > 0);

  const handleMouseEnter = useCallback((_: any, index: number) => {
    try {
      if (typeof index === 'number' && index >= 0 && index < filteredData.length) {
        setHoveredIndex(index);
      }
    } catch (error) {
      console.warn('Mouse enter error:', error);
    }
  }, [filteredData.length]);

  const handleMouseLeave = useCallback(() => {
    try {
      setHoveredIndex(null);
    } catch (error) {
      console.warn('Mouse leave error:', error);
    }
  }, []);

  const handleClick = useCallback((_: any, index: number) => {
    try {
      if (typeof index === 'number' && index >= 0 && index < filteredData.length) {
        setActiveIndex(activeIndex === index ? null : index);
      }
    } catch (error) {
      console.warn('Click error:', error);
    }
  }, [activeIndex, filteredData.length]);

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl">
              <IconComponent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">No categories</p>
            </div>
          </div>
        </div>
        
        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">No data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Header with sexy styling */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/40 rounded-xl border border-blue-200 dark:border-blue-700/50">
            <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {filteredData.length} {filteredData.length === 1 ? 'category' : 'categories'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Chart Container - Properly sized and contained */}
      <div className="flex-1 relative min-h-0">
        <ChartErrorBoundary
          onError={(error, errorInfo) => {
            console.error('BreakdownPieChart error:', error, errorInfo);
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 40 }}>
              <defs>
                {filteredData.map((item, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={item.gradientFrom} />
                    <stop offset="100%" stopColor={item.gradientTo} />
                  </linearGradient>
                ))}
              </defs>
              
              <Pie
                data={filteredData}
                cx="50%"
                cy="45%"
                labelLine={false}
                label={renderLabel}
                outerRadius={70}
                innerRadius={showInnerRadius ? 35 : 0}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={showAnimation ? 600 : 0}
                animationEasing="ease-out"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
              >
                {filteredData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#gradient-${index})`}
                    stroke={hoveredIndex === index ? '#ffffff' : 'transparent'}
                    strokeWidth={hoveredIndex === index ? 3 : 0}
                    style={{
                      filter: hoveredIndex === index ? 'brightness(1.1) drop-shadow(0 8px 20px rgba(0,0,0,0.2))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))',
                      transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </Pie>
              
              <Tooltip 
                content={(props) => {
                  try {
                    return <CustomTooltip {...props} title={title} />;
                  } catch (error) {
                    console.warn('Tooltip render error:', error);
                    return null;
                  }
                }}
                animationDuration={100}
                animationEasing="ease-out"
                wrapperStyle={{ outline: 'none' }}
                cursor={false}
                isAnimationActive={false}
              />
              
              {/* Material Design inspired Legend */}
              <Legend 
                verticalAlign="bottom" 
                height={35}
                iconType="circle"
                wrapperStyle={{
                  paddingTop: '10px',
                  fontSize: '10px',
                  fontWeight: '600',
                  lineHeight: '1.2'
                }}
                formatter={(value, entry, index) => {
                  try {
                    const dataEntry = filteredData[index];
                    const isActive = hoveredIndex === index;
                    const percentage = dataEntry?.percentage || 0;
                    
                    return (
                      <span 
                        style={{ 
                          color: isActive ? (entry?.color || '#374151') : '#374151',
                          fontWeight: isActive ? '700' : '600',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {value} ({formatPercentage(percentage)}%)
                      </span>
                    );
                  } catch (error) {
                    console.warn('Legend formatter error:', error);
                    return <span>{value}</span>;
                  }
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>
    </div>
  );
};