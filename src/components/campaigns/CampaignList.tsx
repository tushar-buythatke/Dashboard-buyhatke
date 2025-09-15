import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Filter, Play, Pause, Edit, Copy, MoreHorizontal, RefreshCw, Download, Search, BarChart3, Calendar, Target, Zap, TrendingUp, Eye, MousePointer, DollarSign, Sparkles, Star, Activity, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Campaign, CampaignResponse } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsService } from '@/services/analyticsService';
import { campaignService } from '@/services/campaignService';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { exportToCsv } from '@/utils/csvExport';
import { getApiBaseUrl } from '@/config/api';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: '0', label: 'Draft' },
  { value: '1', label: 'Live' },
  { value: '2', label: 'Test' },
  { value: '3', label: 'Paused' },
  { value: '-1', label: 'Archived' },
];

const statusMap = {
  0: { label: 'Draft', variant: 'warning' as const },
  1: { label: 'Live', variant: 'success' as const },
  2: { label: 'Test', variant: 'info' as const },
  3: { label: 'Paused', variant: 'outline' as const },
  '-1': { label: 'Archived', variant: 'destructive' as const },
} as const;

export function CampaignList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [campaignMetrics, setCampaignMetrics] = useState<Record<number, { impressions: number; clicks: number }>>({});
  
  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    campaignId?: number;
    campaignName?: string;
  }>({ isOpen: false });
  
  const statusFilter = searchParams.get('status') || 'all';
  const brandNameFilter = searchParams.get('brandName') || '';

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, brandNameFilter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${getApiBaseUrl()}/campaigns`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      const result: CampaignResponse = await response.json();
      
      if (result.status === 1 && result.data?.campaignList) {
        setCampaigns(result.data.campaignList);

        const dateRange = analyticsService.getDateRange('30d');
        const metricsArr = await Promise.all(result.data.campaignList.map(async (c) => {
          const mRes = await analyticsService.getMetrics({ ...dateRange, campaignId: c.campaignId });
          return { id: c.campaignId, metrics: mRes.success && mRes.data ? mRes.data : null };
        }));
        const metricMap: Record<number, { impressions: number; clicks: number }> = {};
        metricsArr.forEach(({ id, metrics }) => {
          if (metrics) metricMap[id] = { impressions: metrics.impressions, clicks: metrics.clicks };
        });
        setCampaignMetrics(metricMap);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCampaigns();
    setIsRefreshing(false);
  };

  const handleExport = () => {
    if (filteredCampaigns.length === 0) {
      toast.error('No campaigns to export');
      return;
    }

    // Prepare CSV data
    const csvData = filteredCampaigns.map(campaign => ({
      'Campaign ID': campaign.campaignId,
      'Brand Name': campaign.brandName,
      'Status': campaign.status === 1 ? 'Live' : campaign.status === 0 ? 'Draft' : campaign.status === 2 ? 'Test' : 'Paused',
      'Impression Target': campaign.impressionTarget || 0,
      'Click Target': campaign.clickTarget || 0,
      'Total Budget': campaign.totalBudget || 'N/A',
      'Created By': campaign.createdBy || 'N/A',
      'Created Date': campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'N/A',
      'Last Updated': campaign.updatedAt ? new Date(campaign.updatedAt).toLocaleDateString() : 'N/A'
    }));

    const filename = `campaigns_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCsv(csvData, filename);
    toast.success(`Exported ${filteredCampaigns.length} campaigns to ${filename}`);
  };

  const handleCloneCampaign = async (campaignId: number) => {
    try {
      const response = await campaignService.cloneCampaign(campaignId, 1);
      
      if (response.success) {
        toast.success('Campaign cloned successfully');
        fetchCampaigns();
      } else {
        toast.error(response.message || 'Failed to clone campaign');
      }
    } catch (error) {
      console.error('Error cloning campaign:', error);
      toast.error('Failed to clone campaign');
    }
  };

  const handleArchiveCampaign = async (campaignId: number) => {
    const campaign = campaigns.find(c => c.campaignId === campaignId);
    setConfirmationModal({
      isOpen: true,
      campaignId,
      campaignName: campaign?.brandName || `Campaign ${campaignId}`
    });
  };

  const confirmArchiveCampaign = async () => {
    if (!confirmationModal.campaignId) return;
    
    try {
      const response = await campaignService.archiveCampaign(confirmationModal.campaignId, 1);
      
      if (response.success) {
        toast.success(`Campaign "${confirmationModal.campaignName}" and associated ads archived successfully`);
        fetchCampaigns(); // Refresh the list
      } else {
        toast.error(response.message || 'Failed to archive campaign');
      }
    } catch (error) {
      console.error('Error archiving campaign:', error);
      toast.error('Failed to archive campaign');
    }
  };

  const handleStatusChange = async (campaignId: number, newStatus: number) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/campaigns/update?userId=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update campaign status');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success(`Campaign ${statusMap[newStatus as keyof typeof statusMap]?.label?.toLowerCase()} successfully`);
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast.error('Failed to update campaign status');
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesStatus = statusFilter === 'all' || campaign.status.toString() === statusFilter;
    const matchesBrand = campaign.brandName.toLowerCase().includes(brandNameFilter.toLowerCase());
    return matchesStatus && matchesBrand;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate summary stats
  const activeCampaigns = campaigns.filter(c => c.status === 1).length;
  const totalBudget = campaigns.reduce((sum, c) => sum + parseFloat(c.totalBudget), 0);
  const totalImpressions = Object.values(campaignMetrics).reduce((s,m)=>s+m.impressions,0);



  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 transition-all duration-300 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-400/5 to-cyan-400/5 rounded-full blur-3xl" />
      </div>

      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/50 px-4 sm:px-6 py-6 sm:py-8 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col space-y-6 sm:space-y-0 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center space-x-4 sm:space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-75" />
                <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse delay-150" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Campaigns
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base font-medium">
                  Manage and monitor your advertising campaigns with style
                </p>
              </div>
            </div>
            
            {/* Enhanced Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="group relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-105 transition-all duration-300 h-11 px-4"
              >
                <RefreshCw className={`h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                <span className="ml-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="group relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-green-50 dark:hover:bg-green-900/20 hover:scale-105 transition-all duration-300 h-11 px-4"
              >
                <Download className="h-4 w-4 text-green-600 dark:text-green-400 group-hover:animate-bounce" />
                <span className="ml-2 text-sm font-semibold text-green-700 dark:text-green-300">Export</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/analytics')}
                className="group relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:scale-105 transition-all duration-300 h-11 px-4"
              >
                <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="ml-2 text-sm font-semibold text-purple-700 dark:text-purple-300">Analytics</span>
              </Button>
              
              <Button 
                onClick={() => navigate('/campaigns/new')} 
                className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-bold h-11 px-6 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 border-0"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                <span className="ml-2 text-sm relative z-10">Create Campaign</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="space-y-6 sm:space-y-8">
          {/* Enhanced Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            <div className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-emerald-400/10 to-teal-400/20"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <p className="text-green-700 dark:text-green-400 text-sm font-bold">Active Campaigns</p>
                  </div>
                  <p className="text-3xl font-black text-green-800 dark:text-green-300">{activeCampaigns}</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/30">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-indigo-400/10 to-purple-400/20"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <p className="text-blue-700 dark:text-blue-400 text-sm font-bold">Total Budget</p>
                  </div>
                  <p className="text-3xl font-black text-blue-800 dark:text-blue-300">₹{totalBudget.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/30">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-pink-400/10 to-rose-400/20"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    <p className="text-purple-700 dark:text-purple-400 text-sm font-bold">Live Impressions</p>
                  </div>
                  <p className="text-3xl font-black text-purple-800 dark:text-purple-300">{totalImpressions.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/30">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Filters Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 via-blue-50/30 to-purple-50/50 dark:from-gray-800/50 dark:via-blue-900/20 dark:to-purple-900/20"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-6">
                <Filter className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-purple-500/20 to-transparent"></div>
            </div>
            
              <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:gap-6">
              <div className="flex-1">
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => setSearchParams(prev => ({ ...Object.fromEntries(prev), status: value === 'all' ? '' : value }))}
                >
                    <SelectTrigger className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-600/50 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 h-12 rounded-xl font-semibold transition-all duration-300">
                      <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border-white/20 rounded-xl">
                    {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value} className="font-medium">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Search className="text-purple-500 h-4 w-4" />
                    </div>
                  <Input
                      placeholder="Search by brand name..."
                      className="pl-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-600/50 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 h-12 rounded-xl font-semibold transition-all duration-300"
                    value={brandNameFilter}
                    onChange={(e) => setSearchParams(prev => ({ ...Object.fromEntries(prev), brandName: e.target.value }))}
                  />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Campaigns List/Table */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-900/20 dark:via-purple-900/10 dark:to-pink-900/20"></div>
            
            {/* Table Header */}
            <div className="relative z-10 bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-600/50 p-4">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                  Campaign List
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20"></div>
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold px-3 py-1">
                  {filteredCampaigns.length} campaigns
                </Badge>
              </div>
            </div>

            <div className="relative z-10 overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex space-x-2">
                    <motion.div
                      className="w-4 h-4 bg-blue-500 rounded-full"
                      animate={{ y: [-10, 0, -10] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-4 h-4 bg-purple-500 rounded-full"
                      animate={{ y: [-10, 0, -10] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-4 h-4 bg-pink-500 rounded-full"
                      animate={{ y: [-10, 0, -10] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                  <span className="ml-4 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Loading campaigns...
                  </span>
                </div>
              ) : error ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="text-red-500 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm rounded-2xl p-8 inline-block border border-red-200/50">
                    <span className="font-bold text-lg">{error}</span>
                  </div>
                </motion.div>
              ) : filteredCampaigns.length === 0 ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 inline-block border border-gray-200/50">
                    <span className="font-bold text-lg">No campaigns found</span>
                  </div>
                </motion.div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50/60 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-700/60 border-b border-gray-200/30 dark:border-gray-600/30">
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 w-[220px]">
                        <div className="flex items-center space-x-3">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span>Brand</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 w-[140px]">
                        <div className="flex items-center space-x-3">
                          <Activity className="h-4 w-4 text-green-600" />
                          <span>Status</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 w-[130px]">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-purple-600" />
                          <span>Created</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-right w-[140px]">
                        <div className="flex items-center justify-end space-x-2">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span>Target Impr.</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-right w-[130px]">
                        <div className="flex items-center justify-end space-x-2">
                          <MousePointer className="h-4 w-4 text-purple-600" />
                          <span>Target Clicks</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-center w-[110px]">
                        <div className="flex items-center justify-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-indigo-600" />
                          <span>Target CTR</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-right w-[130px]">
                        <div className="flex items-center justify-end space-x-2">
                          <Activity className="h-4 w-4 text-green-600" />
                          <span>Live Impr.</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-right w-[120px]">
                        <div className="flex items-center justify-end space-x-2">
                          <Zap className="h-4 w-4 text-orange-600" />
                          <span>Live Clicks</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-center w-[110px]">
                        <div className="flex items-center justify-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-pink-600" />
                          <span>Live CTR</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-right w-[120px]">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="text-orange-600 font-bold">₹</span>
                          <span>Budget</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-center w-[100px]">
                        <span>Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredCampaigns.map((campaign, index) => (
                        <motion.tr 
                          key={campaign.campaignId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
                          className="group cursor-pointer border-b border-gray-200/30 dark:border-gray-700/30 hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-purple-50/40 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 transition-colors duration-200"
                        >
                          <TableCell className="p-4 w-[220px]">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {campaign.brandName}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="p-4 w-[140px]" onClick={(e) => e.stopPropagation()}>
                              <Badge 
                              className={`text-xs font-bold px-3 py-1 rounded-full ${
                                  campaign.status === 1 
                                  ? 'bg-green-500 text-white' 
                                    : campaign.status === 3 
                                    ? 'bg-yellow-500 text-white' 
                                      : campaign.status === 0
                                      ? 'bg-gray-500 text-white'
                                        : campaign.status === 2
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-400 text-white'
                                }`}
                              >
                                {statusMap[campaign.status as keyof typeof statusMap]?.label || 'Unknown'}
                              </Badge>
                          </TableCell>
                          
                          <TableCell className="p-4 w-[130px]">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                            {formatDate(campaign.createdAt)}
                            </div>
                          </TableCell>
                          
                          <TableCell className="p-4 text-right w-[140px]">
                            <span className="font-semibold text-blue-800 dark:text-blue-300 text-sm">
                            {campaign.impressionTarget.toLocaleString()}
                            </span>
                          </TableCell>
                          
                          <TableCell className="p-4 text-right w-[130px]">
                            <span className="font-semibold text-purple-800 dark:text-purple-300 text-sm">
                            {campaign.clickTarget.toLocaleString()}
                            </span>
                          </TableCell>
                          
                          <TableCell className="p-4 text-center w-[110px]">
                            <span className="font-semibold text-indigo-800 dark:text-indigo-300 text-sm">
                            {campaign.impressionTarget > 0 ? ((campaign.clickTarget / campaign.impressionTarget) * 100).toFixed(1) + '%' : '—'}
                            </span>
                          </TableCell>
                          
                          <TableCell className="p-4 text-right w-[130px]">
                            <span className="font-semibold text-green-800 dark:text-green-300 text-sm">
                            {campaignMetrics[campaign.campaignId]?.impressions?.toLocaleString() ?? '—'}
                            </span>
                          </TableCell>
                          
                          <TableCell className="p-4 text-right w-[120px]">
                            <span className="font-semibold text-orange-800 dark:text-orange-300 text-sm">
                            {campaignMetrics[campaign.campaignId]?.clicks?.toLocaleString() ?? '—'}
                            </span>
                          </TableCell>
                          
                          <TableCell className="p-4 text-center w-[110px]">
                            <span className="font-semibold text-pink-800 dark:text-pink-300 text-sm">
                            {campaignMetrics[campaign.campaignId] && campaignMetrics[campaign.campaignId].impressions > 0
                              ? ((campaignMetrics[campaign.campaignId].clicks / campaignMetrics[campaign.campaignId].impressions) * 100).toFixed(1) + '%'
                              : '—'}
                            </span>
                          </TableCell>
                          
                          <TableCell className="p-4 text-right w-[120px]">
                            <span className="font-semibold text-orange-800 dark:text-orange-300 text-sm">
                            ₹{(parseFloat(campaign.totalBudget) / 1000).toFixed(0)}K
                            </span>
                          </TableCell>
                          
                          <TableCell className="p-4 text-center w-[100px]" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-full"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/campaigns/${campaign.campaignId}/edit`);
                                  }}
                                  className="text-sm"
                                >
                                  <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloneCampaign(campaign.campaignId);
                                  }}
                                  className="text-sm"
                                >
                                  <Copy className="mr-2 h-4 w-4 text-purple-600" />
                                  Clone
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveCampaign(campaign.campaignId);
                                  }}
                                  className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                                {campaign.status !== 3 && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(campaign.campaignId, 3);
                                    }}
                                    className="text-sm"
                                  >
                                    <Pause className="mr-2 h-4 w-4 text-orange-600" />
                                    Pause
                                  </DropdownMenuItem>
                                )}
                                {campaign.status === 3 && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(campaign.campaignId, 1);
                                    }}
                                    className="text-sm"
                                  >
                                    <Play className="mr-2 h-4 w-4 text-green-600" />
                                    Resume
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ isOpen: false })}
        onConfirm={confirmArchiveCampaign}
        title="Archive Campaign"
        message="Are you sure you want to archive this campaign? This will also archive all associated ads and cannot be undone."
        itemName={confirmationModal.campaignName}
        itemType="campaign"
        variant="danger"
      />
    </div>
  );
}