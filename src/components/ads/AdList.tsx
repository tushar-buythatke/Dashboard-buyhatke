import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Play, Pause, Edit, Copy, MoreHorizontal, Image as ImageIcon, ArrowLeft, RefreshCw, Download, TrendingUp, Eye, MousePointerClick, Search, X, AlertTriangle, Zap, Archive, Filter, Rows3 } from 'lucide-react';
import { StatusPill, type StatusKind } from '@/components/ui/status-pill';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { toast } from 'sonner';
import { Ad, Slot, SlotListResponse, ApiAd, mapApiAdToAd } from '@/types';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { analyticsService } from '@/services/analyticsService';
import { adService } from '@/services/adService';
import { exportToCsv } from '@/utils/csvExport';
import { buildApiUrl } from '@/config/api';
import { normalizeAdList, isV2Active } from '@/utils/v2Normalizer';
import { formatCount } from '@/lib/format';
import { getPlatformName } from '@/utils/platform';
import { extractCategoriesForUpdate, getCacheBustedUrl, toLocalDateInput } from '@/utils/adUtils';
import { usePermissions } from '@/context/PermissionsContext';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useCountUp } from '@/hooks/useCountUp';

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

/** A compact stat inside the inline stat-bar row. */
function StatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="halo-chip h-9 w-9 rounded-[10px]">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-[var(--h-ink-2)]">{label}</p>
        <p className="num mt-0.5 text-[1.05rem] font-semibold leading-none text-[var(--h-ink)]">{value}</p>
      </div>
    </div>
  );
}

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
  const [slots, setSlots] = useState<Record<string, any>>({});
  const [campaign, setCampaign] = useState<{ brandName?: string; id?: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [adMetrics, setAdMetrics] = useState<Record<string, { impressions: number; clicks: number; landingCount: number }>>({});
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    adId?: string | number;
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
          // Slots must resolve BEFORE ads so enrichment (slot name/dimensions) has
          // the map — otherwise the SLOT column falls back to the raw id.
          const [, slotsMap] = await Promise.all([
            fetchCampaign(),
            fetchSlots()
          ]);
          await fetchAds(slotsMap);
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
        const metrics = (adMetrics as any)[ad.adId];
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
                campaignId: campaign.id as any,
                adId: ad.adId as any,
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
                campaignId: campaign.id as any,
                adId: ad.adId as any,
                metric: 'clicks',
                improvement
              }
            });
          }
        }
      });
    }
  }, [ads, adMetrics, campaign.id, addNotification]);

  const fetchSlots = async (): Promise<Record<string, any>> => {
    try {
      const response = await fetch(buildApiUrl('/slots'));
      if (!response.ok) throw new Error('Failed to fetch slots');

      const result: SlotListResponse = await response.json();
      if (result.status === 1 && result.data?.slotList) {
        const slotsMap: Record<string, any> = {};
        result.data.slotList.forEach((slot: any) => {
          slotsMap[String(slot.slotId)] = slot;
          if (isV2Active() && slot.slotType) {
            slotsMap[String(slot.slotType)] = slot;
          }
        });
        setSlots(slotsMap as any);
        return slotsMap;
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to load slot information');
    }
    return {};
  };

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`${buildApiUrl('/campaigns')}?campaignId=${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');

      const result = await response.json();
      if (result.status === 1 && result.data?.campaignList?.[0]) {
        const campaignData = result.data.campaignList[0];
        setCampaign({
          ...campaignData,
          id: isV2Active() ? (campaignId || '') : parseInt(campaignId || '0', 10)
        });
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
    }
  };

  const fetchAds = async (slotsMap: Record<string, any> = slots) => {
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
        `${buildApiUrl('/ads')}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch ads');
      }

      const result = await response.json();

      if (result.status === 1 && result.data?.adsList) {
        // Enrich ads with slot information and map to the frontend Ad type
        const adsList = normalizeAdList(result.data.adsList);
        const enrichedAds = adsList.map((apiAd: ApiAd) => {
          const ad = mapApiAdToAd(apiAd);
          const slot = slotsMap[ad.slotId] ?? slotsMap[String((apiAd as any).slotType)];
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
            campaignId: (campaignId ? (isV2Active() ? campaignId : Number(campaignId)) : undefined) as any,
            adId: ad.adId as any
          });
        });

        const metricsResults = await Promise.all(metricsPromises);

        const newAdMetrics: Record<string, any> = {};
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

  const handleCloneAd = async (adId: string | number) => {
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

  const handleArchiveAd = (adId: string | number) => {
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

  const handleStatusChange = async (adId: string | number, newStatus: 0 | 1) => {
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
      const response = await fetch(`${buildApiUrl('/ads/update')}?userId=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId,
          campaignId: adToUpdate.campaignId,
          name: adToUpdate.name,
          label: adToUpdate.label,
          slotType: adToUpdate.slotType ?? adToUpdate.slotId,
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
          couponCode: adToUpdate.couponCode || '',
          impressionCharge: adToUpdate.impressionCharge ?? 0,
          clickCharge: adToUpdate.clickCharge ?? 0,
          minBid: adToUpdate.minBid ?? 0,
          maxBid: adToUpdate.maxBid ?? 0,
          bidModel: adToUpdate.bidModel ?? 0,
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
    const spotlight = useSpotlight();

    return (
      <div
        onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}`)}
        className="halo-card halo-card-interactive halo-spotlight halo-rise p-4"
        style={{ '--i': Math.min(index, 10) } as React.CSSProperties}
        {...spotlight}
      >
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
          {/* Creative */}
          <div className="flex-shrink-0 self-center lg:self-auto">
            <div className="h-16 w-20 flex items-center justify-center overflow-hidden halo-inset">
              {ad.creativeUrl ? (
                isVideo ? (
                  <video
                    src={getCacheBustedUrl(ad.creativeUrl)}
                    className="h-full w-full object-contain rounded-[var(--h-r-sm)]"
                    muted
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img
                    src={getCacheBustedUrl(ad.creativeUrl)}
                    alt="Ad creative"
                    className="h-full w-full object-contain rounded-[var(--h-r-sm)]"
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
                <div className="flex flex-col items-center justify-center text-[var(--h-ink-3)]">
                  <ImageIcon className="h-4 w-4 mb-1" strokeWidth={1.75} />
                  <span className="text-xs font-medium">No media</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill
                    status={ad.status === 1 ? 'live' : ad.status === 0 ? 'paused' : ad.status === -1 ? 'archived' : 'muted'}
                    label={ad.status === 1 ? 'Live' : ad.status === 0 ? 'Paused' : ad.status === -1 ? 'Archived' : 'Unknown'}
                    size="sm"
                  />
                  {ad.slotName && (
                    <span className="halo-badge">{ad.slotName}</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-[var(--h-ink)] mb-1">
                  {ad.name}
                </div>
                {ad.slotWidth && ad.slotHeight && (
                  <p className="text-xs text-[var(--h-ink-3)] num">
                    {Math.round(Number(ad.slotWidth))} × {Math.round(Number(ad.slotHeight))} px
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="btn-halo-ghost btn-halo-icon btn-halo-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/campaigns/${campaignId}/ads/${ad.adId}`);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4 text-[var(--h-iris-600)]" strokeWidth={1.75} />
                    <span>View details</span>
                  </DropdownMenuItem>
                  {canEdit && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/campaigns/${campaignId}/ads/${ad.adId}/edit`);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" strokeWidth={1.75} />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloneAd(ad.adId);
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" strokeWidth={1.75} />
                        <span>Clone</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveAd(ad.adId);
                        }}
                        className="text-[var(--h-coral)] focus:text-[var(--h-coral)] focus:bg-[var(--h-neg-soft)]"
                      >
                        <Archive className="mr-2 h-4 w-4" strokeWidth={1.75} />
                        <span>Archive</span>
                      </DropdownMenuItem>
                      {ad.status === 1 ? (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(ad.adId, 0);
                          }}
                        >
                          <Pause className="mr-2 h-4 w-4 text-[var(--h-amber)]" strokeWidth={1.75} />
                          <span>Pause</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(ad.adId, 1);
                          }}
                        >
                          <Play className="mr-2 h-4 w-4 text-[var(--h-mint)]" strokeWidth={1.75} />
                          <span>Activate</span>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {/* Target Metrics */}
              <div className="text-center p-2 halo-inset">
                <div className="text-[10px] text-[var(--h-ink-3)] mb-1">Target impr.</div>
                <div className="text-sm font-semibold text-[var(--h-ink)] num">
                  {formatCount(ad.impressionTarget)}
                </div>
              </div>
              <div className="text-center p-2 halo-inset">
                <div className="text-[10px] text-[var(--h-ink-3)] mb-1">Target clicks</div>
                <div className="text-sm font-semibold text-[var(--h-ink)] num">
                  {formatCount(ad.clickTarget)}
                </div>
              </div>
              <div className="text-center p-2 halo-inset">
                <div className="text-[10px] text-[var(--h-ink-3)] mb-1">Target CTR</div>
                <div className="text-sm font-semibold text-[var(--h-iris-600)] num">
                  {ad.impressionTarget > 0 ? ((ad.clickTarget / ad.impressionTarget) * 100).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div className="text-center p-2 halo-inset">
                <div className="text-[10px] text-[var(--h-ink-3)] mb-1">Target landing</div>
                <div className="text-sm font-semibold text-[var(--h-ink)]">
                  —
                </div>
              </div>

              {/* Live Metrics */}
              <div className="text-center p-2 halo-inset">
                <div className="text-[10px] text-[var(--h-ink-3)] mb-1">Live impr.</div>
                <div className="text-sm font-semibold text-[var(--h-ink)] num">
                  {formatCount(adMetrics[ad.adId]?.impressions)}
                </div>
              </div>
              <div className="text-center p-2 halo-inset">
                <div className="text-[10px] text-[var(--h-ink-3)] mb-1">Live clicks</div>
                <div className="text-sm font-semibold text-[var(--h-ink)] num">
                  {formatCount(adMetrics[ad.adId]?.clicks)}
                </div>
              </div>
              <div className="text-center p-2 halo-inset">
                <div className="text-[10px] text-[var(--h-ink-3)] mb-1">Live CTR</div>
                <div className="text-sm font-semibold text-[var(--h-iris-600)] num">
                  {adMetrics[ad.adId] && adMetrics[ad.adId].impressions > 0
                    ? ((adMetrics[ad.adId].clicks / adMetrics[ad.adId].impressions) * 100).toFixed(2) + '%'
                    : '0.0%'}
                </div>
              </div>
              <div className="text-center p-2 halo-inset">
                <div className="text-[10px] text-[var(--h-ink-3)] mb-1">Live landing</div>
                <div className="text-sm font-semibold text-[var(--h-ink)] num">
                  {formatCount(adMetrics[ad.adId]?.landingCount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="halo-page">
        <div className="space-y-5">
          <div className="halo-skeleton h-16 rounded-[var(--h-r-lg)]" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="halo-skeleton h-20 rounded-[var(--h-r-card)]" />
            ))}
          </div>
          <div className="halo-skeleton h-96 rounded-[var(--h-r-card)]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="halo-page">
        <div className="halo-card p-5 flex items-center gap-3" role="alert">
          <span className="halo-chip" style={{ background: 'var(--h-neg-soft)', color: 'var(--h-coral)' }}>
            <AlertTriangle size={16} strokeWidth={1.75} />
          </span>
          <div>
            <p className="halo-heading text-[var(--h-coral)]">Error</p>
            <p className="halo-subtitle">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="halo-page">
      <div className="space-y-5">
        {/* Header Section */}
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
            className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--h-ink-3)] hover:text-[var(--h-iris-500)] transition-colors duration-200"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={1.75} />
            Campaigns
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="halo-eyebrow">Ads</p>
              <h1 className="halo-title mt-1">{campaign?.brandName || 'Campaign'}</h1>
              <p className="mt-1.5 halo-subtitle">
                <span className="font-semibold num text-[var(--h-ink-2)]">{totalAds}</span> total
                <span className="mx-1.5 text-[var(--h-ink-3)]">·</span>
                <span className="font-semibold num text-[var(--h-mint)]">{activeAds}</span> live
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={fetchAds} className="btn-halo-ghost btn-halo-sm">
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                Refresh
              </button>
              <button onClick={handleExport} className="btn-halo-ghost btn-halo-sm">
                <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                Export
              </button>
              {canEdit && (
                <button
                  onClick={() => navigate(`/campaigns/${campaignId}/ads/new`)}
                  className="btn-halo btn-halo-sm"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Create ad
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Performance overview — one vivid hero + a compact stat bar, not six cloned cards.
            The hero's color follows performance: green once ads are hitting target,
            iris while there isn't enough data to judge yet, red when falling well short. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 items-stretch">
          <div
            className={`halo-mesh ${
              totalTargetImpressions === 0 || totalLiveImpressions === 0
                ? 'halo-mesh-iris'
                : liveCTR >= targetCTR
                ? 'halo-mesh-mint'
                : liveCTR >= targetCTR / 2
                ? 'halo-mesh-iris'
                : 'halo-mesh-coral'
            } halo-rise relative flex flex-col justify-between overflow-hidden rounded-[var(--h-r-card)] p-5 lg:col-span-2`}
            style={{ '--i': 0 } as React.CSSProperties}
          >
            <div className="halo-mesh-grain" aria-hidden="true" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-white/75">Live impressions</span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                {totalTargetImpressions > 0 ? Math.min(100, Math.round((totalLiveImpressions / totalTargetImpressions) * 100)) : 0}% of target
              </span>
            </div>
            <div>
              <p className="num mt-1 text-[2rem] font-semibold leading-none tracking-[-0.03em]">
                {formatCount(totalLiveImpressions)}
              </p>
              <p className="mt-1.5 text-[12.5px] text-white/60">
                of {formatCount(totalTargetImpressions)} targeted · {liveCTR.toFixed(2)}% CTR vs {targetCTR.toFixed(2)}% target
              </p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white/80"
                  style={{ width: `${totalTargetImpressions > 0 ? Math.min(100, (totalLiveImpressions / totalTargetImpressions) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="halo-card halo-rise grid grid-cols-2 content-center divide-y divide-[var(--h-line)] sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-[var(--h-line)] lg:col-span-3" style={{ '--i': 1 } as React.CSSProperties}>
            <StatItem label="Total ads" value={formatCount(totalAds)} icon={<TrendingUp className="h-4 w-4" strokeWidth={2} />} />
            <StatItem label="Active ads" value={formatCount(activeAds)} icon={<Play className="h-4 w-4" strokeWidth={2} />} />
            <StatItem label="Live clicks" value={formatCount(totalLiveClicks)} icon={<MousePointerClick className="h-4 w-4" strokeWidth={2} />} />
            <StatItem label="Live landings" value={formatCount(totalLiveLandingCount)} icon={<Zap className="h-4 w-4" strokeWidth={2} />} />
          </div>
        </div>

        {/* Search + filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="halo-glass rounded-[var(--h-r-lg)] p-3 sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--h-ink-3)] pointer-events-none" strokeWidth={1.75} />
            <Input
              placeholder="Search ads by name…"
              className="halo-field halo-search h-9 text-[12.5px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="btn-halo-ghost btn-halo-icon btn-halo-sm"
                >
                  <span className="sr-only">Clear search</span>
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--h-ink-3)]" strokeWidth={1.75} />
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
              <SelectTrigger className="halo-field w-40 h-9 text-[12.5px]">
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
            <span className="halo-badge halo-badge-iris">
              {filteredAds.length} {filteredAds.length === 1 ? 'result' : 'results'}
            </span>
          )}
        </motion.div>

        {(searchQuery || statusFilter !== 'all') && filteredAds.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="halo-card p-4 flex items-start gap-3"
          >
            <span className="halo-chip" style={{ background: 'var(--h-warn-soft)', color: 'var(--h-amber)' }}>
              <Filter size={16} strokeWidth={1.75} />
            </span>
            <div>
              <div className="text-[var(--h-ink)] font-medium text-sm">
                No ads found {searchQuery && `matching "${searchQuery}"`}
                {statusFilter !== 'all' && ` with status "${statusOptions.find(opt => opt.value === statusFilter)?.label}"`}
              </div>
              <p className="halo-subtitle mt-0.5">
                Try adjusting your filters or create a new ad
              </p>
            </div>
          </motion.div>
        )}

        {/* Ads Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Desktop Table View */}
          <div className="hidden lg:block halo-card overflow-hidden">
            <div className="halo-panel-head halo-panel-head-mesh">
              <div className="halo-mesh-grain" aria-hidden="true" />
              <div className="halo-panel-head-title">
                <span className="halo-chip"><Rows3 size={16} strokeWidth={1.75} /></span>
                <h3 className="halo-heading">Ad list</h3>
              </div>
              <span className="halo-badge num">{filteredAds.length} ads</span>
            </div>
            <div className="halo-scroll-x">
              <Table className="halo-table min-w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[100px] px-4">
                      Creative
                    </TableHead>
                    <TableHead className="w-[120px]">
                      Status
                    </TableHead>
                    <TableHead className="w-[180px]">
                      Name
                    </TableHead>
                    <TableHead className="w-[140px]">
                      Slot
                    </TableHead>
                    {/* Target group */}
                    <TableHead className="col-num w-[120px]">
                      Target impr.
                    </TableHead>
                    <TableHead className="col-num w-[120px]">
                      Target clicks
                    </TableHead>
                    <TableHead className="w-[110px] text-center">
                      Target CTR
                    </TableHead>
                    {/* Live group */}
                    <TableHead className="col-num w-[120px]">
                      Live impr.
                    </TableHead>
                    <TableHead className="col-num w-[120px]">
                      Live clicks
                    </TableHead>
                    <TableHead className="w-[110px] text-center">
                      Live CTR
                    </TableHead>
                    <TableHead className="col-num w-[120px]">
                      Live landing
                    </TableHead>
                    <TableHead className="w-[80px] text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAds.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={12} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 py-6">
                          <span className="halo-chip-lg"><ImageIcon size={20} strokeWidth={1.75} /></span>
                          <span className="halo-heading">
                            {searchQuery
                              ? `No ads found matching "${searchQuery}"`
                              : 'No ads yet'}
                          </span>
                          <p className="halo-subtitle">
                            {searchQuery ? 'Try a different search term' : 'Create your first ad to get started'}
                          </p>
                          {!searchQuery && canEdit && (
                            <button
                              onClick={() => navigate(`/campaigns/${campaignId}/ads/new`)}
                              className="btn-halo btn-halo-sm mt-2"
                            >
                              <Plus size={14} strokeWidth={1.75} />
                              Create ad
                            </button>
                          )}
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
                          // Include a 0-alpha same-hue backgroundColor in the resting state so
                          // framer interpolates rgba→rgba on hover (animating from `transparent`
                          // resolves to oklab(0 0 0 / 0), which it warns is not animatable).
                          animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(99, 76, 230, 0)' }}
                          transition={{ duration: 0.3, delay: index * 0.02 }}
                          whileHover={{
                            scale: 1.005,
                            backgroundColor: theme === 'dark' ? 'rgba(99, 76, 230, 0.08)' : 'rgba(99, 76, 230, 0.04)'
                          }}
                          onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}`)}
                          className="group cursor-pointer"
                        >
                          <TableCell className="p-3">
                            <div className="h-14 w-20 flex items-center justify-center overflow-hidden halo-inset">
                              {ad.creativeUrl ? (
                                isVideo ? (
                                  <video
                                    src={getCacheBustedUrl(ad.creativeUrl)}
                                    className="h-full w-full object-contain rounded-[var(--h-r-sm)]"
                                    muted
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <img
                                    src={getCacheBustedUrl(ad.creativeUrl)}
                                    alt="Ad creative"
                                    className="h-full w-full object-contain rounded-[var(--h-r-sm)]"
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
                                <div className="flex flex-col items-center justify-center text-[var(--h-ink-3)]">
                                  <ImageIcon className="h-4 w-4 mb-1" strokeWidth={1.75} />
                                  <span className="text-[10px] font-semibold">No media</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="p-3">
                            <span className="inline-flex items-center gap-1.5">
                              <StatusPill
                                status={ad.status === 1 ? 'live' : ad.status === 0 ? 'paused' : ad.status === -1 ? 'archived' : 'muted'}
                                label={ad.status === 1 ? 'Live' : ad.status === 0 ? 'Paused' : ad.status === -1 ? 'Archived' : 'Unknown'}
                                size="sm"
                              />
                            </span>
                          </TableCell>
                          <TableCell className="p-3">
                            <span className="text-[13px] font-semibold tracking-[-0.005em] text-[var(--h-ink)] truncate max-w-32 group-hover:text-[var(--h-iris-600)] transition-colors">{ad.name}</span>
                          </TableCell>
                          <TableCell className="p-3">
                            {ad.slotName && (
                              <div className="flex flex-col space-y-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[13px] font-semibold tracking-[-0.005em] text-[var(--h-ink-2)] truncate max-w-32 group-hover:text-[var(--h-iris-600)] transition-colors cursor-help">{ad.slotName}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-none">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-semibold">{ad.slotName}</span>
                                      <span className="text-[10.5px] opacity-90">
                                        <span className="opacity-70">slotId: </span>
                                        <span className="font-mono">{String(ad.slotId)}</span>
                                      </span>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                {ad.slotWidth && ad.slotHeight && (
                                  <span className="w-fit self-start halo-badge num whitespace-nowrap">
                                    {Math.round(Number(ad.slotWidth))} × {Math.round(Number(ad.slotHeight))} px
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="col-num p-3">
                            {formatCount(ad.impressionTarget)}
                          </TableCell>
                          <TableCell className="col-num p-3">
                            {formatCount(ad.clickTarget)}
                          </TableCell>
                          <TableCell className="text-center p-3">
                            <span className="halo-badge halo-badge-iris num">
                              {ad.impressionTarget > 0 ? `${((ad.clickTarget / ad.impressionTarget) * 100).toFixed(2)}%` : '0.00%'}
                            </span>
                          </TableCell>
                          <TableCell className="col-num p-3">
                            {formatCount(adMetrics[ad.adId]?.impressions)}
                          </TableCell>
                          <TableCell className="col-num p-3">
                            {formatCount(adMetrics[ad.adId]?.clicks)}
                          </TableCell>
                          <TableCell className="text-center p-3">
                            {(() => {
                              const targetCtrPct = ad.impressionTarget > 0 ? (ad.clickTarget / ad.impressionTarget) * 100 : 0;
                              const liveImpr = adMetrics[ad.adId]?.impressions ?? 0;
                              const liveCtrPct = liveImpr > 0 ? ((adMetrics[ad.adId]?.clicks ?? 0) / liveImpr) * 100 : 0;
                              const tone = liveImpr === 0 ? '' : liveCtrPct >= targetCtrPct ? 'halo-badge-pos' : liveCtrPct >= targetCtrPct / 2 ? 'halo-badge-warn' : 'halo-badge-neg';
                              return (
                                <span className={`halo-badge num ${tone}`}>
                                  {liveCtrPct.toFixed(2)}%
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="col-num p-3">
                            {formatCount(adMetrics[ad.adId]?.landingCount)}
                          </TableCell>
                          <TableCell className="text-center p-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="btn-halo-ghost btn-halo-icon btn-halo-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/campaigns/${campaignId}/ads/${ad.adId}`);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" strokeWidth={1.75} />
                                  <span>View details</span>
                                </DropdownMenuItem>
                                {canEdit && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/campaigns/${campaignId}/ads/${ad.adId}/edit`);
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" strokeWidth={1.75} />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloneAd(ad.adId);
                                      }}
                                    >
                                      <Copy className="mr-2 h-4 w-4" strokeWidth={1.75} />
                                      <span>Clone</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArchiveAd(ad.adId);
                                      }}
                                      className="text-[var(--h-coral)] focus:text-[var(--h-coral)] focus:bg-[var(--h-neg-soft)]"
                                    >
                                      <Archive className="mr-2 h-4 w-4" strokeWidth={1.75} />
                                      <span>Archive</span>
                                    </DropdownMenuItem>
                                    {ad.status === 1 ? (
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(ad.adId, 0);
                                        }}
                                      >
                                        <Pause className="mr-2 h-4 w-4 text-[var(--h-amber)]" strokeWidth={1.75} />
                                        <span>Pause</span>
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(ad.adId, 1);
                                        }}
                                      >
                                        <Play className="mr-2 h-4 w-4 text-[var(--h-mint)]" strokeWidth={1.75} />
                                        <span>Activate</span>
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
          <div className="lg:hidden space-y-3">
            {filteredAds.length === 0 ? (
              <div className="halo-card text-center py-12">
                <span className="halo-chip-lg mx-auto"><ImageIcon size={20} strokeWidth={1.75} /></span>
                <p className="halo-heading mt-3">
                  {searchQuery
                    ? `No ads found matching "${searchQuery}"`
                    : 'No ads yet'}
                </p>
                <p className="halo-subtitle mt-1">
                  {searchQuery ? 'Try a different search term' : 'Create your first ad to get started'}
                </p>
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
        title="Archive ad"
        message="Are you sure you want to archive this ad? This action cannot be undone."
        itemName={confirmationModal.adName}
        itemType="ad"
        variant="danger"
      />
    </div>
  );
}