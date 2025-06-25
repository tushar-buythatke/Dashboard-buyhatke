import React from 'react';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { TrendChart } from '@/components/analytics/TrendChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { FilterSidebar } from '@/components/analytics/FilterSidebar';
import { 
  mockTrendData, 
  mockGenderBreakdown, 
  mockAgeBreakdown, 
  mockPlatformBreakdown, 
  mockLocationBreakdown 
} from '@/data/mockData';

const mockMetrics = {
  impressions: 187400,
  clicks: 4692,
  ctr: 2.47,
  conversions: 258,
  revenue: 25800,
  roi: 186.5
};

export function Analytics() {
  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600 mt-1">Detailed insights and performance analysis</p>
      </div>

      <div className="flex gap-6">
        <div className="w-80 flex-shrink-0">
          <FilterSidebar />
        </div>
        
        <div className="flex-1 min-w-0 space-y-6">
          <MetricsDashboard data={mockMetrics} />
          
          <TrendChart data={mockTrendData} title="Performance Over Time" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BreakdownPieChart data={mockGenderBreakdown} title="Gender Distribution" />
            <BreakdownPieChart data={mockAgeBreakdown} title="Age Groups" />
            <BreakdownPieChart data={mockPlatformBreakdown} title="Platform Performance" />
            <BreakdownPieChart data={mockLocationBreakdown} title="Geographic Distribution" />
          </div>
        </div>
      </div>
    </div>
  );
}