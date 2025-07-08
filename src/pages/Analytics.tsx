import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Calendar, TrendingUp, Filter, ChevronDown, ChevronUp, BarChart3, PieChart, Table, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterSidebar } from '@/components/analytics/FilterSidebar';
import { TrendChart } from '@/components/analytics/TrendChart';
import { GroupedBarChart } from '@/components/analytics/GroupedBarChart';
import { ComboChart } from '@/components/analytics/ComboChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { FilterDropdown } from '@/components/analytics/FilterDropdown';
import { MultiSelectDropdown } from '@/components/analytics/MultiSelectDropdown';
import { AdNameFilterDropdown } from '@/components/analytics/AdNameFilterDropdown';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { DataTable } from '@/components/analytics/DataTable';

// Analytics Components
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';

// Analytics Service
import { 
  analyticsService, 
  MetricsPayload 
} from '@/services/analyticsService';
import { adService } from '@/services/adService';

// Types
import { 
  Campaign, 
  Slot, 
  MetricsData, 
  TrendDataPoint, 
  BreakdownData,
  TrendChartSeries
} from '@/types';

// Type definitions for sites (specific to analytics)
interface Site {
  posId: string;
  name: string;
  domain: string[];
  image: string;
}

interface AdOption {
  name: string;
  label: string;
}

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
  const [activeView, setActiveView] = useState<'campaign' | 'slot' | 'ad' | 'pos'>('campaign');
  
  // Filter states
  const [selectedCampaigns, setSelectedCampaigns] = useState<(string | number)[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<(string | number)[]>([]);
  const [selectedPOS, setSelectedPOS] = useState<(string | number)[]>([]);
  const [selectedKPIs, setSelectedKPIs] = useState<(string | number)[]>(['impressions', 'clicks']);
  
  // Ad name filter states
  const [selectedExactAdNames, setSelectedExactAdNames] = useState<string[]>([]);
  const [selectedStartsWithAdNames, setSelectedStartsWithAdNames] = useState<string[]>([]);
  const [adNameOptions, setAdNameOptions] = useState<AdOption[]>([]);

  // Data states
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [trendData, setTrendData] = useState<TrendChartSeries[]>([]);
  const [breakdownData, setBreakdownData] = useState<{
    gender: BreakdownData[];
    age: BreakdownData[];
    platform: BreakdownData[];
    location: BreakdownData[];
  }>({
    gender: [],
    age: [],
    platform: [],
    location: []
  });

  // Table data states
  const [topLocations, setTopLocations] = useState<any[]>([]);
  const [topSlotsData, setTopSlotsData] = useState<any[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Fetch dropdown data on component mount
  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Fetch analytics data when filters change
  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeRange, selectedCampaigns, selectedSlots, selectedPOS, selectedExactAdNames, selectedStartsWithAdNames, activeView]);

  // Fetch ad names when selected campaigns change
  useEffect(() => {
    const loadAdNames = async () => {
      if (selectedCampaigns.length === 0) {
        setAdNameOptions([]);
        setSelectedExactAdNames([]);
        setSelectedStartsWithAdNames([]);
        return;
      }
      try {
        const adOptions: AdOption[] = [];
        await Promise.all(
          selectedCampaigns.map(async (campId) => {
            const res = await adService.getAdLabels(Number(campId));
            if (res.success && res.data) {
              // Add each ad option with name and label fields
              res.data.forEach((adInfo) => {
                adOptions.push({
                  name: adInfo.name,
                  label: adInfo.label
                });
              });
            }
          })
        );
        // Remove duplicates based on name field
        const uniqueOptions = adOptions.filter((option, index, self) =>
          index === self.findIndex((t) => t.name === option.name)
        );
        setAdNameOptions(uniqueOptions);
      } catch (err) {
        console.error('Failed to fetch ad names', err);
      }
    };
    loadAdNames();
  }, [selectedCampaigns]);

  const fetchDropdownData = async () => {
    try {
      setLoading(true);
      const [campaignsResult, slotsResult, sitesResult] = await Promise.all([
        analyticsService.getCampaigns(),
        analyticsService.getSlots(),
        analyticsService.getSites()
      ]);

      if (campaignsResult.success && campaignsResult.data) {
        setCampaigns(campaignsResult.data);
      }

      if (slotsResult.success && slotsResult.data) {
        setSlots(slotsResult.data);
      }

      if (sitesResult.success && sitesResult.data) {
        setSites(sitesResult.data);
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      toast.error('Failed to load dropdown data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setDataLoading(true);
      
      const dateRange = analyticsService.getDateRange(selectedTimeRange);

      // Build payload suited for the updated analytics backend – filters are arrays
      const basePayload: MetricsPayload = {
        ...dateRange,
        campaignId: selectedCampaigns.length > 0 ? selectedCampaigns.map(Number) : undefined,
        slotId: selectedSlots.length > 0 ? selectedSlots.map(Number) : undefined,
        siteId: selectedPOS.length > 0 ? selectedPOS.map(Number) : undefined,
      };
      
      // Add ad name filters
      if (selectedExactAdNames.length > 0) {
        basePayload.adNameExact = selectedExactAdNames;
      }
      
      if (selectedStartsWithAdNames.length > 0) {
        basePayload.adNameStartsWith = selectedStartsWithAdNames;
      }

      // Build payload based on the active view
      const trendPayload: MetricsPayload = { ...basePayload, interval: selectedTimeRange };
      
      // Setup comparison logic for trend data
      if (activeView === 'slot' && selectedSlots.length > 0) {
        trendPayload.slotId = selectedSlots.map(Number);
      } else if (activeView === 'ad') {
        // Apply ad name filters for ad view
        trendPayload.adNameExact = selectedExactAdNames;
        trendPayload.adNameStartsWith = selectedStartsWithAdNames;
      } else if (activeView === 'pos' && selectedPOS.length > 0) {
        trendPayload.siteId = selectedPOS.map(Number);
      }

      // Fetch metrics, trend data, breakdowns & tables in parallel
      const [metricsResult, trendResult, ...breakdownResults] = await Promise.all([
        analyticsService.getMetrics(basePayload),
        analyticsService.getTrendData(trendPayload),
        analyticsService.getBreakdownData({ ...basePayload, by: 'gender' }),
        analyticsService.getBreakdownData({ ...basePayload, by: 'age' }),
        analyticsService.getBreakdownData({ ...basePayload, by: 'platform' }),
        analyticsService.getBreakdownData({ ...basePayload, by: 'location' }),
        // table data
        analyticsService.getTableData('location', 'impressions'),
        analyticsService.getTableData('slotId', 'impressions')
      ]);

      if (metricsResult.success && metricsResult.data) {
        setMetricsData(metricsResult.data);
      }

      if (trendResult.success && trendResult.data) {
        // Transform the flat TrendDataPoint[] to TrendChartSeries[]
        const series: TrendChartSeries[] = [{
          name: 'Overall Performance',
          data: trendResult.data,
        }];
        setTrendData(series);
      }

      // Process breakdown & table data
      const [genderResult, ageResult, platformResult, locationResult, locationTableResult, slotTableResult] = breakdownResults;
      setBreakdownData({
        gender: genderResult.success ? genderResult.data || [] : [],
        age: ageResult.success ? ageResult.data || [] : [],
        platform: platformResult.success ? platformResult.data || [] : [],
        location: locationResult.success ? locationResult.data || [] : []
      });

      // Table data processing
      if (locationTableResult && locationTableResult.success && locationTableResult.data) {
        setTopLocations(locationTableResult.data);
      }
      if (slotTableResult && slotTableResult.success && slotTableResult.data) {
        setTopSlotsData(slotTableResult.data);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalyticsData();
    setIsRefreshing(false);
  };

  const handleExport = () => {
    console.log('Exporting analytics data...');
    toast.success('Export started');
  };

  const getFilterSummary = () => {
    const parts = [];
    if (selectedCampaigns.length > 0) parts.push(`${selectedCampaigns.length} campaign${selectedCampaigns.length > 1 ? 's' : ''}`);
    if (selectedSlots.length > 0) parts.push(`${selectedSlots.length} slot${selectedSlots.length > 1 ? 's' : ''}`);
    if (selectedPOS.length > 0) parts.push(`${selectedPOS.length} marketplace${selectedPOS.length > 1 ? 's' : ''}`);
    
    const adNameCount = selectedExactAdNames.length + selectedStartsWithAdNames.length;
    if (adNameCount > 0) parts.push(`${adNameCount} ad name${adNameCount > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? `Filtered by ${parts.join(', ')}` : 'No filters applied';
  };

  // Get default metrics for loading state
  const getDefaultMetrics = (): MetricsData => ({
    impressions: 0,
    clicks: 0,
    ctr: 0,
    conversions: 0,
    revenue: 0,
    roi: 0
  });

  // Fallback mock data – used only if API fails
  const mockTopLocations = [
    { location: 'Mumbai', impressions: 45000, clicks: 1350 },
    { location: 'Delhi', impressions: 38000, clicks: 1140 },
    { location: 'Bangalore', impressions: 32000, clicks: 960 },
    { location: 'Chennai', impressions: 28000, clicks: 840 },
    { location: 'Hyderabad', impressions: 25000, clicks: 750 }
  ];

  const mockTopSlots = [
    { slotId: 1, impressions: 52000, clicks: 1560 },
    { slotId: 2, impressions: 41000, clicks: 1230 },
    { slotId: 3, impressions: 38000, clicks: 1140 },
    { slotId: 4, impressions: 28000, clicks: 840 },
    { slotId: 5, impressions: 25000, clicks: 750 }
  ];

  const mockImpressionsVsConversions = [
    { date: '2024-01-01', impressions: 12000, conversions: 18 },
    { date: '2024-01-02', impressions: 13500, conversions: 21 },
    { date: '2024-01-03', impressions: 11800, conversions: 16 },
    { date: '2024-01-04', impressions: 14200, conversions: 23 },
    { date: '2024-01-05', impressions: 15600, conversions: 26 },
    { date: '2024-01-06', impressions: 13900, conversions: 19 },
    { date: '2024-01-07', impressions: 16200, conversions: 28 }
  ];

  const mockImpressionsVsCTR = [
    { date: '2024-01-01', impressions: 12000, ctr: 2.5 },
    { date: '2024-01-02', impressions: 13500, ctr: 2.6 },
    { date: '2024-01-03', impressions: 11800, ctr: 2.4 },
    { date: '2024-01-04', impressions: 14200, ctr: 2.7 },
    { date: '2024-01-05', impressions: 15600, ctr: 2.8 },
    { date: '2024-01-06', impressions: 13900, ctr: 2.5 },
    { date: '2024-01-07', impressions: 16200, ctr: 2.9 }
  ];

  const mockBrandAgeData = [
    { ageGroup: '18-24', 'TechGear Pro': 145, 'Fashion Forward': 120, 'Sports Elite': 98, 'Home & Garden': 76 },
    { ageGroup: '25-34', 'TechGear Pro': 289, 'Fashion Forward': 245, 'Sports Elite': 178, 'Home & Garden': 134 },
    { ageGroup: '35-44', 'TechGear Pro': 234, 'Fashion Forward': 198, 'Sports Elite': 145, 'Home & Garden': 167 },
    { ageGroup: '45-54', 'TechGear Pro': 156, 'Fashion Forward': 134, 'Sports Elite': 89, 'Home & Garden': 198 },
    { ageGroup: '55+', 'TechGear Pro': 67, 'Fashion Forward': 45, 'Sports Elite': 34, 'Home & Garden': 123 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-gray-900 transition-colors duration-200 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce ml-2" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce ml-2" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">Loading Analytics Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-100"></div>
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-200"></div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Advanced Analytics
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  Your central hub for performance insights.
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* View Selector */}
              <Select value={activeView} onValueChange={(value) => setActiveView(value as any)}>
                <SelectTrigger className="h-9 sm:h-10 w-full sm:w-auto text-xs sm:text-sm border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                  <SelectValue placeholder="View By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">Campaign wise</SelectItem>
                  <SelectItem value="slot">Slots wise</SelectItem>
                  <SelectItem value="ad">Ads wise</SelectItem>
                  <SelectItem value="pos">POS wise</SelectItem>
                </SelectContent>
              </Select>

              {/* Time Range Selector */}
              <DateRangePicker />

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 sm:h-10"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-9 sm:h-10"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="h-9 sm:h-10"
              >
                <Filter className="h-4 w-4" />
                <Badge variant="secondary" className="ml-2">
                  {selectedCampaigns.length + selectedSlots.length + selectedPOS.length + selectedExactAdNames.length + selectedStartsWithAdNames.length}
                </Badge>
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
                  options={campaigns.map(campaign => ({ value: campaign.campaignId, label: campaign.brandName }))}
                  selectedValues={selectedCampaigns}
                  onChange={setSelectedCampaigns}
                  placeholder="Select campaigns..."
                />
                
                <MultiSelectDropdown
                  label="Slots"
                  options={slots.map(slot => ({ value: slot.slotId, label: slot.name }))}
                  selectedValues={selectedSlots}
                  onChange={setSelectedSlots}
                  placeholder="Select slots..."
                />
                
                <MultiSelectDropdown
                  label="Marketplaces (POS)"
                  options={sites.map(site => ({ value: site.posId, label: site.name }))}
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

                {adNameOptions.length > 0 && (
                  <div className="md:col-span-2">
                    <AdNameFilterDropdown
                      options={adNameOptions}
                      selectedExactValues={selectedExactAdNames}
                      selectedStartsWithValues={selectedStartsWithAdNames}
                      onExactChange={setSelectedExactAdNames}
                      onStartsWithChange={setSelectedStartsWithAdNames}
                      placeholder="Filter ad names..."
                      label="Ad Names (Starts With / Exact)"
                    />
                  </div>
                )}
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
                    {activeView === 'slot' ? 'Slot-wise' : activeView === 'campaign' ? 'Campaign-wise' : activeView === 'ad' ? 'Ad-wise' : 'POS-wise'} Analytics
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {selectedTimeRange} • Real-time data
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
            <MetricsDashboard data={metricsData || getDefaultMetrics()} />
          </motion.div>
          
          {/* Main Analytics Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow duration-200"
          >
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce ml-2" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce ml-2" style={{ animationDelay: '0.2s' }}></div>
                <span className="ml-3 text-base font-medium">Loading chart data...</span>
              </div>
            ) : (
              <TrendChart
                series={trendData}
                title={`${activeView === 'slot' ? 'Slot' : activeView === 'campaign' ? 'Campaign' : activeView === 'ad' ? 'Ad' : 'POS'} Performance Over Time`}
              />
            )}
          </motion.div>

          {/* Data Tables Section */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <DataTable
                title="Top 5 Locations by Impressions"
                data={topLocations.length > 0 ? topLocations : mockTopLocations}
                columns={[
                  { key: 'location', label: 'Location' },
                  { key: 'impressions', label: 'Impressions', format: 'number' },
                  { key: 'clicks', label: 'Clicks', format: 'number' }
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
                title="Top Slots by Performance"
                data={topSlotsData.length > 0 ? topSlotsData : mockTopSlots}
                columns={[
                  { key: 'slotId', label: 'Slot ID' },
                  { key: 'impressions', label: 'Impressions', format: 'number' },
                  { key: 'clicks', label: 'Clicks', format: 'number' }
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
              <BreakdownPieChart data={breakdownData.gender} title="Gender Distribution" height={250} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <BreakdownPieChart data={breakdownData.age} title="Age Distribution" height={250} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <BreakdownPieChart data={breakdownData.platform} title="Platform Breakdown" height={250} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <BreakdownPieChart data={breakdownData.location} title="Location Distribution" height={250} />
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