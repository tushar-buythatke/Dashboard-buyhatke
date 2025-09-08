import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { TrendChart } from '@/components/analytics/TrendChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, TrendingUp, Users, Target, Zap, Sparkles, Rocket, Award, Crown, Star, Activity, BarChart3, PieChart, Eye, MousePointer, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { analyticsService, MetricsPayload } from '@/services/analyticsService';
import { MetricsData, BreakdownData, TrendChartSeries, Campaign } from '@/types';
import { toast } from 'sonner';

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
  ctr: 0
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
      toast.success('📊 Loaded dashboard data from cache!');
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
            const key = item[breakdownType] || item.name || 'Unknown';
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

      toast.success(`Last 7 days combined data loaded from ${allCampaignIds.length} campaigns!`);
      
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
    toast.success('Last 7 days analytics loaded successfully! 📊');
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
    toast.success('Dashboard cache cleared! 🧹');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Clear cache before fetching fresh data
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    await fetchDashboardData();
    setIsRefreshing(false);
    toast.success('Last 7 days dashboard refreshed with fresh data! 🚀');
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🚀 Loading Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Fetching real analytics data and comparison metrics...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center space-x-3 sm:space-x-4"
            >
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-100"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse delay-200"></div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base font-medium">
                  Real-time analytics for the last 7 days! 📈
                </p>
              </div>
            </motion.div>
            
            {/* Action Buttons - Only show when data is loaded */}
            {dataLoaded && (
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center justify-center space-x-2 h-11"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="font-semibold">{isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  className="flex items-center justify-center space-x-2 h-11"
                >
                  <Zap className="h-4 w-4" />
                  <span className="font-semibold">🧹 Clear Cache</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex items-center justify-center space-x-2 h-11"
                >
                  <Download className="h-4 w-4" />
                  <span className="font-semibold">📥 Export</span>
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/analytics')}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold h-11 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Deep Analytics</span>
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/slot-management')}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold h-11 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Settings className="h-4 w-4" />
                  <span>Manage Slots</span>
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Check if we have data loaded or if this is initial load */}
      {!dataLoaded && !loading ? (
        /* Initial State - Show Fetch Button */
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto px-4 py-8"
        >
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <div className="mb-6">
                <BarChart3 className="h-16 w-16 mx-auto text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Last 7 Days Analytics</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Click below to fetch combined analytics data from all your campaigns for the last 7 days
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Data will be cached for 24 hours to improve performance
                </p>
              </div>
              
              <Button
                onClick={handleFetchAnalytics}
                disabled={loading}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Fetching Analytics...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Fetch Last 7 Days Analytics
                  </>
                )}
              </Button>
              
              <p className="text-xs text-gray-500 mt-4">
                This will aggregate data from all your campaigns individually
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        /* Main Dashboard Content */
        <>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-2">
        <div className="space-y-6 sm:space-y-8">
          {/* Performance Summary Banner - Only show if we have REAL comparison data */}
          {hasComparisonData && ctrGrowth !== null && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                  className="flex items-center space-x-4"
                  whileHover={{ scale: 1.05 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300 
                  }}
                >
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Rocket className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      🔥 7-Day Power
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                      ⚡ Real comparison data
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800"
                  whileHover={{ scale: 1.05 }}
                >
                  <div>
                    <div className="text-2xl font-black text-green-600 dark:text-green-400">
                      {ctrGrowth > 0 ? '+' : ''}{ctrGrowth.toFixed(1)}%
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold">🎯 CTR Growth</div>
                  </div>
                  <Sparkles className="h-8 w-8 text-green-500" />
                </motion.div>
                
                <motion.div 
                  className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
                  whileHover={{ scale: 1.05 }}
                >
                  <div>
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {metricsData.ctr.toFixed(2)}%
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-semibold">👑 Overall CTR</div>
                  </div>
                  <Crown className="h-8 w-8 text-purple-500" />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Metrics Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full shadow-lg" />
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">LAST 7 DAYS METRICS</h2>
              <Badge variant="secondary" className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold border-0 shadow-lg">
                📈 DAILY TRENDS
              </Badge>
            </div>
            <MetricsDashboard data={metricsData} comparisonData={comparisonMetricsData || undefined} />
          </motion.div>

          {/* Slot Management Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-800 rounded-xl">
                  <Settings className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                    Ad Slot Management
                  </h3>
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm">
                    Create, update, and manage ad slots for different platforms
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/slot-management')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Slots
              </Button>
            </div>
          </motion.div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Performance Trends */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <TrendChart 
                series={trendData}
                title="📈 Last 7 Days Performance Trends"
                showGrid={true}
                animated={true}
              />
            </motion.div>
            
            {/* Quick Insights Panel */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Activity className="h-6 w-6 text-blue-500" />
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  ⚡ LIVE INSIGHTS
                </h3>
              </div>
              <div className="space-y-4">
                <motion.div 
                  className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800"
                  whileHover={{ scale: 1.05, x: 5 }}
                >
                  <span className="text-gray-900 dark:text-white font-semibold">🚀 Active Campaigns</span>
                  <span className="font-black text-green-600 dark:text-green-400 text-xl">
                    {quickStats.activeCampaigns}
                  </span>
                </motion.div>
                
                <motion.div 
                  className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                  whileHover={{ scale: 1.05, x: 5 }}
                >
                  <span className="text-gray-900 dark:text-white font-semibold">🎯 Overall CTR</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 text-xl">
                    {metricsData.ctr.toFixed(2)}%
                  </span>
                </motion.div>
                
                <motion.div 
                  className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
                  whileHover={{ scale: 1.05, x: 5 }}
                >
                  <span className="text-gray-900 dark:text-white font-semibold">📱 Top Platform</span>
                  <span className="font-black text-purple-600 dark:text-purple-400 text-xl">
                    {quickStats.topPlatform}
                  </span>
                </motion.div>
                
                <motion.div 
                  className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800"
                  whileHover={{ scale: 1.05, x: 5 }}
                >
                  <span className="text-gray-900 dark:text-white font-semibold">💫 Conversion Rate</span>
                  <span className="font-black text-orange-600 dark:text-orange-400 text-xl">
                    {quickStats.conversionRate.toFixed(1)}%
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 p-6 backdrop-blur-sm h-[400px]"
            >
              <BreakdownPieChart data={genderBreakdown} title="Gender (7 Days)" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 p-6 backdrop-blur-sm h-[400px]"
            >
              <BreakdownPieChart data={platformBreakdown} title="Platform (7 Days)" />
            </motion.div>

          <motion.div
              initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 p-6 backdrop-blur-sm h-[400px]"
            >
              <BreakdownPieChart data={ageBreakdown} title="Age Groups (7 Days)" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 p-6 backdrop-blur-sm h-[400px]"
            >
              <BreakdownPieChart data={locationBreakdown} title="Location (7 Days)" />
            </motion.div>
            </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}