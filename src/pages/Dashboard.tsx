import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { TrendChart } from '@/components/analytics/TrendChart';
import { BreakdownPieChart } from '@/components/analytics/BreakdownPieChart';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, TrendingUp, Users, Target, Zap, Sparkles, Rocket, Award, Crown, Star, Activity, BarChart3, PieChart, Eye, MousePointer, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { analyticsService, MetricsPayload } from '@/services/analyticsService';
import { MetricsData, BreakdownData, TrendChartSeries, Campaign } from '@/types';
import { toast } from 'sonner';

// Helper function to get default metrics
const getDefaultMetrics = (): MetricsData => ({
  impressions: 0,
  clicks: 0,
  ctr: 0,
  conversions: 0,
  revenue: 0,
  roi: 0
});

// Helper function to map platform numbers to names
const getPlatformName = (platformId: number | string): string => {
  const id = Number(platformId);
  switch (id) {
    case 0:
      return 'Web Extension';
    case 1:
      return 'Mobile';
    default:
      return 'Unknown';
  }
};

export function Dashboard() {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
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
    topPlatform: 'Web Extension',
    conversionRate: 0
  });

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('📊 Fetching LAST 7 DAYS data using /metrics endpoint');
      
      // Create last 7 days date range
      const last7DaysPayload: MetricsPayload = {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
        interval: '1d' // Daily intervals for better line chart
      };
      
      console.log('📊 Date range:', last7DaysPayload);
      
      // Create comparison period (previous 7 days)
      const comparisonPayload: MetricsPayload = {
        from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days ago
        to: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],    // 7 days ago
        interval: '1d'
      };

      console.log('📊 Comparison date range:', comparisonPayload);

      // Fetch data using the same approach as Analytics.tsx
      const [
        metricsResult,
        comparisonResult,
        trendResult,
        campaignsResult,
        genderResult,
        platformResult,
        ageResult,
        locationResult
      ] = await Promise.all([
        analyticsService.getMetrics(last7DaysPayload),
        analyticsService.getMetrics(comparisonPayload), // Get previous 7 days for comparison
        analyticsService.getTrendData(last7DaysPayload),
        analyticsService.getCampaigns(),
        analyticsService.getBreakdownData({ 
          ...last7DaysPayload,
          by: 'gender' 
        }),
        analyticsService.getBreakdownData({ 
          ...last7DaysPayload,
          by: 'platform' 
        }),
        analyticsService.getBreakdownData({ 
          ...last7DaysPayload,
          by: 'age' 
        }),
        analyticsService.getBreakdownData({ 
          ...last7DaysPayload,
          by: 'location' 
        })
      ]);

      console.log('📊 Metrics result:', metricsResult);
      console.log('📊 Trend result:', trendResult);

      // Process main metrics data from /metrics endpoint
      if (metricsResult.success && metricsResult.data) {
        setMetricsData(metricsResult.data);
        console.log('✅ Set 7-day metrics from /metrics:', metricsResult.data);
      }

      // Process comparison data from previous 7 days
      if (comparisonResult.success && comparisonResult.data) {
        setComparisonMetricsData(comparisonResult.data);
        console.log('✅ Set comparison metrics from previous 7 days:', comparisonResult.data);
      } else {
        setComparisonMetricsData(null);
        console.log('⚠️ No comparison data available - banner will be hidden');
      }

      // Process trend data for proper line chart
      if (trendResult.success && trendResult.data && Array.isArray(trendResult.data) && trendResult.data.length > 0) {
        setTrendData([{
          name: 'Overall Performance',
          data: trendResult.data
        }]);
        console.log('✅ Set trend data from /trend API:', trendResult.data);
        console.log('📈 Trend data has', trendResult.data.length, 'data points for 7-day chart');
      } else {
        console.warn('⚠️ Trend API failed or returned empty data. Result:', trendResult);
        console.log('🔄 Using fallback: creating single point from current metrics');
        
        // Fallback: create a single point if trend API doesn't work
        if (metricsResult.success && metricsResult.data) {
          const currentDate = new Date().toISOString().split('T')[0];
          const trendPoint = {
            date: currentDate,
            impressions: metricsResult.data.impressions,
            clicks: metricsResult.data.clicks,
            conversions: metricsResult.data.conversions,
            ctr: metricsResult.data.ctr,
            conversionRate: metricsResult.data.clicks > 0 ? (metricsResult.data.conversions / metricsResult.data.clicks) * 100 : 0,
            revenue: metricsResult.data.revenue
          };

          setTrendData([{
            name: 'Overall Performance',
            data: [trendPoint]
          }]);
          console.log('⚠️ Set fallback trend data (single point):', trendPoint);
        }
      }

      // Process campaigns data
      let activeCampaigns: Campaign[] = [];
      if (campaignsResult.success && campaignsResult.data) {
        setCampaigns(campaignsResult.data);
        activeCampaigns = campaignsResult.data.filter((c: Campaign) => c.status === 1);
      }

      // Process breakdown data with proper platform mapping
      if (genderResult.success && Array.isArray(genderResult.data)) {
        setGenderBreakdown(genderResult.data);
        console.log('✅ Set gender breakdown:', genderResult.data);
      }

      let mappedPlatformData: BreakdownData[] = [];
      if (platformResult.success && Array.isArray(platformResult.data)) {
        mappedPlatformData = platformResult.data.map(item => ({
          ...item,
          name: getPlatformName(item.name)
        }));
        setPlatformBreakdown(mappedPlatformData);
        console.log('✅ Set platform breakdown:', mappedPlatformData);
      }

      // Process age breakdown
      if (ageResult.success && Array.isArray(ageResult.data)) {
        setAgeBreakdown(ageResult.data);
        console.log('✅ Set age breakdown:', ageResult.data);
      }

      // Process location breakdown
      if (locationResult.success && Array.isArray(locationResult.data)) {
        setLocationBreakdown(locationResult.data);
        console.log('✅ Set location breakdown:', locationResult.data);
      }

      // Calculate quick stats using REAL API data
      const activeCampaignsCount = activeCampaigns.length;
      const bestCTR = metricsResult.data?.ctr || 0;
      
      // Calculate top platform from ACTUAL breakdown data
      const topPlatform = mappedPlatformData.length > 0 ? 
        mappedPlatformData.sort((a, b) => b.value - a.value)[0].name : 
        'Unknown';
      
      const conversionRate = (metricsResult.data?.clicks && metricsResult.data.clicks > 0) ? 
        ((metricsResult.data.conversions || 0) / metricsResult.data.clicks) * 100 : 0;
      
      console.log('📊 Top platform calculated from breakdown:', topPlatform, 'from data:', mappedPlatformData);
      
      setQuickStats({
        activeCampaigns: activeCampaignsCount,
        bestCTR,
        topPlatform,
        conversionRate
      });
      console.log('✅ Set quick stats:', { activeCampaigns: activeCampaignsCount, bestCTR, topPlatform, conversionRate });

      const hasRealComparison = comparisonMetricsData !== null;
      toast.success(`✅ Last 7 days data loaded! ${hasRealComparison ? '📊 Growth data available' : '⚠️ No comparison data'}`);
      
      if (!hasRealComparison) {
        toast.info('ℹ️ Performance banner hidden - no previous period data available');
      }

    } catch (error) {
      console.error('❌ Error fetching 7-day dashboard data:', error);
      toast.error('Failed to load 7-day dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
    toast.success('Last 7 days dashboard refreshed! 🚀');
  };

  const handleExport = () => {
    toast.success('Exporting last 7 days dashboard data... 📊');
    console.log('Exporting last 7 days dashboard data...');
  };

  // Calculate REAL growth percentages from comparison data
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const hasComparisonData = comparisonMetricsData !== null;
  const revenueGrowth = hasComparisonData ? 
    calculateGrowth(metricsData.revenue, comparisonMetricsData.revenue) : null;
  const roiGrowth = hasComparisonData ? 
    calculateGrowth(metricsData.roi, comparisonMetricsData.roi) : null;
  
  console.log('📊 Growth calculations:', { 
    hasComparisonData, 
    currentRevenue: metricsData.revenue, 
    previousRevenue: comparisonMetricsData?.revenue,
    revenueGrowth,
    currentROI: metricsData.roi,
    previousROI: comparisonMetricsData?.roi,
    roiGrowth 
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
            
            {/* Action Buttons */}
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
                <span>📊 Deep Analytics</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-2">
        <div className="space-y-6 sm:space-y-8">
          {/* Performance Summary Banner - Only show if we have REAL comparison data */}
          {hasComparisonData && revenueGrowth !== null && (
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
                      {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold">💰 Revenue Growth</div>
                  </div>
                  <Sparkles className="h-8 w-8 text-green-500" />
                </motion.div>
                
                <motion.div 
                  className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
                  whileHover={{ scale: 1.05 }}
                >
                  <div>
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {metricsData.roi.toFixed(1)}%
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-semibold">👑 Total ROI</div>
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
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">📊 LAST 7 DAYS METRICS</h2>
              <Badge variant="secondary" className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold border-0 shadow-lg">
                📈 DAILY TRENDS
              </Badge>
            </div>
            <MetricsDashboard data={metricsData} comparisonData={comparisonMetricsData || undefined} />
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
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <BreakdownPieChart data={genderBreakdown} title="👥 Gender (7 Days)" height={250} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <BreakdownPieChart data={platformBreakdown} title="📱 Platform (7 Days)" height={250} />
            </motion.div>

          <motion.div
              initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <BreakdownPieChart data={ageBreakdown} title="👶 Age Groups (7 Days)" height={250} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <BreakdownPieChart data={locationBreakdown} title="🌍 Location (7 Days)" height={250} />
            </motion.div>
            </div>
        </div>
      </div>
    </div>
  );
}