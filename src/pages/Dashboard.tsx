import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { TrendChart } from '@/components/analytics/TrendChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { BreakdownModal } from '@/components/analytics/BreakdownModal';
import { RefreshCw, Download, TrendingUp, Zap, Activity, BarChart3, ArrowUpRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VelvetLoader } from '@/components/ui/velvet-loader';
import { CometCard } from '@/components/ui/comet-card';
import { analyticsService, MetricsPayload } from '@/services/analyticsService';
import { MetricsData, BreakdownData, TrendChartSeries, Campaign } from '@/types';
import { toast } from 'sonner';
import { coerceName, formatSmartPercent } from '@/lib/format';

// Utils
import { exportToCSV, formatDashboardForCSV } from '@/utils/csvExport';

// Constants for localStorage
const DASHBOARD_CACHE_KEY = 'dashboard_analytics_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const card = 'velvet-surface velvet-micro-shadow p-5';

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
      toast.success('Loaded dashboard data from cache');
    }
  }, []);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
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

      // Fetch data for each campaign individually BUT IN PARALLEL (much faster)
      console.log('📊 Fetching metrics for each campaign individually IN PARALLEL...');
      
      // Create all campaign promises for metrics and trend data
      const campaignPromises = allCampaignIds.map(async (campaignId) => {
        const payload: MetricsPayload = {
          ...last7DaysPayload,
          campaignId: [campaignId], // Single campaign ID in array
          slotId: undefined,
          siteId: undefined
        };

        console.log(`📊 Campaign ${campaignId} payload:`, payload);

        try {
          const [metricsRes, trendRes] = await Promise.all([
            analyticsService.getMetrics(payload),
            analyticsService.getTrendData(payload)
          ]);

          const campaign = allCampaigns.find(c => c.campaignId === campaignId);
          return {
            campaignId,
            campaignName: campaign?.brandName || `Campaign ${campaignId}`,
            metrics: metricsRes.success ? metricsRes.data : getDefaultMetrics(),
            trendData: trendRes.success ? trendRes.data : []
          };
        } catch (error) {
          console.error(`Error fetching data for campaign ${campaignId}:`, error);
          return {
            campaignId,
            campaignName: `Campaign ${campaignId}`,
            metrics: getDefaultMetrics(),
            trendData: []
          };
        }
      });

      // Execute all campaign calls in parallel
      const campaignResults = await Promise.all(campaignPromises);
      console.log('📊 Campaign results received (parallel):', campaignResults);

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

      // Fetch breakdown data for each campaign individually BUT IN PARALLEL
      console.log('📊 Fetching breakdown data for each campaign individually IN PARALLEL...');
      const breakdownTypes = ['gender', 'platform', 'age', 'location'];
      
      // Create all breakdown promises for all campaigns and types in parallel
      const allBreakdownPromises = breakdownTypes.map(async (breakdownType) => {
        const breakdownByType: { [key: string]: any } = {};

        // Create promises for this breakdown type across all campaigns
        const campaignBreakdownPromises = allCampaignIds.map(async (campaignId) => {
          try {
            const breakdownPayload = {
              ...last7DaysPayload,
              campaignId: [campaignId],
              slotId: undefined,
              siteId: undefined,
              by: breakdownType
            };

            const breakdownResult = await analyticsService.getBreakdownData(breakdownPayload);
            
            if (breakdownResult.success && Array.isArray(breakdownResult.data)) {
              return breakdownResult.data;
            }
            return [];
          } catch (error) {
            console.error(`Error fetching ${breakdownType} breakdown for campaign ${campaignId}:`, error);
            return [];
          }
        });

        // Wait for all campaigns for this breakdown type
        const allCampaignBreakdownData = await Promise.all(campaignBreakdownPromises);
        
        // Aggregate data for this breakdown type
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
      });

      // Execute all breakdown calls in parallel (all types, all campaigns)
      const allBreakdownResults = await Promise.all(allBreakdownPromises);
      console.log('📊 All breakdown results (parallel):', allBreakdownResults);

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

      // Also fetch comparison data if possible (individual campaigns in parallel)
      try {
        const previous7DaysPayload = {
          ...last7DaysPayload,
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        console.log('📊 Fetching comparison data for each campaign in parallel...');
        
        // Create comparison promises for all campaigns
        const comparisonPromises = allCampaignIds.map(async (campaignId) => {
          const payload = {
            ...previous7DaysPayload,
            campaignId: [campaignId],
            slotId: undefined,
            siteId: undefined
          };

          try {
            const metricsRes = await analyticsService.getMetrics(payload);
            return metricsRes.success ? metricsRes.data : getDefaultMetrics();
          } catch (error) {
            console.error(`Error fetching comparison for campaign ${campaignId}:`, error);
            return getDefaultMetrics();
          }
        });

        // Execute all comparison calls in parallel
        const comparisonResults = await Promise.all(comparisonPromises);

        // Aggregate comparison metrics
        let aggregatedComparison = getDefaultMetrics();
        comparisonResults.forEach(metrics => {
          if (metrics) {
            aggregatedComparison.impressions += metrics.impressions || 0;
            aggregatedComparison.clicks += metrics.clicks || 0;
            aggregatedComparison.conversions += metrics.conversions || 0;
            aggregatedComparison.landingCount += metrics.landingCount || 0;
          }
        });

        aggregatedComparison.ctr = aggregatedComparison.impressions > 0 ? 
          (aggregatedComparison.clicks / aggregatedComparison.impressions) * 100 : 0;

        setComparisonMetricsData(aggregatedComparison);
        console.log('✅ Set aggregated comparison metrics (parallel):', aggregatedComparison);
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
      toast.error('Failed to load 7-day dashboard data');
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
    toast.success('Last 7 days analytics loaded successfully');
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
    // Clear cache before fetching fresh data
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    await fetchDashboardData();
    setIsRefreshing(false);
    toast.success('Last 7 days dashboard refreshed with fresh data');
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <VelvetLoader size={36} label="Loading dashboard" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="page-eyebrow">Dashboard</p>
          <h1 className="page-display">
            <span className="velvet-header-gradient">Performance</span> <span className="page-display-serif gradient-text">overview</span>
          </h1>
        </div>
        {dataLoaded && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-velvet-ghost h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={handleClearCache} className="btn-velvet-ghost h-9">
              <Zap className="h-3.5 w-3.5" />
              Clear cache
            </button>
            <button onClick={handleExport} className="btn-velvet-ghost h-9">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button onClick={() => navigate('/analytics')} className="btn-velvet h-9">
              Deep analytics
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {!dataLoaded && !loading ? (
        <CometCard className="mx-auto max-w-md">
          <div className="velvet-surface velvet-micro-shadow p-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--bg-tint)] border border-[var(--line-violet)] mb-4">
              <BarChart3 className="h-6 w-6 text-[var(--indigo-500)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-1)]">Ready to fetch</h2>
            <p className="mt-1.5 text-[12.5px] text-[var(--text-3)]">
              Combined metrics from all campaigns · cached 24h
            </p>
            <div className="mt-6 flex justify-center">
              <button onClick={handleFetchAnalytics} disabled={loading} className="btn-velvet h-10 px-5">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Fetching…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Fetch analytics
                  </span>
                )}
              </button>
            </div>
          </div>
        </CometCard>
      ) : (
        <div className="space-y-5">
          {hasComparisonData && ctrGrowth !== null && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="velvet-surface velvet-micro-shadow p-4 flex items-center gap-3 min-h-[88px]">
                <div className="metric-icon-tone metric-icon-tone--accent relative">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10.5px] text-[var(--text-3)] uppercase tracking-wider font-semibold">7-day period</p>
                  <p className="text-[13px] font-semibold text-[var(--text-1)] truncate">Week-over-week</p>
                </div>
              </div>
              <div className="velvet-surface velvet-micro-shadow p-4 flex items-center justify-between min-h-[88px]">
                <div>
                  <p className={`text-[20px] font-semibold tabular-nums leading-none ${ctrGrowth >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>
                    {ctrGrowth > 0 ? '+' : ''}{ctrGrowth.toFixed(1)}%
                  </p>
                  <p className="text-[10.5px] text-[var(--text-3)] uppercase tracking-wider font-semibold mt-1.5">CTR growth</p>
                </div>
                <Sparkles className="h-4 w-4 text-[var(--gold-500)] opacity-70 flex-shrink-0" />
              </div>
              <div className="velvet-surface velvet-micro-shadow p-4 flex items-center justify-between min-h-[88px]">
                <div>
                  <p className="text-[20px] font-semibold tabular-nums leading-none text-[var(--text-1)]">
                    {metricsData.ctr.toFixed(2)}<span className="text-[var(--text-3)] text-[14px]">%</span>
                  </p>
                  <p className="text-[10.5px] text-[var(--text-3)] uppercase tracking-wider font-semibold mt-1.5">Overall CTR</p>
                </div>
                <TrendingUp className="h-4 w-4 text-[var(--indigo-500)] opacity-80 flex-shrink-0" />
              </div>
            </div>
          )}

          <section className="space-y-3">
            <div className="velvet-section-title">Key metrics</div>
            <MetricsDashboard data={metricsData} comparisonData={comparisonMetricsData || undefined} period="7d" />
          </section>

          <div className="velvet-surface velvet-micro-shadow p-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--text-1)]">Ad slot management</p>
              <p className="text-[11.5px] text-[var(--text-3)]">Slots across platforms</p>
            </div>
            <button onClick={() => navigate('/slot-management')} className="btn-velvet-ghost h-8 text-[12px] flex-shrink-0">
              Manage slots
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="velvet-surface velvet-micro-shadow xl:col-span-2 p-4 flex flex-col min-h-[360px]">
              <div className="velvet-section-title mb-3">Performance trends</div>
              <div className="flex-1 min-h-[300px]">
                <TrendChart series={trendData} title="7-day performance" showGrid animated={false} height={300} />
              </div>
            </div>
            <div className="velvet-surface velvet-micro-shadow p-4 flex flex-col min-h-[360px]">
              <div className="velvet-section-title mb-3">Quick insights</div>
              <div className="flex-1 space-y-1.5">
                {[
                  { label: 'Active campaigns', value: quickStats.activeCampaigns },
                  { label: 'Overall CTR', value: `${metricsData.ctr.toFixed(2)}%` },
                  { label: 'Top platform', value: quickStats.topPlatform },
                  { label: 'Conversion rate', value: `${quickStats.conversionRate.toFixed(1)}%` },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--bg-panel-2)] px-3 py-2.5"
                  >
                    <span className="text-[11.5px] text-[var(--text-2)]">{row.label}</span>
                    <span className="text-[12.5px] font-semibold tabular-nums text-[var(--text-1)]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { data: genderBreakdown, title: 'Gender' },
              { data: platformBreakdown, title: 'Platform' },
              { data: ageBreakdown, title: 'Age' },
              { data: locationBreakdown, title: 'Location' },
            ].map(({ data, title }) => (
              <CometCard key={title} className="h-[400px]">
                <button
                  type="button"
                  onClick={() => setBreakdownModal({ open: true, title: `${title} · 7 days`, data })}
                  className="relative velvet-surface velvet-micro-shadow group cursor-pointer w-full h-full text-left transition-all duration-300 hover:shadow-[var(--shadow-velvet)] hover:-translate-y-0.5 overflow-hidden flex flex-col"
                >
                  <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[var(--violet-500)]/0 via-[var(--violet-500)]/0 to-[var(--plum-500)]/5" />
                  <div className="relative flex-1 min-h-0 p-3">
                    <BreakdownPieChart data={data} title={`${title} · 7 days`} />
                  </div>
                </button>
              </CometCard>
            ))}
          </div>
        </div>
      )}

      <BreakdownModal
        open={breakdownModal.open}
        onOpenChange={(open: boolean) => setBreakdownModal((prev) => ({ ...prev, open }))}
        title={breakdownModal.title}
        data={breakdownModal.data}
      />
    </div>
  );
}