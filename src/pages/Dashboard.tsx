import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { TrendChart } from '@/components/analytics/TrendChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { mockTrendData, mockGenderBreakdown, mockPlatformBreakdown } from '@/data/mockData';

const mockMetrics = {
  impressions: 187400,
  clicks: 4692,
  ctr: 2.47,
  conversions: 258,
  revenue: 25800,
  roi: 186.5
};

export function Dashboard() {
  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your advertising performance</p>
      </div>

      <MetricsDashboard data={mockMetrics} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TrendChart data={mockTrendData} title="Performance Trends" />
        </div>
        <div className="space-y-6">
          <BreakdownPieChart data={mockGenderBreakdown} title="Gender Distribution" />
          <BreakdownPieChart data={mockPlatformBreakdown} title="Platform Breakdown" />
        </div>
      </div>
    </div>
  );
}