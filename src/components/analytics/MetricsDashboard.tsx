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
      {metrics.map((metric) => (
        <Card key={metric.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${metric.bgColor}`}>
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {metric.value}
            </div>
            <div className="text-xs text-green-600 font-medium">
              {metric.change} from last period
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}