import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Filter, Play, Pause, Edit, Copy, MoreHorizontal, RefreshCw, Download, Search, BarChart3, Calendar, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Campaign, CampaignResponse } from '@/types';
import { motion } from 'framer-motion';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: '0', label: 'Draft' },
  { value: '1', label: 'Live' },
  { value: '2', label: 'Test' },
  { value: '3', label: 'Paused' },
];

const statusMap = {
  0: { label: 'Draft', variant: 'warning' as const },
  1: { label: 'Live', variant: 'success' as const },
  2: { label: 'Test', variant: 'info' as const },
  3: { label: 'Paused', variant: 'outline' as const },
} as const;

export function CampaignList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const statusFilter = searchParams.get('status') || 'all';
  const brandNameFilter = searchParams.get('brandName') || '';

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, brandNameFilter]);



  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns');
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      const result: CampaignResponse = await response.json();
      
      if (result.status === 1 && result.data?.campaignList) {
        setCampaigns(result.data.campaignList);
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
    console.log('Exporting campaigns data...');
    toast.success('Export started');
  };

  const handleCloneCampaign = async (campaignId: number) => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns/clone?userId=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      });

      if (!response.ok) throw new Error('Failed to clone campaign');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success('Campaign cloned successfully');
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error cloning campaign:', error);
      toast.error('Failed to clone campaign');
    }
  };

  const handleStatusChange = async (campaignId: number, newStatus: number) => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns/update?userId=1', {
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
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressionTarget, 0);

  // Campaign Card Component for mobile view
  const CampaignCard = ({ campaign, index }: { campaign: Campaign; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 cursor-pointer active:scale-95"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg truncate">
            {campaign.brandName}
          </h3>
          <div className="flex items-center mt-1 space-x-2">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(campaign.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <Badge 
            variant={statusMap[campaign.status as keyof typeof statusMap]?.variant || 'outline'} 
            className={`text-xs ${
              campaign.status === 1 
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' 
                : campaign.status === 3 
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700' 
                  : campaign.status === 0
                    ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                    : campaign.status === 2
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
            }`}
          >
            {statusMap[campaign.status as keyof typeof statusMap]?.label || 'Unknown'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full">
                <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/campaigns/${campaign.campaignId}/edit`);
                }}
              >
                <Edit className="mr-2 h-4 w-4 text-blue-600" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloneCampaign(campaign.campaignId);
                }}
              >
                <Copy className="mr-2 h-4 w-4 text-purple-600" />
                <span>Clone</span>
              </DropdownMenuItem>
              {campaign.status !== 3 && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(campaign.campaignId, 3);
                  }}
                >
                  <Pause className="mr-2 h-4 w-4 text-orange-600" />
                  <span>Pause</span>
                </DropdownMenuItem>
              )}
              {campaign.status === 3 && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(campaign.campaignId, 1);
                  }}
                >
                  <Play className="mr-2 h-4 w-4 text-green-600" />
                  <span>Resume</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Impressions</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {campaign.impressionTarget.toLocaleString()}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Clicks</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {campaign.clickTarget.toLocaleString()}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Budget</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            ₹{parseFloat(campaign.totalBudget).toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-indigo-500 rounded-full animate-pulse delay-200"></div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Campaigns
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm sm:text-base">Manage and monitor your advertising campaigns</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center justify-center space-x-2 h-9 sm:h-8"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex items-center justify-center space-x-2 h-9 sm:h-8"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">Export</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/analytics')}
                className="flex items-center justify-center space-x-2 h-9 sm:h-8"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Analytics</span>
              </Button>
              
              <Button 
                onClick={() => navigate('/campaigns/new')} 
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 h-9 sm:h-8"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Create Campaign</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-2">
        <div className="space-y-6 sm:space-y-8">
          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
          >
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 sm:p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium">Active Campaigns</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300">{activeCampaigns}</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-500 rounded-lg">
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Budget</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300">₹{totalBudget.toLocaleString()}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-500 rounded-lg">
                  <span className="text-white text-xl">💰</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Target Impressions</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">{totalImpressions.toLocaleString()}</p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-500 rounded-lg">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Filters Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
            </div>
            
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4">
              <div className="flex-1">
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => setSearchParams(prev => ({ ...Object.fromEntries(prev), status: value === 'all' ? '' : value }))}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 h-10">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by brand name"
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 h-10"
                    value={brandNameFilter}
                    onChange={(e) => setSearchParams(prev => ({ ...Object.fromEntries(prev), brandName: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Campaigns Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-700">
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-40">Brand</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-24">Status</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-28">Created</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-28 text-right">Impressions</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-24 text-right">Clicks</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-28 text-right">Budget</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <div className="text-gray-500 dark:text-gray-400 p-6">
                            <span className="font-medium text-lg">No campaigns found. Create your first campaign to get started.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCampaigns.map((campaign) => (
                        <TableRow 
                          key={campaign.campaignId}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                          onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
                        >
                          <TableCell className="font-semibold text-gray-900 dark:text-gray-100 p-2">
                            <div className="truncate max-w-36" title={campaign.brandName}>
                              {campaign.brandName}
                            </div>
                          </TableCell>
                          <TableCell className="p-2">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Badge 
                                variant={statusMap[campaign.status as keyof typeof statusMap]?.variant || 'outline'} 
                                className={`font-medium text-xs ${
                                  campaign.status === 1 
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' 
                                    : campaign.status === 3 
                                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700' 
                                      : campaign.status === 0
                                        ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                                        : campaign.status === 2
                                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700'
                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                {statusMap[campaign.status as keyof typeof statusMap]?.label || 'Unknown'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 p-2 text-sm">
                            {formatDate(campaign.createdAt)}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-right p-2 text-sm">
                            {(campaign.impressionTarget / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-right p-2 text-sm">
                            {(campaign.clickTarget / 1000).toFixed(1)}K
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-right p-2 text-sm">
                            ₹{(parseFloat(campaign.totalBudget) / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell className="text-right p-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/campaigns/${campaign.campaignId}/edit`);
                                  }}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <Edit className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloneCampaign(campaign.campaignId);
                                  }}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <Copy className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">Clone</span>
                                </DropdownMenuItem>
                                {campaign.status !== 3 && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(campaign.campaignId, 3);
                                    }}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <Pause className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Pause</span>
                                  </DropdownMenuItem>
                                )}
                                {campaign.status === 3 && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(campaign.campaignId, 1);
                                    }}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <Play className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Resume</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-400">
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce ml-2" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce ml-2" style={{ animationDelay: '0.2s' }}></div>
                  <span className="ml-3 text-base font-medium">Loading campaigns...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 inline-block">
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 inline-block">
                    <span className="font-medium">No campaigns found</span>
                  </div>
                </div>
              ) : (
                filteredCampaigns.map((campaign, index) => (
                  <CampaignCard key={campaign.campaignId} campaign={campaign} index={index} />
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}