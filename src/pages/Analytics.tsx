import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Calendar, TrendingUp, Filter, BarChart3, Tag, Plane, MapPin, Eye, DollarSign, Inbox, X, Sparkles, SlidersHorizontal } from 'lucide-react';
import { NoiseButton } from '@/components/ui/noise-button';
import { Button } from '@/components/ui/button';
import { VelvetLoader } from '@/components/ui/velvet-loader';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterSidebar } from '@/components/analytics/FilterSidebar';
import { TrendChart, type ChartType } from '@/components/analytics/TrendChart';
import { GroupedBarChart } from '@/components/analytics/GroupedBarChart';
import { ComboChart } from '@/components/analytics/ComboChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { BreakdownModal } from '@/components/analytics/BreakdownModal';
import { FilterDropdown } from '@/components/analytics/FilterDropdown';
import { MultiSelectDropdown } from '@/components/analytics/MultiSelectDropdown';
import { AdNameFilterDropdown } from '@/components/analytics/AdNameFilterDropdown';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { useFilters } from '@/context/FilterContext';
import { PLATFORM_OPTIONS } from '@/utils/platform';
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
import { formatCount, formatSmartPercent, coerceName } from '@/lib/format';
import { normalizeFilterIds, matchesId, matchSlotId, normalizeRouteId, toLookupKey } from '@/utils/v2Normalizer';

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
  adId: number;
}



