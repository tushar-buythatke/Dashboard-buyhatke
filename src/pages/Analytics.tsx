import React, { useState } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown, Download, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
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

export function Analytics() {
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // Simulate export functionality
    console.log('Exporting data...');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200">
      {/* Enhanced Header with Actions */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-4">
            {/* Title and Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-100"></div>
                  <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse delay-200"></div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Analytics Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">Real-time insights and performance analysis</p>
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
                  <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-5 w-5" />
                  <span>Export</span>
                </Button>
                
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 transition-all duration-200 ${
                    showFilters 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30' 
                      : 'hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20'
                  }`}
                >
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                  <ChevronDown className={`h-5 w-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  <Badge variant="secondary" className="ml-1">3</Badge>
                </Button>
              </div>
            </div>

            {/* Filter Dropdown */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    {/* Shining background effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-purple-600/20 to-indigo-500/10 dark:from-purple-600/20 dark:via-purple-700/30 dark:to-indigo-600/20 rounded-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5 rounded-xl animate-pulse"></div>
                    
                    {/* Filter content */}
                    <div className="relative bg-gradient-to-br from-purple-50/80 to-indigo-50/80 dark:from-purple-900/30 dark:to-indigo-900/30 backdrop-blur-sm rounded-xl p-6 border border-purple-200/50 dark:border-purple-700/50 shadow-lg shadow-purple-500/10">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-4">
                          <FilterSidebar />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-8">
          {/* Quick Stats Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Performance Summary
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Last 7 days vs previous period
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">+12.5%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Growth</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹25.8K</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">186.5%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">ROI</div>
                </div>
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
            </div>
            <MetricsDashboard data={mockMetrics} />
          </motion.div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Performance Trend - Spans 2 columns */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
            >
              <TrendChart data={mockTrendData} title="Performance Over Time" />
            </motion.div>
            
            {/* Quick Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Insights
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Best Performing Day</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">Jan 5</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Peak Hour</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">2-3 PM</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Top Platform</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">Mobile</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Breakdown Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
            >
              <BreakdownPieChart data={mockGenderBreakdown} title="Gender Distribution" height={300} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
            >
              <BreakdownPieChart data={mockAgeBreakdown} title="Age Groups" height={300} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
            >
              <BreakdownPieChart data={mockPlatformBreakdown} title="Platform Performance" height={300} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
            >
              <BreakdownPieChart data={mockLocationBreakdown} title="Geographic Distribution" height={300} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}