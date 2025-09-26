import { useState, useCallback, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BreakdownData } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Monitor, MapPin, Calendar, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface BreakdownPieChartProps {
  data: Array<{ name: string; value: number; percentage?: number }>;
  title: string;
  showInnerRadius?: boolean;
  showAnimation?: boolean;
  maxDisplayItems?: number; // Maximum number of items to show in chart (default: 5)
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
  showAnimation = true,
  maxDisplayItems = 5 
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showAllDropdown, setShowAllDropdown] = useState(false);
  
  // Early safety checks
  if (!data || !Array.isArray(data)) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }
  
  const IconComponent = getChartIcon(title);
  
  // Show all data in pie chart, but only top 5 in legend
  const allData = [...data].sort((a, b) => b.value - a.value);
  const hasViewAllOption = allData.length > 5; // Show "View All" if more than 5 items
  
  // Get top 5 for legend display
  const top5Data = allData.slice(0, 5);
  const remainingCount = allData.length - 5;

  const renderLabel = useCallback(() => {
    return ''; // Disable labels to prevent overflow
  }, []);

  // Process all data for pie chart (but we'll only show top 5 in legend)
  const enrichedData = allData.map((item, index) => {
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
  
  // Process top 5 for legend display
  const top5EnrichedData = top5Data.map((item, index) => {
    let mappedName = item.name;
    
    if (title.toLowerCase().includes('platform')) {
      mappedName = getPlatformName(item.name);
    }
    
    return {
      ...item,
      name: mappedName,
      color: COLORS[index % COLORS.length]
    };
  });

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
      // Add a small delay to prevent flickering and ensure proper cleanup
      setTimeout(() => {
        setHoveredIndex(null);
      }, 50);
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
      {/* Clean Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/40 rounded-lg">
            <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {allData.length} categories
            </p>
          </div>
        </div>
        
        {/* Compact Details Button */}
        {hasViewAllOption && (
          <DropdownMenu open={showAllDropdown} onOpenChange={setShowAllDropdown}>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                  transition-all duration-200 
                  ${showAllDropdown 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span>Details</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">({allData.length})</span>
                <motion.div
                  animate={{ rotate: showAllDropdown ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-2.5 h-2.5" />
                </motion.div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-80 max-h-64 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg"
              sideOffset={4}
            >
              <div className="p-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>All Categories</span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {allData.length}
                  </span>
                </h4>
                
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                  {enrichedData.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-900 dark:text-white truncate font-medium">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[30px] text-right">
                          {item.value}
                        </span>
                        <span 
                          className="text-xs font-semibold px-1.5 py-0.5 rounded text-white min-w-[35px] text-center"
                          style={{ backgroundColor: item.color }}
                        >
                          {formatPercentage(item.percentage || 0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Chart Container - Properly sized and contained */}
      <div 
        className="relative h-64"
        onMouseLeave={() => {
          // Force clear hover state when leaving the entire chart area
          setTimeout(() => setHoveredIndex(null), 100);
        }}
      >
        <ChartErrorBoundary
          onError={(error, errorInfo) => {
            console.error('BreakdownPieChart error:', error, errorInfo);
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
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
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={80}
                innerRadius={showInnerRadius ? 40 : 0}
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
                    // Only show tooltip if we have valid hover state
                    if (hoveredIndex === null) return null;
                    return <CustomTooltip {...props} title={title} />;
                  } catch (error) {
                    console.warn('Tooltip render error:', error);
                    return null;
                  }
                }}
                animationDuration={150}
                animationEasing="ease-out"
                wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
                cursor={false}
                isAnimationActive={true}
                allowEscapeViewBox={{ x: true, y: true }}
                position={{ x: undefined, y: undefined }}
              />
              
              {/* Hide default legend since we'll create custom one below */}
              <Legend content={() => null} />
            </PieChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>
      
      {/* Custom Legend - Top 5 only */}
      <div className="mt-2">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
          {top5EnrichedData.map((item, index) => (
            <div key={`legend-${index}`} className="flex items-center gap-1">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {item.name} ({formatPercentage(item.percentage || 0)}%)
              </span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="text-gray-500 dark:text-gray-500 font-medium">
                +{remainingCount} more
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};