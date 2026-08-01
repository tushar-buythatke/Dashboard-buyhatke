import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, RefreshCw, Download, BarChart3, MoreHorizontal, Eye, Edit, Copy, Archive, Pause, Play, Activity, IndianRupee, Rows3, Zap, Megaphone, Inbox, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusPill, type StatusKind } from '@/components/ui/status-pill';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Campaign, CampaignResponse } from '@/types';
import { motion } from 'framer-motion';
import { analyticsService } from '@/services/analyticsService';
import { campaignService } from '@/services/campaignService';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { exportToCsv } from '@/utils/csvExport';
import { buildApiUrl } from '@/config/api';
import { usePermissions } from '@/context/PermissionsContext';
import { formatCount, familyForString } from '@/lib/format';

const ZOOM_REMINDER_KEY = 'campaign_zoom_reminder_shown';
const REMINDER_COOLDOWN = 24 * 60 * 60 * 1000;

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
                const liveAds = adsResult.data.adsList.filter((ad: any) => ad.status === 1);
                return { campaignId: c.campaignId, count: liveAds.length };
              }
            }
            return { campaignId: c.campaignId, count: 0 };
          } catch {
            return { campaignId: c.campaignId, count: 0 };
          }
        });
        const liveAdsResults = await Promise.all(liveAdsPromises);
        const liveAdsMap: Record<string, number> = {};
        liveAdsResults.forEach(({ campaignId, count }) => {
          liveAdsMap[campaignId] = count;
        });
        setLiveAdsCount(liveAdsMap);
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

  return (
    <div className="halo-page">
      <div className="space-y-5">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
        >
          <div>
            <p className="halo-eyebrow">Marketing / Campaigns</p>
            <h1 className="halo-title mt-1 flex items-center gap-2">
              <Megaphone size={20} strokeWidth={1.75} className="text-[var(--h-iris-500)]" />
              All campaigns
            </h1>
            <p className="halo-subtitle mt-1">Manage and monitor your advertising campaigns</p>
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
          className="halo-glass rounded-[var(--h-r-lg)] p-3 sticky top-0 z-10"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--h-ink-3)] pointer-events-none" strokeWidth={1.75} />
              <Input
                placeholder="Search by brand name…"
                className="halo-field halo-search h-9 text-[12.5px]"
                value={brandNameFilter}
                onChange={(e) => setSearchParams(prev => ({ ...Object.fromEntries(prev), brandName: e.target.value }))}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setSearchParams(prev => ({ ...Object.fromEntries(prev), status: value === 'all' ? '' : value }))}
            >
              <SelectTrigger className="halo-field w-full sm:w-48 h-9 text-[12.5px]">
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
              <span className="halo-chip"><Rows3 size={16} strokeWidth={1.75} /></span>
              <h3 className="halo-heading">Campaign list</h3>
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
            ) : (
              <Table className="halo-table">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px]">Brand</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[80px] text-center">Live ads</TableHead>
                    <TableHead className="w-[120px]">Created</TableHead>
                    <TableHead className="col-num w-[110px]">Target impr.</TableHead>
                    <TableHead className="col-num w-[110px]">Live impr.</TableHead>
                    <TableHead className="col-num w-[110px]">Live clicks</TableHead>
                    <TableHead className="w-[90px] text-center">CTR</TableHead>
                    <TableHead className="col-num w-[110px]">Landings</TableHead>
                    <TableHead className="col-num w-[90px]">Budget</TableHead>
                    <TableHead className="w-[80px] text-center">Actions</TableHead>
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
                          <span className="flex items-center gap-2.5">
                            <span className={`halo-avatar halo-chip-solid halo-chip-${familyForString(campaign.brandName)}`}>
                              {campaign.brandName.trim().charAt(0).toUpperCase() || '?'}
                            </span>
                            <span className="text-[12.5px] font-semibold text-[var(--h-ink)]">
                              {campaign.brandName}
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
                        <TableCell className="text-[11.5px] text-[var(--h-ink-2)]">
                          {formatDate(campaign.createdAt)}
                        </TableCell>
                        <TableCell className="col-num">
                          {formatCount(campaign.impressionTarget)}
                        </TableCell>
                        <TableCell className="col-num">
                          {numCell(m?.impressions)}
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
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="btn-halo-ghost btn-halo-icon btn-halo-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
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
