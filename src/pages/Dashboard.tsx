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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Enhanced Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header with Glass Effect */}
        <div className="backdrop-blur-sm bg-white/30 border border-white/20 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-200"></div>
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse delay-400"></div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-slate-600 text-lg">Overview of your advertising performance</p>
        </div>

        {/* Enhanced Metrics Dashboard with backdrop */}
        <div className="backdrop-blur-sm bg-white/30 border border-white/20 rounded-2xl p-6 shadow-xl">
          <MetricsDashboard data={mockMetrics} />
        </div>

        {/* Enhanced Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 backdrop-blur-sm bg-white/30 border border-white/20 rounded-2xl p-6 shadow-xl">
            <TrendChart data={mockTrendData} title="Performance Trends" />
          </div>
          <div className="space-y-6">
            <div className="backdrop-blur-sm bg-white/30 border border-white/20 rounded-2xl p-6 shadow-xl">
              <BreakdownPieChart data={mockGenderBreakdown} title="Gender Distribution" />
            </div>
            <div className="backdrop-blur-sm bg-white/30 border border-white/20 rounded-2xl p-6 shadow-xl">
              <BreakdownPieChart data={mockPlatformBreakdown} title="Platform Breakdown" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}