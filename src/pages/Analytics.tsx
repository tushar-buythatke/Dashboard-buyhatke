import React, { useState, useEffect } from 'react';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { TrendChart } from '@/components/analytics/TrendChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { FilterSidebar } from '@/components/analytics/FilterSidebar';
import { useFilters } from '@/context/FilterContext';
import { 
  mockTrendData, 
  mockGenderBreakdown, 
  mockAgeBreakdown, 
  mockPlatformBreakdown, 
  mockLocationBreakdown 
} from '@/data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Calendar, TrendingUp, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mockMetrics = {
  impressions: 187400,
  clicks: 4692,
  ctr: 2.47,
  conversions: 258,
  revenue: 25800,
  roi: 186.5
};

export function Analytics() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const { filters, updateFilters } = useFilters();

  // Function to get display text based on current filters
  const getPerformanceTimeText = () => {
    if (filters.dateRange.from && filters.dateRange.to) {
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Last 24 hours';
      if (diffDays === 7) return 'Last 7 days';
      if (diffDays === 30) return 'Last 30 days';
      if (diffDays === 90) return 'Last 90 days';
      
      return `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`;
    }
    
    // Fallback to time range selector
    return timeRanges.find(r => r.value === selectedTimeRange)?.label.toLowerCase() || 'Last 7 days';
  };

  // Handle time range selector change
  const handleTimeRangeChange = (value: string) => {
    setSelectedTimeRange(value);
    
    // Update filter date range based on selection
    const today = new Date();
    const fromDate = new Date();
    
    switch (value) {
      case '1d':
        fromDate.setDate(today.getDate() - 1);
        break;
      case '7d':
        fromDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        fromDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        fromDate.setDate(today.getDate() - 90);
        break;
      default:
        fromDate.setDate(today.getDate() - 7);
    }
    
    updateFilters({
      dateRange: {
        from: fromDate.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
      }
    });
  };

  // Sync time range selector with filter date range
  useEffect(() => {
    if (filters.dateRange.from && filters.dateRange.to) {
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) setSelectedTimeRange('1d');
      else if (diffDays === 7) setSelectedTimeRange('7d');
      else if (diffDays === 30) setSelectedTimeRange('30d');
      else if (diffDays === 90) setSelectedTimeRange('90d');
    }
  }, [filters.dateRange]);

  // Initialize default date range if not set
  useEffect(() => {
    if (!filters.dateRange.from || !filters.dateRange.to) {
      const today = new Date();
      const fromDate = new Date();
      fromDate.setDate(today.getDate() - 7); // Default to last 7 days
      
      updateFilters({
        dateRange: {
          from: fromDate.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        }
      });
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    console.log('Exporting analytics data...');
  };

  const timeRanges = [
    { value: '1d', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full animate-pulse delay-200"></div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm sm:text-base">In-depth performance insights and trends</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Time Range Selector */}
              <Select value={selectedTimeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-40 h-9 sm:h-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {timeRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center justify-center space-x-2 h-9 sm:h-8"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex items-center justify-center space-x-2 h-9 sm:h-8"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">Export</span>
              </Button>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="flex items-center justify-center space-x-2 h-9 sm:h-8"
              >
                <Filter className="h-4 w-4" />
                <span className="text-sm">Filters</span>
                {isFilterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Filter Section */}
      <AnimatePresence>
        {isFilterExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <FilterSidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-2">
        {/* Main Analytics Content */}
        <div className="space-y-6 sm:space-y-8">
            {/* Performance Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-4 sm:p-6 border border-green-200 dark:border-green-800"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                      Performance Analytics
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      {getPerformanceTimeText()} • Updated now
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    Live Data
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Real-time</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Metrics Dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Key Metrics</h2>
              </div>
              <MetricsDashboard data={mockMetrics} />
            </motion.div>
            
            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
              {/* Performance Trend - Spans 2 columns on xl+ screens */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
              >
                <TrendChart data={mockTrendData} title="Performance Over Time" />
              </motion.div>
              
              {/* Quick Insights */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    Quick Insights
                  </h3>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Best Performing Campaign</span>
                    <span className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">TechGear Pro</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Peak Traffic Hour</span>
                    <span className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">2:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Top Device</span>
                    <span className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">Mobile</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Avg. Session Duration</span>
                    <span className="text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-400">3:42</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Demographic Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
              >
                <BreakdownPieChart data={mockGenderBreakdown} title="Gender Distribution" height={300} />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
              >
                <BreakdownPieChart data={mockAgeBreakdown} title="Age Distribution" height={300} />
              </motion.div>
            </div>

            {/* Platform & Location Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
              >
                <BreakdownPieChart data={mockPlatformBreakdown} title="Platform Breakdown" height={300} />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
              >
                <BreakdownPieChart data={mockLocationBreakdown} title="Location Breakdown" height={300} />
              </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}