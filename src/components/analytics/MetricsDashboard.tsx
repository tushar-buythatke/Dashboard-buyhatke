import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Eye, MousePointer, Target, DollarSign, BarChart3 } from 'lucide-react';
import { MetricsData } from '@/types';

interface MetricsDashboardProps {
  data: MetricsData;
}

export function MetricsDashboard({ data }: MetricsDashboardProps) {
  const formatNumber = (num: number) => num.toLocaleString();
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatPercentage = (num: number) => `${num.toFixed(2)}%`;

  const metrics = [
    {
      title: 'Impressions',
      value: formatNumber(data.impressions),
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12.5%'
    },
    {
      title: 'Clicks',
      value: formatNumber(data.clicks),
      icon: MousePointer,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8.2%'
    },
    {
      title: 'CTR',
      value: formatPercentage(data.ctr),
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+0.3%'
    },
    {
      title: 'Conversions',
      value: formatNumber(data.conversions),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+15.7%'
    },
    {
      title: 'Revenue',
      value: formatCurrency(data.revenue),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+22.1%'
    },
    {
      title: 'ROI',
      value: formatPercentage(data.roi),
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      change: '+18.9%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <Card 
          key={metric.title} 
          className="backdrop-blur-sm bg-white/60 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl overflow-hidden"
        >
          <CardHeader className="bg-gradient-to-r from-white/40 to-white/20 backdrop-blur-sm border-b border-white/20 p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  index === 0 ? 'bg-blue-500' :
                  index === 1 ? 'bg-green-500' :
                  index === 2 ? 'bg-purple-500' :
                  index === 3 ? 'bg-orange-500' :
                  index === 4 ? 'bg-emerald-500' : 'bg-indigo-500'
                } animate-pulse`}></div>
                {metric.title}
              </CardTitle>
              <div className={`p-3 rounded-xl ${metric.bgColor} shadow-md backdrop-blur-sm border border-white/30`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-slate-900 mb-3">
              {metric.value}
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full border border-green-200">
                {metric.change} from last period
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}