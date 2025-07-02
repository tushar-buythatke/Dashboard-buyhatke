import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Edit, Copy, MoreHorizontal, Image as ImageIcon, ArrowLeft, RefreshCw, Download, TrendingUp, Eye, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Ad, Slot, SlotListResponse } from '@/types';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

// Placeholder image URL
const PLACEHOLDER_IMAGE = 'https://eos.org/wp-content/uploads/2023/10/moon-2.jpg';

export function AdList() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Record<number, Slot>>({});
  const [campaign, setCampaign] = useState<{ brandName?: string }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Inject gradient animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gradientFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (campaignId) {
        try {
          await Promise.all([
            fetchCampaign(),
            fetchSlots(),
            fetchAds()
          ]);
        } catch (error) {
          console.error('Error fetching data:', error);
          setError('Failed to load data. Please try again.');
        }
      } else {
        setError('No campaign ID provided');
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId]);

  const fetchSlots = async () => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/slots');
      if (!response.ok) throw new Error('Failed to fetch slots');
      
      const result: SlotListResponse = await response.json();
      if (result.status === 1 && result.data?.slotList) {
        const slotsMap = result.data.slotList.reduce((acc, slot) => ({
          ...acc,
          [slot.slotId]: slot
        }), {} as Record<number, Slot>);
        setSlots(slotsMap);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to load slot information');
    }
  };

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns?campaignId=${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      
      const result = await response.json();
      if (result.status === 1 && result.data?.campaignList?.[0]) {
        setCampaign(result.data.campaignList[0]);
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
    }
  };

  const fetchAds = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams({
        campaignId: campaignId || '',
        slotId: '',
        adId: '',
        status: ''
      });

      const response = await fetch(
        `https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch ads');
      }
      
      const result = await response.json();
      
      if (result.status === 1 && result.data?.adsList) {
        // Enrich ads with slot information
        const enrichedAds = result.data.adsList.map((ad: Ad) => {
          const slot = slots[ad.slotId];
          return {
            ...ad,
            slotName: slot?.name || `Slot-${ad.slotId}`,
            slotWidth: slot?.width,
            slotHeight: slot?.height
          };
        });
        setAds(enrichedAds);
      } else {
        setAds([]);
        setError('No ads found for this campaign');
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
      setError('Failed to load ads. Please try again.');
      toast.error('Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneAd = async (adId: number) => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads/clone?userId=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId })
      });

      if (!response.ok) throw new Error('Failed to clone ad');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success('Ad cloned successfully');
        fetchAds();
      }
    } catch (error) {
      console.error('Error cloning ad:', error);
      toast.error('Failed to clone ad');
    }
  };

  const handleStatusChange = async (adId: number, newStatus: 0 | 1) => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads/update?userId=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update ad status');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success(`Ad ${newStatus === 1 ? 'activated' : 'paused'} successfully`);
        fetchAds();
      }
    } catch (error) {
      console.error('Error updating ad status:', error);
      toast.error('Failed to update ad status');
    }
  };

  // Calculate summary stats
  const totalAds = ads.length;
  const activeAds = ads.filter(ad => ad.status === 1).length;
  const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressionTarget, 0);
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clickTarget, 0);
  const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Mobile Ad Card Component
  const AdCard = ({ ad, index }: { ad: Ad; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}`)}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 active:scale-95 cursor-pointer"
    >
      <div className="flex items-start space-x-4">
        {/* Creative */}
        <div className="flex-shrink-0">
          <div className="h-16 w-20 flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            {ad.creativeUrl ? (
              <img 
                src={ad.creativeUrl} 
                alt="Ad creative" 
                className="h-full w-full object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'true';
                    target.src = PLACEHOLDER_IMAGE;
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <ImageIcon className="h-4 w-4 mb-1" />
                <span className="text-xs font-medium">No Image</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Badge 
                  variant={ad.status === 1 ? 'success' : 'outline'} 
                  className={`text-xs ${
                    ad.status === 1 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' 
                      : ad.status === 0 
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700' 
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {ad.status === 1 ? 'Active' : ad.status === 0 ? 'Paused' : 'Draft'}
                </Badge>
                {ad.slotName && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {ad.slotName}
                  </span>
                )}
              </div>
              {ad.slotWidth && ad.slotHeight && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {ad.slotWidth} x {ad.slotHeight}px
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/campaigns/${campaignId}/ads/${ad.adId}`);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4 text-indigo-600" />
                  <span>View Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/campaigns/${campaignId}/ads/${ad.adId}/edit`);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4 text-blue-600" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloneAd(ad.adId);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4 text-purple-600" />
                  <span>Clone</span>
                </DropdownMenuItem>
                {ad.status === 1 ? (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(ad.adId, 0);
                    }}
                  >
                    <Pause className="mr-2 h-4 w-4 text-orange-600" />
                    <span>Pause</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(ad.adId, 1);
                    }}
                  >
                    <Play className="mr-2 h-4 w-4 text-green-600" />
                    <span>Activate</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Impressions</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {ad.impressionTarget.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Clicks</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {ad.clickTarget.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">CTR</div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {ad.impressionTarget > 0 
                  ? ((ad.clickTarget / ad.impressionTarget) * 100).toFixed(2) + '%' 
                  : '0.00%'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-2 space-y-6">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
          style={{
            background: theme === 'dark' 
              ? 'linear-gradient(-45deg, #1f2937, #374151, #4f46e5, #7c3aed, #1f2937, #374151)'
              : 'linear-gradient(-45deg, #ffffff, #f8fafc, #e0e7ff, #ddd6fe, #ffffff, #f8fafc)',
            backgroundSize: '400% 400%',
            animation: 'gradientFlow 8s ease infinite'
          }}
        >
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Button 
                variant="ghost"
                onClick={() => navigate('/campaigns')}
                className="h-100 w-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {campaign?.brandName || 'Campaign'} Ads
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                  Manage ads for {campaign?.brandName || 'this campaign'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <Button
                variant="outline"
                onClick={fetchAds}
                className="flex items-center justify-center space-x-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 sm:h-10"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Refresh</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center space-x-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 sm:h-10"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">Export</span>
              </Button>
              <Button 
                onClick={() => navigate(`/campaigns/${campaignId}/ads/new`)} 
                className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white h-9 sm:h-10"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Create Ad</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium">Total Ads</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">{totalAds}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 dark:text-green-400 text-xs sm:text-sm font-medium">Active Ads</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">{activeAds}</p>
              </div>
              <Play className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-medium">Total Impressions</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{totalImpressions.toLocaleString()}</p>
              </div>
              <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 dark:text-purple-400 text-xs sm:text-sm font-medium">Average CTR</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100">{averageCTR.toFixed(2)}%</p>
              </div>
              <MousePointerClick className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </Card>
        </motion.div>

        {/* Search and Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 w-full">
              <Input
                placeholder="Search ads..."
                className="flex-1 sm:max-w-sm bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
              />
            </div>
          </div>
        </motion.div>

        {/* Ads Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-20">Creative</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-24">Status</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-32">Slot</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-28 text-right">Impressions</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-24 text-right">Clicks</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-20 text-center">CTR</TableHead>
                    <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="text-gray-500 dark:text-gray-400 p-6">
                          <span className="font-medium text-lg">No ads found. Create your first ad to get started.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ads.map((ad, index) => (
                      <motion.tr 
                        key={ad.adId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}`)}
                        className="transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 cursor-pointer"
                      >
                        <TableCell className="p-2">
                          <div className="h-12 w-16 flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            {ad.creativeUrl ? (
                              <img 
                                src={ad.creativeUrl} 
                                alt="Ad creative" 
                                className="h-full w-full object-contain rounded-lg"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (!target.dataset.fallback) {
                                    target.dataset.fallback = 'true';
                                    target.src = PLACEHOLDER_IMAGE;
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                <ImageIcon className="h-3 w-3 mb-1" />
                                <span className="text-xs font-medium">No Image</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
                          <Badge 
                            variant={ad.status === 1 ? 'success' : 'outline'} 
                            className={`font-medium text-xs ${
                              ad.status === 1 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' 
                                : ad.status === 0 
                                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700' 
                                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {ad.status === 1 ? 'Active' : ad.status === 0 ? 'Paused' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 font-medium p-2">
                          {ad.slotName && (
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm truncate max-w-32">{ad.slotName}</span>
                              {ad.slotWidth && ad.slotHeight && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-center mt-1">
                                  {ad.slotWidth} x {ad.slotHeight}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 font-medium text-right p-2 text-sm">
                          {(ad.impressionTarget / 1000).toFixed(0)}K
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 font-medium text-right p-2 text-sm">
                          {(ad.clickTarget / 1000).toFixed(1)}K
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 font-medium text-center p-2">
                          <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                            {ad.impressionTarget > 0 
                              ? ((ad.clickTarget / ad.impressionTarget) * 100).toFixed(1) + '%' 
                              : '0%'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right p-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
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
                                  navigate(`/campaigns/${campaignId}/ads/${ad.adId}`);
                                }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Eye className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-gray-700 dark:text-gray-300 font-medium">View Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/campaigns/${campaignId}/ads/${ad.adId}/edit`);
                                }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Edit className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloneAd(ad.adId);
                                }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Copy className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Clone</span>
                              </DropdownMenuItem>
                              {ad.status === 1 ? (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(ad.adId, 0);
                                  }}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <Pause className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">Pause</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(ad.adId, 1);
                                  }}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <Play className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">Activate</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {ads.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <span className="font-medium">No ads found. Create your first ad to get started.</span>
                </div>
              </div>
            ) : (
              ads.map((ad, index) => (
                <AdCard key={ad.adId} ad={ad} index={index} />
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}