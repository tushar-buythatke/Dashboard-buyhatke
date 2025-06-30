import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { TrendChart } from '@/components/analytics/TrendChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { mockTrendData, mockGenderBreakdown, mockPlatformBreakdown } from '@/data/mockData';
import { motion } from 'framer-motion';
import { RefreshCw, Download, TrendingUp, Users, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const mockMetrics = {
  impressions: 187400,
  clicks: 4692,
  ctr: 2.47,
  conversions: 258,
  revenue: 25800,
  roi: 186.5
};

export function Dashboard() {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // Simulate export functionality
    console.log('Exporting dashboard data...');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-100"></div>
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse delay-200"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Overview of your advertising performance</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/analytics')}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <TrendingUp className="h-4 w-4" />
                <span>View Analytics</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-8">
          {/* Performance Summary Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Today's Performance
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Real-time updates
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">+12.5%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Revenue Growth</div>
                </div>
                <Zap className="h-8 w-8 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">186.5%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Current ROI</div>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </motion.div>

          {/* Metrics Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Key Metrics</h2>
              <Badge variant="secondary" className="ml-2">Live</Badge>
            </div>
            <MetricsDashboard data={mockMetrics} />
          </motion.div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Performance Trends - Spans 2 columns */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
            >
              <TrendChart data={mockTrendData} title="Performance Trends" />
            </motion.div>
            
            {/* Quick Insights Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Quick Insights
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active Campaigns</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">12</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Best CTR Today</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">3.2%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Top Platform</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">Mobile</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Conversion Rate</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">5.5%</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
            >
              <BreakdownPieChart data={mockGenderBreakdown} title="Gender Distribution" height={350} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
            >
              <BreakdownPieChart data={mockPlatformBreakdown} title="Platform Breakdown" height={350} />
            </motion.div>
          </div>

          {/* Additional Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Impressions</p>
                  <p className="text-2xl font-bold">187.4K</p>
                </div>
                <div className="text-blue-200">📊</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Clicks</p>
                  <p className="text-2xl font-bold">4.69K</p>
                </div>
                <div className="text-green-200">👆</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Conversions</p>
                  <p className="text-2xl font-bold">258</p>
                </div>
                <div className="text-purple-200">💰</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Revenue</p>
                  <p className="text-2xl font-bold">₹25.8K</p>
                </div>
                <div className="text-orange-200">🚀</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}