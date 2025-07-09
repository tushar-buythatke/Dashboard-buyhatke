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
import { useFilters } from '@/context/FilterContext';
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



// Helper function to get default metrics
const getDefaultMetrics = (): MetricsData => ({
  impressions: 0,
  clicks: 0,
  ctr: 0,
  conversions: 0,
  revenue: 0,
  roi: 0
});

export default function Analytics() {
  const { filters } = useFilters(); // Get filters from context
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [dataGrouping, setDataGrouping] = useState<'1d' | '7d' | '30d'>('7d'); // For data aggregation
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [activeView, setActiveView] = useState<'campaign' | 'slot' | 'ad' | 'pos'>('campaign');
  
  // Filter states
  const [selectedCampaigns, setSelectedCampaigns] = useState<(string | number)[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<(string | number)[]>([]);
  const [selectedPOS, setSelectedPOS] = useState<(string | number)[]>([]);

  
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

  // Manual fetch - removed automatic fetching on filter changes

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
      
      // Use date range from context (DateRangePicker) with safety check
      const dateRange = filters.dateRange || {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      };
      
      console.log('Fetching analytics data with:', { dateRange, activeView, selectedCampaigns, selectedSlots, selectedPOS });

      // Build payload based on active view
      let trendSeries: TrendChartSeries[] = [];
      let aggregatedMetrics: MetricsData = getDefaultMetrics();

      if (activeView === 'campaign' && selectedCampaigns.length > 0) {
        // Campaign-wise comparison
        const campaignResults = await Promise.all(
          selectedCampaigns.map(async (campaignId) => {
            const payload: MetricsPayload = {
              ...dateRange,
              campaignId: [Number(campaignId)],
              slotId: selectedSlots.length > 0 ? selectedSlots.map(Number) : undefined,
              siteId: selectedPOS.length > 0 ? selectedPOS.map(Number) : undefined,
              interval: dataGrouping
            };

            const [metricsRes, trendRes] = await Promise.all([
              analyticsService.getMetrics(payload),
              analyticsService.getTrendData(payload)
            ]);

            const campaign = campaigns.find(c => c.campaignId === campaignId);
            return {
              campaignId,
              campaignName: campaign?.brandName || `Campaign ${campaignId}`,
              metrics: metricsRes.success ? metricsRes.data : getDefaultMetrics(),
              trendData: trendRes.success ? trendRes.data : []
            };
          })
        );

        // Create series for each campaign + combined total
        campaignResults.forEach(result => {
          try {
            if (result.trendData && Array.isArray(result.trendData) && result.trendData.length > 0) {
              trendSeries.push({
                name: result.campaignName,
                data: result.trendData
              });
            }
          } catch (error) {
            console.error('Error processing campaign trend data:', error, result);
          }
        });

        // Calculate combined metrics
        campaignResults.forEach(result => {
          try {
            if (result.metrics) {
              aggregatedMetrics.impressions += result.metrics.impressions || 0;
              aggregatedMetrics.clicks += result.metrics.clicks || 0;
              aggregatedMetrics.conversions += result.metrics.conversions || 0;
              aggregatedMetrics.revenue += result.metrics.revenue || 0;
            }
          } catch (error) {
            console.error('Error processing campaign metrics:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ? 
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;
        aggregatedMetrics.roi = aggregatedMetrics.impressions > 0 ? 
          ((aggregatedMetrics.revenue - (aggregatedMetrics.impressions * 0.1)) / (aggregatedMetrics.impressions * 0.1)) * 100 : 0;

      } else if (activeView === 'slot' && selectedSlots.length > 0) {
        // Slot-wise comparison
        const slotResults = await Promise.all(
          selectedSlots.map(async (slotId) => {
            const payload: MetricsPayload = {
              ...dateRange,
              slotId: [Number(slotId)],
              campaignId: selectedCampaigns.length > 0 ? selectedCampaigns.map(Number) : undefined,
              siteId: selectedPOS.length > 0 ? selectedPOS.map(Number) : undefined,
              interval: dataGrouping
            };

            const [metricsRes, trendRes] = await Promise.all([
              analyticsService.getMetrics(payload),
              analyticsService.getTrendData(payload)
            ]);

            const slot = slots.find(s => s.slotId === slotId);
            return {
              slotId,
              slotName: slot?.name || `Slot ${slotId}`,
              metrics: metricsRes.success ? metricsRes.data : getDefaultMetrics(),
              trendData: trendRes.success ? trendRes.data : []
            };
          })
        );

        // Create series for each slot
        slotResults.forEach(result => {
          try {
            if (result.trendData && Array.isArray(result.trendData) && result.trendData.length > 0) {
              trendSeries.push({
                name: result.slotName,
                data: result.trendData
              });
            }
          } catch (error) {
            console.error('Error processing slot trend data:', error, result);
          }
        });

        // Calculate combined metrics
        slotResults.forEach(result => {
          try {
            if (result.metrics) {
              aggregatedMetrics.impressions += result.metrics.impressions || 0;
              aggregatedMetrics.clicks += result.metrics.clicks || 0;
              aggregatedMetrics.conversions += result.metrics.conversions || 0;
              aggregatedMetrics.revenue += result.metrics.revenue || 0;
            }
          } catch (error) {
            console.error('Error processing slot metrics:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ? 
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;
        aggregatedMetrics.roi = aggregatedMetrics.impressions > 0 ? 
          ((aggregatedMetrics.revenue - (aggregatedMetrics.impressions * 0.1)) / (aggregatedMetrics.impressions * 0.1)) * 100 : 0;

      } else if (activeView === 'pos' && selectedPOS.length > 0) {
        // POS-wise comparison
        const posResults = await Promise.all(
          selectedPOS.map(async (posId) => {
            const payload: MetricsPayload = {
              ...dateRange,
              siteId: [Number(posId)],
              campaignId: selectedCampaigns.length > 0 ? selectedCampaigns.map(Number) : undefined,
              slotId: selectedSlots.length > 0 ? selectedSlots.map(Number) : undefined,
              interval: dataGrouping
            };

            const [metricsRes, trendRes] = await Promise.all([
              analyticsService.getMetrics(payload),
              analyticsService.getTrendData(payload)
            ]);

            const site = sites.find(s => s.posId === posId.toString());
            return {
              posId,
              posName: site?.name || `POS ${posId}`,
              metrics: metricsRes.success ? metricsRes.data : getDefaultMetrics(),
              trendData: trendRes.success ? trendRes.data : []
            };
          })
        );

        // Create series for each POS
        posResults.forEach(result => {
          try {
            if (result.trendData && Array.isArray(result.trendData) && result.trendData.length > 0) {
              trendSeries.push({
                name: result.posName,
                data: result.trendData
              });
            }
          } catch (error) {
            console.error('Error processing POS trend data:', error, result);
          }
        });

        // Calculate combined metrics
        posResults.forEach(result => {
          try {
            if (result.metrics) {
              aggregatedMetrics.impressions += result.metrics.impressions || 0;
              aggregatedMetrics.clicks += result.metrics.clicks || 0;
              aggregatedMetrics.conversions += result.metrics.conversions || 0;
              aggregatedMetrics.revenue += result.metrics.revenue || 0;
            }
          } catch (error) {
            console.error('Error processing POS metrics:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ? 
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;
        aggregatedMetrics.roi = aggregatedMetrics.impressions > 0 ? 
          ((aggregatedMetrics.revenue - (aggregatedMetrics.impressions * 0.1)) / (aggregatedMetrics.impressions * 0.1)) * 100 : 0;

      } else if (activeView === 'ad' && (selectedExactAdNames.length > 0 || selectedStartsWithAdNames.length > 0)) {
        // Ad-wise comparison (when ad names are selected)
        const basePayload: MetricsPayload = {
          ...dateRange,
          campaignId: selectedCampaigns.length > 0 ? selectedCampaigns.map(Number) : undefined,
          slotId: selectedSlots.length > 0 ? selectedSlots.map(Number) : undefined,
          siteId: selectedPOS.length > 0 ? selectedPOS.map(Number) : undefined,
          interval: dataGrouping
        };

        const [metricsResult, trendResult] = await Promise.all([
          analyticsService.getMetrics(basePayload),
          analyticsService.getTrendData(basePayload)
        ]);

        if (metricsResult.success && metricsResult.data) {
          aggregatedMetrics = metricsResult.data;
        }

        if (trendResult.success && trendResult.data) {
          trendSeries = [{
            name: 'Ad Performance',
            data: trendResult.data
          }];
        }

      } else {
        // Default: overall analytics
        const basePayload: MetricsPayload = {
          ...dateRange,
          campaignId: selectedCampaigns.length > 0 ? selectedCampaigns.map(Number) : undefined,
          slotId: selectedSlots.length > 0 ? selectedSlots.map(Number) : undefined,
          siteId: selectedPOS.length > 0 ? selectedPOS.map(Number) : undefined,
          interval: dataGrouping
        };

        const [metricsResult, trendResult] = await Promise.all([
          analyticsService.getMetrics(basePayload),
          analyticsService.getTrendData(basePayload)
        ]);

        if (metricsResult.success && metricsResult.data) {
          aggregatedMetrics = metricsResult.data;
        }

        if (trendResult.success && trendResult.data) {
          trendSeries = [{
            name: 'Overall Performance',
            data: trendResult.data
          }];
        }
      }

      // Set the processed data
      setMetricsData(aggregatedMetrics);
      setTrendData(trendSeries);

      // Fetch breakdown data and tables (non-view-specific)
      const basePayload: MetricsPayload = {
        ...dateRange,
        campaignId: selectedCampaigns.length > 0 ? selectedCampaigns.map(Number) : undefined,
        slotId: selectedSlots.length > 0 ? selectedSlots.map(Number) : undefined,
        siteId: selectedPOS.length > 0 ? selectedPOS.map(Number) : undefined,
      };

      const [genderResult, ageResult, platformResult, locationResult, locationTableResult, slotTableResult] = await Promise.all([
        analyticsService.getBreakdownData({ ...basePayload, by: 'gender' }),
        analyticsService.getBreakdownData({ ...basePayload, by: 'age' }),
        analyticsService.getBreakdownData({ ...basePayload, by: 'platform' }),
        analyticsService.getBreakdownData({ ...basePayload, by: 'location' }),
        analyticsService.getTableData('location', 'impressions'),
        analyticsService.getTableData('slotId', 'impressions')
      ]);

      // Safely process breakdown data
      try {
        setBreakdownData({
          gender: (genderResult.success && Array.isArray(genderResult.data)) ? genderResult.data : [],
          age: (ageResult.success && Array.isArray(ageResult.data)) ? ageResult.data : [],
          platform: (platformResult.success && Array.isArray(platformResult.data)) ? platformResult.data : [],
          location: (locationResult.success && Array.isArray(locationResult.data)) ? locationResult.data : []
        });
      } catch (error) {
        console.error('Error setting breakdown data:', error);
        setBreakdownData({ gender: [], age: [], platform: [], location: [] });
      }

      // Safely process table data
      try {
        if (locationTableResult && locationTableResult.success && Array.isArray(locationTableResult.data)) {
          setTopLocations(locationTableResult.data);
        } else {
          setTopLocations([]);
        }
      } catch (error) {
        console.error('Error setting location table data:', error);
        setTopLocations([]);
      }

      try {
        if (slotTableResult && slotTableResult.success && Array.isArray(slotTableResult.data)) {
          setTopSlotsData(slotTableResult.data);
        } else {
          setTopSlotsData([]);
        }
      } catch (error) {
        console.error('Error setting slot table data:', error);
        setTopSlotsData([]);
      }

      console.log('Analytics data fetch completed successfully:', { 
        metricsData: aggregatedMetrics, 
        trendSeries: trendSeries.length,
        breakdownDataItems: Object.keys(breakdownData).length
      });
      
      toast.success('Analytics data fetched successfully!');

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error(`Failed to load analytics data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Reset data to safe defaults on error
      setMetricsData(getDefaultMetrics());
      setTrendData([]);
      setBreakdownData({ gender: [], age: [], platform: [], location: [] });
      setTopLocations([]);
      setTopSlotsData([]);
      
    } finally {
      setDataLoading(false);
      console.log('Data loading completed');
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



  // No mock data - all data comes from API

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

              {/* Date Range Picker */}
              <DateRangePicker />

              {/* Data Grouping Toggle */}
              <Select value={dataGrouping} onValueChange={(value) => setDataGrouping(value as '1d' | '7d' | '30d')}>
                <SelectTrigger className="h-9 sm:h-10 w-full sm:w-auto text-xs sm:text-sm border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                  <SelectValue placeholder="Data Grouping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Daily</SelectItem>
                  <SelectItem value="7d">Weekly</SelectItem>
                  <SelectItem value="30d">Monthly</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={fetchAnalyticsData}
                disabled={dataLoading}
                className="h-9 sm:h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {dataLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Fetch Results
                  </>
                )}
              </Button>
              
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
                    {dataGrouping === '1d' ? 'Daily' : dataGrouping === '7d' ? 'Weekly' : 'Monthly'} Grouping • Real-time data
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
              <div className="w-full">
                {trendData && trendData.length > 0 ? (
                  <TrendChart
                    series={trendData}
                    title={`${activeView === 'slot' ? 'Slot' : activeView === 'campaign' ? 'Campaign' : activeView === 'ad' ? 'Ad' : 'POS'} Performance Over Time`}
                  />
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No trend data available. Please select filters and click "Fetch Results".</p>
                  </div>
                )}
              </div>
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
                title="Top 5 Locations (Cities/States) Based on Impressions"
                data={topLocations.map(item => ({
                  location: item.location || 'Unknown',
                  impressions: item.impressions || 0,
                  clicks: item.clicks || 0,
                  conversions: item.conversions || 0
                }))}
                columns={[
                  { key: 'location', label: 'Location (City/State)' },
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
                title="Top Slots Sorted by Impressions, Clicks, and Conversion Rate"
                data={topSlotsData.map(slot => ({
                  slotName: `Slot ${slot.slotId || 'Unknown'}`,
                  impressions: slot.impressions || 0,
                  clicks: slot.clicks || 0,
                  conversionRate: (slot.clicks && slot.clicks > 0) ? 
                    `${(((slot.conversions || 0) / slot.clicks) * 100).toFixed(2)}%` : 
                    '0%'
                }))}
                columns={[
                  { key: 'slotName', label: 'Slot Name' },
                  { key: 'impressions', label: 'Impressions', format: 'number' },
                  { key: 'clicks', label: 'Clicks', format: 'number' },
                  { key: 'conversionRate', label: 'Conversion Rate (CR)' }
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
                data={trendData.length > 0 && trendData[0]?.data ? 
                  trendData[0].data.map(d => ({ 
                    date: d.date, 
                    impressions: d.impressions || 0, 
                    conversions: d.conversions || 0 
                  })) : 
                  []
                }
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
                data={trendData.length > 0 && trendData[0]?.data ? 
                  trendData[0].data.map(d => ({ 
                    date: d.date, 
                    impressions: d.impressions || 0, 
                    ctr: d.ctr || 0 
                  })) : 
                  []
                }
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
            <BreakdownPieChart 
              data={breakdownData.age || []} 
              title="Age-wise Performance Distribution" 
              height={400} 
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}