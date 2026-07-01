import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Copy, Play, Pause, Calendar, Target, Eye, MousePointerClick, Clock, Globe, Users, Tag, MapPin, Banknote, Settings, Image as ImageIcon, TrendingUp, BarChart3, Download, Zap, ChevronRight, Check, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VelvetBackButton } from '@/components/ui/velvet-back-button';
import { Badge } from '@/components/ui/badge';
import { StatusPill, type StatusKind } from '@/components/ui/status-pill';
import { toast } from 'sonner';
import { Ad, Slot, ApiAd, mapApiAdToAd, CategoryPath } from '@/types';
import { motion } from 'framer-motion';
import { analyticsService } from '@/services/analyticsService';
import { exportToCsv } from '@/utils/csvExport';
import { buildApiUrl } from '@/config/api';
import { normalizeAd, normalizeSlotList, isV2Active, resolveCatIds } from '@/utils/v2Normalizer';
import { getPlatformName } from '@/utils/platform';
import { extractCategoriesForUpdate, getCacheBustedUrl, toLocalDateInput } from '@/utils/adUtils';
import { usePermissions } from '@/context/PermissionsContext';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import { formatCount } from '@/lib/format';

// Placeholder image URL
const PLACEHOLDER_IMAGE = 'https://eos.org/wp-content/uploads/2023/10/moon-2.jpg';

const easeOut = [0.22, 1, 0.36, 1] as const;

/** Velvet section panel — tinted icon chip + mono label header, gradient hairline via .velvet-panel */
function SectionPanel({
  icon,
  title,
  aside,
  delay = 0,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  aside?: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: easeOut }}
      className={cn('velvet-panel velvet-micro-shadow overflow-hidden', className)}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-tint)] text-[var(--indigo-400)]">
            {icon}
          </span>
          <h3 className="page-eyebrow !mb-0 !text-[11px] text-[var(--text-2)]">{title}</h3>
        </div>
        {aside}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </motion.section>
  );
}

/** Small labelled value used inside detail sections */
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="metric-label">{label}</div>
      <div className="mt-1 text-sm font-semibold tracking-tight text-[var(--text-1)]">{children}</div>
    </div>
  );
}

