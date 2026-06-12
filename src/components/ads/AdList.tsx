import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Play, Pause, Edit, Copy, MoreHorizontal, Image as ImageIcon, ArrowLeft, RefreshCw, Download, TrendingUp, Eye, MousePointerClick, Search, X, Target, Activity, Zap, Star, Sparkles, Archive, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPill, type StatusKind } from '@/components/ui/status-pill';
import { MetricCard } from '@/components/ui/metric-card';
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
import { formatCount } from '@/lib/format';
import { getPlatformName } from '@/utils/platform';
import { extractCategoriesForUpdate, getCacheBustedUrl, toLocalDateInput } from '@/utils/adUtils';
import { usePermissions } from '@/context/PermissionsContext';

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
  const { canEdit } = usePermissions();
  const { checkPerformanceAlerts, addNotification } = useNotifications();
  const [ads, setAds] = useState<Ad[]>([]);
  const [filteredAds, setFilteredAds] = useState<Ad[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const statusFilter = searchParams.get('status') || 'all';
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Record<number, Slot>>({});
  const [campaign, setCampaign] = useState<{ brandName?: string; id?: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [adMetrics, setAdMetrics] = useState<Record<number, { impressions: number; clicks: number; landingCount: number }>>({});
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

        const newAdMetrics: Record<number, { impressions: number; clicks: number; landingCount: number }> = {};
        metricsResults.forEach((resp, index) => {
          const adId = enrichedAds[index].adId;
          if (resp.success && resp.data) {
            newAdMetrics[adId] = {
              impressions: resp.data.impressions,
              clicks: resp.data.clicks,
              landingCount: resp.data.landingCount,
            };
          }
        });

        setAdMetrics(newAdMetrics);

        // Check for performance alerts with enriched data
        const adsWithMetrics = enrichedAds.map((ad: Ad) => ({
          ...ad,
          liveImpressions: newAdMetrics[ad.adId]?.impressions || 0,
          liveClicks: newAdMetrics[ad.adId]?.clicks || 0,
          liveLandingCount: newAdMetrics[ad.adId]?.landingCount || 0,
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
      // Find the ad to get all its data
      const adToUpdate = ads.find(a => a.adId === adId);
      if (!adToUpdate) {
        toast.error('Ad not found');
        return;
      }

      // Extract categories for payload
      const categoriesPayload = extractCategoriesForUpdate(adToUpdate.categories);

      // Send full ad data to prevent backend from resetting missing fields
      const response = await fetch(`${getApiBaseUrl()}/ads/update?userId=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId,
          campaignId: adToUpdate.campaignId,
          name: adToUpdate.name,
          label: adToUpdate.label,
          slotId: adToUpdate.slotId,
          impressionTarget: adToUpdate.impressionTarget,
          clickTarget: adToUpdate.clickTarget,
          impressionPixel: adToUpdate.impressionPixel,
          clickPixel: adToUpdate.clickPixel,
          targetUrl: adToUpdate.targetUrl,
          status: newStatus,
          categories: categoriesPayload,
          sites: adToUpdate.sites,
          location: adToUpdate.location,
          brandTargets: adToUpdate.brandTargets,
          priceRangeMin: adToUpdate.priceRangeMin,
          priceRangeMax: adToUpdate.priceRangeMax,
          ageRangeMin: adToUpdate.ageRangeMin,
          ageRangeMax: adToUpdate.ageRangeMax,
          priority: adToUpdate.priority,
          startDate: toLocalDateInput(adToUpdate.startDate),
          startTime: adToUpdate.startTime,
          endDate: toLocalDateInput(adToUpdate.endDate),
          endTime: adToUpdate.endTime,
          creativeUrl: adToUpdate.creativeUrl,
          logo: adToUpdate.logo || '',
          otherDetails: adToUpdate.otherDetails || {},
          gender: adToUpdate.gender,
          isTestPhase: adToUpdate.isTestPhase,
          serveStrategy: adToUpdate.serveStrategy,
          isModelType: adToUpdate.isModelType,
        })
      });

      if (!response.ok) throw new Error('Failed to update ad status');

      const result = await response.json();
      if (result.status === 1) {
        toast.success(`Ad ${newStatus === 1 ? 'activated' : 'paused'} successfully`, { id: 'ad-status' });
        fetchAds();
      }
    } catch (error) {
      console.error('Error updating ad status:', error);
      toast.error('Failed to update ad status', { id: 'ad-status' });
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
  const totalLiveLandingCount = Object.values(adMetrics).reduce((sum, metrics) => sum + (metrics.landingCount || 0), 0);
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
        className="velvet-surface rounded-xl p-4 hover:shadow-[var(--shadow-2)] hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] cursor-pointer group"
      >
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
          {/* Creative */}
          <div className="flex-shrink-0 self-center lg:self-auto">
            <div className="h-16 w-20 flex items-center justify-center overflow-hidden bg-[var(--bg-panel-2)] rounded-lg border border-[var(--line)] shadow-[var(--shadow-1)] group-hover:border-[var(--line-violet)] group-hover:shadow-[var(--shadow-2)] transition-all duration-200">
              {ad.creativeUrl ? (
                isVideo ? (
                  <video
                    src={getCacheBustedUrl(ad.creativeUrl)}
                    className="h-full w-full object-contain rounded-md transition-transform duration-300 group-hover:scale-105"
                    muted
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img
                    src={getCacheBustedUrl(ad.creativeUrl)}
                    alt="Ad creative"
                    className="h-full w-full object-contain rounded-md transition-transform duration-300 group-hover:scale-105"
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
                  <StatusPill
                    status={ad.status === 1 ? 'live' : ad.status === 0 ? 'paused' : ad.status === -1 ? 'archived' : 'muted'}
                    label={ad.status === 1 ? 'Live' : ad.status === 0 ? 'Paused' : ad.status === -1 ? 'Archived' : 'Unknown'}
                    size="sm"
                  />
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {Math.round(Number(ad.slotWidth))} × {Math.round(Number(ad.slotHeight))} px
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
                  {canEdit && (
                    <>
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
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mt-3">
              {/* Target Metrics */}
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Impr.</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCount(ad.impressionTarget)}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Clicks</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCount(ad.clickTarget)}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target CTR</div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {ad.impressionTarget > 0 ? ((ad.clickTarget / ad.impressionTarget) * 100).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Landing</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  —
                </div>
              </div>

              {/* Live Metrics */}
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Live Impr.</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCount(adMetrics[ad.adId]?.impressions)}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Live Clicks</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCount(adMetrics[ad.adId]?.clicks)}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Live CTR</div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {adMetrics[ad.adId] && adMetrics[ad.adId].impressions > 0
                    ? ((adMetrics[ad.adId].clicks / adMetrics[ad.adId].impressions) * 100).toFixed(2) + '%'
                    : '0.0%'}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Live Landing</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCount(adMetrics[ad.adId]?.landingCount)}
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
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            aria-label="Back to campaigns"
            className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-3)] hover:text-[var(--indigo-500)] transition-colors duration-200"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Campaigns
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="page-display">
                <span className="velvet-header-gradient">{campaign?.brandName || 'Campaign'}</span>
              </h1>
              <p className="mt-1.5 text-[12.5px] text-[var(--text-2)]">
                <span className="font-semibold tabular-nums">{totalAds}</span> total
                <span className="mx-1.5 text-[var(--text-3)]">·</span>
                <span className="font-semibold tabular-nums text-emerald-600">{activeAds}</span> live
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAds}
                className="h-8 gap-1.5 text-[12px] text-[var(--text-2)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="h-8 gap-1.5 text-[12px] text-[var(--text-2)]"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/campaigns/${campaignId}/ads/new`)}
                  className="btn-velvet h-8 gap-1.5 px-3 text-[12px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Ad
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Performance overview */}
        <div className="space-y-3">
          <h2 className="velvet-section-title">Performance overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <MetricCard
              label="Total Ads"
              value={totalAds}
              tone="violet"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              label="Active Ads"
              value={activeAds}
              tone="accent"
              icon={<Play className="h-4 w-4" />}
            />
            <div className="metric-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-500 to-rose-500" />
              <div className="relative z-[1]">
                <div className="metric-label flex items-center gap-1.5">
                  <Eye className="h-3 w-3 text-pink-500" />
                  Impressions
                </div>
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Target</span>
                    <span className="text-[13px] font-semibold tabular-nums text-[var(--text-1)]">{formatCount(totalTargetImpressions)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Live</span>
                    <span className="text-[13px] font-semibold tabular-nums text-emerald-600">{formatCount(totalLiveImpressions)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="metric-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-purple-500" />
              <div className="relative z-[1]">
                <div className="metric-label flex items-center gap-1.5">
                  <MousePointerClick className="h-3 w-3 text-violet-500" />
                  Clicks
                </div>
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Target</span>
                    <span className="text-[13px] font-semibold tabular-nums text-[var(--text-1)]">{formatCount(totalTargetClicks)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Live</span>
                    <span className="text-[13px] font-semibold tabular-nums text-emerald-600">{formatCount(totalLiveClicks)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="metric-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="relative z-[1]">
                <div className="metric-label flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-amber-500" />
                  CTR
                </div>
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Target</span>
                    <span className="text-[13px] font-semibold tabular-nums text-[var(--text-1)]">{targetCTR.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Live</span>
                    <span className={`text-[13px] font-semibold tabular-nums ${liveCTR >= targetCTR ? 'text-emerald-600' : 'text-amber-600'}`}>{liveCTR.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
            <MetricCard
              label="Landing"
              value={totalLiveLandingCount}
              tone="plum"
              icon={<Zap className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Search + filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
            <Input
              placeholder="Search ads by name..."
              className="pl-8 h-9 border-[var(--line)] bg-[var(--bg-panel)] text-[12.5px] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:ring-2 focus:ring-[var(--line-violet)] focus:border-[var(--line-violet)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[var(--text-3)] hover:text-[var(--indigo-500)] hover:bg-[var(--bg-tint)] rounded-full p-1 transition-all duration-200"
                >
                  <span className="sr-only">Clear search</span>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--text-3)]" />
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
              <SelectTrigger className="w-40 h-10 bg-white/70 dark:bg-[var(--bg-panel-2)]/70 border-slate-200/80 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-[var(--text-1)] rounded-xl backdrop-blur-sm">
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

          {(searchQuery || statusFilter !== 'all') && (
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-3)]">
              {filteredAds.length} {filteredAds.length === 1 ? 'result' : 'results'}
            </span>
          )}
        </motion.div>

        {(searchQuery || statusFilter !== 'all') && filteredAds.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-3 px-4 bg-amber-50/80 dark:bg-amber-900/20 rounded-xl border border-amber-200/80 dark:border-amber-700/50"
          >
            <div className="text-amber-700 dark:text-amber-300 font-medium text-sm">
              No ads found {searchQuery && `matching "${searchQuery}"`}
              {statusFilter !== 'all' && ` with status "${statusOptions.find(opt => opt.value === statusFilter)?.label}"`}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Try adjusting your filters or create a new ad
            </p>
          </motion.div>
        )}

        {/* Ads Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Enhanced Desktop Table View */}
          <div className="hidden lg:block velvet-surface overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-b border-[var(--line)] hover:bg-transparent bg-[var(--bg-panel-2)]">
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[100px] px-4">
                      Creative
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[120px] px-3">
                      Status
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[180px] px-3">
                      Name
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[140px] px-3">
                      Slot
                    </TableHead>
                    {/* Target group */}
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[120px] text-right px-3">
                      Target Impr.
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[120px] text-right px-3">
                      Target Clicks
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[110px] text-center px-3">
                      Target CTR
                    </TableHead>
                    {/* Live group */}
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[120px] text-right px-3">
                      Live Impr.
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[120px] text-right px-3">
                      Live Clicks
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[110px] text-center px-3">
                      Live CTR
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[120px] text-right px-3">
                      Live Landing
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)] w-[80px] text-center px-3">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-32 text-center">
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
                            backgroundColor: theme === 'dark' ? 'rgba(99, 76, 230, 0.08)' : 'rgba(99, 76, 230, 0.04)'
                          }}
                          onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}`)}
                          className="group velvet-row-hover transition-colors duration-150 border-[var(--line)] cursor-pointer"
                        >
                          <TableCell className="p-3">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 300 }}
                              className="h-14 w-20 flex items-center justify-center overflow-hidden bg-[var(--bg-panel-2)] rounded-lg border border-[var(--line)] shadow-[var(--shadow-1)] group-hover:border-[var(--line-violet)] group-hover:shadow-[var(--shadow-2)] transition-all duration-200"
                            >
                              {ad.creativeUrl ? (
                                isVideo ? (
                                  <video
                                    src={getCacheBustedUrl(ad.creativeUrl)}
                                    className="h-full w-full object-contain rounded-md transition-transform duration-300 group-hover:scale-105"
                                    muted
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <img
                                    src={getCacheBustedUrl(ad.creativeUrl)}
                                    alt="Ad creative"
                                    className="h-full w-full object-contain rounded-md transition-transform duration-300 group-hover:scale-105"
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
                                <div className="flex flex-col items-center justify-center text-[var(--text-3)]">
                                  <ImageIcon className="h-4 w-4 mb-1" />
                                  <span className="text-[10px] font-semibold">No Media</span>
                                </div>
                              )}
                            </motion.div>
                          </TableCell>
                          <TableCell className="p-3">
                            <StatusPill
                              status={ad.status === 1 ? 'live' : ad.status === 0 ? 'paused' : ad.status === -1 ? 'archived' : 'muted'}
                              label={ad.status === 1 ? 'Live' : ad.status === 0 ? 'Paused' : ad.status === -1 ? 'Archived' : 'Unknown'}
                              size="sm"
                            />
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 font-semibold p-3">
                            <span className="text-[13px] font-semibold tracking-[-0.005em] truncate max-w-32 group-hover:text-[var(--indigo-500)] transition-colors">{ad.name}</span>
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 font-semibold p-3">
                            {ad.slotName && (
                              <div className="flex flex-col space-y-1">
                                <span className="text-[13px] font-semibold tracking-[-0.005em] truncate max-w-32 group-hover:text-[var(--indigo-500)] transition-colors">{ad.slotName}</span>
                                {ad.slotWidth && ad.slotHeight && (
                                  <span className="text-[10.5px] text-[var(--text-3)] bg-[var(--bg-panel-2)] border border-[var(--line)] px-2 py-0.5 rounded-md text-center font-medium tabular-nums">
                                    {Math.round(Number(ad.slotWidth))} × {Math.round(Number(ad.slotHeight))} px
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-[12px] font-semibold tabular-nums text-[var(--text-1)] text-right p-3">
                            {formatCount(ad.impressionTarget)}
                          </TableCell>
                          <TableCell className="text-[12px] font-semibold tabular-nums text-[var(--text-1)] text-right p-3">
                            {formatCount(ad.clickTarget)}
                          </TableCell>
                          <TableCell className="text-center p-3">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <span className="bg-[var(--bg-tint)] text-[var(--indigo-500)] px-2 py-0.5 rounded-md text-[10.5px] font-semibold border border-[var(--line-violet)]">
                                {ad.impressionTarget > 0 ? `${((ad.clickTarget / ad.impressionTarget) * 100).toFixed(2)}%` : '0.00%'}
                              </span>
                            </motion.div>
                          </TableCell>
                          <TableCell className="text-[12px] font-semibold tabular-nums text-[var(--text-1)] text-right p-3">
                            {formatCount(adMetrics[ad.adId]?.impressions)}
                          </TableCell>
                          <TableCell className="text-[12px] font-semibold tabular-nums text-[var(--text-1)] text-right p-3">
                            {formatCount(adMetrics[ad.adId]?.clicks)}
                          </TableCell>
                          <TableCell className="text-center p-3">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <span className="bg-[var(--bg-tint)] text-[var(--indigo-500)] px-2 py-0.5 rounded-md text-[10.5px] font-semibold tabular-nums border border-[var(--line-violet)]">
                                {adMetrics[ad.adId] && adMetrics[ad.adId].impressions > 0
                                  ? `${((adMetrics[ad.adId].clicks / adMetrics[ad.adId].impressions) * 100).toFixed(2)}%`
                                  : '0.00%'}
                              </span>
                            </motion.div>
                          </TableCell>
                          <TableCell className="text-[12px] font-semibold tabular-nums text-[var(--text-1)] text-right p-3">
                            {formatCount(adMetrics[ad.adId]?.landingCount)}
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
                                {canEdit && (
                                  <>
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
                                  </>
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