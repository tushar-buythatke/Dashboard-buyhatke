import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { TrendChart } from '@/components/analytics/TrendChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { BreakdownModal } from '@/components/analytics/BreakdownModal';
import { RefreshCw, Download, TrendingUp, Zap, Activity, BarChart3, ArrowUpRight, Percent, Gauge, LayoutGrid, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { CometCard } from '@/components/ui/comet-card';
import { useSpotlight } from '@/hooks/useSpotlight';
import { analyticsService, MetricsPayload } from '@/services/analyticsService';
import { MetricsData, BreakdownData, TrendChartSeries, Campaign } from '@/types';
import { toast } from 'sonner';
import { coerceName } from '@/lib/format';
import { normalizeFilterIds } from '@/utils/v2Normalizer';

// Utils
import { exportToCSV, formatDashboardForCSV } from '@/utils/csvExport';

// Constants for localStorage
const DASHBOARD_CACHE_KEY = 'dashboard_analytics_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Helper function to get default metrics
const getDefaultMetrics = (): MetricsData => ({
  impressions: 0,
  clicks: 0,
  conversions: 0,
  ctr: 0,
  landingCount: 0
});

// Helper function to save data to localStorage
const saveDashboardCache = (data: any) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cacheData));
    console.log('💾 Dashboard data saved to localStorage');
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Helper function to load data from localStorage
const loadDashboardCache = () => {
  try {
    const cached = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (within 24 hours)
    if (now - cacheData.timestamp < CACHE_DURATION) {
      console.log('💾 Loading dashboard data from localStorage cache');
      return cacheData.data;
    } else {
      // Cache expired, remove it
      localStorage.removeItem(DASHBOARD_CACHE_KEY);
      console.log('💾 Dashboard cache expired, removed from localStorage');
      return null;
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

// Helper function to map platform numbers to names
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

export function Dashboard() {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false); // Start with false - no auto-loading
  const [dataLoaded, setDataLoaded] = useState(false); // Track if any data has been loaded
  // HALO: additive-only UI state — captures the last fetch error for the styled
  // error banner. Does not alter fetching, caching, or handler behaviour.
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Real data states
  const [metricsData, setMetricsData] = useState<MetricsData>(getDefaultMetrics());
  const [comparisonMetricsData, setComparisonMetricsData] = useState<MetricsData | null>(null);
  const [trendData, setTrendData] = useState<TrendChartSeries[]>([]);
  const [genderBreakdown, setGenderBreakdown] = useState<BreakdownData[]>([]);
  const [platformBreakdown, setPlatformBreakdown] = useState<BreakdownData[]>([]);
  const [ageBreakdown, setAgeBreakdown] = useState<BreakdownData[]>([]);
  const [locationBreakdown, setLocationBreakdown] = useState<BreakdownData[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [quickStats, setQuickStats] = useState({
    activeCampaigns: 0,
    bestCTR: 0,
    topPlatform: 'Unknown',
    conversionRate: 0
  });

  const [breakdownModal, setBreakdownModal] = useState<{ open: boolean; title: string; data: any[] }>({
    open: false,
    title: '',
    data: []
  });

  // Check for cached data on component mount
  useEffect(() => {
    const cachedData = loadDashboardCache();
    if (cachedData) {
      // Load cached data
      setMetricsData(cachedData.metricsData || getDefaultMetrics());
      setComparisonMetricsData(cachedData.comparisonMetricsData || null);
      setTrendData(cachedData.trendData || []);
      setGenderBreakdown(cachedData.genderBreakdown || []);
      setPlatformBreakdown(cachedData.platformBreakdown || []);
      setAgeBreakdown(cachedData.ageBreakdown || []);
      setLocationBreakdown(cachedData.locationBreakdown || []);
      setQuickStats(cachedData.quickStats || {
        activeCampaigns: 0,
        bestCTR: 0,
        topPlatform: 'Unknown',
        conversionRate: 0
      });
      setDataLoaded(true);
    }
  }, []);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setFetchError(null);

      console.log('📊 Fetching LAST 7 DAYS data using individual campaign approach like Analytics');

      // Create last 7 days date range (exactly 7 days from today)
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000); // 6 days ago + today = 7 days

      const last7DaysPayload: MetricsPayload = {
        from: sevenDaysAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
        interval: '1d' // Daily intervals for better line chart
      };

      console.log('📊 Date range (exactly 7 days):', {
        from: last7DaysPayload.from,
        to: last7DaysPayload.to,
        totalDays: Math.ceil((today.getTime() - sevenDaysAgo.getTime()) / (24 * 60 * 60 * 1000)) + 1
      });

      // Create comparison period (previous 7 days)
      const fourteenDaysAgo = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000); // 13 days ago + 7 days ago = previous 7 days
      const comparisonPayload: MetricsPayload = {
        from: fourteenDaysAgo.toISOString().split('T')[0],
        to: sevenDaysAgo.toISOString().split('T')[0],
        interval: '1d'
      };

      console.log('📊 Comparison date range (previous 7 days):', comparisonPayload);

      // First, fetch campaigns list
      const campaignsResult = await analyticsService.getCampaigns();
      console.log('📊 Campaigns result:', campaignsResult);

      if (!campaignsResult.success || !campaignsResult.data) {
        throw new Error('Failed to fetch campaigns');
      }

      setCampaigns(campaignsResult.data);

      // Process campaigns data to get all campaign IDs (active + archived)
      const allCampaigns = campaignsResult.data;
      const activeCampaigns = allCampaigns.filter((c: Campaign) => c.status === 1);
      const archivedCampaigns = allCampaigns.filter((c: Campaign) => c.status === -1);

      console.log('📊 Found campaigns:', {
        total: allCampaigns.length,
        active: activeCampaigns.length,
        archived: archivedCampaigns.length
      });

      // Get all campaign IDs (like Analytics does when no campaigns are selected)
      const allCampaignIds = allCampaigns.map((c: Campaign) => c.campaignId);
      console.log('📊 Processing all campaign IDs:', allCampaignIds);

      // Fetch metrics and trend for ALL campaigns in ONE batched call each.
      // The API accepts a campaignId array and aggregates across it, so the
      // old per-campaign fan-out (2N requests) collapses to 2 requests.
      // The merge loop further down still works unchanged — it now merges a
      // single already-aggregated result.
      const campaignIds = normalizeFilterIds(allCampaignIds);

      console.log(`📊 Fetching metrics + trend for ALL ${campaignIds.length} campaigns in 2 batched calls...`);

      const [metricsResult, trendResult] = await Promise.all([
        analyticsService.getMetrics({
          ...last7DaysPayload,
          campaignId: campaignIds,
          slotId: undefined,
          siteId: undefined
        }),
        analyticsService.getTrendData({
          ...last7DaysPayload,
          campaignId: campaignIds,
          slotId: undefined,
          siteId: undefined
        })
      ]);

      const campaignResults = [{
        campaignId: 'all',
        campaignName: 'Overall Performance',
        metrics: metricsResult.success ? metricsResult.data : getDefaultMetrics(),
        trendData: trendResult.success ? trendResult.data : []
      }];
      console.log('📊 Batched metrics + trend result received:', campaignResults);

      // Aggregate metrics from all campaigns (like Analytics does)
      let aggregatedMetrics: MetricsData = getDefaultMetrics();
      let trendDataPoints: { [date: string]: any } = {};

      campaignResults.forEach(result => {
        try {
          if (result.metrics) {
            aggregatedMetrics.impressions += result.metrics.impressions || 0;
            aggregatedMetrics.clicks += result.metrics.clicks || 0;
            aggregatedMetrics.conversions += result.metrics.conversions || 0;
            aggregatedMetrics.landingCount += result.metrics.landingCount || 0;
          }

          // Aggregate trend data by date
          if (result.trendData && Array.isArray(result.trendData)) {
            result.trendData.forEach((point: any) => {
              const date = point.date || point.day;
              if (date) {
                if (!trendDataPoints[date]) {
                  trendDataPoints[date] = {
                    date,
                    impressions: 0,
                    clicks: 0,
                    conversions: 0
                  };
                }

                trendDataPoints[date].impressions += point.impressions || 0;
                trendDataPoints[date].clicks += point.clicks || 0;
                trendDataPoints[date].conversions += point.conversions || 0;
              }
            });
          }
        } catch (error) {
          console.error('Error processing campaign data:', error, result);
        }
      });

      // Recalculate derived metrics (like Analytics does)
      aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 ?
        (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;

      console.log('📊 Aggregated metrics (parallel processing):', aggregatedMetrics);

      // Convert trend data points to array and calculate CTR for each point
      const aggregatedTrendData = Object.values(trendDataPoints).map((point: any) => ({
        ...point,
        ctr: point.impressions > 0 ? (point.clicks / point.impressions) * 100 : 0
      })).sort((a, b) => a.date.localeCompare(b.date));

      console.log('📊 Aggregated trend data (parallel processing):', aggregatedTrendData);

      // Set the aggregated data
      setMetricsData(aggregatedMetrics);

      if (aggregatedTrendData.length > 0) {
        setTrendData([{
          name: 'Overall Performance',
          data: aggregatedTrendData
        }]);
        console.log('✅ Set trend data for dashboard');
      } else {
        console.log('⚠️ No trend data available');
        setTrendData([]);
      }

      // Fetch each breakdown type for ALL campaigns in ONE batched call.
      // The API aggregates across the campaignId array — this collapses the
      // old per-campaign × per-type fan-out (4N requests) into 4 requests.
      // The merge logic below is unchanged: a single batched result flows
      // through the same aggregation, dedupe, and percentage math.
      console.log('📊 Fetching breakdown data for ALL campaigns in 4 batched calls...');
      const breakdownTypes = ['gender', 'platform', 'age', 'location'];

      // Create all breakdown promises (one per type, all campaigns batched)
      const allBreakdownPromises = breakdownTypes.map(async (breakdownType) => {
        const breakdownByType: { [key: string]: any } = {};

        try {
          const breakdownPayload = {
            ...last7DaysPayload,
            campaignId: campaignIds,
            slotId: undefined,
            siteId: undefined,
            by: breakdownType
          };

          const breakdownResult = await analyticsService.getBreakdownData(breakdownPayload);

          const allCampaignBreakdownData = (breakdownResult.success && Array.isArray(breakdownResult.data))
            ? [breakdownResult.data]
            : [];

          // Aggregate data for this breakdown type (single batched result now,
          // but kept as an array so the merge loop stays identical)
          allCampaignBreakdownData.forEach(campaignData => {
            campaignData.forEach((item: any) => {
              // CRITICAL: coerce to a string for the map key.
              // Backend may return objects like { city, state } for location
              // — which would dedupe everything under "[object Object]".
              const rawKey = item[breakdownType] ?? item.name;
              const key = coerceName(rawKey, 'Unspecified');
              if (!breakdownByType[key]) {
                breakdownByType[key] = {
                  [breakdownType]: key,
                  name: key,
                  impressions: 0,
                  clicks: 0,
                  conversions: 0,
                  value: 0
                };
              }

              breakdownByType[key].impressions += item.impressions || 0;
              breakdownByType[key].clicks += item.clicks || 0;
              breakdownByType[key].conversions += item.conversions || 0;
              breakdownByType[key].value = breakdownByType[key].impressions; // For chart display
            });
          });

          // Convert to array and calculate CTR and proper percentages
          const breakdownArray = Object.values(breakdownByType).map((item: any) => ({
            ...item,
            ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0
          }));

          // Calculate total impressions for percentage calculation
          const totalImpressions = breakdownArray.reduce((sum, item: any) => sum + (item.impressions || 0), 0);

          // Calculate proper percentages based on total impressions
          const breakdownWithPercentages = breakdownArray.map((item: any) => ({
            ...item,
            percentage: totalImpressions > 0 ? (item.impressions / totalImpressions) * 100 : 0
          }));

          return {
            type: breakdownType,
            data: breakdownWithPercentages
          };
        } catch (error) {
          console.error(`Error fetching ${breakdownType} breakdown:`, error);
          return { type: breakdownType, data: [] };
        }
      });

      // Execute all breakdown calls in parallel (all types, one batched call each)
      const allBreakdownResults = await Promise.all(allBreakdownPromises);
      console.log('📊 All breakdown results (batched):', allBreakdownResults);

      // Set breakdown data by type
      const aggregatedBreakdownData: any = {};
      allBreakdownResults.forEach(result => {
        aggregatedBreakdownData[result.type] = result.data;
      });

      // Set individual breakdown data for charts
      setGenderBreakdown(aggregatedBreakdownData.gender || []);

      // Map platform names for display
      const mappedPlatformData = (aggregatedBreakdownData.platform || []).map((item: any) => ({
        ...item,
        name: getPlatformName(item.name)
      }));
      setPlatformBreakdown(mappedPlatformData);

      setAgeBreakdown(aggregatedBreakdownData.age || []);
      setLocationBreakdown(aggregatedBreakdownData.location || []);

      console.log('✅ Set aggregated breakdown data (parallel processing):', {
        gender: aggregatedBreakdownData.gender?.length || 0,
        platform: mappedPlatformData.length,
        age: aggregatedBreakdownData.age?.length || 0,
        location: aggregatedBreakdownData.location?.length || 0
      });

      // Calculate quick stats using REAL aggregated data
      const activeCampaignsCount = activeCampaigns.length;
      const bestCTR = aggregatedMetrics.ctr || 0;

      // Calculate top platform from ACTUAL breakdown data
      const topPlatform = mappedPlatformData.length > 0 ?
        mappedPlatformData.sort((a: any, b: any) => (b.impressions || 0) - (a.impressions || 0))[0]?.name || 'Unknown' :
        'Unknown';

      const conversionRate = (aggregatedMetrics.clicks && aggregatedMetrics.clicks > 0) ?
        ((aggregatedMetrics.conversions || 0) / aggregatedMetrics.clicks) * 100 : 0;

      console.log('📊 Top platform calculated from aggregated breakdown:', topPlatform, 'from data:', mappedPlatformData);

      setQuickStats({
        activeCampaigns: activeCampaignsCount,
        bestCTR,
        topPlatform,
        conversionRate
      });
      console.log('✅ Set quick stats using aggregated data:', { activeCampaigns: activeCampaignsCount, bestCTR, topPlatform, conversionRate });

      // Also fetch comparison data (previous 7 days) in ONE batched call.
      // Note: comparisonPayload (computed above with the correct previous-7-day
      // from/to) is used here. The old code spread last7DaysPayload and added
      // startDate/endDate keys the API ignores, so the comparison silently
      // fetched the SAME period as the current one (growth always ~0%).
      try {
        console.log('📊 Fetching comparison data for ALL campaigns in 1 batched call...');

        const comparisonMetricsRes = await analyticsService.getMetrics({
          ...comparisonPayload,
          campaignId: campaignIds,
          slotId: undefined,
          siteId: undefined
        });

        const aggregatedComparison = comparisonMetricsRes.success && comparisonMetricsRes.data
          ? comparisonMetricsRes.data
          : getDefaultMetrics();

        // Recalculate derived metrics (parity with the aggregation path above)
        aggregatedComparison.ctr = aggregatedComparison.impressions > 0 ?
          (aggregatedComparison.clicks / aggregatedComparison.impressions) * 100 : 0;

        setComparisonMetricsData(aggregatedComparison);
        console.log('✅ Set comparison metrics (batched):', aggregatedComparison);
      } catch (error) {
        console.error('Error fetching comparison data:', error);
        setComparisonMetricsData(null);
      }

      // Save all data to localStorage for 24-hour caching
      const dataToCache = {
        metricsData: aggregatedMetrics,
        comparisonMetricsData: comparisonMetricsData,
        trendData: aggregatedTrendData.length > 0 ? [{
          name: 'Overall Performance',
          data: aggregatedTrendData
        }] : [],
        genderBreakdown: aggregatedBreakdownData.gender || [],
        platformBreakdown: mappedPlatformData,
        ageBreakdown: aggregatedBreakdownData.age || [],
        locationBreakdown: aggregatedBreakdownData.location || [],
        quickStats: {
          activeCampaigns: activeCampaignsCount,
          bestCTR,
          topPlatform,
          conversionRate
        }
      };
      saveDashboardCache(dataToCache);
      setDataLoaded(true);

      toast.success(`Last 7 days combined data loaded from ${allCampaignIds.length} campaigns!`);

    } catch (error) {
      console.error('❌ Error fetching 7-day dashboard data:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to load 7-day dashboard data');
      setFetchError(message);
      // Clear all data on error
      setMetricsData(getDefaultMetrics());
      setComparisonMetricsData(null);
      setTrendData([]);
      setGenderBreakdown([]);
      setPlatformBreakdown([]);
      setAgeBreakdown([]);
      setLocationBreakdown([]);
      setQuickStats({
        activeCampaigns: 0,
        bestCTR: 0,
        topPlatform: 'Unknown',
        conversionRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't auto-load data on mount - wait for user to click fetch button
  // useEffect(() => {
  //   fetchDashboardData();
  // }, []);

  const handleFetchAnalytics = async () => {
    setLoading(true);
    await fetchDashboardData();
  };

  const handleClearCache = () => {
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    setDataLoaded(false);
    setMetricsData(getDefaultMetrics());
    setComparisonMetricsData(null);
    setTrendData([]);
    setGenderBreakdown([]);
    setPlatformBreakdown([]);
    setAgeBreakdown([]);
    setLocationBreakdown([]);
    setQuickStats({
      activeCampaigns: 0,
      bestCTR: 0,
      topPlatform: 'Unknown',
      conversionRate: 0
    });
    toast.success('Dashboard cache cleared');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  const handleExport = () => {
    try {
      console.log('Exporting last 7 days dashboard data...');

      // Prepare breakdown data in the format expected by the export function
      const consolidatedBreakdownData = {
        gender: genderBreakdown,
        platform: platformBreakdown,
        age: ageBreakdown,
        location: locationBreakdown
      };

      // Format the current dashboard data for CSV export
      const csvData = formatDashboardForCSV(
        metricsData,
        consolidatedBreakdownData,
        trendData
      );

      if (csvData.length === 0) {
        toast.error('No data available to export');
        return;
      }

      // Export to CSV with clean headers
      exportToCSV({
        filename: 'dashboard_last_7_days',
        data: csvData,
        headers: {
          sheet_section: 'Data Section',
          time_period: 'Time Period',
          metric_name: 'Metric',
          value: 'Value',
          description: 'Description',
          export_date: 'Export Date',
          demographic: 'Demographic',
          platform: 'Platform',
          impressions: 'Impressions',
          percentage: 'Percentage',
          date: 'Date',
          clicks: 'Clicks',
          conversions: 'Conversions',
          ctr_percent: 'CTR %',
          conversion_rate_percent: 'Conversion Rate %',
          note: 'Note'
        }
      });

      toast.success('Dashboard data exported successfully!');
    } catch (error) {
      console.error('Error exporting dashboard data:', error);
      toast.error('Failed to export data. Please try again.');
    }
  };

  // Calculate REAL growth percentages from comparison data
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const hasComparisonData = comparisonMetricsData !== null;
  const ctrGrowth = hasComparisonData ?
    calculateGrowth(metricsData.ctr, comparisonMetricsData.ctr) : null;
  const clicksGrowth = hasComparisonData ?
    calculateGrowth(metricsData.clicks, comparisonMetricsData.clicks) : null;

  console.log('📊 Growth calculations:', {
    hasComparisonData,
    currentCTR: metricsData.ctr,
    previousCTR: comparisonMetricsData?.ctr,
    ctrGrowth,
    currentClicks: metricsData.clicks,
    previousClicks: comparisonMetricsData?.clicks,
    clicksGrowth
  });

  const headerActions = dataLoaded ? (
    <>
      <Button variant="ghost" size="sm" onClick={handleClearCache}>
        <Zap className="h-3.5 w-3.5" />
        Clear cache
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>
      <Button variant="secondary" size="sm" onClick={() => navigate('/analytics')}>
        Deep analytics
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" onClick={handleRefresh} disabled={isRefreshing}>
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </>
  ) : null;

  return (
    <div className="halo-page">
      <PageHeader
        eyebrow="Dashboard"
        title="Performance overview"
        subhead="Combined performance across every live campaign over the last 7 days, cached locally for a day."
        actions={headerActions}
      />

      <div className="mt-7 space-y-5">
        {fetchError && (
          <div className="halo-card p-5 flex items-start gap-3" role="alert">
            <div className="halo-chip flex-none" style={{ background: 'var(--h-neg-soft)', color: 'var(--h-coral)' }}>
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="halo-heading">Couldn't load dashboard data</p>
              <p className="halo-subtitle mt-0.5">{fetchError} — check your connection and try refreshing.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : !dataLoaded ? (
          <div className="halo-card halo-card-raised mx-auto max-w-md py-12 px-8 text-center">
            <div className="halo-chip-lg mx-auto">
              <BarChart3 className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h2 className="halo-heading mt-4">Ready to fetch</h2>
            <p className="halo-subtitle mt-1.5">
              Combined metrics from all campaigns, cached for 24 hours once loaded.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={handleFetchAnalytics} disabled={loading} size="lg">
                <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
                Fetch analytics
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {hasComparisonData && ctrGrowth !== null && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3 items-stretch">
                <div className="halo-card halo-rail halo-rail-iris halo-tile-iris halo-rise p-5 flex items-center gap-3" style={{ '--i': 0 } as CSSProperties}>
                  <div className="halo-badge-glass halo-chip-iris flex-none">
                    <Activity className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--h-ink-2)]">7-day period</p>
                    <p className="mt-0.5 truncate font-semibold text-[var(--h-ink)]">Week-over-week</p>
                  </div>
                </div>
                <div
                  className={`halo-card halo-rail ${ctrGrowth >= 0 ? 'halo-rail-mint halo-tile-mint' : 'halo-rail-coral halo-tile-coral'} halo-rise p-5 flex items-center justify-between`}
                  style={{ '--i': 1 } as CSSProperties}
                >
                  <div>
                    <p className={`num text-xl font-semibold leading-none ${ctrGrowth >= 0 ? 'halo-delta-up' : 'halo-delta-down'}`}>
                      {ctrGrowth > 0 ? '+' : ''}{ctrGrowth.toFixed(1)}%
                    </p>
                    <p className="mt-1.5 text-[13px] font-medium text-[var(--h-ink-2)]">CTR growth</p>
                  </div>
                  <div className={`halo-badge-glass ${ctrGrowth >= 0 ? 'halo-chip-mint' : 'halo-chip-coral'} flex-none`}>
                    <Percent className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>
                </div>
                <div className="halo-card halo-rail halo-rail-violet halo-tile-violet halo-rise p-5 flex items-center justify-between" style={{ '--i': 2 } as CSSProperties}>
                  <div>
                    <p className="num text-xl font-semibold leading-none text-[var(--h-ink)]">
                      {metricsData.ctr.toFixed(2)}<span className="text-sm text-[var(--h-ink-3)]">%</span>
                    </p>
                    <p className="mt-1.5 text-[13px] font-medium text-[var(--h-ink-2)]">Overall CTR</p>
                  </div>
                  <div className="halo-badge-glass halo-chip-violet flex-none">
                    <Gauge className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>
                </div>
              </div>
            )}

            <section>
              <MetricsDashboard
                data={metricsData}
                comparisonData={comparisonMetricsData || undefined}
                period="7d"
                trend={trendData[0]?.data.map((d) => d.impressions) ?? []}
              />
            </section>

            <div className="halo-card p-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex items-center gap-3">
                <div className="halo-badge-glass halo-chip-iris flex-none">
                  <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} />
                </div>
                <div>
                  <p className="halo-heading">Ad slot management</p>
                  <p className="halo-subtitle">Slots across platforms</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/slot-management')}>
                Manage slots
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-stretch">
              <div className="halo-card p-5 flex flex-col min-h-[360px] xl:col-span-8">
                <div className="flex-1 min-h-[300px]">
                  <TrendChart series={trendData} title="7-day performance" showGrid animated={false} height={300} />
                </div>
              </div>
              <div className="halo-card p-5 flex flex-col min-h-[360px] xl:col-span-4">
                <h3 className="halo-heading mb-3">Quick insights</h3>
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Active campaigns', value: quickStats.activeCampaigns, tone: 'pos' },
                    { label: 'Overall CTR', value: `${metricsData.ctr.toFixed(2)}%`, tone: 'iris' },
                    { label: 'Top platform', value: quickStats.topPlatform, tone: 'ink' },
                    { label: 'Conversion rate', value: `${quickStats.conversionRate.toFixed(1)}%`, tone: 'violet' },
                  ].map((row) => (
                    <div key={row.label} className="halo-inset flex items-center justify-between px-3 py-2.5">
                      <span className="halo-label">{row.label}</span>
                      <span
                        className="num text-sm font-semibold"
                        style={{
                          color:
                            row.tone === 'pos' ? 'var(--h-mint)' :
                            row.tone === 'iris' ? 'var(--h-iris-500)' :
                            row.tone === 'violet' ? 'var(--h-violet)' :
                            'var(--h-ink)',
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 xl:grid-cols-4 items-stretch">
              {[
                { data: genderBreakdown, title: 'Gender' },
                { data: platformBreakdown, title: 'Platform' },
                { data: ageBreakdown, title: 'Age' },
                { data: locationBreakdown, title: 'Location' },
              ].map(({ data, title }, idx) => (
                <BreakdownCard
                  key={title}
                  index={idx}
                  onClick={() => setBreakdownModal({ open: true, title: `${title} · 7 days`, data })}
                >
                  <BreakdownPieChart data={data} title={`${title} · 7 days`} showAnimation={false} />
                </BreakdownCard>
              ))}
            </div>
          </div>
        )}
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

function BreakdownCard({
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
    <CometCard className="h-[400px]">
      <button
        type="button"
        onClick={onClick}
        {...spotlight}
        style={{ '--i': Math.min(index, 10) } as CSSProperties}
        className="halo-card halo-card-interactive halo-spotlight halo-rise w-full h-full text-left flex flex-col overflow-hidden"
      >
        <div className="relative flex-1 min-h-0 p-5">{children}</div>
      </button>
    </CometCard>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="halo-card p-5 h-[104px] flex flex-col justify-between">
            <div className="halo-skeleton h-3 w-16" />
            <div className="halo-skeleton h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="halo-card p-5 min-h-[360px] xl:col-span-8">
          <div className="halo-skeleton h-3 w-32 mb-4" />
          <div className="halo-skeleton h-[300px] w-full" />
        </div>
        <div className="halo-card p-5 min-h-[360px] xl:col-span-4 space-y-2">
          <div className="halo-skeleton h-3 w-28 mb-2" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="halo-skeleton h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="halo-card p-5 h-[400px]">
            <div className="halo-skeleton h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
