import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Play, Pause, Edit, Copy, MoreHorizontal, Image as ImageIcon, ArrowLeft, RefreshCw, Download, TrendingUp, Eye, MousePointerClick, Search, X, Target, Activity, Zap, Star, Sparkles, Archive, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { toast } from 'sonner';
import { Ad, Slot, SlotListResponse, ApiAd, mapApiAdToAd } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { analyticsService } from '@/services/analyticsService';
import { adService } from '@/services/adService';
import { exportToCsv } from '@/utils/csvExport';
import { getApiBaseUrl } from '@/config/api';
import { getPlatformName } from '@/utils/platform';

// Placeholder image URL
const PLACEHOLDER_IMAGE = 'https://eos.org/wp-content/uploads/2023/10/moon-2.jpg';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: '0', label: 'Paused' },
  { value: '1', label: 'Live' },
  { value: '-1', label: 'Archived' },
];

const statusMap = {
  0: { label: 'Paused', variant: 'outline' as const },
  1: { label: 'Live', variant: 'success' as const },
  '-1': { label: 'Archived', variant: 'destructive' as const },
} as const;

export function AdList() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();
  const { checkPerformanceAlerts, addNotification } = useNotifications();
  const [ads, setAds] = useState<Ad[]>([]);
  const [filteredAds, setFilteredAds] = useState<Ad[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const statusFilter = searchParams.get('status') || 'all';
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Record<number, Slot>>({});
  const [campaign, setCampaign] = useState<{ brandName?: string; id?: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [adMetrics, setAdMetrics] = useState<Record<number, { impressions: number; clicks: number }>>({});
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    adId?: number;
    adName?: string;
  }>({ isOpen: false });
  // We use adService for auto-numbering, but don't need visual indicators in the UI

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

  // Real-time performance monitoring for notifications
  useEffect(() => {
    if (ads.length > 0 && Object.keys(adMetrics).length > 0) {
      // Check each ad for performance achievements
      ads.forEach(ad => {
        const metrics = adMetrics[ad.adId];
        if (!metrics) return;

        const impressionExceeded = metrics.impressions > ad.impressionTarget;
        const clickExceeded = metrics.clicks > ad.clickTarget;

        // Only notify if targets are actually exceeded
        if (impressionExceeded && ad.impressionTarget > 0) {
          const improvement = Math.round(((metrics.impressions - ad.impressionTarget) / ad.impressionTarget) * 100);
          if (improvement > 0) {
            addNotification({
              type: 'achievement',
              title: 'Impression Target Exceeded!',
              message: `Ad "${ad.name}" exceeded impression targets by ${improvement}%`,
              metadata: {
                campaignId: campaign.id,
                adId: ad.adId,
                metric: 'impressions',
                improvement
              }
            });
          }
        }

        if (clickExceeded && ad.clickTarget > 0) {
          const improvement = Math.round(((metrics.clicks - ad.clickTarget) / ad.clickTarget) * 100);
          if (improvement > 0) {
            addNotification({
              type: 'success',
              title: 'Click Target Exceeded!',
              message: `Ad "${ad.name}" exceeded click targets by ${improvement}%`,
              metadata: {
                campaignId: campaign.id,
                adId: ad.adId,
                metric: 'clicks',
                improvement
              }
            });
          }
        }
      });
    }
  }, [ads, adMetrics, campaign.id, addNotification]);

  const fetchSlots = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/slots`);
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
      const response = await fetch(`${getApiBaseUrl()}/campaigns?campaignId=${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      
      const result = await response.json();
      if (result.status === 1 && result.data?.campaignList?.[0]) {
        const campaignData = result.data.campaignList[0];
        setCampaign({
          ...campaignData,
          id: parseInt(campaignId || '0', 10)
        });
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
        `${getApiBaseUrl()}/ads?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch ads');
      }
      
      const result = await response.json();
      
      if (result.status === 1 && result.data?.adsList) {
        // Enrich ads with slot information and map to the frontend Ad type
        const enrichedAds = result.data.adsList.map((apiAd: ApiAd) => {
          const ad = mapApiAdToAd(apiAd);
          const slot = slots[ad.slotId];
          return {
            ...ad,
            slotName: slot?.name || `Slot-${ad.slotId}`,
            slotWidth: slot?.width,
            slotHeight: slot?.height
          };
        });
        setAds(enrichedAds);
        setFilteredAds(enrichedAds);

        // fetch live metrics for ads
        const today = new Date().toISOString().split('T')[0];
        const metricsPromises = enrichedAds.map((ad: Ad) => {
          const fromDate = ad.createdAt.split('T')[0];
          return analyticsService.getMetrics({ 
            from: fromDate, 
            to: today,
            campaignId: campaignId ? Number(campaignId) : undefined,
            adId: ad.adId 
          });
        });
        
        const metricsResults = await Promise.all(metricsPromises);
        
        const newAdMetrics: Record<number, { impressions: number; clicks: number }> = {};
        metricsResults.forEach((resp, index) => {
          const adId = enrichedAds[index].adId;
          if (resp.success && resp.data) {
            newAdMetrics[adId] = {
              impressions: resp.data.impressions,
              clicks: resp.data.clicks,
            };
          }
        });

        setAdMetrics(newAdMetrics);

        // Check for performance alerts with enriched data
        const adsWithMetrics = enrichedAds.map((ad: Ad) => ({
          ...ad,
          liveImpressions: newAdMetrics[ad.adId]?.impressions || 0,
          liveClicks: newAdMetrics[ad.adId]?.clicks || 0,
        }));

        // Check performance and trigger notifications
        const campaignData = campaign.id ? [campaign] : [];
        checkPerformanceAlerts(campaignData, adsWithMetrics);
      } else {
        setAds([]);
        setFilteredAds([]);
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
      const response = await adService.cloneAd(adId, 1);
      
      if (response.success) {
        toast.success('Ad cloned successfully');
        fetchAds();
      } else {
        toast.error(response.message || 'Failed to clone ad');
      }
    } catch (error) {
      console.error('Error cloning ad:', error);
      toast.error('Failed to clone ad');
    }
  };

  const handleArchiveAd = (adId: number) => {
    const ad = ads.find(a => a.adId === adId);
    setConfirmationModal({
      isOpen: true,
      adId,
      adName: ad?.name || 'Unknown Ad'
    });
  };

  const confirmArchiveAd = async () => {
    try {
      if (!confirmationModal.adId) return;

      const response = await adService.archiveAd(confirmationModal.adId, 1);
      
      if (response.success) {
        toast.success(`Ad "${confirmationModal.adName}" archived successfully`);
        fetchAds(); // Refresh the list
      } else {
        toast.error(response.message || 'Failed to archive ad');
      }
    } catch (error) {
      console.error('Error archiving ad:', error);
      toast.error('Failed to archive ad');
    } finally {
      setConfirmationModal({ isOpen: false });
    }
  };

  const handleExport = () => {
    if (filteredAds.length === 0) {
      toast.error('No ads to export');
      return;
    }

    // Prepare CSV data
    const csvData = filteredAds.map(ad => ({
      'Ad ID': ad.adId,
      'Ad Name': ad.name,
      'Campaign ID': campaignId,
      'Campaign Name': campaign.brandName || 'N/A',
      'Status': ad.status === 1 ? 'Live' : ad.status === 0 ? 'Paused' : ad.status === -1 ? 'Archived' : 'Unknown',
      'Slot ID': ad.slotId,
      'Slot Name': slots[ad.slotId]?.name || 'N/A',
      'Platform': slots[ad.slotId]?.platform !== undefined ? getPlatformName(slots[ad.slotId].platform) : 'Unknown Platform',
      'Impression Target': ad.impressionTarget || 0,
      'Click Target': ad.clickTarget || 0,
      'Creative URL': ad.creativeUrl || 'N/A',
      'Start Date': ad.startDate || 'N/A',
      'End Date': ad.endDate || 'N/A',
      'Start Time': ad.startTime || 'N/A',
      'End Time': ad.endTime || 'N/A',
      'Priority': ad.priority || 'N/A',
      'Gender Target': ad.gender || 'N/A',
      'Age Range': `${ad.ageRangeMin || 'N/A'} - ${ad.ageRangeMax || 'N/A'}`,
      'Price Range': `${ad.priceRangeMin || 'N/A'} - ${ad.priceRangeMax || 'N/A'}`,
      'Created Date': ad.createdAt ? new Date(ad.createdAt).toLocaleDateString() : 'N/A',
      'Last Updated': ad.updatedAt ? new Date(ad.updatedAt).toLocaleDateString() : 'N/A'
    }));

    const filename = `ads_campaign_${campaignId}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCsv(csvData, filename);
    toast.success(`Exported ${filteredAds.length} ads to ${filename}`);
  };

  const handleStatusChange = async (adId: number, newStatus: 0 | 1) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/ads/update?userId=1`, {
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

  // Set filtered ads initially
  useEffect(() => {
    setFilteredAds(ads);
  }, [ads]);

  // Filter ads when search query or status changes
  useEffect(() => {
    let filtered = ads;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ad => ad.status.toString() === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(ad => 
        ad.name.toLowerCase().includes(query)
      );
    }

    setFilteredAds(filtered);
  }, [ads, searchQuery, statusFilter]);

  // We handle auto-numbering in the AdForm component when selecting existing names

  // Auto-numbering is handled by the adService.getSuggestedAdName function

  // Calculate summary stats
  const totalAds = ads.length;
  const activeAds = ads.filter(ad => ad.status === 1).length;

  const totalTargetImpressions = ads.reduce((sum, ad) => sum + (ad.impressionTarget || 0), 0);
  const totalTargetClicks = ads.reduce((sum, ad) => sum + (ad.clickTarget || 0), 0);
  const targetCTR = totalTargetImpressions > 0 ? (totalTargetClicks / totalTargetImpressions) * 100 : 0;

  const totalLiveImpressions = Object.values(adMetrics).reduce((sum, metrics) => sum + (metrics.impressions || 0), 0);
  const totalLiveClicks = Object.values(adMetrics).reduce((sum, metrics) => sum + (metrics.clicks || 0), 0);
  const liveCTR = totalLiveImpressions > 0 ? (totalLiveClicks / totalLiveImpressions) * 100 : 0;

  // Mobile Ad Card Component
  const AdCard = ({ ad, index }: { ad: Ad; index: number }) => {
    const isVideo = ad.creativeUrl && (/\.(mp4|webm|ogg|mov)$/i.test(ad.creativeUrl) || ad.creativeUrl.includes('video'));
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}`)}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 active:scale-95 cursor-pointer"
      >
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
          {/* Creative */}
          <div className="flex-shrink-0 self-center lg:self-auto">
            <div className="h-16 w-20 flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              {ad.creativeUrl ? (
                isVideo ? (
                  <video 
                    src={ad.creativeUrl} 
                    className="h-full w-full object-contain rounded-lg"
                    muted
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
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
                )
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  <ImageIcon className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">No Media</span>
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
                  variant={ad.status === 1 ? 'success' : ad.status === -1 ? 'destructive' : 'outline'} 
                  className={`text-xs ${
                    ad.status === 1 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' 
                      : ad.status === 0 
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700'
                        : ad.status === -1
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {ad.status === 1 ? 'Live' : ad.status === 0 ? 'Paused' : ad.status === -1 ? 'Archived' : 'Unknown'}
                </Badge>
                {ad.slotName && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {ad.slotName}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {ad.name}
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
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchiveAd(ad.adId);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Archive</span>
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
            {/* Target Metrics */}
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Impr.</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {ad.impressionTarget.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Clicks</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {ad.clickTarget.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target CTR</div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {ad.impressionTarget > 0 ? ((ad.clickTarget / ad.impressionTarget) * 100).toFixed(1) : '0'}%
              </div>
            </div>

            {/* Live Metrics */}
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Live Impr.</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {adMetrics[ad.adId]?.impressions?.toLocaleString() ?? '0'}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Live Clicks</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {adMetrics[ad.adId]?.clicks?.toLocaleString() ?? '0'}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Live CTR</div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {adMetrics[ad.adId] && adMetrics[ad.adId].impressions > 0
                  ? ((adMetrics[ad.adId].clicks / adMetrics[ad.adId].impressions) * 100).toFixed(1) + '%'
                  : '0.0%'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    );
  };

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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 transition-all duration-300 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-400/5 to-cyan-400/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-2 space-y-6 relative z-10">
        {/* Enhanced Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-blue-600/5 to-pink-600/5"></div>
          <div className="relative z-10">
            <div className="flex flex-col space-y-6 sm:space-y-0 sm:flex-row sm:items-center justify-between">
              <div className="flex items-center space-x-4 sm:space-x-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-75" />
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse delay-150" />
                </div>
                <Button 
                  variant="ghost"
                  onClick={() => navigate('/campaigns')}
                  className="h-12 w-12 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all duration-300 hover:scale-110"
                >
                  <ArrowLeft className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-700 via-gray-800 to-slate-900 dark:from-slate-100 dark:via-gray-200 dark:to-slate-100 bg-clip-text text-transparent">
                    {campaign?.brandName || 'Campaign'} Ads
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm font-medium">
                    Manage and monitor your advertising campaigns
                  </p>
                </div>
              </div>
              
              {/* Enhanced Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <Button
                  variant="outline"
                  onClick={fetchAds}
                  className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 h-10 px-4"
                >
                  <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Refresh</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 h-10 px-4"
                >
                  <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Export</span>
                </Button>
                <Button 
                  onClick={() => navigate(`/campaigns/${campaignId}/ads/new`)} 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-10 px-6 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span className="ml-2 text-sm">Create Ad</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Summary Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6"
        >
          {/* Total Ads Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative group"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-cyan-100 dark:from-blue-900/80 dark:via-blue-800/80 dark:to-cyan-900/80 border-blue-300/50 dark:border-blue-700/50 p-5 sm:p-6 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-cyan-400/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-blue-700 dark:text-blue-300 text-sm font-semibold">Total Ads</p>
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalAds}</p>
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">total</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Active Ads Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative group"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-green-900/80 dark:via-emerald-800/80 dark:to-teal-900/80 border-green-300/50 dark:border-green-700/50 p-5 sm:p-6 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-teal-400/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-green-700 dark:text-green-300 text-sm font-semibold">Active Ads</p>
                  <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{activeAds}</p>
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">live</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Impressions Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative group"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/80 dark:via-amber-800/80 dark:to-yellow-900/80 border-orange-300/50 dark:border-orange-700/50 p-5 sm:p-6 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-yellow-400/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-orange-700 dark:text-orange-300 text-sm font-semibold">Impressions</p>
                  <Eye className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Target</span>
                    <span className="text-lg font-semibold text-orange-900 dark:text-orange-100">{totalTargetImpressions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Live</span>
                    <span className="text-lg font-semibold text-orange-900 dark:text-orange-100">{totalLiveImpressions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Clicks Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative group"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-100 dark:from-purple-900/80 dark:via-violet-800/80 dark:to-fuchsia-900/80 border-purple-300/50 dark:border-purple-700/50 p-5 sm:p-6 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-fuchsia-400/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-purple-700 dark:text-purple-300 text-sm font-semibold">Clicks</p>
                  <MousePointerClick className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Target</span>
                    <span className="text-lg font-semibold text-purple-900 dark:text-purple-100">{totalTargetClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Live</span>
                    <span className="text-lg font-semibold text-purple-900 dark:text-purple-100">{totalLiveClicks.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* CTR Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative group"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-red-100 dark:from-pink-900/80 dark:via-rose-800/80 dark:to-red-900/80 border-pink-300/50 dark:border-pink-700/50 p-5 sm:p-6 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-400/10 to-red-400/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-pink-700 dark:text-pink-300 text-sm font-semibold">CTR</p>
                  <TrendingUp className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">Target</span>
                    <span className="text-lg font-semibold text-pink-900 dark:text-pink-100">{targetCTR.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">Live</span>
                    <span className="text-lg font-semibold text-pink-900 dark:text-pink-100">{liveCTR.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Enhanced Search and Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-purple-600/5 to-pink-600/5"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Search className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Search & Filter
                </h3>
              </div>
              {(searchQuery || statusFilter !== 'all') && (
                <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {filteredAds.length} results
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4 w-full">
              <div className="relative flex-1 sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  placeholder="Search ads by name..."
                  className="pl-10 pr-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-1 transition-all duration-200"
                    >
                      <span className="sr-only">Clear search</span>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    const newSearchParams = new URLSearchParams(searchParams);
                    if (value === 'all') {
                      newSearchParams.delete('status');
                    } else {
                      newSearchParams.set('status', value);
                    }
                    setSearchParams(newSearchParams);
                  }}
                >
                  <SelectTrigger className="w-40 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(searchQuery || statusFilter !== 'all') && filteredAds.length === 0 && (
              <div className="mt-4 text-center py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <div className="text-amber-700 dark:text-amber-300 font-medium">
                  No ads found {searchQuery && `matching "${searchQuery}"`}
                  {statusFilter !== 'all' && ` with status "${statusOptions.find(opt => opt.value === statusFilter)?.label}"`}
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Try adjusting your filters or create a new ad
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Ads Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Enhanced Desktop Table View */}
          <div className="hidden lg:block bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-50 via-blue-50 to-purple-50 dark:from-gray-800 dark:via-slate-700 dark:to-gray-800 border-slate-200 dark:border-gray-600">
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-sm w-[100px] px-4">
                      Creative
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-sm w-[120px] px-3">
                      Status
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-sm w-[180px] px-3">
                      Name
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-sm w-[140px] px-3">
                      Slot
                    </TableHead>
                    {/* Target group */}
                    <TableHead className="text-orange-700 dark:text-orange-300 font-semibold text-sm w-[120px] text-right bg-orange-50/50 dark:bg-orange-900/20 px-3">
                      Target Impr.
                    </TableHead>
                    <TableHead className="text-orange-700 dark:text-orange-300 font-semibold text-sm w-[120px] text-right bg-orange-50/50 dark:bg-orange-900/20 px-3">
                      Target Clicks
                    </TableHead>
                    <TableHead className="text-orange-700 dark:text-orange-300 font-semibold text-sm w-[110px] text-center bg-orange-50/50 dark:bg-orange-900/20 px-3">
                      Target CTR
                    </TableHead>
                    {/* Live group */}
                    <TableHead className="text-blue-700 dark:text-blue-300 font-semibold text-sm w-[120px] text-right bg-blue-50/50 dark:bg-blue-900/20 px-3">
                      Live Impr.
                    </TableHead>
                    <TableHead className="text-blue-700 dark:text-blue-300 font-semibold text-sm w-[120px] text-right bg-blue-50/50 dark:bg-blue-900/20 px-3">
                      Live Clicks
                    </TableHead>
                    <TableHead className="text-blue-700 dark:text-blue-300 font-semibold text-sm w-[110px] text-center bg-blue-50/50 dark:bg-blue-900/20 px-3">
                      Live CTR
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-sm w-[80px] text-center px-3">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="text-gray-500 dark:text-gray-400 p-6">
                          <span className="font-medium text-lg">
                            {searchQuery 
                              ? `No ads found matching "${searchQuery}"`
                              : "No ads found. Create your first ad to get started."}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAds.map((ad, index) => {
                      const isVideo = ad.creativeUrl && (/\.(mp4|webm|ogg|mov)$/i.test(ad.creativeUrl) || ad.creativeUrl.includes('video'));
                      
                      return (
                        <motion.tr 
                          key={ad.adId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.02 }}
                          whileHover={{ 
                            scale: 1.005,
                            backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)'
                          }}
                          onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}`)}
                          className="group transition-all duration-300 border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-indigo-900/20 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm"
                        >
                          <TableCell className="p-3">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 300 }}
                              className="h-14 w-20 flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-700 dark:to-gray-700 rounded-xl border-2 border-slate-200 dark:border-slate-600 shadow-sm group-hover:shadow-md transition-all duration-300"
                            >
                              {ad.creativeUrl ? (
                                isVideo ? (
                                  <video 
                                    src={ad.creativeUrl} 
                                    className="h-full w-full object-contain rounded-lg"
                                    muted
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
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
                                )
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                  <ImageIcon className="h-4 w-4 mb-1" />
                                  <span className="text-xs font-semibold">No Media</span>
                                </div>
                              )}
                            </motion.div>
                          </TableCell>
                        <TableCell className="p-3">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Badge 
                              className={`font-semibold text-xs px-2.5 py-1 rounded-lg border transition-all duration-200 ${
                                ad.status === 1 
                                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' 
                                  : ad.status === 0 
                                    ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700' 
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              {ad.status === 1 ? 'Live' : ad.status === 0 ? 'Paused' : ad.status === -1 ? 'Archived' : 'Unknown'}
                            </Badge>
                          </motion.div>
                        </TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 font-semibold p-3">
                          <span className="font-black text-sm truncate max-w-32 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">{ad.name}</span>
                        </TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 font-semibold p-3">
                          {ad.slotName && (
                            <div className="flex flex-col space-y-1">
                              <span className="font-black text-sm truncate max-w-32 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">{ad.slotName}</span>
                              {ad.slotWidth && ad.slotHeight && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-center font-medium">
                                  {ad.slotWidth} x {ad.slotHeight}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-orange-700 dark:text-orange-300 font-black text-right p-3 text-sm group-hover:text-orange-600 dark:group-hover:text-orange-200 transition-colors">
                          {ad.impressionTarget.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-orange-700 dark:text-orange-300 font-black text-right p-3 text-sm group-hover:text-orange-600 dark:group-hover:text-orange-200 transition-colors">
                          {ad.clickTarget.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center p-3">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <span className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-md text-xs font-semibold border border-orange-200 dark:border-orange-700">
                              {ad.impressionTarget > 0 ? `${((ad.clickTarget / ad.impressionTarget) * 100).toFixed(1)}%` : '0.0%'}
                            </span>
                          </motion.div>
                        </TableCell>
                        <TableCell className="text-blue-700 dark:text-blue-300 font-black text-right p-3 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-200 transition-colors">
                          {adMetrics[ad.adId]?.impressions?.toLocaleString() ?? '0'}
                        </TableCell>
                        <TableCell className="text-blue-700 dark:text-blue-300 font-black text-right p-3 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-200 transition-colors">
                          {adMetrics[ad.adId]?.clicks?.toLocaleString() ?? '0'}
                        </TableCell>
                        <TableCell className="text-center p-3">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-xs font-semibold border border-blue-200 dark:border-blue-700">
                              {adMetrics[ad.adId] && adMetrics[ad.adId].impressions > 0
                                ? `${((adMetrics[ad.adId].clicks / adMetrics[ad.adId].impressions) * 100).toFixed(1)}%`
                                : '0.0%'}
                            </span>
                          </motion.div>
                        </TableCell>
                        <TableCell className="text-center p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div>
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                </Button>
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/campaigns/${campaignId}/ads/${ad.adId}`);
                                }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Eye className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-gray-700 dark:text-gray-300 font-medium">View Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/campaigns/${campaignId}/ads/${ad.adId}/edit`);
                                }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Edit className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloneAd(ad.adId);
                                }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Copy className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Clone</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveAd(ad.adId);
                                }}
                                className="hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                <span className="font-medium">Archive</span>
                              </DropdownMenuItem>
                              {ad.status === 1 ? (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(ad.adId, 0);
                                  }}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Play className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">Activate</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredAds.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <span className="font-medium">
                    {searchQuery 
                      ? `No ads found matching "${searchQuery}"`
                      : "No ads found. Create your first ad to get started."}
                  </span>
                </div>
              </div>
            ) : (
              filteredAds.map((ad, index) => (
                <AdCard key={ad.adId} ad={ad} index={index} />
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ isOpen: false })}
        onConfirm={confirmArchiveAd}
        title="Archive Ad"
        message="Are you sure you want to archive this ad? This action cannot be undone."
        itemName={confirmationModal.adName}
        itemType="ad"
        variant="danger"
      />
    </div>
  );
}