// Helper function to get default metrics
const getDefaultMetrics = (): MetricsData => ({
  impressions: 0,
  clicks: 0,
  ctr: 0,
  conversions: 0,
  landingCount: 0
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

const dedupeNumericIds = (values?: (string | number)[]): number[] | undefined => {
  if (!values || values.length === 0) return undefined;

  const normalizedValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  return normalizedValues.length > 0 ? Array.from(new Set(normalizedValues)) : undefined;
};

const sanitizeSlots = (rawSlots: Slot[]): Slot[] => {
  const uniqueSlots = new Map<number, Slot>();

  rawSlots.forEach((slot) => {
    const normalizedSlotId = toLookupKey(slot.slotId);

    if (!Number.isFinite(normalizedSlotId) || uniqueSlots.has(normalizedSlotId)) {
      return;
    }

    uniqueSlots.set(normalizedSlotId, {
      ...slot,
      slotId: normalizedSlotId,
      platform: Number(slot.platform),
      width: String(slot.width),
      height: String(slot.height),
    });
  });

  return Array.from(uniqueSlots.values());
};

export default function Analytics() {
  const { filters } = useFilters(); // Get filters from context
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [dataGrouping, setDataGrouping] = useState<'1d' | '7d' | '30d'>('7d'); // For data aggregation
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [activeView, setActiveView] = useState<'campaign' | 'slot' | 'ad' | 'pos'>('campaign');
  const [chartType, setChartType] = useState<ChartType>('line');

  // Filter states
  const [selectedCampaigns, setSelectedCampaigns] = useState<(string | number)[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<(string | number)[]>([]);
  const [selectedPOS, setSelectedPOS] = useState<(string | number)[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<(string | number)[]>([]);


  // Ad name filter states
  const [selectedExactAdNames, setSelectedExactAdNames] = useState<string[]>([]);
  const [selectedStartsWithAdNames, setSelectedStartsWithAdNames] = useState<string[]>([]);
  const [adNameOptions, setAdNameOptions] = useState<AdOption[]>([]);
  const [adNamesLoading, setAdNamesLoading] = useState(false);

  // Data states
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<Slot[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [comparisonMetricsData, setComparisonMetricsData] = useState<MetricsData | null>(null);
  const [trendData, setTrendData] = useState<TrendChartSeries[]>([]);
  const [landingTrendData, setLandingTrendData] = useState<TrendChartSeries[]>([]);
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

  const [breakdownModal, setBreakdownModal] = useState<{ open: boolean; title: string; data: any[] }>({
    open: false,
    title: '',
    data: []
  });

  // Table data states
  const [topLocations, setTopLocations] = useState<any[]>([]);
  const [topSlotsData, setTopSlotsData] = useState<any[]>([]);
  const [slotMetrics, setSlotMetrics] = useState<Array<{
    slotId: number;
    slotName: string;
    metrics: MetricsData;
  }>>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const slotLabelCounts = useMemo(() => {
    const counts = new Map<string, number>();

    slots.forEach((slot) => {
      const slotName = slot.name?.trim() || `Slot ${slot.slotId}`;
      const slotLabelKey = `${slotName} • ${getPlatformName(slot.platform)}`;
      counts.set(slotLabelKey, (counts.get(slotLabelKey) || 0) + 1);
    });

    return counts;
  }, [slots]);

  const slotLookup = useMemo(
    () => new Map(slots.map((slot) => [toLookupKey(slot.slotId), slot])),
    [slots]
  );

  const filteredSlotIdSet = useMemo(
    () => new Set(filteredSlots.map((slot) => String(slot.slotId))),
    [filteredSlots]
  );

  const getSlotDisplayLabel = (slot: Slot) => {
    const slotName = slot.name?.trim() || `Slot ${slot.slotId}`;
    const platformName = getPlatformName(slot.platform);
    const baseLabel = `${slotName} • ${platformName}`;

    if ((slotLabelCounts.get(baseLabel) || 0) <= 1) {
      return baseLabel;
    }

    return `${baseLabel} • #${slot.slotId}`;
  };


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
                  label: adInfo.label,
                  adId: adInfo.adId
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

  // Filter slots based on selected platforms
  useEffect(() => {
    if (selectedPlatforms.length > 0) {
      const newFilteredSlots = slots.filter(slot => selectedPlatforms.includes(slot.platform));
      setFilteredSlots(newFilteredSlots);
    } else {
      setFilteredSlots(slots);
    }
  }, [selectedPlatforms, slots]);

  useEffect(() => {
    setSelectedSlots((previousSelectedSlots) => {
      const normalizedSelectedSlots = dedupeNumericIds(previousSelectedSlots) || [];

      const nextSelectedSlots = normalizedSelectedSlots.filter((slotId) => filteredSlotIdSet.has(slotId));

      if (
        nextSelectedSlots.length === previousSelectedSlots.length &&
        nextSelectedSlots.every((slotId, index) => String(previousSelectedSlots[index]) === String(slotId))
      ) {
        return previousSelectedSlots;
      }

      return nextSelectedSlots;
    });
  }, [filteredSlotIdSet]);

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
        setSlots(sanitizeSlots(slotsResult.data));
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

      // Map ad names to IDs for filtering
      const adIdsToFilter = [
        ...adNameOptions.filter(opt => selectedExactAdNames.includes(opt.name)).map(opt => opt.adId),
        ...adNameOptions.filter(opt => selectedStartsWithAdNames.includes(opt.label)).map(opt => opt.adId)
      ];
      // Deduplicate
      const validAdIds = adIdsToFilter.length > 0 ? Array.from(new Set(adIdsToFilter)) : undefined;

      // Centralized filter validation logic
      const validCampaignIdsAcrossViews = selectedCampaigns.length > 0
        ? dedupeNumericIds(selectedCampaigns.filter(id => campaigns.some(c => matchesId(c.campaignId, id))))
        : undefined;

      const validSlotIdsAcrossViews = selectedSlots.length > 0
        ? dedupeNumericIds(selectedSlots.filter(id => filteredSlotIdSet.has(String(id))))
        : dedupeNumericIds(filteredSlots.map(s => s.slotId));

      const validPOSIdsAcrossViews = selectedPOS.length > 0
        ? dedupeNumericIds(selectedPOS.filter(id => sites.some(s => matchesId(s.posId, id))))
        : undefined;

      // Build payload based on active view
      let trendSeries: TrendChartSeries[] = [];
      let aggregatedMetrics: MetricsData = getDefaultMetrics();

      if (activeView === 'campaign') {
        // Use centralized valid Campaign IDs or default to all if none selected
        const campaignsToProcess = validCampaignIdsAcrossViews || campaigns.map(c => c.campaignId);

        console.log(`📊 Processing ${campaignsToProcess.length} campaigns:`,
          selectedCampaigns.length > 0 ? 'USER SELECTED' : 'AUTO-SELECTED ALL');
        console.log(`📊 Valid slot IDs:`, validSlotIdsAcrossViews || 'ALL SLOTS');
        console.log(`📊 Valid POS IDs:`, validPOSIdsAcrossViews || 'ALL POS');

        // Campaign-wise comparison
        const campaignResults = await Promise.all(
          campaignsToProcess.map(async (campaignId) => {
            const payload: MetricsPayload = {
              ...dateRange,
              campaignId: normalizeFilterIds([campaignId]),
              slotId: selectedSlots.length > 0 ? normalizeFilterIds(selectedSlots) : undefined,
              siteId: validPOSIdsAcrossViews ? normalizeFilterIds(validPOSIdsAcrossViews) : undefined,
              adId: validAdIds,
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
              aggregatedMetrics.landingCount += result.metrics.landingCount || 0;
            }
          } catch (error) {
            console.error('Error processing campaign metrics:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ?
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;

      } else if (activeView === 'slot') {
        // Use centralized valid slot IDs (which already respects platform filter)
        const slotsToProcess = validSlotIdsAcrossViews || slots.map(s => s.slotId);

        console.log(`📊 Processing ${slotsToProcess.length} slots:`,
          selectedSlots.length > 0 ? 'USER SELECTED' : 'AUTO-SELECTED ALL (FILTERED)');
        console.log(`📊 Valid campaign IDs:`, validCampaignIdsAcrossViews || 'ALL CAMPAIGNS');
        console.log(`📊 Valid POS IDs:`, validPOSIdsAcrossViews || 'ALL POS');

        // Slot-wise comparison
        const slotResults = await Promise.all(
          slotsToProcess.map(async (slotId) => {
            const payload: MetricsPayload = {
              ...dateRange,
slotId: normalizeFilterIds(selectedSlots),
        campaignId: validCampaignIdsAcrossViews ? normalizeFilterIds(validCampaignIdsAcrossViews) : undefined,
siteId: validPOSIdsAcrossViews ? normalizeFilterIds(validPOSIdsAcrossViews) : undefined,
          adId: validAdIds,
              interval: dataGrouping
            };

            const [metricsRes, trendRes] = await Promise.all([
              analyticsService.getMetrics(payload),
              analyticsService.getTrendData(payload)
            ]);

            const slot = slots.find(s => matchesId(s.slotId, slotId));
            return {
              slotId,
              slotName: slot ? getSlotDisplayLabel(slot) : `Slot ${slotId}`,
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
              aggregatedMetrics.landingCount += result.metrics.landingCount || 0;
            }
          } catch (error) {
            console.error('Error processing slot metrics:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ?
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;

        // Stash per-slot metrics for the "Slot performance" section
        setSlotMetrics(slotResults
          .filter((r) => r.metrics)
          .map((r) => ({
            slotId: String(r.slotId),
            slotName: r.slotName,
            metrics: r.metrics as MetricsData,
          })));

      } else if (activeView === 'pos') {
        // Use centralized valid POS IDs or default to all
        const posToProcess = validPOSIdsAcrossViews || sites.map(s => s.posId);

        console.log(`📊 Processing ${posToProcess.length} POS:`,
          selectedPOS.length > 0 ? 'USER SELECTED' : 'AUTO-SELECTED ALL');
        console.log(`📊 Valid campaign IDs:`, validCampaignIdsAcrossViews || 'ALL CAMPAIGNS');
        console.log(`📊 Valid slot IDs:`, validSlotIdsAcrossViews || 'ALL SLOTS');

        // POS-wise comparison
        const posResults = await Promise.all(
          posToProcess.map(async (posId) => {
            const payload: MetricsPayload = {
              ...dateRange,
              siteId: [Number(posId)],
              campaignId: validCampaignIdsAcrossViews ? normalizeFilterIds(validCampaignIdsAcrossViews) : undefined,
              slotId: selectedSlots.length > 0 ? validSlotIdsAcrossViews ? normalizeFilterIds(validSlotIdsAcrossViews) : undefined : undefined,
              adId: validAdIds,
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
              aggregatedMetrics.landingCount += result.metrics.landingCount || 0;
            }
          } catch (error) {
            console.error('Error processing POS metrics:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ?
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;

      } else if (activeView === 'ad') {
        // If ad filters are set, use those. Otherwise, use all available ad options for selected campaigns.
        const adsToProcess = (selectedExactAdNames.length > 0 || selectedStartsWithAdNames.length > 0)
          ? adNameOptions.filter(opt => selectedExactAdNames.includes(opt.name) || selectedStartsWithAdNames.includes(opt.label))
          : adNameOptions;

        console.log(`📊 Processing ${adsToProcess.length} ads individually`);

        // Take top 20 ads to avoid excessive requests, but ensure they are sorted or meaningful
        const limitedAds = adsToProcess.slice(0, 20);

        const adResults = await Promise.all(
          limitedAds.map(async (ad) => {
            const payload: MetricsPayload = {
              ...dateRange,
              adId: [ad.adId],
          campaignId: validCampaignIdsAcrossViews ? normalizeFilterIds(validCampaignIdsAcrossViews) : undefined,
          slotId: selectedSlots.length > 0 ? normalizeFilterIds(selectedSlots) : undefined,
          siteId: validPOSIdsAcrossViews ? normalizeFilterIds(validPOSIdsAcrossViews) : undefined,
              interval: dataGrouping
            };

            const [metrics, trend] = await Promise.all([
              analyticsService.getMetrics(payload),
              analyticsService.getTrendData(payload)
            ]);

            return {
              adName: ad.label || ad.name,
              metrics: metrics.success ? metrics.data : null,
              trendData: trend.success ? trend.data : []
            };
          })
        );

        adResults.forEach(result => {
          try {
            if (result.trendData && Array.isArray(result.trendData) && result.trendData.length > 0) {
              trendSeries.push({
                name: result.adName,
                data: result.trendData
              });
            }
            if (result.metrics) {
              aggregatedMetrics.impressions += result.metrics.impressions || 0;
              aggregatedMetrics.clicks += result.metrics.clicks || 0;
              aggregatedMetrics.conversions += result.metrics.conversions || 0;
              aggregatedMetrics.landingCount += result.metrics.landingCount || 0;
            }
          } catch (error) {
            console.error('Error processing ad results:', error, result);
          }
        });

        // Recalculate derived metrics
        aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ?
          (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;

      } else {
        // Default: overall analytics for all available data
        console.log(`📊 Processing overall analytics - showing ALL available data`);

        // Validate all filter IDs to ensure they exist in the fetched data
        const validCampaignIds = selectedCampaigns.length > 0
          ? dedupeNumericIds(selectedCampaigns.filter(id => campaigns.some(c => matchesId(c.campaignId, id))))
          : undefined;
        const validSlotIds = selectedSlots.length > 0
          ? dedupeNumericIds(selectedSlots.filter(id => filteredSlotIdSet.has(String(id))))
          : dedupeNumericIds(filteredSlots.map(s => s.slotId));
        const validPOSIds = selectedPOS.length > 0
          ? dedupeNumericIds(selectedPOS.filter(id => sites.some(s => matchesId(s.posId, id))))
          : undefined;

        const basePayload: MetricsPayload = {
          ...dateRange,
          campaignId: validCampaignIds ? normalizeFilterIds(validCampaignIds) : undefined,
          slotId: validSlotIds ? normalizeFilterIds(validSlotIds) : undefined,
          siteId: validPOSIds ? normalizeFilterIds(validPOSIds) : undefined,
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

      // Reset per-slot metrics unless the active view is 'slot' (handled in that branch)
      if (activeView !== 'slot') {
        setSlotMetrics([]);
      }

      // Build landing trend — per-series breakdown (not aggregated)
      try {
        const landingSeries: TrendChartSeries[] = [];
        trendSeries.forEach((series) => {
          const landingPoints = series.data
            .filter((point: TrendDataPoint) => (point.landingCount || 0) > 0)
            .map((point: TrendDataPoint) => ({
              date: point.date,
              impressions: 0,
              clicks: 0,
              conversions: 0,
              ctr: 0,
              conversionRate: 0,
              landingCount: point.landingCount || 0,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (landingPoints.length > 0) {
            landingSeries.push({ name: series.name, data: landingPoints });
          }
        });

        setLandingTrendData(landingSeries);
        console.log('Landing trend data built per-series:', landingSeries.length, 'series');
      } catch (error) {
        console.error('Error building landing trend data:', error);
        setLandingTrendData([]);
      }

      // Fetch comparison metrics for the previous period
      try {
        const comparisonPayload: MetricsPayload = {
          ...comparisonDateRange,
          campaignId: selectedCampaigns.length > 0 ? normalizeFilterIds(selectedCampaigns) : undefined,
          slotId: selectedSlots.length > 0 ? normalizeFilterIds(selectedSlots) : undefined,
          siteId: selectedPOS.length > 0 ? normalizeFilterIds(selectedPOS) : undefined,
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
        ? dedupeNumericIds(selectedCampaigns.filter(id => campaigns.some(c => matchesId(c.campaignId, id))))
        : undefined;
      const validSlotIds = selectedSlots.length > 0
        ? dedupeNumericIds(selectedSlots.filter(id => filteredSlotIdSet.has(String(id))))
        : dedupeNumericIds(filteredSlots.map(s => s.slotId));
      const validPOSIds = selectedPOS.length > 0
        ? dedupeNumericIds(selectedPOS.filter(id => sites.some(s => matchesId(s.posId, id))))
        : undefined;

      const basePayload: MetricsPayload = {
        ...dateRange,
        campaignId: validCampaignIds ? normalizeFilterIds(validCampaignIds) : undefined,
        slotId: validSlotIds ? normalizeFilterIds(validSlotIds) : undefined,
        siteId: validPOSIds ? normalizeFilterIds(validPOSIds) : undefined,
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

      toast.success('Analytics data fetched', { id: 'analytics-fetch', description: `${trendSeries.length} series · ${formatCount(aggregatedMetrics.impressions)} impressions` });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error(`Failed to load analytics data: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Reset data to safe defaults on error
      setMetricsData(getDefaultMetrics());
      setComparisonMetricsData(null);
      setTrendData([]);
      setLandingTrendData([]);
      setBreakdownData({ gender: [], age: [], platform: [], location: [] });
      setTopLocations([]);
      setTopSlotsData([]);
      setSlotMetrics([]);

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
        [...trendData, ...landingTrendData],
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
          live_landings: 'Live Landings',
          ctr_percent: 'CTR %',
          series_name: 'Campaign / Slot / Ad',
          date: 'Date',
          rank: 'Rank',
          location_name: 'Location',
          slot_identifier: 'Slot',
          performance_score: 'Performance Score'
        }
      });

      toast.success('Analytics data exported successfully');
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

  // Active filter chips — each item carries a label, group, and remover callback
  type FilterChip = { id: string; group: string; label: string; onRemove: () => void };
  const activeFilterChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];
    selectedCampaigns.forEach((id) => {
      const c = campaigns.find((x) => x.campaignId === id);
      chips.push({
        id: `campaign-${id}`,
        group: 'Campaign',
        label: c?.brandName || `Campaign ${id}`,
        onRemove: () => setSelectedCampaigns((prev) => prev.filter((v) => v !== id)),
      });
    });
    selectedPlatforms.forEach((id) => {
      const p = PLATFORM_OPTIONS.find((x) => String(x.value) === String(id));
      chips.push({
        id: `platform-${id}`,
        group: 'Platform',
        label: p?.label || String(id),
        onRemove: () => setSelectedPlatforms((prev) => prev.filter((v) => v !== id)),
      });
    });
    selectedSlots.forEach((id) => {
      const s = filteredSlots.find((x) => x.slotId === id) || slots.find((x) => x.slotId === id);
      chips.push({
        id: `slot-${id}`,
        group: 'Slot',
        label: s ? getSlotDisplayLabel(s) : `Slot ${id}`,
        onRemove: () => setSelectedSlots((prev) => prev.filter((v) => v !== id)),
      });
    });
    selectedPOS.forEach((id) => {
      const s = sites.find((x) => String(x.posId) === String(id));
      chips.push({
        id: `pos-${id}`,
        group: 'Marketplace',
        label: s?.name || `POS ${id}`,
        onRemove: () => setSelectedPOS((prev) => prev.filter((v) => v !== id)),
      });
    });
    selectedExactAdNames.forEach((name) => {
      chips.push({
        id: `adExact-${name}`,
        group: 'Ad',
        label: name,
        onRemove: () => setSelectedExactAdNames((prev) => prev.filter((v) => v !== name)),
      });
    });
    selectedStartsWithAdNames.forEach((name) => {
      chips.push({
        id: `adStarts-${name}`,
        group: 'Ad',
        label: `starts: ${name}`,
        onRemove: () => setSelectedStartsWithAdNames((prev) => prev.filter((v) => v !== name)),
      });
    });
    return chips;
  }, [
    selectedCampaigns, selectedPlatforms, selectedSlots, selectedPOS,
    selectedExactAdNames, selectedStartsWithAdNames,
    campaigns, filteredSlots, slots, sites,
  ]);

  function clearAllFilters() {
    setSelectedCampaigns([]);
    setSelectedPlatforms([]);
    setSelectedSlots([]);
    setSelectedPOS([]);
    setSelectedExactAdNames([]);
    setSelectedStartsWithAdNames([]);
  }

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
      <div className="min-h-screen w-full bg-[var(--bg-canvas)] flex items-center justify-center">
        <VelvetLoader size={36} label="Loading Analytics" />
      </div>
    );
  }

  const filterCount =
    selectedCampaigns.length +
    selectedSlots.length +
    selectedPOS.length +
    selectedExactAdNames.length +
    selectedStartsWithAdNames.length;

  return (
    <div className="w-full">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-5 py-4 sm:py-5 space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="velvet-section-title !my-0 !before:hidden">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-3)]">Analytics</p>
            <h1 className="page-display mt-1">
              <span className="velvet-header-gradient">Advanced</span>{' '}
              <span className="page-display-serif gradient-text">analytics</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-velvet-ghost h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="btn-velvet-ghost h-9"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="velvet-surface p-3 sm:p-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
            <div className="space-y-1">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">
                View type
              </label>
              <Select value={activeView} onValueChange={(value) => setActiveView(value as 'campaign' | 'slot' | 'ad' | 'pos')}>
                <SelectTrigger className="velvet-focus h-9 w-full text-[12.5px] border-[var(--line)] bg-[var(--bg-panel-2)]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent className="z-[60] border-[var(--line)] bg-[var(--bg-panel)]">
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="slot">Slots</SelectItem>
                  <SelectItem value="ad">Ads</SelectItem>
                  <SelectItem value="pos">POS / marketplace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">
                Date range
              </label>
              <div className="velvet-focus relative z-50">
                <DateRangePicker />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">
                Grouping
              </label>
              <Select value={dataGrouping} onValueChange={(value) => setDataGrouping(value as '1d' | '7d' | '30d')}>
                <SelectTrigger className="velvet-focus h-9 w-full text-[12.5px] border-[var(--line)] bg-[var(--bg-panel-2)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60] border-[var(--line)] bg-[var(--bg-panel)]">
                  <SelectItem value="1d">Daily (1d)</SelectItem>
                  <SelectItem value="7d">Weekly (7d)</SelectItem>
                  <SelectItem value="30d">Monthly (30d)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">
                Chart type
              </label>
              <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                <SelectTrigger className="velvet-focus h-9 w-full text-[12.5px] border-[var(--line)] bg-[var(--bg-panel-2)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60] border-[var(--line)] bg-[var(--bg-panel)]">
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">
                &nbsp;
              </label>
              <button
                type="button"
                onClick={fetchAnalyticsData}
                disabled={dataLoading}
                className="w-full h-9 rounded-[10px] font-medium text-[12.5px] text-white inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #634ce6 0%, #7c6feb 50%, #9b8af0 100%)',
                  boxShadow: '0 6px 20px -6px rgba(99, 76, 230, 0.45), 0 2px 6px rgba(15, 12, 40, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(99, 76, 230, 0.3)',
                }}
              >
                {dataLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Fetching…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Fetch results
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-[var(--line)] flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`velvet-focus h-8 px-3 inline-flex items-center gap-1.5 rounded-md border transition-all duration-200 text-[12px] font-medium ${
                isFilterExpanded
                  ? 'bg-[var(--bg-tint)] border-[var(--line-violet)] text-[var(--indigo-500)]'
                  : 'bg-[var(--bg-panel-2)] border-[var(--line)] text-[var(--text-2)] hover:text-[var(--indigo-500)] hover:border-[var(--line-violet)] hover:bg-[var(--bg-tint)]'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Advanced Filters
              {filterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--violet-500)] text-white text-[10px] font-semibold">
                  {filterCount}
                </span>
              )}
              <span className={`text-[var(--text-3)] text-[10px] transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`}>▾</span>
            </button>
          </div>
        </div>

      {(selectedCampaigns.length === 0 && selectedSlots.length === 0 && selectedPOS.length === 0 && selectedExactAdNames.length === 0 && selectedStartsWithAdNames.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="velvet-surface-inset p-2.5 flex items-center gap-2.5"
        >
          <span className="live-dot" />
          <p className="text-[12px] text-[var(--text-2)]">
            <span className="font-semibold text-[var(--text-1)]">Auto-selection:</span> When no specific {
              activeView === 'campaign' ? 'campaigns' :
                activeView === 'slot' ? 'slots' :
                  activeView === 'pos' ? 'marketplaces' :
                    'ads'
            } are selected, we fetch data for <span className="font-semibold text-[var(--text-1)]">all available {
              activeView === 'campaign' ? `${campaigns.length} campaigns` :
                activeView === 'slot' ? `${filteredSlots.length} slots` :
                  activeView === 'pos' ? `${sites.length} marketplaces` :
                    'ads'
            }</span>.
          </p>
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
            className="velvet-surface velvet-micro-shadow rounded-2xl"
          >
            <div className="p-3 sm:p-3.5">
              <div className="velvet-section-title mb-3 !my-0">
                <h3 className="text-[12px] font-semibold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3 w-3 text-[var(--indigo-500)]" />
                  Advanced filters
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2.5">
                {/* Campaign Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[var(--text-2)] flex items-center gap-2">
                    Campaigns
                    {selectedCampaigns.length === 0 && campaigns.length > 0 && (
                      <span className="velvet-chip text-[9.5px] py-0 px-1.5">Auto · All {campaigns.length}</span>
                    )}
                  </label>
                  <div className="velvet-surface-inset p-2 hover:border-[var(--line-violet)] transition-colors">
                    <MultiSelectDropdown
                      label=""
                      options={campaigns.map(campaign => ({ value: campaign.campaignId, label: campaign.brandName }))}
                      selectedValues={selectedCampaigns}
                      onChange={setSelectedCampaigns}
                      placeholder="Select campaigns..."
                    />
                  </div>
                </div>

                {/* Platform Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[var(--text-2)] flex items-center gap-2">
                    Platform
                    {selectedPlatforms.length === 0 && (
                      <span className="velvet-chip text-[9.5px] py-0 px-1.5">All</span>
                    )}
                  </label>
                  <div className="velvet-surface-inset p-2 hover:border-[var(--line-violet)] transition-colors">
                    <MultiSelectDropdown
                      options={PLATFORM_OPTIONS}
                      selectedValues={selectedPlatforms}
                      onChange={setSelectedPlatforms}
                      placeholder="Select platforms..."
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Slots Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[var(--text-2)] flex items-center gap-2">
                    Slots
                    {selectedSlots.length === 0 && slots.length > 0 && (
                      <span className="velvet-chip text-[9.5px] py-0 px-1.5">Auto · All {filteredSlots.length}</span>
                    )}
                  </label>
                  <div className="velvet-surface-inset p-2 hover:border-[var(--line-violet)] transition-colors">
                    <MultiSelectDropdown
                      options={filteredSlots.map(s => ({ value: s.slotId, label: getSlotDisplayLabel(s) }))}
                      selectedValues={selectedSlots}
                      onChange={setSelectedSlots}
                      placeholder="Select slots..."
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Marketplaces Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[var(--text-2)] flex items-center gap-2">
                    Marketplaces
                    {selectedPOS.length === 0 && sites.length > 0 && (
                      <span className="velvet-chip text-[9.5px] py-0 px-1.5">Auto · All {sites.length}</span>
                    )}
                  </label>
                  <div className="velvet-surface-inset p-2 hover:border-[var(--line-violet)] transition-colors">
                    <MultiSelectDropdown
                      options={sites.map(s => ({ value: s.posId, label: `${s.name} (${s.posId})`, image: s.image }))}
                      selectedValues={selectedPOS}
                      onChange={setSelectedPOS}
                      placeholder="Select marketplaces..."
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Ad Names Filter - Show when campaigns are selected */}
                {selectedCampaigns.length > 0 && (
                  <div className="md:col-span-2 lg:col-span-4 space-y-1.5">
                    <label className="block text-[11px] font-medium text-[var(--text-2)]">
                      Ad names (starts with / exact)
                    </label>
                    <div className="velvet-surface-inset p-2 hover:border-[var(--line-violet)] transition-colors">
                      {adNamesLoading ? (
                        <div className="flex items-center justify-center py-3">
                          <VelvetLoader size={20} label="Loading ad names" />
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
                        <div className="flex flex-col items-center justify-center py-4 text-center gap-1.5">
                          <div className="h-7 w-7 rounded-lg bg-[var(--bg-panel-2)] border border-[var(--line)] flex items-center justify-center">
                            <Inbox className="h-3.5 w-3.5 text-[var(--text-3)]" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-[11.5px] font-medium text-[var(--text-2)]">No ads found</p>
                            <p className="text-[10px] text-[var(--text-3)] mt-0.5 max-w-[220px]">
                              Create some ads in the selected campaigns to enable ad-level filtering
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Active filter chips — dismissable, or dashed empty state */}
              <div className="mt-4">
                {activeFilterChips.length === 0 ? (
                  <div className="velvet-chip-track-empty">
                    <Sparkles className="h-3 w-3 text-[var(--indigo-500)]" />
                    <span>No filters applied — we&apos;ll fetch data for all available {activeView === 'campaign' ? 'campaigns' : activeView === 'slot' ? 'slots' : activeView === 'pos' ? 'marketplaces' : 'ads'}.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg-panel-2)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] px-1.5">Active</span>
                    {activeFilterChips.map((chip) => (
                      <span key={chip.id} className="velvet-filter-chip group">
                        <span className="text-[9.5px] uppercase tracking-wider text-[var(--text-3)] font-semibold">{chip.group}</span>
                        <span className="text-[var(--text-1)] max-w-[180px] truncate">{chip.label}</span>
                        <button
                          type="button"
                          onClick={chip.onRemove}
                          className="velvet-filter-chip-remove"
                          aria-label={`Remove ${chip.group} filter ${chip.label}`}
                        >
                          <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="ml-auto text-[10.5px] font-medium text-[var(--text-3)] hover:text-[var(--neg)] px-2 py-1 rounded-md hover:bg-[var(--neg-soft)] transition-colors duration-200"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-5 pt-2">
        <div className="space-y-3">
          {/* Performance Summary */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="velvet-surface velvet-micro-shadow p-3 sm:p-3.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>

                <div>
                  <h3 className="text-[14px] sm:text-[15px] font-semibold text-[var(--text-1)] tracking-tight">
                    {activeView === 'slot' ? 'Slot-wise' : activeView === 'campaign' ? 'Campaign-wise' : activeView === 'ad' ? 'Ad-wise' : 'POS-wise'} analytics
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10.5px] text-[var(--text-3)] font-medium">
                      {dataGrouping === '1d' ? 'Daily (1d)' : dataGrouping === '7d' ? 'Weekly (7d)' : 'Monthly (30d)'} grouping
                    </span>
                    <span className="text-[var(--text-3)] opacity-40">·</span>
                    <span className="text-[10.5px] text-[var(--text-3)] font-medium">Real-time data</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="velvet-chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--pos)] animate-pulse" />
                  Live Data
                </span>
                <span className="velvet-chip capitalize">
                  {activeView} view
                </span>
              </div>
            </div>
          </motion.div>

          {/* Metrics Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
            className="velvet-surface p-3 sm:p-3.5"
          >
            <div className="velvet-section-title mb-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--pos)]" />
                <h2 className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--text-1)] uppercase tracking-wider">
                  Key Metrics
                </h2>
              </div>
              <span className="velvet-chip text-[9.5px] py-0 px-1.5">Real-time</span>
            </div>

            {metricsData ? (
              <MetricsDashboard
                data={metricsData}
                comparisonData={comparisonMetricsData || undefined}
                period={dataGrouping}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-[var(--bg-tint)] border border-[var(--line)] flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-[var(--text-3)]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[var(--text-2)]">No data available</p>
                  <p className="text-[10.5px] text-[var(--text-3)] mt-0.5 max-w-[280px]">
                    Configure filters and click "Fetch Results" to view analytics
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Analytics Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="velvet-surface p-3 sm:p-3.5"
          >
            {/* Data Grouping Info */}
            <div className="velvet-section-title mb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Calendar className="h-3 w-3 text-[var(--indigo-500)]" />
                <span className="velvet-chip text-[10px] py-0 px-1.5">
                  {dataGrouping === '1d' ? 'Daily intervals' :
                    dataGrouping === '7d' ? 'Weekly intervals' :
                      dataGrouping === '30d' ? 'Monthly intervals' :
                        'Custom intervals'}
                </span>
                {trendData.length > 0 && (
                  <span className="text-[10px] text-[var(--text-3)]">
                    · {trendData.reduce((sum, series) => sum + series.data.length, 0)} pts · {trendData.length} series
                  </span>
                )}
              </div>
            </div>

            {dataLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <VelvetLoader size={28} label="Loading chart data" />
              </div>
            ) : (
              <div className="w-full">
                {trendData && trendData.length > 0 ? (
                  <TrendChart
                    series={trendData}
                    title={`${activeView === 'slot' ? 'Slot' : activeView === 'campaign' ? 'Campaign' : activeView === 'ad' ? 'Ad' : 'POS'} performance over time ${dataGrouping === '1d' ? '(daily)' :
                      dataGrouping === '7d' ? '(Weekly)' :
                        dataGrouping === '30d' ? '(Monthly)' : ''
                      }`}
                    period={dataGrouping}
                    enableSeriesFilters={activeView === 'slot'}
                    enablePlatformFilter={activeView === 'slot'}
                    height={400}
                    chartType={chartType}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <BarChart3 className="h-8 w-8 text-[var(--text-3)]" strokeWidth={1.5} />
                    <p className="text-[12px] font-medium text-[var(--text-2)] text-center">
                      No trend data available yet
                    </p>
                    <p className="text-[10.5px] text-[var(--text-3)] text-center max-w-[260px]">
                      Select filters and click Fetch results to view analytics
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Clicks vs Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
            className="velvet-surface p-3 sm:p-3.5"
          >
            <TrendChart
              series={trendData}
              title="Clicks over time"
              dataKey="clicks"
              yAxisLabel="Clicks"
              period={dataGrouping}
              enableSeriesFilters={activeView === 'slot'}
              enablePlatformFilter={activeView === 'slot'}
              height={380}
              chartType={chartType}
            />
          </motion.div>

          {/* CTR vs Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            className="velvet-surface p-3 sm:p-3.5"
          >
            <TrendChart
              series={trendData}
              title="CTR over time"
              dataKey="ctr"
              yAxisLabel="CTR (%)"
              period={dataGrouping}
              enableSeriesFilters={activeView === 'slot'}
              enablePlatformFilter={activeView === 'slot'}
              height={380}
              chartType={chartType}
            />
          </motion.div>

          {/* Live Landings Over Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
            className="velvet-surface p-3 sm:p-3.5"
          >
            {landingTrendData.length > 0 && landingTrendData[0]?.data?.length > 0 ? (
              <TrendChart
                series={landingTrendData}
                title="Live Landings Over Time"
                dataKey="landingCount"
                yAxisLabel="Live Landings"
                period={dataGrouping}
                height={380}
                chartType={chartType}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-[var(--bg-tint)] border border-[var(--line-violet)] flex items-center justify-center">
                  <Plane className="h-4 w-4 text-[var(--indigo-500)]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--text-1)]">
                    No landing trend data yet
                  </p>
                  <p className="text-[10.5px] text-[var(--text-3)] mt-0.5 max-w-[260px]">
                    Select filters and click Fetch results to view landing analytics
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Data Tables Section */}
          <div className="grid grid-cols-1 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
              className="velvet-surface p-3 sm:p-3.5"
            >
              <div className="velvet-section-title mb-3">
                <div>
                  <h3 className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-[var(--indigo-500)]" />
                    Top performing locations
                  </h3>
                  <p className="text-[10.5px] text-[var(--text-3)] mt-0.5">Cities and states ranked by impression volume</p>
                </div>
                {topLocations.length > 0 && (
                  <span className="velvet-chip text-[9.5px] py-0 px-1.5">{topLocations.length} rows</span>
                )}
              </div>

              <DataTable
                title="Top performing locations"
                data={
                  [...topLocations]
                    .sort((a, b) => ((b.impressions || 0) + (b.clicks || 0)) - ((a.impressions || 0) + (a.clicks || 0)))
                    .map(item => ({
                      location: coerceName(item.location, 'Unknown'),
                      impressions: item.impressions || 0,
                      clicks: item.clicks || 0,
                      conversions: item.conversions || 0
                    }))
                }
                columns={[
                  { key: 'location', label: 'Location (City/State)', icon: <MapPin className="h-3 w-3" /> },
                  { key: 'impressions', label: 'Impressions', format: 'number', icon: <Eye className="h-3 w-3" />, align: 'right' },
                  { key: 'clicks', label: 'Clicks', format: 'number', align: 'right' },
                  { key: 'conversions', label: 'Conversions', format: 'number', icon: <DollarSign className="h-3 w-3" />, align: 'right' }
                ]}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
              className="velvet-surface p-3 sm:p-3.5"
            >
              <div className="velvet-section-title mb-3">
                <div>
                  <h3 className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-[var(--indigo-500)]" />
                    Ad slots performance
                  </h3>
                  <p className="text-[10.5px] text-[var(--text-3)] mt-0.5">Slots sorted by performance metrics</p>
                </div>
                {topSlotsData.length > 0 && (
                  <span className="velvet-chip text-[9.5px] py-0 px-1.5">{topSlotsData.length} rows</span>
                )}
              </div>

              <DataTable
                title="Ad slots performance"
                data={
                  [...topSlotsData]
                    .sort((a, b) => ((b.impressions || 0) + (b.clicks || 0)) - ((a.impressions || 0) + (a.clicks || 0)))
                    .map(slot => {
                      const impressions = slot.impressions || 0;
                      const clicks = slot.clicks || 0;
                      const mappedSlot = slotLookup.get(toLookupKey(slot.slotId));
                      return {
                        slotName: mappedSlot ? getSlotDisplayLabel(mappedSlot) : `Slot ${slot.slotId || 'Unknown'}`,
                        impressions,
                        clicks,
                        conversionRate: formatSmartPercent(impressions > 0 ? (clicks / impressions) * 100 : 0)
                      };
                    })
                }
                columns={[
                  { key: 'slotName', label: 'Slot Name', icon: <Tag className="h-3 w-3" /> },
                  { key: 'impressions', label: 'Impressions', format: 'number', icon: <Eye className="h-3 w-3" />, align: 'right' },
                  { key: 'clicks', label: 'Clicks', format: 'number', align: 'right' },
                  { key: 'conversionRate', label: 'CTR (CR)', align: 'right' }
                ]}
              />
            </motion.div>
          </div>

          {/* Slot performance overview — only when activeView === 'slot' */}
          {activeView === 'slot' && slotMetrics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
              className="velvet-surface p-3 sm:p-3.5"
            >
              <div className="velvet-section-title mb-3">
                <div>
                  <h3 className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-[var(--indigo-500)]" />
                    Slot performance overview
                  </h3>
                  <p className="text-[10.5px] text-[var(--text-3)] mt-0.5">
                    Per-slot metrics for the {slotMetrics.length} {slotMetrics.length === 1 ? 'slot' : 'slots'} in the current selection
                  </p>
                </div>
                <span className="velvet-chip text-[9.5px] py-0 px-1.5">{slotMetrics.length} slots</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[...slotMetrics]
                  .sort((a, b) => (b.metrics.impressions + b.metrics.clicks) - (a.metrics.impressions + a.metrics.clicks))
                  .slice(0, 9)
                  .map((s) => {
                    const ctr = s.metrics.impressions > 0
                      ? (s.metrics.clicks / s.metrics.impressions) * 100
                      : 0;
                    return (
                      <div
                        key={s.slotId}
                        className="velvet-surface-inset p-2.5 hover:border-[var(--line-violet)] transition-colors group"
                      >
                        <div className="flex items-start gap-2 mb-1.5">
                          <div className="h-6 w-6 rounded-md bg-[var(--bg-tint)] border border-[var(--line-violet)] flex items-center justify-center flex-shrink-0">
                            <Tag className="h-3 w-3 text-[var(--indigo-500)]" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-[var(--text-1)] truncate" title={s.slotName}>
                              {s.slotName}
                            </p>
                            <p className="text-[9.5px] text-[var(--text-3)] uppercase tracking-wider">Slot #{s.slotId}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Impressions</p>
                            <p className="text-[13px] font-semibold tabular-nums text-[var(--text-1)]">
                              {formatCount(s.metrics.impressions)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Clicks</p>
                            <p className="text-[13px] font-semibold tabular-nums text-[var(--text-1)]">
                              {formatCount(s.metrics.clicks)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-[var(--text-3)] font-semibold">CTR</p>
                            <p className="text-[12.5px] font-semibold tabular-nums text-[var(--indigo-500)]">
                              {formatSmartPercent(ctr)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Landings</p>
                            <p className="text-[13px] font-semibold tabular-nums text-[var(--pink-500)]">
                              {formatCount(s.metrics.landingCount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* Combo Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
              className="velvet-surface p-3 sm:p-3.5"
            >
              <ComboChart
                data={trendData.length > 0 && trendData[0]?.data ?
                  trendData[0].data.map(d => ({
                    date: d.date,
                    impressions: d.impressions || 0,
                    clicks: d.clicks || 0
                  })) :
                  []
                }
                title="Impressions vs clicks"
                barKey="impressions"
                lineKey="clicks"
                barName="Impressions"
                lineName="Clicks"
                barColor="#634ce6"
                lineColor="#d94684"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
              className="velvet-surface p-3 sm:p-3.5"
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
                barColor="#634ce6"
                lineColor="#fbbf24"
              />
            </motion.div>
          </div>

          {/* Demographic and Platform Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { data: breakdownData.gender, title: 'Gender' },
              { data: breakdownData.age, title: 'Age' },
              { data: breakdownData.platform, title: 'Platform' },
              { data: breakdownData.location, title: 'Location' },
            ].map(({ data, title }, idx) => (
              <motion.div
                key={title}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + idx * 0.05 }}
                onClick={() => setBreakdownModal({ open: true, title, data })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setBreakdownModal({ open: true, title, data });
                  }
                }}
                className="velvet-surface velvet-micro-shadow p-3 text-left cursor-pointer transition-all duration-300 hover:shadow-[var(--shadow-velvet)] hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500"
              >
                <BreakdownPieChart data={data} title={title} />
              </motion.div>
            ))}
          </div>

          {/* Age-wise Analysis — DISABLED: not used, was duplicated below.
              TODO: re-enable only if a separate "Performance by age" KPI panel is needed. */}
          {false && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="velvet-surface p-3"
            >
              <BreakdownPieChart
                data={breakdownData.age || []}
                title="Age-wise Performance Distribution"
              />
            </motion.div>
          )}
        </div>
      </div>
      </div>

      <BreakdownModal
        open={breakdownModal.open}
        onOpenChange={(open: boolean) => setBreakdownModal((prev) => ({ ...prev, open }))}
        title={breakdownModal.title}
        data={breakdownModal.data}
      />
    </div>
  );
}