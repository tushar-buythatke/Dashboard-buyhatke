import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, RefreshCw, Download, BarChart3, MoreHorizontal, Eye, Edit, Copy, Archive, Pause, Play, Activity, IndianRupee, Rows3, Zap, Inbox, AlertCircle, LayoutGrid, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusPill, type StatusKind } from '@/components/ui/status-pill';
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
import { buildApiUrl } from '@/config/api';
import { usePermissions } from '@/context/PermissionsContext';
import { formatCount } from '@/lib/format';
import { CreativeCover, type CreativeItem } from './CreativeCover';
import { cn } from '@/lib/utils';

const ZOOM_REMINDER_KEY = 'campaign_zoom_reminder_shown';
const REMINDER_COOLDOWN = 24 * 60 * 60 * 1000;
const GALLERY_TEASE_EVERY = 4 * 24 * 60 * 60 * 1000;

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: '0', label: 'Draft' },
  { value: '1', label: 'Live' },
  { value: '2', label: 'Test' },
  { value: '3', label: 'Paused' },
  { value: '-1', label: 'Archived' },
];

const statusMap = {
  0: { label: 'Draft', kind: 'draft' as StatusKind },
  1: { label: 'Live', kind: 'live' as StatusKind },
  2: { label: 'Test', kind: 'test' as StatusKind },
  3: { label: 'Paused', kind: 'paused' as StatusKind },
  '-1': { label: 'Archived', kind: 'archived' as StatusKind },
} as const;

