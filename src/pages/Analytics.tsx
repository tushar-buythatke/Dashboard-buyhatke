import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Calendar, TrendingUp, Filter, ChevronDown, ChevronUp, BarChart3, PieChart, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Analytics Components
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { TrendChart } from '@/components/analytics/TrendChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { ComboChart } from '@/components/analytics/ComboChart';
import { DataTable } from '@/components/analytics/DataTable';
import { GroupedBarChart } from '@/components/analytics/GroupedBarChart';
import { MultiSelectDropdown } from '@/components/analytics/MultiSelectDropdown';

// Mock Data
import { 
  mockTrendData,
  mockSlots,
  mockCampaigns,
  mockPOS,
  mockSlotAnalytics,
  mockCampaignAnalytics,
  mockTopLocations,
  mockTopLandingUrls,
  mockTopSlots,
  mockDeviceBreakdown,
  mockAgeAnalytics,
  mockBrandAgeData,
  mockImpressionsVsConversions,
  mockImpressionsVsCTR,
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

const timeRanges = [
  { value: '1d', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

const kpiOptions = [
  { value: 'impressions', label: 'Impressions' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'ctr', label: 'CTR' },
  { value: 'conversionRate', label: 'Conversion Rate' }
];

export function Analytics() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [activeView, setActiveView] = useState<'slot' | 'campaign'>('slot');
  
  // Filter states
  const [selectedCampaigns, setSelectedCampaigns] = useState<(string | number)[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<(string | number)[]>([]);
  const [selectedPOS, setSelectedPOS] = useState<(string | number)[]>([]);
  const [selectedKPIs, setSelectedKPIs] = useState<(string | number)[]>(['impressions', 'clicks']);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    console.log('Exporting analytics data...');
  };

  // Get current analytics data based on active view
  const getCurrentAnalyticsData = () => {
    if (activeView === 'slot') {
      if (selectedSlots.length > 0) {
        const slotName = mockSlots.find(slot => slot.slotId === selectedSlots[0])?.name;
        return slotName ? (mockSlotAnalytics as any)[slotName] || mockTrendData : mockTrendData;
      }
      return mockSlotAnalytics['Header Banner'] || mockTrendData;
    } else {
      if (selectedCampaigns.length > 0) {
        const campaignName = mockCampaigns.find(campaign => campaign.campaignId === selectedCampaigns[0])?.brandName;
        return campaignName ? (mockCampaignAnalytics as any)[campaignName] || mockTrendData : mockTrendData;
      }
      return mockCampaignAnalytics['TechGear Pro'] || mockTrendData;
    }
  };

  const getFilterSummary = () => {
    const parts = [];
    if (selectedCampaigns.length > 0) parts.push(`${selectedCampaigns.length} campaign${selectedCampaigns.length > 1 ? 's' : ''}`);
    if (selectedSlots.length > 0) parts.push(`${selectedSlots.length} slot${selectedSlots.length > 1 ? 's' : ''}`);
    if (selectedPOS.length > 0) parts.push(`${selectedPOS.length} marketplace${selectedPOS.length > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? `Filtered by ${parts.join(', ')}` : 'No filters applied';
  };

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
                  Advanced Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm sm:text-base">
                  Comprehensive performance insights • {getFilterSummary()}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  variant={activeView === 'slot' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('slot')}
                  className="flex items-center space-x-2 text-xs"
                >
                  <BarChart3 className="h-3 w-3" />
                  <span>Slot-wise</span>
                </Button>
                <Button
                  variant={activeView === 'campaign' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('campaign')}
                  className="flex items-center space-x-2 text-xs"
                >
                  <PieChart className="h-3 w-3" />
                  <span>Campaign-wise</span>
                </Button>
              </div>

              {/* Time Range Selector */}
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-32 h-9 sm:h-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
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
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedCampaigns.length + selectedSlots.length + selectedPOS.length}
                </Badge>
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
            className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
          >
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MultiSelectDropdown
                  label="Campaigns"
                  options={mockCampaigns.map(campaign => ({ value: campaign.campaignId, label: campaign.brandName }))}
                  selectedValues={selectedCampaigns}
                  onChange={setSelectedCampaigns}
                  placeholder="Select campaigns..."
                />
                
                <MultiSelectDropdown
                  label="Slots"
                  options={mockSlots.map(slot => ({ value: slot.slotId, label: slot.name }))}
                  selectedValues={selectedSlots}
                  onChange={setSelectedSlots}
                  placeholder="Select slots..."
                />
                
                <MultiSelectDropdown
                  label="Marketplaces (POS)"
                  options={mockPOS.map(pos => ({ value: pos.posId, label: pos.name }))}
                  selectedValues={selectedPOS}
                  onChange={setSelectedPOS}
                  placeholder="Select marketplaces..."
                />
                
                <MultiSelectDropdown
                  label="KPIs"
                  options={kpiOptions}
                  selectedValues={selectedKPIs}
                  onChange={setSelectedKPIs}
                  placeholder="Select KPIs..."
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-2">
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
                    {activeView === 'slot' ? 'Slot-wise' : 'Campaign-wise'} Analytics
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {timeRanges.find(r => r.value === selectedTimeRange)?.label} • Real-time data
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Live Data
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {activeView} View
                </Badge>
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
          
          {/* Main Analytics Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
          >
            <TrendChart 
              data={getCurrentAnalyticsData()} 
              title={`${activeView === 'slot' ? 'Slot' : 'Campaign'} Performance Over Time`} 
            />
          </motion.div>

          {/* Data Tables Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <DataTable
                title="Top 5 Locations by Impressions"
                data={mockTopLocations}
                columns={[
                  { key: 'location', label: 'Location' },
                  { key: 'impressions', label: 'Impressions', format: 'number' },
                  { key: 'clicks', label: 'Clicks', format: 'number' },
                  { key: 'conversions', label: 'Conversions', format: 'number' }
                ]}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <DataTable
                title="Top 5 Landing URLs by Clicks"
                data={mockTopLandingUrls}
                columns={[
                  { key: 'landingUrl', label: 'Landing URL', format: 'url' },
                  { key: 'clicks', label: 'Clicks', format: 'number' },
                  { key: 'impressions', label: 'Impressions', format: 'number' },
                  { key: 'conversions', label: 'Conversions', format: 'number' }
                ]}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <DataTable
                title="Top Slots by Performance"
                data={mockTopSlots}
                columns={[
                  { key: 'slotName', label: 'Slot Name' },
                  { key: 'impressions', label: 'Impressions', format: 'number' },
                  { key: 'clicks', label: 'Clicks', format: 'number' },
                  { key: 'conversionRate', label: 'CR %', format: 'percentage' }
                ]}
              />
            </motion.div>
          </div>

          {/* Combo Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <ComboChart
                data={mockImpressionsVsConversions}
                title="Impressions vs Conversions"
                barKey="impressions"
                lineKey="conversions"
                barName="Impressions"
                lineName="Conversions"
                barColor="#6366F1"
                lineColor="#059669"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <ComboChart
                data={mockImpressionsVsCTR}
                title="Impressions vs CTR"
                barKey="impressions"
                lineKey="ctr"
                barName="Impressions"
                lineName="CTR (%)"
                barColor="#7C3AED"
                lineColor="#DC2626"
              />
            </motion.div>
          </div>

          {/* Demographic and Platform Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <BreakdownPieChart data={mockGenderBreakdown} title="Gender Distribution" height={250} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <BreakdownPieChart data={mockAgeBreakdown} title="Age Distribution" height={250} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <BreakdownPieChart data={mockPlatformBreakdown} title="Platform Breakdown" height={250} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <BreakdownPieChart data={mockLocationBreakdown} title="Location Distribution" height={250} />
            </motion.div>
          </div>

          {/* Per-Brand Age-wise Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
          >
            <GroupedBarChart
              data={mockBrandAgeData}
              title="Per-Brand Age-wise Performance"
              xAxisKey="ageGroup"
              seriesKeys={['TechGear Pro', 'Fashion Forward', 'Sports Elite', 'Home & Garden']}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}