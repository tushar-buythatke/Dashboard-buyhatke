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
  const [adNamesLoading, setAdNamesLoading] = useState(false);

  // Data states
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [comparisonMetricsData, setComparisonMetricsData] = useState<MetricsData | null>(null);
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
        setAdNamesLoading(false);
        return;
      }
      
      try {
        setAdNamesLoading(true);
        console.log('Loading ad names for campaigns:', selectedCampaigns);
        
        const adOptions: AdOption[] = [];
        await Promise.all(
          selectedCampaigns.map(async (campId) => {
            console.log('Fetching ads for campaign ID:', campId);
            const res = await adService.getAdLabels(Number(campId));
            console.log('Ad labels response for campaign', campId, ':', res);
            
            if (res.success && res.data) {
              // Add each ad option with name and label fields
              res.data.forEach((adInfo) => {
                console.log('Processing ad info:', adInfo);
                adOptions.push({
                  name: adInfo.name,
                  label: adInfo.label
                });
              });
            } else {
              console.warn('Failed to get ad labels for campaign', campId, ':', res.message);
            }
          })
        );
        
        // Remove duplicates based on name field
        const uniqueOptions = adOptions.filter((option, index, self) =>
          index === self.findIndex((t) => t.name === option.name)
        );
        
        console.log('Final ad options:', uniqueOptions);
        setAdNameOptions(uniqueOptions);
      } catch (err) {
        console.error('Failed to fetch ad names', err);
        toast.error('Failed to load ad names');
      } finally {
        setAdNamesLoading(false);
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
      
      // Calculate comparison date range based on period
      const calculateComparisonDateRange = (currentRange: any, period: '1d' | '7d' | '30d') => {
        const fromDate = new Date(currentRange.from);
        const toDate = new Date(currentRange.to);
        const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate previous period
        const comparisonToDate = new Date(fromDate);
        comparisonToDate.setDate(comparisonToDate.getDate() - 1); // End one day before current period starts
        
        const comparisonFromDate = new Date(comparisonToDate);
        comparisonFromDate.setDate(comparisonFromDate.getDate() - rangeDays + 1); // Go back the same number of days
        
        return {
          from: comparisonFromDate.toISOString().split('T')[0],
          to: comparisonToDate.toISOString().split('T')[0]
        };
      };
      
      const comparisonDateRange = calculateComparisonDateRange(dateRange, dataGrouping);
      
      console.log('Fetching analytics data with:', { 
        dateRange, 
        comparisonDateRange,
        activeView, 
        selectedCampaigns, 
        selectedSlots, 
        selectedPOS 
      });

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

      // Fetch comparison metrics for the previous period
      try {
        const comparisonPayload: MetricsPayload = {
          ...comparisonDateRange,
          campaignId: selectedCampaigns.length > 0 ? selectedCampaigns.map(Number) : undefined,
          slotId: selectedSlots.length > 0 ? selectedSlots.map(Number) : undefined,
          siteId: selectedPOS.length > 0 ? selectedPOS.map(Number) : undefined,
          interval: dataGrouping
        };

        const comparisonResult = await analyticsService.getMetrics(comparisonPayload);
        
        if (comparisonResult.success && comparisonResult.data) {
          setComparisonMetricsData(comparisonResult.data);
          console.log('Comparison metrics fetched successfully:', comparisonResult.data);
        } else {
          setComparisonMetricsData(null);
          console.log('No comparison data available');
        }
      } catch (error) {
        console.error('Error fetching comparison metrics:', error);
        setComparisonMetricsData(null);
      }

      // Fetch breakdown data and tables (non-view-specific)
      const basePayload: MetricsPayload = {
        ...dateRange,
        campaignId: selectedCampaigns.length > 0 ? selectedCampaigns.map(Number) : undefined,
        slotId: selectedSlots.length > 0 ? selectedSlots.map(Number) : undefined,
        siteId: selectedPOS.length > 0 ? selectedPOS.map(Number) : undefined,
      };

      // Ensure we have at least one filter for breakdown queries (backend requirement)
      const hasValidCampaignId = basePayload.campaignId && (Array.isArray(basePayload.campaignId) ? basePayload.campaignId.length > 0 : true);
      const hasValidSlotId = basePayload.slotId && (Array.isArray(basePayload.slotId) ? basePayload.slotId.length > 0 : true);
      const hasValidSiteId = basePayload.siteId && (Array.isArray(basePayload.siteId) ? basePayload.siteId.length > 0 : true);

      const breakdownPayload = {
        ...basePayload,
        // Add a default campaignId if no filters are selected
        ...(!hasValidCampaignId && !hasValidSlotId && !hasValidSiteId && {
          campaignId: campaigns.length > 0 ? [campaigns[0].campaignId] : [1] // Use first campaign or default
        })
      };

      console.log('Breakdown payload:', breakdownPayload);

      const [genderResult, ageResult, platformResult, locationResult, locationTableResult, slotTableResult] = await Promise.all([
        analyticsService.getBreakdownData({ ...breakdownPayload, by: 'gender' }),
        analyticsService.getBreakdownData({ ...breakdownPayload, by: 'age' }),
        analyticsService.getBreakdownData({ ...breakdownPayload, by: 'platform' }),
        analyticsService.getBreakdownData({ ...breakdownPayload, by: 'location' }),
        analyticsService.getTableData('location', 'impressions'),
        analyticsService.getTableData('slotId', 'impressions')
      ]);

      // Safely process breakdown data
      try {
      setBreakdownData({
          gender: (genderResult.success && Array.isArray(genderResult.data)) ? genderResult.data : [],
          age: (ageResult.success && Array.isArray(ageResult.data)) ? transformAgeBucketData(ageResult.data) : [],
          platform: (platformResult.success && Array.isArray(platformResult.data)) ? platformResult.data : [],
          location: (locationResult.success && Array.isArray(locationResult.data)) ? locationResult.data : []
        });
        
        // Log transformed age data for debugging
        if (ageResult.success && ageResult.data) {
          console.log('Raw age data from backend:', ageResult.data);
          console.log('Transformed age data for chart:', transformAgeBucketData(ageResult.data));
        }
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
      setComparisonMetricsData(null);
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

  // Transform age bucket data from backend to frontend format
  const transformAgeBucketData = (rawData: any[]): any[] => {
    if (!rawData || rawData.length === 0) {
      console.log('No age data to transform');
      return [];
    }

    try {
      console.log('Transforming age bucket data:', rawData);
      
      // Age bucket definitions (adjust these ranges based on your backend logic)
      const ageBucketLabels = [
        '13-17', // ageBucket0
        '18-24', // ageBucket1
        '25-34', // ageBucket2
        '35-44', // ageBucket3
        '45-54', // ageBucket4
        '55-64', // ageBucket5
        '65-74', // ageBucket6
        '75+'    // ageBucket7
      ];

      // Initialize age distribution
      const ageDistribution: { [key: string]: number } = {};
      ageBucketLabels.forEach(label => {
        ageDistribution[label] = 0;
      });

      // Process each data row
      rawData.forEach((row, index) => {
        console.log(`Processing row ${index}:`, row);
        
        // Sum up each age bucket
        ageBucketLabels.forEach((label, bucketIndex) => {
          const bucketKey = `ageBucket${bucketIndex}`;
          const bucketValue = row[bucketKey];
          
          if (typeof bucketValue === 'number' && bucketValue > 0) {
            ageDistribution[label] += bucketValue;
            console.log(`Added ${bucketValue} to ${label} from ${bucketKey}`);
          } else if (typeof bucketValue === 'string' && !isNaN(parseInt(bucketValue))) {
            const parsedValue = parseInt(bucketValue);
            ageDistribution[label] += parsedValue;
            console.log(`Added ${parsedValue} to ${label} from ${bucketKey} (parsed from string)`);
          } else if (bucketValue !== undefined && bucketValue !== null) {
            console.log(`Unexpected value for ${bucketKey}:`, bucketValue, typeof bucketValue);
          }
        });
      });

      console.log('Final age distribution:', ageDistribution);

      // Convert to array format expected by pie chart
      const result = Object.entries(ageDistribution)
        .filter(([_, value]) => value > 0) // Only include non-zero values
        .map(([name, value]) => ({
          name,
          value,
          percentage: 0 // Will be calculated by the chart component
        }));

      console.log('Transformed age data for chart:', result);
      return result;

    } catch (error) {
      console.error('Error transforming age bucket data:', error, rawData);
      return [];
    }
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-blue-950/30 dark:to-purple-950/20 transition-all duration-500">
      {/* Stunning Header with Glassmorphism */}
      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 px-4 sm:px-6 py-6 sm:py-8 shadow-lg shadow-blue-500/5">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 animate-pulse"></div>
        
        <div className="relative max-w-7xl mx-auto">
          {/* Title Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              {/* Enhanced animated dots */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/30"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-ping opacity-20"></div>
              </div>
                <div className="relative">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse delay-150 shadow-lg shadow-blue-500/30"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-ping opacity-20 delay-150"></div>
                </div>
                <div className="relative">
                  <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-pulse delay-300 shadow-lg shadow-purple-500/30"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-ping opacity-20 delay-300"></div>
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
                  Advanced Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2 text-base font-medium tracking-wide">
                  🚀 Your central hub for performance insights
                </p>
              </div>
              </div>
            </div>
            
          {/* Control Panel - More Spacious */}
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-xl p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-center">
              {/* View Selector */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📊 View Type
                </label>
              <Select value={activeView} onValueChange={(value) => setActiveView(value as any)}>
                  <SelectTrigger className="h-11 w-full text-sm font-medium border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl">
                    <SelectValue placeholder="Select View" />
                </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl z-[60]">
                    <SelectItem value="campaign" className="hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg m-1 transition-all duration-200">📈 Campaign wise</SelectItem>
                    <SelectItem value="slot" className="hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg m-1 transition-all duration-200">🎯 Slots wise</SelectItem>
                    <SelectItem value="ad" className="hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg m-1 transition-all duration-200">📝 Ads wise</SelectItem>
                    <SelectItem value="pos" className="hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg m-1 transition-all duration-200">🏪 POS wise</SelectItem>
                </SelectContent>
              </Select>
              </div>

              {/* Date Range Picker */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📅 Date Range
                </label>
                <div className="h-11 flex items-center px-3 text-sm font-medium border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl relative z-50">
              <DateRangePicker />
                </div>
              </div>

              {/* Data Grouping */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ⏱️ Data Grouping
                </label>
                <Select value={dataGrouping} onValueChange={(value) => setDataGrouping(value as '1d' | '7d' | '30d')}>
                  <SelectTrigger className="h-11 w-full text-sm font-medium border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl">
                    <SelectValue placeholder="Select Grouping" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl z-[60]">
                    <SelectItem value="1d" className="hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg m-1 transition-all duration-200">📅 Daily (1d)</SelectItem>
                    <SelectItem value="7d" className="hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg m-1 transition-all duration-200">📊 Weekly (7d)</SelectItem>
                    <SelectItem value="30d" className="hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg m-1 transition-all duration-200">📈 Monthly (30d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="lg:col-span-3 xl:col-span-2 flex flex-wrap items-end gap-3">
                {/* Main Fetch Button */}
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🚀 Actions
                  </label>
                  <Button
                    onClick={fetchAnalyticsData}
                    disabled={dataLoading}
                    className="h-11 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl border-0 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {dataLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                        <span className="relative z-10">Fetching...</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-5 w-5 mr-2" />
                        <span className="relative z-10">🚀 Fetch Results</span>
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Secondary Actions */}
                <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                    className="h-11 w-11 border-2 border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl group"
              >
                    <RefreshCw className={`h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                    className="h-11 w-11 border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-400 dark:hover:border-blue-500 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl group"
              >
                    <Download className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 group-hover:translate-y-0.5 transition-all duration-300" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    className="h-11 px-4 border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-400 dark:hover:border-purple-500 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl group"
              >
                    <Filter className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 mr-2 group-hover:rotate-12 transition-all duration-300" />
                    <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-800 dark:text-purple-200 border-0 shadow-sm">
                  {selectedCampaigns.length + selectedSlots.length + selectedPOS.length + selectedExactAdNames.length + selectedStartsWithAdNames.length}
                </Badge>
              </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Expandable Filter Section */}
      <AnimatePresence>
        {isFilterExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-xl z-10"
          >
            <div className="max-w-7xl mx-auto p-6 sm:p-8">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  🎯 Advanced Filters
                  <div className="ml-4 h-0.5 flex-1 bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-600"></div>
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Fine-tune your analytics with precision targeting</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Campaign Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    📈 Campaigns
                  </label>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 p-3 hover:border-blue-300 dark:hover:border-blue-600">
                <MultiSelectDropdown
                      label=""
                  options={campaigns.map(campaign => ({ value: campaign.campaignId, label: campaign.brandName }))}
                  selectedValues={selectedCampaigns}
                  onChange={setSelectedCampaigns}
                  placeholder="Select campaigns..."
                />
                  </div>
                </div>
                
                {/* Slots Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🎯 Slots
                  </label>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 p-3 hover:border-emerald-300 dark:hover:border-emerald-600">
                <MultiSelectDropdown
                      label=""
                  options={slots.map(slot => ({ value: slot.slotId, label: slot.name }))}
                  selectedValues={selectedSlots}
                  onChange={setSelectedSlots}
                  placeholder="Select slots..."
                />
                  </div>
                </div>
                
                {/* Marketplaces Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🏪 Marketplaces (POS)
                  </label>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 p-3 hover:border-purple-300 dark:hover:border-purple-600">
                <MultiSelectDropdown
                      label=""
                  options={sites.map(site => ({ value: site.posId, label: site.name }))}
                  selectedValues={selectedPOS}
                  onChange={setSelectedPOS}
                  placeholder="Select marketplaces..."
                />
                  </div>
                </div>

                {/* Ad Names Filter - Show when campaigns are selected */}
                {selectedCampaigns.length > 0 && (
                  <div className="md:col-span-2 lg:col-span-3 space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      📝 Ad Names (Starts With / Exact)
                    </label>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 p-3 hover:border-indigo-300 dark:hover:border-indigo-600">
                      {adNamesLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading ad names...</span>
                        </div>
                      ) : adNameOptions.length > 0 ? (
                    <AdNameFilterDropdown
                      options={adNameOptions}
                      selectedExactValues={selectedExactAdNames}
                      selectedStartsWithValues={selectedStartsWithAdNames}
                      onExactChange={setSelectedExactAdNames}
                      onStartsWithChange={setSelectedStartsWithAdNames}
                      placeholder="Filter ad names..."
                          label=""
                        />
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-gray-500 dark:text-gray-400 text-sm">
                            <div className="mb-2">📭 No ads found</div>
                            <div>Create some ads in the selected campaigns to enable ad-level filtering</div>
                          </div>
                  </div>
                )}
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Summary */}
              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  📊 {getFilterSummary()}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-8 relative z-0">
        <div className="space-y-8 sm:space-y-10">
          {/* Performance Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 dark:border-gray-700/50 shadow-xl p-6 sm:p-8 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4 sm:space-x-6">
                {/* Professional icon */}
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ✨ {activeView === 'slot' ? 'Slot-wise' : activeView === 'campaign' ? 'Campaign-wise' : activeView === 'ad' ? 'Ad-wise' : 'POS-wise'} Analytics
                  </h3>
                  <div className="flex items-center space-x-3 mt-2">
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                      📊 {dataGrouping === '1d' ? 'Daily (1d)' : dataGrouping === '7d' ? 'Weekly (7d)' : 'Monthly (30d)'} Grouping
                    </p>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                      🔄 Real-time data
                  </p>
                </div>
              </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Live Badge */}
                <Badge className="bg-emerald-500 text-white border-0 shadow-md font-medium px-3 py-1 rounded-lg">
              <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>Live Data</span>
                  </div>
                </Badge>
                
                {/* View Badge */}
                <Badge variant="outline" className="border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-medium px-3 py-1 rounded-lg capitalize">
                  🎯 {activeView} View
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Metrics Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-xl p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Key Metrics
                </h2>
              </div>
              
              <div className="hidden sm:flex items-center space-x-2">
                <Badge variant="outline" className="text-xs font-medium">
                  Real-time
                </Badge>
              </div>
            </div>
            
            {/* Show metrics only after data has been fetched */}
            {metricsData ? (
              <MetricsDashboard 
                data={metricsData} 
                comparisonData={comparisonMetricsData || undefined}
                period={dataGrouping}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Data Available
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                  Configure your filters and click "Fetch Results" to view analytics data
                </p>
                <div className="flex flex-col space-y-2 text-sm text-gray-400 dark:text-gray-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Select view type and filters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Click the "Fetch Results" button</span>
                  </div>
                  <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>View your analytics insights</span>
            </div>
                </div>
              </div>
            )}
          </motion.div>
          
          {/* Analytics Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-xl p-6 sm:p-8"
          >
            {dataLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex items-center space-x-3 mb-4">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Loading chart data...
                </span>
              </div>
            ) : (
              <div className="w-full">
                {trendData && trendData.length > 0 ? (
              <TrendChart
                series={trendData}
                    title={`📈 ${activeView === 'slot' ? 'Slot' : activeView === 'campaign' ? 'Campaign' : activeView === 'ad' ? 'Ad' : 'POS'} Performance Over Time`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg font-medium text-center">
                      No trend data available yet
                    </p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm text-center mt-2">
                      Please select filters and click "🚀 Fetch Results" to view analytics
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Data Tables Section */}
          <div className="grid grid-cols-1 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-xl p-6 sm:p-8"
            >
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  🏆 Top Performing Locations
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Cities and states ranked by impression volume</p>
              </div>
              
              <DataTable
                title=""
                data={topLocations.map(item => ({
                  location: item.location || 'Unknown',
                  impressions: item.impressions || 0,
                  clicks: item.clicks || 0,
                  conversions: item.conversions || 0
                }))}
                columns={[
                  { key: 'location', label: '📍 Location (City/State)' },
                  { key: 'impressions', label: '👁️ Impressions', format: 'number' },
                  { key: 'clicks', label: '🎯 Clicks', format: 'number' },
                  { key: 'conversions', label: '💰 Conversions', format: 'number' }
                ]}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-xl p-6 sm:p-8"
            >
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  🎯 Ad Slots Performance
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Slots sorted by performance metrics</p>
              </div>
              
              <DataTable
                title=""
                data={topSlotsData.map(slot => ({
                  slotName: `Slot ${slot.slotId || 'Unknown'}`,
                  impressions: slot.impressions || 0,
                  clicks: slot.clicks || 0,
                  conversionRate: (slot.clicks && slot.clicks > 0) ? 
                    `${(((slot.conversions || 0) / slot.clicks) * 100).toFixed(2)}%` : 
                    '0%'
                }))}
                columns={[
                  { key: 'slotName', label: '🎪 Slot Name' },
                  { key: 'impressions', label: '👁️ Impressions', format: 'number' },
                  { key: 'clicks', label: '🎯 Clicks', format: 'number' },
                  { key: 'conversionRate', label: '📈 Conversion Rate (CR)' }
                ]}
              />
            </motion.div>
          </div>

          {/* Combo Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
              className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-xl p-6 sm:p-8"
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
                title="📊 Impressions vs Conversions"
                barKey="impressions"
                lineKey="conversions"
                barName="Impressions"
                lineName="Conversions"
                barColor="#059669"
                lineColor="#DC2626"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }}
              className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-xl p-6 sm:p-8"
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
                title="🎯 Impressions vs CTR"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg p-6"
            >
              <BreakdownPieChart data={breakdownData.gender} title="Gender Distribution" height={250} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg p-6"
            >
              <BreakdownPieChart data={breakdownData.age} title="Age Distribution" height={250} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg p-6"
            >
              <BreakdownPieChart data={breakdownData.platform} title="Platform Breakdown" height={250} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg p-6"
            >
              <BreakdownPieChart data={breakdownData.location} title="Location Distribution" height={250} />
            </motion.div>
          </div>

          {/* Age-wise Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg p-6"
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