import { useState, useEffect, useMemo, type ReactNode, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Calendar, TrendingUp, Filter, BarChart3, Tag, Plane, MapPin, Eye, CheckCircle2, Inbox, X, Sparkles, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TrendChart, type ChartType } from '@/components/analytics/TrendChart';
import { ComboChart } from '@/components/analytics/ComboChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { BreakdownModal } from '@/components/analytics/BreakdownModal';
import { MultiSelectDropdown } from '@/components/analytics/MultiSelectDropdown';
import { AdNameFilterDropdown } from '@/components/analytics/AdNameFilterDropdown';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { useFilters } from '@/context/FilterContext';
import { useSpotlight } from '@/hooks/useSpotlight';
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
import { normalizeFilterIds, matchesId, matchSlotId, normalizeRouteId, toLookupKey, isV2Active } from '@/utils/v2Normalizer';

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
  adId: string | number;
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

const dedupeNumericIds = (values?: (string | number)[]): (string | number)[] | undefined => {
  if (!values || values.length === 0) return undefined;

  // V2 campaign/slot ids are UUID strings — Number()/isFinite would drop them all.
  // Dedupe as strings in V2; the downstream normalizeFilterIds re-normalizes per type.
  if (isV2Active()) {
    const deduped = Array.from(new Set(values.map(String).filter((s) => s.length > 0)));
    return deduped.length > 0 ? deduped : undefined;
  }

  const normalizedValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  return normalizedValues.length > 0 ? Array.from(new Set(normalizedValues)) : undefined;
};

