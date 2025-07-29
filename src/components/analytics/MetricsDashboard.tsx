import { useEffect, useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Eye, MousePointerClick, TrendingDown, Target } from 'lucide-react';
import { MetricsData } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface MetricsDashboardProps {
  data: MetricsData;
  comparisonData?: MetricsData;
  period?: '1d' | '7d' | '30d';
}

const NumberCounter = memo(({ end, duration = 1.5 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.min(start, end));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [end, duration]);

  return <span>{Math.round(count).toLocaleString()}</span>;
});

NumberCounter.displayName = 'NumberCounter';

export function MetricsDashboard({ data, comparisonData, period }: MetricsDashboardProps) {
  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercentage = (num: number) => `${num.toFixed(2)}%`;

  // Calculate percentage change between current and comparison data
  const calculateChange = (current: number, previous: number): { change: string; isPositive: boolean } | null => {
    if (!comparisonData || previous === 0) return null;
    
    const percentChange = ((current - previous) / previous) * 100;
    const isPositive = percentChange >= 0;
    const formattedChange = `${isPositive ? '+' : ''}${percentChange.toFixed(1)}%`;
    
    return { change: formattedChange, isPositive };
  };

  // Get period label for comparison text
  const getPeriodLabel = () => {
    switch (period) {
      case '1d': return 'yesterday';
      case '7d': return 'last week';
      case '30d': return 'last month';
      default: return 'previous period';
    }
  };

  const metrics = [
    {
      title: 'Impressions',
      value: formatNumber(data.impressions),
      rawValue: data.impressions,
      icon: Eye,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      changeData: calculateChange(data.impressions, comparisonData?.impressions || 0)
    },
    {
      title: 'Clicks',
      value: formatNumber(data.clicks),
      rawValue: data.clicks,
      icon: MousePointerClick,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      changeData: calculateChange(data.clicks, comparisonData?.clicks || 0)
    },
    {
      title: 'CTR',
      value: formatPercentage(data.ctr),
      rawValue: data.ctr,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      changeData: calculateChange(data.ctr, comparisonData?.ctr || 0)
    },
    {
      title: 'Conversions',
      value: formatNumber(data.conversions),
      rawValue: data.conversions,
      icon: Target,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      changeData: calculateChange(data.conversions, comparisonData?.conversions || 0)
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AnimatePresence>
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.05 }}
          >
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center">
                    <div 
                      className={`w-2 h-2 rounded-full mr-2 ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' :
                        index === 4 ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                    />
                    {metric.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {metric.title === 'CTR' 
                    ? metric.value 
                    : <NumberCounter end={metric.rawValue} />}
                </div>
                {metric.changeData && (
                  <div className={`text-sm font-medium px-2 py-1 rounded-md inline-block ${
                    metric.changeData.isPositive 
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <div className="flex items-center space-x-1">
                      {metric.changeData.isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{metric.changeData.change} from {getPeriodLabel()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
