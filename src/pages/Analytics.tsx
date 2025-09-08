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

// Utils
import { exportToCSV, formatMetricsForCSV } from '@/utils/csvExport';

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
  conversions: 0
});

// Helper function to map platform IDs to proper names
const getPlatformName = (platformId: number | string): string => {
  const id = Number(platformId);
  switch (id) {
    case 0:
      return 'Web Extension';
    case 1:
      return 'Mobile Extension';
    case 2:
      return 'Desktop Site';
    case 3:
      return 'Mobile Site';
    case 4:
      return 'Mobile App Overlay';
    case 5:
      return 'Mobile App';
    default:
      return typeof platformId === 'string' ? platformId : 'Unknown Platform';
  }
};

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

  // Add state for toggles - ensure proper initialization
  const [showCombinedTotal, setShowCombinedTotal] = useState(true);

  // Fetch dropdown data on component mount
  useEffect(() => {
    fetchDropdownData();
    // Don't auto-fetch analytics data on mount, let user manually trigger it
  }, []);

  // Manual fetch - removed automatic fetching on filter changes

  // Fetch ad names when selected campaigns change or load all if none selected
  useEffect(() => {
    // Don't fetch ad names if data is still loading or no campaigns available
    if (loading || campaigns.length === 0) return;
    
    const loadAdNames = async () => {
      try {
        setAdNamesLoading(true);
        
        // If no campaigns selected, load ad names for ALL campaigns
        const campaignsToProcess = selectedCampaigns.length > 0 
          ? selectedCampaigns 
          : campaigns.map(c => c.campaignId);
          
        console.log('Loading ad names for campaigns:', 
          selectedCampaigns.length > 0 ? selectedCampaigns : 'ALL CAMPAIGNS');
        
        const adOptions: AdOption[] = [];
        await Promise.all(
          campaignsToProcess.map(async (campId) => {
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
  }, [selectedCampaigns, campaigns]); // Added campaigns dependency for auto-loading

  // Removed automatic fetching on dataGrouping change to prevent infinite loops
  // Data fetching is now manual via "Fetch Results" button
  // useEffect(() => {
  //   if (!dataGrouping || dataLoading || loading) {
  //     console.log('⏭️ Skipping data fetch:', { dataGrouping, dataLoading, loading });
  //     return;
  //   }
  //   
  //   if (campaigns.length > 0 || slots.length > 0 || sites.length > 0) {
  //     console.log('🔄 Triggering analytics data fetch due to dataGrouping change:', dataGrouping);
  //     fetchAnalyticsData();
  //   } else {
  //     console.log('⚠️ No dropdown data available yet, skipping analytics fetch');
  //   }
  // }, [dataGrouping]);

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
    // Prevent concurrent calls
    if (dataLoading) {
      console.log('⏳ Skipping fetch - already loading data');
      return;
    }
    
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

      if (activeView === 'campaign') {
        // Auto-select all campaigns if none are selected - using ONLY valid campaign IDs
        const campaignsToProcess = selectedCampaigns.length > 0 
          ? selectedCampaigns.filter(id => campaigns.some(c => c.campaignId === id)) // Validate selected IDs
          : campaigns.map(c => c.campaignId); // Use all available campaign IDs
        
        // Also filter slots and POS to ensure only valid IDs are used
        const validSlotIds = selectedSlots.length > 0 
          ? selectedSlots.filter(id => slots.some(s => s.slotId === id))
          : undefined;
        const validPOSIds = selectedPOS.length > 0 
          ? selectedPOS.filter(id => sites.some(s => s.posId === id))
          : undefined;
        
        console.log(`📊 Processing ${campaignsToProcess.length} campaigns:`, 
          selectedCampaigns.length > 0 ? 'USER SELECTED' : 'AUTO-SELECTED ALL');
        console.log(`📊 Valid slot IDs:`, validSlotIds || 'ALL SLOTS');
        console.log(`📊 Valid POS IDs:`, validPOSIds || 'ALL POS');

        // Campaign-wise comparison
        const campaignResults = await Promise.all(
          campaignsToProcess.map(async (campaignId) => {
            const payload: MetricsPayload = {
        ...dateRange,
              campaignId: [Number(campaignId)],
        slotId: validSlotIds?.map(Number),
        siteId: validPOSIds?.map(Number),
              interval: dataGrouping
            };

            console.log(`📊 Campaign ${campaignId} payload with interval:`, payload);

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
            }
          } catch (error) {
            console.error('Error processing campaign metrics:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ? 
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;

      } else if (activeView === 'slot') {
        // Auto-select all slots if none are selected - using ONLY valid slot IDs
        const slotsToProcess = selectedSlots.length > 0 
          ? selectedSlots.filter(id => slots.some(s => s.slotId === id)) // Validate selected IDs
          : slots.map(s => s.slotId); // Use all available slot IDs
          
        // Also filter campaigns and POS to ensure only valid IDs are used
        const validCampaignIds = selectedCampaigns.length > 0 
          ? selectedCampaigns.filter(id => campaigns.some(c => c.campaignId === id))
          : undefined;
        const validPOSIds = selectedPOS.length > 0 
          ? selectedPOS.filter(id => sites.some(s => s.posId === id))
          : undefined;
          
        console.log(`📊 Processing ${slotsToProcess.length} slots:`, 
          selectedSlots.length > 0 ? 'USER SELECTED' : 'AUTO-SELECTED ALL');
        console.log(`📊 Valid campaign IDs:`, validCampaignIds || 'ALL CAMPAIGNS');
        console.log(`📊 Valid POS IDs:`, validPOSIds || 'ALL POS');

        // Slot-wise comparison
        const slotResults = await Promise.all(
          slotsToProcess.map(async (slotId) => {
            const payload: MetricsPayload = {
              ...dateRange,
              slotId: [Number(slotId)],
              campaignId: validCampaignIds?.map(Number),
              siteId: validPOSIds?.map(Number),
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
            }
          } catch (error) {
            console.error('Error processing slot metrics:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ? 
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;

      } else if (activeView === 'pos') {
        // Auto-select all POS if none are selected - using ONLY valid POS IDs
        const posToProcess = selectedPOS.length > 0 
          ? selectedPOS.filter(id => sites.some(s => s.posId === id)) // Validate selected IDs
          : sites.map(s => s.posId); // Use all available POS IDs
          
        // Also filter campaigns and slots to ensure only valid IDs are used
        const validCampaignIds = selectedCampaigns.length > 0 
          ? selectedCampaigns.filter(id => campaigns.some(c => c.campaignId === id))
          : undefined;
        const validSlotIds = selectedSlots.length > 0 
          ? selectedSlots.filter(id => slots.some(s => s.slotId === id))
          : undefined;
          
        console.log(`📊 Processing ${posToProcess.length} POS:`, 
          selectedPOS.length > 0 ? 'USER SELECTED' : 'AUTO-SELECTED ALL');
        console.log(`📊 Valid campaign IDs:`, validCampaignIds || 'ALL CAMPAIGNS');
        console.log(`📊 Valid slot IDs:`, validSlotIds || 'ALL SLOTS');

        // POS-wise comparison
        const posResults = await Promise.all(
          posToProcess.map(async (posId) => {
            const payload: MetricsPayload = {
              ...dateRange,
              siteId: [Number(posId)],
              campaignId: validCampaignIds?.map(Number),
              slotId: validSlotIds?.map(Number),
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
            }
          } catch (error) {
            console.error('Error processing POS metrics:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ? 
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;

      } else if (activeView === 'ad') {
        // Ad-wise comparison - if no specific ad names selected, show overall ad performance
        console.log(`📊 Processing ads:`, 
          (selectedExactAdNames.length > 0 || selectedStartsWithAdNames.length > 0) 
            ? 'USER SELECTED AD FILTERS' : 'ALL ADS (NO FILTERS)');
        
        // Validate all filter IDs to ensure they exist in the fetched data
        const validCampaignIds = selectedCampaigns.length > 0 
          ? selectedCampaigns.filter(id => campaigns.some(c => c.campaignId === id))
          : undefined;
        const validSlotIds = selectedSlots.length > 0 
          ? selectedSlots.filter(id => slots.some(s => s.slotId === id))
          : undefined;
        const validPOSIds = selectedPOS.length > 0 
          ? selectedPOS.filter(id => sites.some(s => s.posId === id))
          : undefined;
            
        const basePayload: MetricsPayload = {
          ...dateRange,
          campaignId: validCampaignIds?.map(Number),
          slotId: validSlotIds?.map(Number),
          siteId: validPOSIds?.map(Number),
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
        // Default: overall analytics for all available data
        console.log(`📊 Processing overall analytics - showing ALL available data`);
        
        // Validate all filter IDs to ensure they exist in the fetched data
        const validCampaignIds = selectedCampaigns.length > 0 
          ? selectedCampaigns.filter(id => campaigns.some(c => c.campaignId === id))
          : undefined;
        const validSlotIds = selectedSlots.length > 0 
          ? selectedSlots.filter(id => slots.some(s => s.slotId === id))
          : undefined;
        const validPOSIds = selectedPOS.length > 0 
          ? selectedPOS.filter(id => sites.some(s => s.posId === id))
          : undefined;
        
        const basePayload: MetricsPayload = {
          ...dateRange,
          campaignId: validCampaignIds?.map(Number),
          slotId: validSlotIds?.map(Number),
          siteId: validPOSIds?.map(Number),
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

      // Fetch breakdown data and tables (non-view-specific) with validated filters
      const validCampaignIds = selectedCampaigns.length > 0 
        ? selectedCampaigns.filter(id => campaigns.some(c => c.campaignId === id))
        : undefined;
      const validSlotIds = selectedSlots.length > 0 
        ? selectedSlots.filter(id => slots.some(s => s.slotId === id))
        : undefined;
      const validPOSIds = selectedPOS.length > 0 
        ? selectedPOS.filter(id => sites.some(s => s.posId === id))
        : undefined;

      const basePayload: MetricsPayload = {
        ...dateRange,
        campaignId: validCampaignIds?.map(Number),
        slotId: validSlotIds?.map(Number),
        siteId: validPOSIds?.map(Number),
      };

      // Ensure we have at least one filter for breakdown queries (backend requirement)
      const hasValidCampaignId = basePayload.campaignId && Array.isArray(basePayload.campaignId) && basePayload.campaignId.length > 0;
      const hasValidSlotId = basePayload.slotId && Array.isArray(basePayload.slotId) && basePayload.slotId.length > 0;
      const hasValidSiteId = basePayload.siteId && Array.isArray(basePayload.siteId) && basePayload.siteId.length > 0;

      const breakdownPayload = {
        ...basePayload,
        // Add a default campaignId if no filters are selected - use first VALID campaign
        ...(!hasValidCampaignId && !hasValidSlotId && !hasValidSiteId && {
          campaignId: campaigns.length > 0 ? [campaigns[0].campaignId] : undefined
        })
      };

      console.log('📊 Breakdown payload with validated filters:', breakdownPayload);

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
        // Process platform data with proper mapping
        let mappedPlatformData: BreakdownData[] = [];
        if (platformResult.success && Array.isArray(platformResult.data)) {
          mappedPlatformData = platformResult.data.map(item => ({
            ...item,
            name: getPlatformName(item.name || 'Unknown')
          }));
        }
        
      setBreakdownData({
          gender: (genderResult.success && Array.isArray(genderResult.data)) ? genderResult.data : [],
          age: (ageResult.success && Array.isArray(ageResult.data)) ? transformAgeBucketData(ageResult.data) : [],
          platform: mappedPlatformData,
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
    try {
      console.log('Exporting analytics data...');
      
      // Format the current analytics data for CSV export
      const csvData = formatMetricsForCSV(
        metricsData,
        breakdownData,
        trendData,
        topLocations,
        topSlotsData
      );

      if (csvData.length === 0) {
        toast.error('No data available to export');
        return;
      }

      // Create filename with current filters
      const filterSummary = getFilterSummary();
      const baseFilename = filterSummary ? `analytics_${filterSummary.replace(/[^a-zA-Z0-9]/g, '_')}` : 'analytics_data';
      
      // Export to CSV with clean headers
      exportToCSV({
        filename: baseFilename,
        data: csvData,
        headers: {
          sheet_section: 'Data Section',
          metric_name: 'Metric',
          value: 'Value',
          description: 'Description',
          export_date: 'Export Date',
          demographic: 'Demographic',
          platform: 'Platform',
          age_group: 'Age Group',
          impressions: 'Impressions',
          clicks: 'Clicks',
          conversions: 'Conversions',
          ctr_percent: 'CTR %',
          date: 'Date',
          rank: 'Rank',
          location_name: 'Location',
          slot_identifier: 'Slot',
          performance_score: 'Performance Score'
        }
      });

      toast.success('Analytics data exported successfully! 📊');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data. Please try again.');
    }
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

      {/* Auto-Selection Info Banner - Only show when no filters are selected */}
      {(selectedCampaigns.length === 0 && selectedSlots.length === 0 && selectedPOS.length === 0 && selectedExactAdNames.length === 0 && selectedStartsWithAdNames.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl border border-blue-200 dark:border-blue-800 p-4 mx-4 sm:mx-6 mb-6"
        >
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              <span className="font-bold">🎯 Smart Auto-Selection:</span> When no specific {
                activeView === 'campaign' ? 'campaigns' :
                activeView === 'slot' ? 'slots' :
                activeView === 'pos' ? 'marketplaces' :
                'ads'
              } are selected, we automatically fetch data for <span className="font-bold text-blue-900 dark:text-blue-100">ALL available {
                activeView === 'campaign' ? `${campaigns.length} campaigns` :
                activeView === 'slot' ? `${slots.length} slots` :
                activeView === 'pos' ? `${sites.length} marketplaces` :
                'ads'
              }</span> to give you the complete picture! 🚀
            </p>
          </div>
        </motion.div>
      )}

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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    📈 Campaigns
                    {selectedCampaigns.length === 0 && campaigns.length > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">
                        Auto: All {campaigns.length}
                      </Badge>
                    )}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    🎯 Slots
                    {selectedSlots.length === 0 && slots.length > 0 && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                        Auto: All {slots.length}
                      </Badge>
                    )}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    🏪 Marketplaces (POS)
                    {selectedPOS.length === 0 && sites.length > 0 && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">
                        Auto: All {sites.length}
                      </Badge>
                    )}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showCombinedTotal"
                  checked={showCombinedTotal}
                  onChange={e => setShowCombinedTotal(e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <label htmlFor="showCombinedTotal" className="text-sm text-gray-700 dark:text-gray-200 font-medium">Show Combined Total</label>
              </div>
            </div>
            
            {/* Data Grouping Info */}
            <div className="mb-4 flex items-center gap-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  📊 Data grouped by: {
                    dataGrouping === '1d' ? 'Daily intervals' : 
                    dataGrouping === '7d' ? 'Weekly intervals' : 
                    dataGrouping === '30d' ? 'Monthly intervals' : 
                    'Custom intervals'
                  }
                </span>
              </div>
              {trendData.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {trendData.reduce((sum, series) => sum + series.data.length, 0)} data points across {trendData.length} series
                </div>
              )}
            </div>
            
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
                    series={(() => {
                      // Filter trendData for the selected period
                      // (Assume trendData is updated on period change, or you may need to refetch)
                      let chartSeries = [...trendData];
                      if (showCombinedTotal && trendData.length > 1) {
                        // Calculate combined total series
                        const dateMap = new Map();
                        trendData.forEach(s => {
                          s.data.forEach(d => {
                            if (d.date && !isNaN(new Date(d.date).getTime())) {
                              if (!dateMap.has(d.date)) {
                                dateMap.set(d.date, { 
                                  ...d, 
                                  impressions: 0, 
                                  clicks: 0, 
                                  conversions: 0,
                                  ctr: 0,
                                  conversionRate: 0
                                });
                              }
                              const existing = dateMap.get(d.date);
                              existing.impressions += d.impressions || 0;
                              existing.clicks += d.clicks || 0;
                              existing.conversions += d.conversions || 0;
                              existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
                              existing.conversionRate = existing.clicks > 0 ? (existing.conversions / existing.clicks) * 100 : 0;
                            }
                          });
                        });
                        const combinedSeries = {
                          name: 'Combined Total',
                          data: Array.from(dateMap.values())
                            .filter(item => item.date && !isNaN(new Date(item.date).getTime()))
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        };
                        chartSeries = [...trendData, combinedSeries];
                      }
                      return chartSeries;
                    })()}
                    title={`📈 ${activeView === 'slot' ? 'Slot' : activeView === 'campaign' ? 'Campaign' : activeView === 'ad' ? 'Ad' : 'POS'} Performance Over Time ${
                      dataGrouping === '1d' ? '(Daily)' : 
                      dataGrouping === '7d' ? '(Weekly)' : 
                      dataGrouping === '30d' ? '(Monthly)' : ''
                    }`}
                    period={dataGrouping}
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
                data={
                  [...topLocations]
                    .sort((a, b) => ((b.impressions || 0) + (b.clicks || 0)) - ((a.impressions || 0) + (a.clicks || 0)))
                    .map(item => ({
                      location: item.location || 'Unknown',
                      impressions: item.impressions || 0,
                      clicks: item.clicks || 0,
                      conversions: item.conversions || 0
                    }))
                }
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
                data={
                  [...topSlotsData]
                    .sort((a, b) => ((b.impressions || 0) + (b.clicks || 0)) - ((a.impressions || 0) + (a.clicks || 0)))
                    .map(slot => {
                      const impressions = slot.impressions || 0;
                      const clicks = slot.clicks || 0;
                      return {
                        slotName: `Slot ${slot.slotId || 'Unknown'}`,
                        impressions,
                        clicks,
                        conversionRate: impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : '0.00%'
                      };
                    })
                }
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
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 p-6 backdrop-blur-sm h-[450px]"
            >
              <BreakdownPieChart data={breakdownData.gender} title="Gender Distribution" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 p-6 backdrop-blur-sm h-[450px]"
            >
              <BreakdownPieChart data={breakdownData.age} title="Age Distribution" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 p-6 backdrop-blur-sm h-[450px]"
            >
              <BreakdownPieChart data={breakdownData.platform} title="Platform Breakdown" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 p-6 backdrop-blur-sm h-[450px]"
            >
              <BreakdownPieChart data={breakdownData.location} title="Location Distribution" />
            </motion.div>
          </div>

          {/* Age-wise Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 p-6 backdrop-blur-sm h-[500px]"
          >
            <BreakdownPieChart 
              data={breakdownData.age || []} 
              title="Age-wise Performance Distribution" 
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}