export function CampaignList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canEdit } = usePermissions();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [campaignMetrics, setCampaignMetrics] = useState<Record<string, { impressions: number; clicks: number; landingCount: number }>>({});
  const [liveAdsCount, setLiveAdsCount] = useState<Record<string, number>>({});
  const [creatives, setCreatives] = useState<Record<string, CreativeItem[]>>({});
  const [view, setView] = useState<'grid' | 'table'>(() => {
    try { return localStorage.getItem('campaign_view') === 'table' ? 'table' : 'grid'; } catch { return 'grid'; }
  });
  const [tease, setTease] = useState(() => {
    if (view !== 'table') return false;
    try {
      const last = Number(localStorage.getItem('gallery_tease_at') || 0);
      return Date.now() - last >= GALLERY_TEASE_EVERY;
    } catch { return false; }
  });
  useEffect(() => {
    if (!tease) return;
    try { localStorage.setItem('gallery_tease_at', String(Date.now())); } catch { /* tease just repeats */ }
  }, [tease]);
  const switchView = (v: 'grid' | 'table') => {
    setTease(false);
    setView(v);
    try { localStorage.setItem('campaign_view', v); } catch { /* per-viewer convenience only */ }
  };

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    campaignId?: string | number;
    campaignName?: string;
  }>({ isOpen: false });

  const statusFilter = searchParams.get('status') || 'all';
  const brandNameFilter = searchParams.get('brandName') || '';

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, brandNameFilter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${buildApiUrl('/campaigns')}?userId=1`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const result: CampaignResponse = await response.json();

      if (result.status === 1 && result.data?.campaignList) {
        setCampaigns(result.data.campaignList);

        const today = new Date().toISOString().split('T')[0];
        const metricsArr = await Promise.all(result.data.campaignList.map(async (c) => {
          const fromDate = c.createdAt ? c.createdAt.split('T')[0] : analyticsService.getDateRange('30d').from;
          const mRes = await analyticsService.getMetrics({ from: fromDate, to: today, campaignId: c.campaignId });
          return { id: c.campaignId, metrics: mRes.success && mRes.data ? mRes.data : null };
        }));
        const metricMap: Record<string, { impressions: number; clicks: number; landingCount: number }> = {};
        metricsArr.forEach(({ id, metrics }) => {
          if (metrics) metricMap[id] = { impressions: metrics.impressions, clicks: metrics.clicks, landingCount: metrics.landingCount };
        });
        setCampaignMetrics(metricMap);

        const liveAdsPromises = result.data.campaignList.map(async (c) => {
          try {
            const adsResponse = await fetch(`${buildApiUrl('/ads')}?campaignId=${c.campaignId}`);
            if (adsResponse.ok) {
              const adsResult = await adsResponse.json();
              if (adsResult.status === 1 && adsResult.data?.adsList) {
                const ads = adsResult.data.adsList as any[];
                const liveAds = ads.filter((ad) => ad.status === 1);
                const items: CreativeItem[] = ads
                  .filter((ad) => ad.status !== -1 && (ad.creativeUrl || ad.logo))
                  .sort((a, b) => (b.status === 1 ? 1 : 0) - (a.status === 1 ? 1 : 0))
                  .map((ad) => ({ adId: ad.adId, name: ad.name || ad.label || `Ad ${ad.adId}`, url: ad.creativeUrl || ad.logo }));
                return { campaignId: c.campaignId, count: liveAds.length, items };
              }
            }
            return { campaignId: c.campaignId, count: 0, items: [] as CreativeItem[] };
          } catch {
            return { campaignId: c.campaignId, count: 0, items: [] as CreativeItem[] };
          }
        });
        const liveAdsResults = await Promise.all(liveAdsPromises);
        const liveAdsMap: Record<string, number> = {};
        const creativeMap: Record<string, CreativeItem[]> = {};
        liveAdsResults.forEach(({ campaignId, count, items }) => {
          liveAdsMap[campaignId] = count;
          creativeMap[campaignId] = items;
        });
        setLiveAdsCount(liveAdsMap);
        setCreatives(creativeMap);
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
    const csvData = filteredCampaigns.map(campaign => ({
      'Campaign ID': String(campaign.campaignId),
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

  const handleCloneCampaign = async (campaignId: string | number) => {
    try {
      const response = await campaignService.cloneCampaign(campaignId, 1);
      if (response.success) {
        toast.success('Campaign cloned successfully');
        fetchCampaigns();
      } else {
        toast.error(response.message || 'Failed to clone campaign');
      }
    } catch {
      toast.error('Failed to clone campaign');
    }
  };

  const handleArchiveCampaign = (campaignId: string | number) => {
    const campaign = campaigns.find(c => c.campaignId === campaignId);
    setConfirmationModal({
      isOpen: true,
      campaignId,
      campaignName: campaign?.brandName || `Campaign ${campaignId}`,
    });
  };

  const confirmArchiveCampaign = async () => {
    if (!confirmationModal.campaignId) return;
    try {
      const response = await campaignService.archiveCampaign(confirmationModal.campaignId, 1);
      if (response.success) {
        toast.success(`Campaign "${confirmationModal.campaignName}" and associated ads archived`);
        fetchCampaigns();
      } else {
        toast.error(response.message || 'Failed to archive campaign');
      }
    } catch {
      toast.error('Failed to archive campaign');
    }
  };

  const handleStatusChange = async (campaignId: string | number, newStatus: number) => {
    try {
      const response = await fetch(`${buildApiUrl('/campaigns/update')}?userId=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update campaign status');
      const result = await response.json();
      if (result.status === 1) {
        toast.success(`Campaign ${statusMap[newStatus as keyof typeof statusMap]?.label?.toLowerCase()} successfully`);
        fetchCampaigns();
      }
    } catch {
      toast.error('Failed to update campaign status');
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesStatus = statusFilter === 'all' || campaign.status.toString() === statusFilter;
    const matchesBrand = campaign.brandName.toLowerCase().includes(brandNameFilter.toLowerCase());
    return matchesStatus && matchesBrand;
  });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const activeCampaigns = campaigns.filter(c => c.status === 1).length;
  const totalBudget = campaigns.reduce((sum, c) => sum + parseFloat(c.totalBudget), 0);
  const totalImpressions = Object.values(campaignMetrics).reduce((s, m) => s + m.impressions, 0);
  const totalLandingCount = Object.values(campaignMetrics).reduce((s, m) => s + m.landingCount, 0);

  const summaryStats = [
    { label: 'Active campaigns', value: activeCampaigns.toLocaleString(), icon: Activity },
    { label: 'Total budget', value: `₹${totalBudget.toLocaleString()}`, icon: IndianRupee },
    { label: 'Live landings', value: formatCount(totalLandingCount), icon: Zap },
  ];

  // Render a numeric table cell with semantic weight:
  // zeros / missing values fall back to 0 and render in a lighter weight
  // so the table never carries em-dashes.
  const numCell = (v: number | string | null | undefined, formatter: (n: number) => string = formatCount) => {
    const n = Number(v);
    const display = Number.isFinite(n) ? formatter(n) : '0';
    const isZero = !Number.isFinite(n) || n === 0;
    return (
      <span className={isZero ? 'text-[var(--h-ink-3)] font-normal' : 'text-[var(--h-ink)] font-semibold'}>
        {display}
      </span>
    );
  };

  const renderActions = (campaign: Campaign) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="e-round !h-8 !w-8"
        >
          <MoreHorizontal size={14} strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
          className="text-[12px]"
        >
          <Eye className="mr-2 h-3.5 w-3.5" />
          View ads
        </DropdownMenuItem>
        {canEdit && (
          <>
            <DropdownMenuItem
              onClick={() => navigate(`/campaigns/${campaign.campaignId}/edit`)}
              className="text-[12px]"
            >
              <Edit className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleCloneCampaign(campaign.campaignId)}
              className="text-[12px]"
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Clone
            </DropdownMenuItem>
            {campaign.status !== 3 ? (
              <DropdownMenuItem
                onClick={() => handleStatusChange(campaign.campaignId, 3)}
                className="text-[12px]"
              >
                <Pause className="mr-2 h-3.5 w-3.5" />
                Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => handleStatusChange(campaign.campaignId, 1)}
                className="text-[12px]"
              >
                <Play className="mr-2 h-3.5 w-3.5" />
                Resume
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => handleArchiveCampaign(campaign.campaignId)}
              className="text-[12px] text-[var(--h-coral)] focus:text-[var(--h-coral)] focus:bg-[var(--h-neg-soft)]"
            >
              <Archive className="mr-2 h-3.5 w-3.5" />
              Archive
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const delivery = (campaign: Campaign) => {
    const m = campaignMetrics[String(campaign.campaignId)];
    const target = Number(campaign.impressionTarget) || 0;
    return target > 0 && m ? Math.min(m.impressions / target, 1) : 0;
  };

  return (
    <div className="halo-page">
      <div className="space-y-5">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 pb-2"
        >
          <div>
            <h1 className="halo-title flex items-start gap-3">
              Campaigns
              <span className="mt-2 rounded-full bg-[var(--e-ink-pill)] px-3 py-1 font-[var(--h-font)] text-[13px] font-bold tracking-normal text-[var(--h-canvas)] num">
                {campaigns.length}
              </span>
            </h1>
            <p className="halo-subtitle mt-3">Tap any cover to pin one creative, or let them rotate.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-halo-ghost btn-halo-sm"
            >
              <RefreshCw size={14} strokeWidth={1.75} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>
            <button onClick={handleExport} className="btn-halo-ghost btn-halo-sm">
              <Download size={14} strokeWidth={1.75} />
              Export
            </button>
            <button onClick={() => navigate('/analytics')} className="btn-halo-ghost btn-halo-sm">
              <BarChart3 size={14} strokeWidth={1.75} />
              Analytics
            </button>
            {canEdit && (
              <button onClick={() => navigate('/campaigns/new')} className="btn-halo btn-halo-sm">
                <Plus size={14} strokeWidth={1.75} />
                New campaign
              </button>
            )}
          </div>
        </motion.div>

        {/* Summary — one vivid hero (the flagship metric) + a compact stat bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.02, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 gap-5 lg:grid-cols-5 items-stretch"
        >
          <div className="halo-mesh halo-mesh-iris relative flex flex-col justify-between overflow-hidden rounded-[var(--h-r-card)] p-5 lg:col-span-2">
            <div className="halo-mesh-grain" aria-hidden="true" />
            <span className="text-[13px] font-medium text-white/75">Total impressions</span>
            <div>
              <p className="num text-[2rem] font-semibold leading-none tracking-[-0.03em] text-white">
                {formatCount(totalImpressions)}
              </p>
              <p className="mt-1.5 text-[12.5px] text-white/60">Across {campaigns.length} campaigns</p>
            </div>
          </div>

          <div className="halo-card grid grid-cols-1 content-center divide-y divide-[var(--h-line)] sm:grid-cols-3 sm:divide-y-0 sm:divide-x sm:divide-[var(--h-line)] lg:col-span-3">
            {summaryStats.map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-4">
                <span className="halo-chip h-9 w-9 rounded-[10px]">
                  <s.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-[var(--h-ink-2)]">{s.label}</p>
                  <p className="num mt-0.5 text-[1.05rem] font-semibold leading-none text-[var(--h-ink)]">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="halo-glass rounded-[26px] sm:rounded-full p-2 sticky top-3 z-10 shadow-[0_14px_30px_-20px_rgba(0,0,0,.35)]"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--h-ink-3)] pointer-events-none" strokeWidth={1.75} />
              <Input
                placeholder="Search by brand name…"
                className="halo-field halo-search h-11 text-[13.5px] !border-transparent !bg-[var(--h-surface-2)]"
                value={brandNameFilter}
                onChange={(e) => setSearchParams(prev => ({ ...Object.fromEntries(prev), brandName: e.target.value }))}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setSearchParams(prev => ({ ...Object.fromEntries(prev), status: value === 'all' ? '' : value }))}
            >
              <SelectTrigger className="halo-field w-full sm:w-48 h-11 text-[13px] !border-transparent !bg-[var(--h-surface-2)]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-[12.5px]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-none">
            <div className="halo-segment" role="tablist" aria-label="View">
              <button role="tab" aria-selected={view === 'grid'} onClick={() => switchView('grid')} className={`halo-segment-item relative ${view === 'grid' ? 'is-active' : ''}`}>
                <LayoutGrid size={14} /> Gallery
                {tease && (
                  <span className="absolute right-1.5 top-1 flex h-2 w-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-[var(--h-iris-500)] opacity-75" />
                    <span className="relative h-2 w-2 rounded-full bg-[var(--h-iris-500)]" />
                  </span>
                )}
              </button>
              <button role="tab" aria-selected={view === 'table'} onClick={() => switchView('table')} className={`halo-segment-item ${view === 'table' ? 'is-active' : ''}`}>
                <Rows3 size={14} /> Table
              </button>
            </div>
            <AnimatePresence>
              {tease && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.6 }}
                  className="absolute right-0 top-[calc(100%+14px)] z-20 w-[290px] rounded-[22px] bg-[var(--e-ink-pill)] p-4 text-[var(--h-canvas)] shadow-[0_24px_50px_-18px_rgba(0,0,0,.55)]"
                >
                  <span className="absolute -top-1.5 right-[118px] h-3 w-3 rotate-45 rounded-[2px] bg-[var(--e-ink-pill)]" />
                  <p className="font-[var(--h-font-display)] text-[17px] font-medium leading-tight">See your campaigns as covers</p>
                  <p className="mt-1 text-[12.5px] opacity-65">Gallery shows every campaign's live creatives, delivery and CTR at a glance.</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => switchView('grid')} className="btn-halo btn-halo-sm">
                      Show me <ArrowUpRight size={13} />
                    </button>
                    <button onClick={() => setTease(false)} className="rounded-full px-3 py-1.5 text-[12px] font-bold opacity-60 hover:opacity-100">
                      Not now
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="halo-card overflow-hidden relative"
        >
          <div className="halo-panel-head halo-panel-head-mesh">
            <div className="halo-mesh-grain" aria-hidden="true" />
            <div className="halo-panel-head-title">
              <h3 className="halo-heading">{view === 'grid' ? 'Gallery' : 'All campaigns'}</h3>
            </div>
            <span className="halo-badge">{filteredCampaigns.length} campaigns</span>
          </div>

          <div className="halo-scroll-x">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="halo-skeleton h-11 rounded-[var(--h-r-sm)]" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <span className="halo-chip-lg" style={{ background: 'var(--h-neg-soft)', color: 'var(--h-coral)' }}>
                  <AlertCircle size={20} strokeWidth={1.75} />
                </span>
                <p className="halo-heading text-[var(--h-coral)]">{error}</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <span className="halo-chip-lg"><Inbox size={20} strokeWidth={1.75} /></span>
                <p className="halo-heading">No campaigns found</p>
                <p className="halo-subtitle">Try adjusting your filters or create a new campaign</p>
                {canEdit && (
                  <button onClick={() => navigate('/campaigns/new')} className="btn-halo btn-halo-sm mt-2">
                    <Plus size={14} strokeWidth={1.75} />
                    New campaign
                  </button>
                )}
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredCampaigns.map((campaign, idx) => {
                  const id = String(campaign.campaignId);
                  const m = campaignMetrics[id];
                  const ctr = m && m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
                  const statusInfo = statusMap[campaign.status as keyof typeof statusMap];
                  const d = delivery(campaign);
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: Math.min(idx, 12) * 0.035, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
                      className="group relative cursor-pointer rounded-[26px] bg-[var(--h-surface-2)] p-2 transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--h-surface)] hover:shadow-[0_0_0_1px_var(--h-line-2),0_30px_60px_-30px_rgba(0,0,0,.35)]"
                    >
                      <div className="relative">
                        <CreativeCover
                          campaignId={campaign.campaignId}
                          name={campaign.brandName}
                          creatives={creatives[id] || []}
                          className="aspect-[16/9] w-full rounded-[20px] text-[2.5rem]"
                        />
                        <span className="pointer-events-none absolute left-3 top-3">
                          <StatusPill status={statusInfo?.kind || 'muted'} label={statusInfo?.label || "Unknown"} className="shadow-md" />
                        </span>
                        <span className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                          {renderActions(campaign)}
                        </span>
                      </div>
                      <div className="px-3 pb-3 pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-[var(--h-font-display)] text-[19px] font-medium tracking-[-0.02em] text-[var(--h-ink)]">{campaign.brandName}</p>
                            <p className="mt-0.5 text-[12px] text-[var(--h-ink-3)] num">
                              {liveAdsCount[id] || 0} live of {(creatives[id] || []).length} · {formatDate(campaign.createdAt)}
                            </p>
                          </div>
                          <span className="flex h-9 w-9 flex-none -rotate-45 items-center justify-center rounded-full bg-[var(--e-ink-pill)] text-[var(--h-canvas)] opacity-0 transition-all duration-300 group-hover:rotate-0 group-hover:opacity-100">
                            <ArrowUpRight size={16} />
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {[
                            { k: 'Impr.', v: formatCount(m?.impressions || 0) },
                            { k: 'Clicks', v: formatCount(m?.clicks || 0) },
                            { k: 'CTR', v: `${ctr.toFixed(1)}%` },
                          ].map((x) => (
                            <div key={x.k} className="rounded-2xl bg-[var(--h-surface)] px-3 py-2.5 transition-colors group-hover:bg-[var(--h-surface-2)]">
                              <p className="text-[11px] text-[var(--h-ink-3)]">{x.k}</p>
                              <p className="num mt-0.5 text-[15px] font-bold text-[var(--h-ink)]">{x.v}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between text-[11px] text-[var(--h-ink-3)]">
                            <span>Delivery</span>
                            <span className="num">{Math.round(d * 100)}% of {formatCount(campaign.impressionTarget || 0)}</span>
                          </div>
                          <div className="flex h-2 gap-[3px]">
                            {Array.from({ length: 24 }).map((_, n) => (
                              <span
                                key={n}
                                className={cn('flex-1 rounded-full transition-colors duration-500', n < Math.round(d * 24) ? 'bg-[var(--h-iris-500)]' : 'bg-[var(--h-surface-3)]')}
                                style={{ transitionDelay: `${n * 15}ms` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <Table className="halo-table">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[340px]">Campaign</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[80px] text-center">Live ads</TableHead>
                    <TableHead className="w-[120px]">Created</TableHead>
                    <TableHead className="col-num w-[110px]">Target impr.</TableHead>
                    <TableHead className="col-num w-[110px]">Live impr.</TableHead>
                    <TableHead className="col-num w-[110px]">Live clicks</TableHead>
                    <TableHead className="w-[90px] text-center">CTR</TableHead>
                    <TableHead className="col-num w-[110px]">Landings</TableHead>
                    <TableHead className="col-num w-[90px]">Budget</TableHead>
                    <TableHead className="sticky right-0 z-[3] w-[140px] text-center"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const m = campaignMetrics[String(campaign.campaignId)];
                    const ctrValue = m && m.impressions > 0 ? ((m.clicks / m.impressions) * 100) : 0;
                    const statusInfo = statusMap[campaign.status as keyof typeof statusMap];
                    return (
                      <TableRow
                        key={String(campaign.campaignId)}
                        onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
                        className="cursor-pointer group"
                      >
                        <TableCell>
                          <span className="flex items-center gap-3.5">
                            <CreativeCover
                              campaignId={campaign.campaignId}
                              name={campaign.brandName}
                              creatives={creatives[String(campaign.campaignId)] || []}
                              className="h-[72px] w-[128px] flex-none rounded-[18px] shadow-[0_10px_24px_-12px_rgba(0,0,0,.45)]"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-bold text-[var(--h-ink)]">{campaign.brandName}</span>
                              <span className="block text-[11.5px] text-[var(--h-ink-3)] num">
                                #{campaign.campaignId} · {(creatives[String(campaign.campaignId)] || []).length} creatives
                              </span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-1.5">
                            <StatusPill
                              status={statusInfo?.kind || 'muted'}
                              label={statusInfo?.label || 'Unknown'}
                              size="sm"
                            />
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[12px] font-semibold num ${liveAdsCount[String(campaign.campaignId)] > 0 ? 'text-[var(--h-mint)]' : 'text-[var(--h-ink-3)]'}`}>
                            {liveAdsCount[String(campaign.campaignId)] || 0}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-[12px] text-[var(--h-ink-2)]">
                          {formatDate(campaign.createdAt)}
                        </TableCell>
                        <TableCell className="col-num">
                          {formatCount(campaign.impressionTarget)}
                        </TableCell>
                        <TableCell className="col-num">
                          <span className="inline-flex flex-col items-end gap-1.5">
                            {numCell(m?.impressions)}
                            <span className="h-1 w-20 overflow-hidden rounded-full bg-[var(--h-surface-3)]">
                              <span className="block h-full rounded-full bg-[var(--h-iris-500)]" style={{ width: `${delivery(campaign) * 100}%` }} />
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="col-num">
                          {numCell(m?.clicks)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`halo-badge num ${
                            ctrValue === 0 ? ''
                              : ctrValue >= 3 ? 'halo-badge-pos'
                              : ctrValue >= 1 ? 'halo-badge-warn'
                              : 'halo-badge-neg'
                          }`}>
                            {ctrValue === 0 ? '0.0%' : `${ctrValue.toFixed(1)}%`}
                          </span>
                        </TableCell>
                        <TableCell className="col-num">
                          {numCell(m?.landingCount)}
                        </TableCell>
                        <TableCell className="col-num">
                          ₹{parseFloat(campaign.totalBudget).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="sticky right-0 text-center bg-gradient-to-l from-[var(--h-surface)] from-70% to-transparent group-hover:from-[var(--h-surface-2)]" onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            <button
                              onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
                              className="btn-ink !h-8 !px-3 !text-[12px]"
                            >
                              Open <ArrowUpRight size={13} />
                            </button>
                            {renderActions(campaign)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </motion.div>
      </div>

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ isOpen: false })}
        onConfirm={confirmArchiveCampaign}
        title="Archive campaign"
        message="Are you sure you want to archive this campaign? This will also archive all associated ads and cannot be undone."
        itemName={confirmationModal.campaignName}
        itemType="campaign"
        variant="danger"
      />
    </div>
  );
}