/** Code block for pixel/landing URLs with a "copy to clipboard" affordance. */
function CodeField({ label, value }: { label: string; value?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      toast.error('Copy failed — try selecting manually');
    }
  };

  const hasValue = !!value && value.trim().length > 0;

  return (
    <div>
      <div className="metric-label flex items-center gap-1.5">
        <Code2 className="h-3 w-3" />
        {label}
      </div>
      <div className="panel-inset relative mt-1.5 group/code">
        <p className="break-all font-mono text-[11.5px] leading-relaxed text-[var(--text-2)] pr-9 pl-3 py-2.5">
          {hasValue ? value : <span className="text-[var(--text-3)] italic">Not configured</span>}
        </p>
        {hasValue && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy to clipboard"
            className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md
                       text-[var(--text-3)] opacity-0 group-hover/code:opacity-100
                       hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)]
                       transition-all duration-200"
          >
            {copied ? <Check className="h-3 w-3 text-[var(--pos)]" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

/** Deep-violet category tag pill — for category filters and target tags. */
const tagPill =
  'inline-flex items-center gap-1 rounded-full bg-purple-100/60 dark:bg-[var(--bg-tint)] px-2.5 py-1 text-[11.5px] font-medium text-purple-900 dark:text-[var(--indigo-400)] border border-purple-200/40 dark:border-[var(--line-violet)]';

const chip =
  'inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-panel-2)] px-2.5 py-1 text-xs font-medium text-[var(--text-1)]';

export function AdDetail() {
  const { campaignId, adId } = useParams<{ campaignId: string; adId: string }>();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const [ad, setAd] = useState<Ad | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [campaign, setCampaign] = useState<{ brandName?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<{ impressions: number; clicks: number; landingCount: number } | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    if (campaignId && adId) {
      fetchAdDetails();
    }
  }, [campaignId, adId]);

  const fetchAdDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ad details, slot info, and campaign info in parallel
      const [adResponse, slotsResponse, campaignResponse] = await Promise.all([
        fetch(`${buildApiUrl('/ads')}?campaignId=${campaignId}&adId=${adId}&slotId=&status=`),
        fetch(buildApiUrl('/slots')),
        fetch(`${buildApiUrl('/campaigns')}?campaignId=${campaignId}`)
      ]);

      if (!adResponse.ok || !slotsResponse.ok || !campaignResponse.ok) {
        throw new Error('Failed to fetch ad details');
      }

      const [adResult, slotsResult, campaignResult] = await Promise.all([
        adResponse.json(),
        slotsResponse.json(),
        campaignResponse.json()
      ]);

      // Set ad data
      if (adResult.status === 1 && adResult.data?.adsList?.[0]) {
          const apiAd = normalizeAd(adResult.data.adsList[0]) as ApiAd;
        let adData = mapApiAdToAd(apiAd);

        if (isV2Active() && adData.categories) {
          const catIds = Object.keys(adData.categories as Record<string, unknown>);
          if (catIds.length > 0) {
            try {
              const nameMap = await resolveCatIds(catIds);
              const resolved: Record<string, string> = {};
              for (const catId of catIds) {
                resolved[catId] = nameMap[catId] || String(catId);
              }
              adData = { ...adData, categories: resolved };
            } catch {}
          }
        }

        setAd(adData);
        fetchLiveMetrics(adData);
      } else {
        setError('Ad not found');
        return;
      }

      // Set slot data
      if (slotsResult.status === 1 && slotsResult.data?.slotList) {
          const adData = normalizeAd(adResult.data.adsList[0]);
        const slotData = slotsResult.data.slotList.find((s: Slot) =>
          s.slotId === adData.slotId || (isV2Active() && s.slotType === String(adData.slotId))
        );
        if (slotData) setSlot(slotData);
      }

      // Set campaign data
      if (campaignResult.status === 1 && campaignResult.data?.campaignList?.[0]) {
        setCampaign(campaignResult.data.campaignList[0]);
      }

    } catch (error) {
      console.error('Error fetching ad details:', error);
      setError('Failed to load ad details');
      toast.error('Failed to load ad details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveMetrics = async (currentAd: Ad) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const fromDate = currentAd.createdAt.split('T')[0];
      const resp = await analyticsService.getMetrics({
        from: fromDate,
        to: today,
        campaignId: isV2Active() ? (campaignId ?? '') : Number(campaignId),
        adId: currentAd.adId
      });
      if (resp.success && resp.data) {
        setLiveMetrics({
          impressions: resp.data.impressions,
          clicks: resp.data.clicks,
          landingCount: resp.data.landingCount,
        });
      }
    } catch (error) {
      console.error('Error fetching live metrics:', error);
    }
  };

  const handleCloneAd = async () => {
    if (!ad) return;

    try {
      const response = await fetch(`${buildApiUrl('/ads/clone')}?userId=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.adId })
      });

      if (!response.ok) throw new Error('Failed to clone ad');

      const result = await response.json();
      if (result.status === 1) {
        toast.success('Ad cloned successfully');
        navigate(`/campaigns/${campaignId}/ads`);
      }
    } catch (error) {
      console.error('Error cloning ad:', error);
      toast.error('Failed to clone ad');
    }
  };

  const handleExport = () => {
    if (!ad) {
      toast.error('No ad data to export');
      return;
    }

    // Prepare detailed CSV data for single ad
    const csvData = [{
      'Ad ID': ad.adId,
      'Ad Name': ad.name,
      'Campaign ID': campaignId,
      'Campaign Name': campaign?.brandName || 'N/A',
      'Status': ad.status === 1 ? 'Live' : ad.status === 0 ? 'Draft' : 'Paused',
      'Slot ID': ad.slotId,
      'Slot Name': slot?.name || 'N/A',
      'Platform': slot?.platform !== undefined ? getPlatformName(slot.platform) : 'N/A',
      'Impression Target': ad.impressionTarget || 0,
      'Click Target': ad.clickTarget || 0,
      'Creative URL': ad.creativeUrl || 'N/A',
      'Impression Pixel': ad.impressionPixel || 'N/A',
      'Click Pixel': ad.clickPixel || 'N/A',
      'Landing URL': ad.targetUrl || 'N/A',
      'Logo URL': ad.logo || 'N/A',
      'Other Details': ad.otherDetails ? JSON.stringify(ad.otherDetails) : 'N/A',
      'Categories': (() => {
        if (!ad.categories) return 'N/A';
        if (typeof ad.categories === 'object' && 'selections' in ad.categories) {
          const catPath = ad.categories as CategoryPath;
          return catPath.selections.map(sel =>
            sel.path.map(c => c.catName).join(' → ')
          ).join('; ');
        }
        if (Array.isArray(ad.categories)) {
          return ad.categories.map((c: any) => c.catName).join(', ');
        }
        const categoryMap = ad.categories as unknown as Record<string, string>;
        return Object.values(categoryMap).join(', ') || 'N/A';
      })(),
      'Sites': ad.sites ? Object.keys(ad.sites).join(', ') : 'N/A',
      'Locations': ad.location ? Object.keys(ad.location).join(', ') : 'N/A',
      'Brand Targets': ad.brandTargets ? Object.keys(ad.brandTargets).join(', ') : 'N/A',
      'Start Date': ad.startDate || 'N/A',
      'End Date': ad.endDate || 'N/A',
      'Start Time': ad.startTime || 'N/A',
      'End Time': ad.endTime || 'N/A',
      'Priority': ad.priority || 'N/A',
      'Gender Target': ad.gender || 'N/A',
      'Age Range': `${ad.ageRangeMin || 'N/A'} - ${ad.ageRangeMax || 'N/A'}`,
      'Price Range': `${ad.priceRangeMin || 'N/A'} - ${ad.priceRangeMax || 'N/A'}`,
      'Is Test Phase': ad.isTestPhase ? 'Yes' : 'No',
      'Is Model Type': ad.isModelType === 1 ? 'Yes' : 'No',
      'Serve Strategy': ad.serveStrategy || 'N/A',
      'Created Date': ad.createdAt ? new Date(ad.createdAt).toLocaleDateString() : 'N/A',
      'Last Updated': ad.updatedAt ? new Date(ad.updatedAt).toLocaleDateString() : 'N/A'
    }];

    const filename = `ad_${ad.adId}_${ad.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCsv(csvData, filename);
    toast.success(`Exported ad details to ${filename}`);
  };

  const handleStatusChange = async (newStatus: 0 | 1) => {
    if (!ad) return;

    try {
      // Extract categories for payload
      const categoriesPayload = extractCategoriesForUpdate(ad.categories);

      // Send full ad data to prevent backend from resetting missing fields
      const response = await fetch(`${buildApiUrl('/ads/update')}?userId=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: ad.adId,
          campaignId: ad.campaignId,
          name: ad.name,
          label: ad.label,
          slotId: ad.slotId,
          impressionTarget: ad.impressionTarget,
          clickTarget: ad.clickTarget,
          impressionPixel: ad.impressionPixel,
          clickPixel: ad.clickPixel,
          targetUrl: ad.targetUrl,
          status: newStatus,
          categories: categoriesPayload,
          sites: ad.sites,
          location: ad.location,
          brandTargets: ad.brandTargets,
          priceRangeMin: ad.priceRangeMin,
          priceRangeMax: ad.priceRangeMax,
          ageRangeMin: ad.ageRangeMin,
          ageRangeMax: ad.ageRangeMax,
          priority: ad.priority,
          startDate: toLocalDateInput(ad.startDate),
          startTime: ad.startTime,
          endDate: toLocalDateInput(ad.endDate),
          endTime: ad.endTime,
          creativeUrl: ad.creativeUrl,
          logo: ad.logo || '',
          otherDetails: ad.otherDetails || {},
          gender: ad.gender,
          isTestPhase: ad.isTestPhase,
          serveStrategy: ad.serveStrategy,
          isModelType: ad.isModelType,
        })
      });

      if (!response.ok) throw new Error('Failed to update ad status');

      const result = await response.json();
      if (result.status === 1) {
        toast.success(`Ad ${newStatus === 1 ? 'activated' : 'paused'} successfully`, { id: 'ad-status' });
        setAd(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating ad status:', error);
      toast.error('Failed to update ad status', { id: 'ad-status' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--indigo-500)]" />
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="p-4 sm:p-6">
        <div className="panel border-[var(--neg)]/30 px-4 py-3 text-sm" role="alert">
          <strong className="font-semibold text-[var(--neg)]">Error: </strong>
          <span className="text-[var(--text-2)]">{error || 'Ad not found'}</span>
        </div>
      </div>
    );
  }

  const statusBadge =
    ad.status === 1 ? (
      <StatusPill status="live" label="Active" />
    ) : ad.status === 0 ? (
      <StatusPill status="paused" label="Paused" />
    ) : (
      <StatusPill status="draft" label="Draft" />
    );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <PageHeader
        crumbs={
          <VelvetBackButton
            label="Back to ads"
            onClick={() => navigate(`/campaigns/${campaignId}/ads`)}
          />
        }
        eyebrow={`${campaign?.brandName || 'Campaign'} · Ad #${ad.adId}`}
        title={ad.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge}
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}/edit`)}
                  className="h-8 gap-1.5 border-[var(--line)] text-xs text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--text-1)]"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloneAd}
                  className="h-8 gap-1.5 border-[var(--line)] text-xs text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--text-1)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Clone
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 gap-1.5 border-[var(--line)] text-xs text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--text-1)]"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            {canEdit &&
              (ad.status === 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(0)}
                  className="h-8 gap-1.5 border-[var(--line)] text-xs text-[var(--warn)] hover:bg-[var(--bg-tint)]"
                >
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(1)}
                  className="btn-velvet h-8 gap-1.5 rounded-lg px-3 text-xs"
                >
                  <Play className="h-3.5 w-3.5" />
                  Activate
                </Button>
              ))}
          </div>
        }
      />

      {/* Targets */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Impression target"
          value={ad.impressionTarget}
          tone="violet"
          icon={<Eye className="h-4 w-4" />}
        />
        <MetricCard
          label="Click target"
          value={ad.clickTarget}
          tone="accent"
          icon={<MousePointerClick className="h-4 w-4" />}
        />
        <MetricCard
          label="Target CTR"
          value={
            ad.impressionTarget > 0
              ? ((ad.clickTarget / ad.impressionTarget) * 100).toFixed(2)
              : '0.00'
          }
          unit="%"
          tone="plum"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Priority"
          value={ad.priority}
          tone="accent"
          icon={<BarChart3 className="h-4 w-4" />}
        />
      </div>

      {/* Live Performance */}
      <SectionPanel
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        title="Live performance"
        aside={
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-3)]">
            <span className="live-dot" />
            since launch
          </span>
        }
        delay={0.06}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Field label="Impressions">
            <span className="text-lg tabular-nums">{formatCount(liveMetrics?.impressions)}</span>
          </Field>
          <Field label="Clicks">
            <span className="text-lg tabular-nums">{formatCount(liveMetrics?.clicks)}</span>
          </Field>
          <Field label="CTR">
            <span className="text-lg tabular-nums">
              {liveMetrics && liveMetrics.impressions > 0
                ? `${((liveMetrics.clicks / liveMetrics.impressions) * 100).toFixed(2)}%`
                : '0.00%'}
            </span>
          </Field>
          <Field label="Landing">
            <span className="text-lg tabular-nums">{formatCount(liveMetrics?.landingCount)}</span>
          </Field>
        </div>
      </SectionPanel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Creative & Slot Details */}
        <SectionPanel
          icon={<ImageIcon className="h-3.5 w-3.5" />}
          title="Creative & slot"
          delay={0.1}
        >
          <div className="space-y-5">
            <Field label="Ad name">{ad.name}</Field>

            {/* Logo */}
            {ad.logo && (
              <div>
                <div className="metric-label">Logo</div>
                <div className="panel-inset mt-1.5 flex justify-center p-3">
                  <img
                    src={getCacheBustedUrl(ad.logo)}
                    alt="Ad logo"
                    className="max-h-20 rounded-lg object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = 'true';
                        target.src = PLACEHOLDER_IMAGE;
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Creative Image/Video */}
            <div className="flex flex-col items-center gap-3">
              <div className="panel-inset flex h-60 w-full max-w-sm items-center justify-center overflow-hidden p-2">
                {ad.creativeUrl ? (
                  (() => {
                    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(ad.creativeUrl) || ad.creativeUrl.includes('video');
                    return isVideo ? (
                      <video
                        src={getCacheBustedUrl(ad.creativeUrl)}
                        controls
                        className="max-h-full max-w-full rounded-lg"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        src={getCacheBustedUrl(ad.creativeUrl)}
                        alt="Ad creative"
                        className="max-h-full max-w-full rounded-lg object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = 'true';
                            target.src = PLACEHOLDER_IMAGE;
                          }
                        }}
                      />
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center text-[var(--text-3)]">
                    <ImageIcon className="mb-2 h-10 w-10 opacity-60" />
                    <span className="text-xs font-medium">No creative</span>
                  </div>
                )}
              </div>

              {slot && (
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--text-1)]">{slot.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--text-3)]">
                    {slot.width} × {slot.height} px · {getPlatformName(slot.platform)}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="panel-inset p-3.5">
                <div className="metric-label flex items-center gap-1.5">
                  <Settings className="h-3 w-3" />
                  Serve strategy
                </div>
                <p className="mt-1.5 text-[13px] font-medium text-[var(--text-1)]">
                  {ad.serveStrategy === 1 ? 'User-based targeting' : 'Product-based targeting'}
                </p>
              </div>
              <div className="panel-inset p-3.5">
                <div className="metric-label flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  Model type
                </div>
                <p className="mt-1.5 text-[13px] font-medium text-[var(--text-1)]">
                  {ad.isModelType === 1 ? 'Model type ad' : 'Standard ad'}
                </p>
              </div>
            </div>

            {ad.isTestPhase === 1 && (
              <div className="panel-inset flex items-center gap-2 border-[var(--line-violet)] p-3.5">
                <span className="live-dot" />
                <p className="text-[13px] font-medium text-[var(--text-1)]">This ad is in test phase</p>
              </div>
            )}
          </div>
        </SectionPanel>

        {/* Scheduling */}
        <SectionPanel
          icon={<Calendar className="h-3.5 w-3.5" />}
          title="Scheduling"
          delay={0.14}
          className="h-fit"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <Field label="Start date">{formatDate(ad.startDate)}</Field>
            <Field label="End date">{formatDate(ad.endDate)}</Field>
            <Field label="Start time">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[var(--text-3)]" />
                {formatTime(ad.startTime)}
              </span>
            </Field>
            <Field label="End time">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[var(--text-3)]" />
                {formatTime(ad.endTime)}
              </span>
            </Field>
          </div>
        </SectionPanel>
      </div>

      {/* Targeting Details */}
      <SectionPanel
        icon={<Target className="h-3.5 w-3.5" />}
        title="Targeting & audience"
        delay={0.18}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Demographics */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-1)]">
              <Users className="h-3.5 w-3.5 text-[var(--text-3)]" />
              Demographics
            </h4>
            <div className="space-y-4">
              <Field label="Gender">{ad.gender || 'Not specified'}</Field>
              <Field label="Age range">{ad.ageRangeMin} – {ad.ageRangeMax} years</Field>
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-1)]">
              <Banknote className="h-3.5 w-3.5 text-[var(--text-3)]" />
              Price range
            </h4>
            <p className="text-sm font-semibold tabular-nums text-[var(--text-1)]">
              ₹{ad.priceRangeMin.toLocaleString()} – ₹{ad.priceRangeMax.toLocaleString()}
            </p>
          </div>

          {/* Locations */}
          {(() => {
            const locations = ad.location;
            if (!locations || (typeof locations === 'object' && Object.keys(locations).length === 0)) return null;

            const rows = Array.isArray(locations)
              ? locations.map((loc: any, idx: number) => ({
                  key: idx,
                  name: typeof loc === 'object' ? (loc.name || loc.catName || JSON.stringify(loc)) : loc,
                  priority: 'N/A',
                }))
              : Object.entries(locations).map(([location, priority]) => ({
                  key: location,
                  name: location,
                  priority: typeof priority === 'object' ? JSON.stringify(priority) : String(priority),
                }));

            return (
              <div className="space-y-4">
                <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-1)]">
                  <MapPin className="h-3.5 w-3.5 text-[var(--text-3)]" />
                  Locations
                </h4>
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-[var(--text-1)]">{row.name}</span>
                      <span className="font-mono text-[11px] text-[var(--text-3)]">P{row.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Categories */}
          {(() => {
            const categories = ad.categories;

            if (!categories) return null;

            const isNewFormat = typeof categories === 'object' && 'selections' in categories;

            if (isNewFormat) {
              const categoryPath = categories as CategoryPath;
              if (!categoryPath.selections || categoryPath.selections.length === 0) return null;

              return (
                <div className="space-y-4 md:col-span-2 lg:col-span-3">
                  <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-1)]">
                    <Tag className="h-3.5 w-3.5 text-[var(--text-3)]" />
                    Categories
                    <span className="font-mono text-[11px] font-normal text-[var(--text-3)]">
                      {categoryPath.selections.length} selected
                    </span>
                  </h4>

                  <div className="space-y-2.5">
                    {categoryPath.selections.map((selection, index) => (
                      <div
                        key={`${selection.selected.catId}-${index}`}
                        className="panel-inset p-3"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {selection.path.map((cat, idx) => (
                            <React.Fragment key={`${cat.catId}-${idx}`}>
                              <span
                                className={cn(
                                  idx === selection.path.length - 1
                                    ? 'rounded-md bg-[var(--bg-tint)] px-2 py-0.5 font-semibold text-[var(--indigo-400)]'
                                    : 'text-[var(--text-2)]'
                                )}
                              >
                                {String(cat.catName)}
                              </span>
                              {idx < selection.path.length - 1 && (
                                <ChevronRight className="h-3 w-3 text-[var(--text-3)]" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            } else if (Array.isArray(categories)) {
              // Array of objects format
              if (categories.length === 0) return null;

              return (
                <div className="space-y-4 md:col-span-2 lg:col-span-3">
                  <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-1)]">
                    <Tag className="h-3.5 w-3.5 text-[var(--text-3)]" />
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat: any) => (
                      <span key={cat.catId} className={tagPill}>
                        {cat.catName}
                      </span>
                    ))}
                  </div>
                </div>
              );
            } else if (typeof categories === 'object' && 'ln' in categories && Array.isArray((categories as any).ln)) {
              // { l0: [], ln: [...] } format
              const lnCategories = (categories as any).ln;
              if (lnCategories.length === 0) return null;

              // Constants for show more/less
              const INITIAL_DISPLAY_COUNT = 12;
              const hasMoreCategories = lnCategories.length > INITIAL_DISPLAY_COUNT;
              const displayedCategories = showAllCategories ? lnCategories : lnCategories.slice(0, INITIAL_DISPLAY_COUNT);

              return (
                <div className="space-y-4 md:col-span-2 lg:col-span-3">
                  <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-1)]">
                    <Tag className="h-3.5 w-3.5 text-[var(--text-3)]" />
                    Categories
                    <span className="font-mono text-[11px] font-normal text-[var(--text-3)]">
                      {lnCategories.length} selected
                    </span>
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {displayedCategories.map((cat: any, idx: number) => (
                      <motion.span
                        key={cat.catId}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.015, ease: easeOut }}
                        className={tagPill}
                      >
                        {cat.catName}
                      </motion.span>
                    ))}
                  </div>

                  {hasMoreCategories && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="h-7 text-xs text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--text-1)]"
                    >
                      {showAllCategories ? (
                        <>
                          Show less
                          <ChevronRight className="ml-1 h-3.5 w-3.5 -rotate-90" />
                        </>
                      ) : (
                        <>
                          Show {lnCategories.length - INITIAL_DISPLAY_COUNT} more
                          <ChevronRight className="ml-1 h-3.5 w-3.5 rotate-90" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            } else {
              // {catId: catName} format
              const categoryMap = categories as unknown as Record<number, string>;
              if (Object.keys(categoryMap).length === 0) return null;

              return (
                <div className="space-y-4 md:col-span-2 lg:col-span-3">
                  <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-1)]">
                    <Tag className="h-3.5 w-3.5 text-[var(--text-3)]" />
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryMap).map(([catId, catName]) => (
                      <span key={catId} className={tagPill}>
                        {typeof catName === 'object' ? JSON.stringify(catName) : catName}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }
          })()}

          {/* Sites */}
          {(() => {
            const sites = ad.sites;
            if (!sites || (typeof sites === 'object' && Object.keys(sites).length === 0)) return null;

            const rows = Array.isArray(sites)
              ? sites.map((site: any, idx: number) => ({
                  key: idx,
                  name: typeof site === 'object' ? (site.name || site.catName || JSON.stringify(site)) : site,
                  priority: 'N/A',
                }))
              : Object.entries(sites).map(([site, priority]) => ({
                  key: site,
                  name: site,
                  priority: typeof priority === 'object' ? JSON.stringify(priority) : String(priority),
                }));

            return (
              <div className="space-y-4">
                <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-1)]">
                  <Globe className="h-3.5 w-3.5 text-[var(--text-3)]" />
                  Sites
                </h4>
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-[var(--text-1)]">{row.name}</span>
                      <span className="font-mono text-[11px] text-[var(--text-3)]">P{row.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Brand Targets */}
          {(() => {
            const brandTargets = ad.brandTargets;
            if (!brandTargets || (typeof brandTargets === 'object' && Object.keys(brandTargets).length === 0)) return null;

            const rows = Array.isArray(brandTargets)
              ? brandTargets.map((brand: any, idx: number) => ({
                  key: idx,
                  name: typeof brand === 'object' ? (brand.name || brand.brandName || brand.catName || JSON.stringify(brand)) : brand,
                  priority: 'N/A',
                }))
              : Object.entries(brandTargets).map(([brand, priority]) => ({
                  key: brand,
                  name: brand,
                  priority: typeof priority === 'object' ? JSON.stringify(priority) : String(priority),
                }));

            return (
              <div className="space-y-4">
                <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-1)]">
                  <Target className="h-3.5 w-3.5 text-[var(--text-3)]" />
                  Brand targets
                </h4>
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-[var(--text-1)]">{row.name}</span>
                      <span className="font-mono text-[11px] text-[var(--text-3)]">P{row.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </SectionPanel>

      {/* Tracking & Pixels */}
      <SectionPanel
        icon={<BarChart3 className="h-3.5 w-3.5" />}
        title="Tracking & pixels"
        delay={0.22}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CodeField label="Impression pixel URL" value={ad.impressionPixel} />
          <CodeField label="Click pixel URL" value={ad.clickPixel} />
        </div>
        <div className="mt-4">
          <CodeField label="Landing URL" value={ad.targetUrl} />
        </div>
      </SectionPanel>

      {/* Other Details */}
      {ad.otherDetails && Object.keys(ad.otherDetails).length > 0 && (
        <SectionPanel
          icon={<Settings className="h-3.5 w-3.5" />}
          title="Other details"
          delay={0.26}
        >
          <div className="panel-inset relative group/json p-4">
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--text-2)] pr-9">
              {JSON.stringify(ad.otherDetails, null, 2).replace(/\\\\n/g, '\\n')}
            </pre>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(ad.otherDetails, null, 2).replace(/\\\\n/g, '\\n'));
                  toast.success('Copied to clipboard');
                } catch {
                  toast.error('Copy failed');
                }
              }}
              aria-label="Copy JSON"
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md
                         text-[var(--text-3)] opacity-0 group-hover/json:opacity-100
                         hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)]
                         transition-all duration-200"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(ad.otherDetails).map(([key, value]) => (
              <div key={key} className="panel-inset p-3.5">
                <div className="metric-label">{key}</div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[13px] font-medium text-[var(--text-1)]">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2).replace(/\\\\n/g, '\n') : String(value).replace(/\\n/g, '\n')}
                </p>
              </div>
            ))}
          </div>
        </SectionPanel>
      )}
    </div>
  );
}
