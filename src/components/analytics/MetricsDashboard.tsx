import React, { useEffect, useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Eye, MousePointer, Target, BarChart3, IndianRupee } from 'lucide-react';
import { MetricsData } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface MetricsDashboardProps {
  data: MetricsData;
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

export function MetricsDashboard({ data }: MetricsDashboardProps) {
  const formatNumber = (num: number) => num.toLocaleString();
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatPercentage = (num: number) => `${num.toFixed(2)}%`;

  const metrics = [
    {
      title: 'Impressions',
      value: formatNumber(data.impressions),
      rawValue: data.impressions,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100/50',
      gradient: 'from-blue-50 to-blue-100',
      change: '+12.5%'
    },
    {
      title: 'Clicks',
      value: formatNumber(data.clicks),
      rawValue: data.clicks,
      icon: MousePointer,
      color: 'text-green-600',
      bgColor: 'bg-green-100/50',
      gradient: 'from-green-50 to-green-100',
      change: '+8.2%'
    },
    {
      title: 'CTR',
      value: formatPercentage(data.ctr),
      rawValue: data.ctr,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100/50',
      gradient: 'from-purple-50 to-purple-100',
      change: '+0.3%'
    },
    {
      title: 'Conversions',
      value: formatNumber(data.conversions),
      rawValue: data.conversions,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100/50',
      gradient: 'from-orange-50 to-orange-100',
      change: '+15.7%'
    },
    {
      title: 'Revenue',
      value: formatCurrency(data.revenue),
      rawValue: data.revenue,
      icon: IndianRupee,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100/50',
      gradient: 'from-emerald-50 to-emerald-100',
      change: '+22.1%'
    },
    {
      title: 'ROI',
      value: formatPercentage(data.roi),
      rawValue: data.roi,
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100/50',
      gradient: 'from-indigo-50 to-indigo-100',
      change: '+18.9%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <AnimatePresence>
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.05 }}
          >
            <Card 
              className="relative backdrop-blur-md bg-white/70 border border-white/20 shadow-xl hover:shadow-3xl hover:scale-110 hover:-translate-y-1 transition-all duration-200 ease-out rounded-2xl overflow-hidden will-change-transform group"
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${metric.gradient} opacity-30 group-hover:opacity-50 transition-opacity duration-200 ease-out`} />
              <CardHeader className="relative bg-gradient-to-r from-white/50 to-white/30 backdrop-blur-md border-b border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center">
                    <div 
                      className={`w-3 h-3 rounded-full mr-3 ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' :
                        index === 4 ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                    />
                    {metric.title}
                  </CardTitle>
                  <div className={`p-3 rounded-full ${metric.bgColor} shadow-lg border border-white/30 will-change-transform group-hover:scale-105 group-hover:rotate-6 transition-transform duration-150 ease-out`}>
                    <metric.icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 relative">
                <motion.div 
                  className="text-4xl font-extrabold text-slate-900 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {metric.title === 'Revenue' || metric.title === 'ROI' || metric.title === 'CTR' 
                    ? metric.value 
                    : <NumberCounter end={metric.rawValue} />}
                </motion.div>
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
                >
                  <div className="text-sm text-green-700 font-medium bg-green-100/70 px-3 py-1 rounded-full border border-green-200/50 shadow-sm">
                    {metric.change} from last period
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}