const sanitizeSlots = (rawSlots: Slot[]): Slot[] => {
  const uniqueSlots = new Map<string | number, Slot>();

  rawSlots.forEach((slot) => {
    const normalizedSlotId = toLookupKey(slot.slotId);

    // In V2 slotId is a UUID string — don't reject it via a numeric-finite check.
    const isValidSlotId = isV2Active()
      ? String(normalizedSlotId).length > 0
      : Number.isFinite(Number(normalizedSlotId));

    if (!isValidSlotId || uniqueSlots.has(normalizedSlotId)) {
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
    slotId: string | number;
    slotName: string;
    metrics: MetricsData;
  }>>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  // HALO: additive-only UI state — captures the last fetch error for the styled
  // error banner. Does not alter fetching, caching, or handler behaviour.
  const [dataFetchError, setDataFetchError] = useState<string | null>(null);

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
            const res = await adService.getAdLabels(isV2Active() ? campId : Number(campId));
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

      const nextSelectedSlots = normalizedSelectedSlots.filter((slotId) => filteredSlotIdSet.has(String(slotId)));

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
      setDataFetchError(null);
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to load dropdown data');
      setDataFetchError(message);
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
      setDataFetchError(null);

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
              slotId: normalizeFilterIds([slotId]),
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to load analytics data: ${message}`);
      setDataFetchError(message);

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
      const s = filteredSlots.find((x) => matchSlotId(x, id)) || slots.find((x) => matchSlotId(x, id));
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
      <div className="halo-page">
        <div className="mb-5 space-y-2">
          <div className="halo-skeleton h-2.5 w-20" />
          <div className="halo-skeleton h-8 w-64" />
          <div className="halo-skeleton h-4 w-96" />
        </div>
        <AnalyticsSkeleton />
      </div>
    );
  }

  const filterCount =
    selectedCampaigns.length +
    selectedSlots.length +
    selectedPOS.length +
    selectedExactAdNames.length +
    selectedStartsWithAdNames.length;

  const headerActions = (
    <>
      <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button size="sm" onClick={handleExport}>
        <Download className="h-3.5 w-3.5" />
        Export CSV
      </Button>
    </>
  );

  return (
    <div className="halo-page">
      <PageHeader
        eyebrow="Analytics"
        title="Advanced analytics"
        subhead="Break performance down by campaign, slot, ad, or marketplace across any date range."
        actions={headerActions}
      />

      <div className="mt-5 space-y-5">
        {dataFetchError && (
          <div className="halo-card p-5 flex items-start gap-3" role="alert">
            <div className="halo-chip flex-none" style={{ background: 'var(--h-neg-soft)', color: 'var(--h-coral)' }}>
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="halo-heading">Couldn't load analytics data</p>
              <p className="halo-subtitle mt-0.5">{dataFetchError} — check your filters and connection, then try again.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAnalyticsData} disabled={dataLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        )}

        <div className="halo-card halo-rail p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="space-y-1.5">
              <label className="halo-label">View type</label>
              <Select value={activeView} onValueChange={(value) => setActiveView(value as 'campaign' | 'slot' | 'ad' | 'pos')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="slot">Slots</SelectItem>
                  <SelectItem value="ad">Ads</SelectItem>
                  <SelectItem value="pos">POS / marketplace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="halo-label">Date range</label>
              <DateRangePicker />
            </div>

            <div className="space-y-1.5">
              <label className="halo-label">Grouping</label>
              <Select value={dataGrouping} onValueChange={(value) => setDataGrouping(value as '1d' | '7d' | '30d')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Daily (1d)</SelectItem>
                  <SelectItem value="7d">Weekly (7d)</SelectItem>
                  <SelectItem value="30d">Monthly (30d)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="halo-label">Chart type</label>
              <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Button
                type="button"
                onClick={fetchAnalyticsData}
                disabled={dataLoading}
                className="w-full"
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
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 flex items-center justify-end gap-2 flex-wrap" style={{ borderTop: '1px solid var(--h-line)' }}>
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={isFilterExpanded ? 'halo-segment-item is-active' : 'halo-segment-item'}
              style={{ background: isFilterExpanded ? 'var(--h-tint-2)' : 'var(--h-surface-3)', color: isFilterExpanded ? 'var(--h-iris-600)' : undefined }}
            >
              <Filter className="h-3.5 w-3.5" strokeWidth={1.75} />
              Advanced filters
              {filterCount > 0 && (
                <span className="halo-badge halo-badge-iris">{filterCount}</span>
              )}
              <span className={`transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--h-ink-3)', fontSize: '10px' }}>▾</span>
            </button>
          </div>
        </div>

      {(selectedCampaigns.length === 0 && selectedSlots.length === 0 && selectedPOS.length === 0 && selectedExactAdNames.length === 0 && selectedStartsWithAdNames.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="halo-inset p-3 flex items-center gap-2.5"
        >
          <span className="halo-dot halo-dot-live" style={{ color: 'var(--h-mint)' }} />
          <p className="text-xs" style={{ color: 'var(--h-ink-2)' }}>
            <span className="font-semibold" style={{ color: 'var(--h-ink)' }}>Auto-selection:</span> When no specific {
              activeView === 'campaign' ? 'campaigns' :
                activeView === 'slot' ? 'slots' :
                  activeView === 'pos' ? 'marketplaces' :
                    'ads'
            } are selected, we fetch data for <span className="font-semibold" style={{ color: 'var(--h-ink)' }}>all available {
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
            className="halo-card overflow-hidden"
          >
            <div className="p-5">
              <div className="halo-eyebrow mb-3 flex items-center gap-1.5">
                <SlidersHorizontal className="h-3 w-3" style={{ color: 'var(--h-iris-500)' }} strokeWidth={1.75} />
                Advanced filters
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Campaign Filter */}
                <div className="space-y-1.5">
                  <label className="halo-label flex items-center gap-2">
                    Campaigns
                    {selectedCampaigns.length === 0 && campaigns.length > 0 && (
                      <span className="halo-badge">Auto · All {campaigns.length}</span>
                    )}
                  </label>
                  <div className="halo-inset p-2">
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
                  <label className="halo-label flex items-center gap-2">
                    Platform
                    {selectedPlatforms.length === 0 && (
                      <span className="halo-badge">All</span>
                    )}
                  </label>
                  <div className="halo-inset p-2">
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
                  <label className="halo-label flex items-center gap-2">
                    Slots
                    {selectedSlots.length === 0 && slots.length > 0 && (
                      <span className="halo-badge">Auto · All {filteredSlots.length}</span>
                    )}
                  </label>
                  <div className="halo-inset p-2">
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
                  <label className="halo-label flex items-center gap-2">
                    Marketplaces
                    {selectedPOS.length === 0 && sites.length > 0 && (
                      <span className="halo-badge">Auto · All {sites.length}</span>
                    )}
                  </label>
                  <div className="halo-inset p-2">
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
                    <label className="halo-label">
                      Ad names (starts with / exact)
                    </label>
                    <div className="halo-inset p-2">
                      {adNamesLoading ? (
                        <div className="flex items-center justify-center py-3">
                          <span className="halo-spinner" />
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
                          <div className="halo-chip">
                            <Inbox className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </div>
                          <div>
                            <p className="halo-label" style={{ color: 'var(--h-ink-2)' }}>No ads found</p>
                            <p className="halo-subtitle mt-0.5 max-w-[220px]">
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
                  <div className="halo-inset flex items-center gap-2 px-3 py-2.5 text-xs" style={{ color: 'var(--h-ink-3)' }}>
                    <Sparkles className="h-3 w-3" style={{ color: 'var(--h-iris-500)' }} strokeWidth={1.75} />
                    <span>No filters applied — we&apos;ll fetch data for all available {activeView === 'campaign' ? 'campaigns' : activeView === 'slot' ? 'slots' : activeView === 'pos' ? 'marketplaces' : 'ads'}.</span>
                  </div>
                ) : (
                  <div className="halo-inset flex flex-wrap items-center gap-1.5 p-2">
                    <span className="halo-eyebrow px-1.5">Active</span>
                    {activeFilterChips.map((chip) => (
                      <span key={chip.id} className="halo-badge group gap-1.5">
                        <span className="halo-eyebrow" style={{ fontSize: '9px' }}>{chip.group}</span>
                        <span className="max-w-[180px] truncate" style={{ color: 'var(--h-ink)' }}>{chip.label}</span>
                        <button
                          type="button"
                          onClick={chip.onRemove}
                          className="inline-flex items-center justify-center rounded-full transition-colors"
                          style={{ width: '14px', height: '14px', color: 'var(--h-ink-3)' }}
                          aria-label={`Remove ${chip.group} filter ${chip.label}`}
                        >
                          <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="ml-auto">
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        <div className="space-y-5">
          {/* Performance Summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="halo-card p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="halo-chip">
                  <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
                </div>

                <div>
                  <h3 className="halo-heading">
                    {activeView === 'slot' ? 'Slot-wise' : activeView === 'campaign' ? 'Campaign-wise' : activeView === 'ad' ? 'Ad-wise' : 'POS-wise'} analytics
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 halo-subtitle">
                    <span>
                      {dataGrouping === '1d' ? 'Daily (1d)' : dataGrouping === '7d' ? 'Weekly (7d)' : 'Monthly (30d)'} grouping
                    </span>
                    <span>·</span>
                    <span>Real-time data</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="halo-badge">
                  <span className="halo-dot halo-dot-live" style={{ color: 'var(--h-mint)' }} />
                  Live data
                </span>
                <span className="halo-badge capitalize">
                  {activeView} view
                </span>
              </div>
            </div>
          </motion.div>

          {/* Metrics Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
            className="halo-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="halo-dot" style={{ color: 'var(--h-mint)' }} />
                <h2 className="halo-eyebrow">Key metrics</h2>
              </div>
              <span className="halo-badge">Real-time</span>
            </div>

            {metricsData ? (
              <MetricsDashboard
                data={metricsData}
                comparisonData={comparisonMetricsData || undefined}
                period={dataGrouping}
              />
            ) : (
              <EmptyState
                icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
                title="No data available"
                subtitle='Configure filters and click "Fetch results" to view analytics.'
              />
            )}
          </motion.div>

          {/* Analytics Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="halo-card p-5"
          >
            {/* Data Grouping Info */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <Calendar className="h-3 w-3" style={{ color: 'var(--h-iris-500)' }} strokeWidth={1.75} />
              <span className="halo-badge">
                {dataGrouping === '1d' ? 'Daily intervals' :
                  dataGrouping === '7d' ? 'Weekly intervals' :
                    dataGrouping === '30d' ? 'Monthly intervals' :
                      'Custom intervals'}
              </span>
              {trendData.length > 0 && (
                <span className="halo-subtitle">
                  · {trendData.reduce((sum, series) => sum + series.data.length, 0)} pts · {trendData.length} series
                </span>
              )}
            </div>

            {dataLoading ? (
              <div className="halo-skeleton w-full" style={{ height: 400 }} />
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
                  <EmptyState
                    icon={<BarChart3 className="h-4 w-4" strokeWidth={1.75} />}
                    title="No trend data available yet"
                    subtitle="Select filters and click Fetch results to view analytics"
                  />
                )}
              </div>
            )}
          </motion.div>

          {/* Clicks vs Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
            className="halo-card p-5"
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            className="halo-card p-5"
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
            className="halo-card p-5"
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
              <EmptyState
                icon={<Plane className="h-4 w-4" strokeWidth={1.75} />}
                title="No landing trend data yet"
                subtitle="Select filters and click Fetch results to view landing analytics"
              />
            )}
          </motion.div>

          {/* Data Tables Section */}
          <div className="grid grid-cols-1 gap-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
              className="halo-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="halo-heading flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--h-iris-500)' }} strokeWidth={1.75} />
                    Top performing locations
                  </h3>
                  <p className="halo-subtitle mt-0.5">Cities and states ranked by impression volume</p>
                </div>
                {topLocations.length > 0 && (
                  <span className="halo-badge">{topLocations.length} rows</span>
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
                  { key: 'conversions', label: 'Conversions', format: 'number', icon: <CheckCircle2 className="h-3 w-3" />, align: 'right' }
                ]}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
              className="halo-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="halo-heading flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" style={{ color: 'var(--h-iris-500)' }} strokeWidth={1.75} />
                    Ad slots performance
                  </h3>
                  <p className="halo-subtitle mt-0.5">Slots sorted by performance metrics</p>
                </div>
                {topSlotsData.length > 0 && (
                  <span className="halo-badge">{topSlotsData.length} rows</span>
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
              className="halo-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="halo-heading flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" style={{ color: 'var(--h-iris-500)' }} strokeWidth={1.75} />
                    Slot performance overview
                  </h3>
                  <p className="halo-subtitle mt-0.5">
                    Per-slot metrics for the {slotMetrics.length} {slotMetrics.length === 1 ? 'slot' : 'slots'} in the current selection
                  </p>
                </div>
                <span className="halo-badge">{slotMetrics.length} slots</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
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
                        className="halo-inset p-3"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <div className="halo-chip flex-none" style={{ width: '1.5rem', height: '1.5rem' }}>
                            <Tag className="h-3 w-3" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="halo-label truncate" style={{ color: 'var(--h-ink)' }} title={s.slotName}>
                              {s.slotName}
                            </p>
                            <p className="halo-eyebrow">Slot #{s.slotId}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="halo-eyebrow">Impressions</p>
                            <p className="num text-sm font-semibold" style={{ color: 'var(--h-ink)' }}>
                              {formatCount(s.metrics.impressions)}
                            </p>
                          </div>
                          <div>
                            <p className="halo-eyebrow">Clicks</p>
                            <p className="num text-sm font-semibold" style={{ color: 'var(--h-ink)' }}>
                              {formatCount(s.metrics.clicks)}
                            </p>
                          </div>
                          <div>
                            <p className="halo-eyebrow">CTR</p>
                            <p className="num text-sm font-semibold" style={{ color: 'var(--h-iris-500)' }}>
                              {formatSmartPercent(ctr)}
                            </p>
                          </div>
                          <div>
                            <p className="halo-eyebrow">Landings</p>
                            <p className="num text-sm font-semibold" style={{ color: 'var(--h-violet)' }}>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
              className="halo-card p-5"
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
                barColor="var(--h-iris-500)"
                lineColor="var(--h-coral)"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
              className="halo-card p-5"
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
                barColor="var(--h-iris-500)"
                lineColor="var(--h-amber)"
              />
            </motion.div>
          </div>

          {/* Demographic and Platform Analytics */}
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4 items-stretch">
            {[
              { data: breakdownData.gender, title: 'Gender' },
              { data: breakdownData.age, title: 'Age' },
              { data: breakdownData.platform, title: 'Platform' },
              { data: breakdownData.location, title: 'Location' },
            ].map(({ data, title }, idx) => (
              <BreakdownTile
                key={title}
                index={idx}
                onClick={() => setBreakdownModal({ open: true, title, data })}
              >
                <BreakdownPieChart data={data} title={title} />
              </BreakdownTile>
            ))}
          </div>

          {/* Age-wise Analysis — DISABLED: not used, was duplicated below.
              TODO: re-enable only if a separate "Performance by age" KPI panel is needed. */}
          {false && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="halo-card p-5"
            >
              <BreakdownPieChart
                data={breakdownData.age || []}
                title="Age-wise Performance Distribution"
              />
            </motion.div>
          )}
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

/* ============================================================
   Local presentational helpers
   ============================================================ */

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
      <div className="halo-chip">{icon}</div>
      <div>
        <p className="halo-label" style={{ color: 'var(--h-ink-2)' }}>{title}</p>
        <p className="halo-subtitle mt-0.5 max-w-[280px]">{subtitle}</p>
      </div>
    </div>
  );
}

function BreakdownTile({
  index,
  onClick,
  children,
}: {
  index: number;
  onClick: () => void;
  children: ReactNode;
}) {
  const spotlight = useSpotlight();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      {...spotlight}
      style={{ '--i': Math.min(index, 10) } as CSSProperties}
      className="halo-card halo-card-interactive halo-spotlight halo-rise p-5 text-left cursor-pointer focus:outline-none"
    >
      {children}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="halo-card p-5 h-[140px]">
        <div className="halo-skeleton h-full w-full" />
      </div>
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="halo-card p-5 h-[104px] flex flex-col justify-between">
            <div className="halo-skeleton h-3 w-16" />
            <div className="halo-skeleton h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="halo-card p-5">
        <div className="halo-skeleton h-[400px] w-full" />
      </div>
    </div>
  );
}