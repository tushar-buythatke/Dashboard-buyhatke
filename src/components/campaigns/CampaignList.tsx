import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, RefreshCw, Download, BarChart3, MoreHorizontal, Eye, Edit, Copy, Archive, Pause, Play, Activity, DollarSign, Target, Zap, Megaphone, Inbox, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VelvetLoader } from '@/components/ui/velvet-loader';
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
import { getApiBaseUrl } from '@/config/api';
import { usePermissions } from '@/context/PermissionsContext';
import { formatCount } from '@/lib/format';

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

  const [campaignMetrics, setCampaignMetrics] = useState<Record<number, { impressions: number; clicks: number; landingCount: number }>>({});
  const [liveAdsCount, setLiveAdsCount] = useState<Record<number, number>>({});

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    campaignId?: number;
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

      const response = await fetch(`${getApiBaseUrl()}/campaigns`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const result: CampaignResponse = await response.json();

      if (result.status === 1 && result.data?.campaignList) {
        setCampaigns(result.data.campaignList);

        const dateRange = analyticsService.getDateRange('30d');
        const metricsArr = await Promise.all(result.data.campaignList.map(async (c) => {
          const mRes = await analyticsService.getMetrics({ ...dateRange, campaignId: c.campaignId });
          return { id: c.campaignId, metrics: mRes.success && mRes.data ? mRes.data : null };
        }));
        const metricMap: Record<number, { impressions: number; clicks: number; landingCount: number }> = {};
        metricsArr.forEach(({ id, metrics }) => {
          if (metrics) metricMap[id] = { impressions: metrics.impressions, clicks: metrics.clicks, landingCount: metrics.landingCount };
        });
        setCampaignMetrics(metricMap);

        const liveAdsPromises = result.data.campaignList.map(async (c) => {
          try {
            const adsResponse = await fetch(`${getApiBaseUrl()}/ads?campaignId=${c.campaignId}`);
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
        const liveAdsMap: Record<number, number> = {};
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

  // Zoom reminder — once per 24h
  useEffect(() => {
    if (campaigns.length === 0) return;
    const reminderData = localStorage.getItem(ZOOM_REMINDER_KEY);
    const now = Date.now();
    const shouldShow = !reminderData || (now - JSON.parse(reminderData).timestamp > REMINDER_COOLDOWN);
    if (!shouldShow) return;

    const t = setTimeout(() => {
      toast.info('Best viewing at 80% magnification', {
        duration: 4500,
        position: 'top-center',
        description: 'This dashboard is optimised for a slightly zoomed-out view',
      });
      localStorage.setItem(ZOOM_REMINDER_KEY, JSON.stringify({ timestamp: now }));
    }, 2000);
    return () => clearTimeout(t);
  }, [campaigns.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    localStorage.removeItem(ZOOM_REMINDER_KEY);
    await fetchCampaigns();
    setIsRefreshing(false);
  };

  const handleExport = () => {
    if (filteredCampaigns.length === 0) {
      toast.error('No campaigns to export');
      return;
    }
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
    } catch {
      toast.error('Failed to clone campaign');
    }
  };

  const handleArchiveCampaign = (campaignId: number) => {
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

  const handleStatusChange = async (campaignId: number, newStatus: number) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/campaigns/update?userId=1`, {
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

  const summaryCards = [
    { label: 'Active', value: activeCampaigns, icon: Play, tone: 'pos' as const },
    { label: 'Budget', value: `₹${totalBudget.toLocaleString()}`, icon: DollarSign, tone: 'sky' as const },
    { label: 'Impressions', value: formatCount(totalImpressions), icon: Eye, tone: 'violet' as const },
    { label: 'Live Landings', value: formatCount(totalLandingCount), icon: Zap, tone: 'amber' as const },
  ];

  // Render a numeric table cell with semantic weight:
  // zeros / missing values fall back to 0 and render in a lighter weight
  // so the table never carries em-dashes.
  const numCell = (v: number | string | null | undefined, formatter: (n: number) => string = formatCount) => {
    const n = Number(v);
    const display = Number.isFinite(n) ? formatter(n) : '0';
    const isZero = !Number.isFinite(n) || n === 0;
    return (
      <span className={isZero ? 'text-[var(--text-3)] font-normal' : 'text-[var(--text-1)] font-semibold'}>
        {display}
      </span>
    );
  };

  return (
    <div className="min-h-screen w-full app-canvas">
      {/* Subtle ambient haze behind everything */}
      <div className="velvet-ambient" aria-hidden>
        <div className="velvet-orb velvet-orb--violet" style={{ width: 360, height: 360, top: -100, right: -80, opacity: 0.35 }} />
        <div className="velvet-orb velvet-orb--plum" style={{ width: 280, height: 280, bottom: 100, left: -80, opacity: 0.25 }} />
      </div>

      <div className="relative z-[1] max-w-[1400px] mx-auto p-4 sm:p-6 space-y-5">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
        >
          <div>
            <p className="page-eyebrow">Marketing · Campaigns</p>
            <h1 className="page-display mt-1">
              <Megaphone className="h-5 w-5 text-[var(--indigo-500)]" strokeWidth={1.5} />
              <span className="velvet-header-gradient">All</span>
              <span className="page-display-serif gradient-text">Campaigns</span>
            </h1>
            <p className="page-subhead">Manage and monitor your advertising campaigns</p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="h-8"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/analytics')}
              className="h-8"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </Button>
            {canEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/campaigns/new')}
                className="h-8"
              >
                <Plus className="h-3.5 w-3.5" />
                New campaign
              </Button>
            )}
          </div>
        </motion.div>

        {/* Summary cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4"
        >
          {summaryCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="metric-card">
                <div className="relative z-[1]">
                  <div className="metric-label">{s.label}</div>
                  <div className="metric-value text-[1.1rem] sm:text-[1.25rem]">{s.value}</div>
                </div>
                <div className={`metric-icon-tone metric-icon-tone--${s.tone === 'pos' ? 'teal' : s.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="velvet-surface p-4"
        >
          <div className="velvet-section-title mb-3">Filters</div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Select
              value={statusFilter}
              onValueChange={(value) => setSearchParams(prev => ({ ...Object.fromEntries(prev), status: value === 'all' ? '' : value }))}
            >
              <SelectTrigger className="w-full sm:w-48 h-9 bg-[var(--bg-panel)] border-[var(--line)] text-[12.5px]">
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

            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
              <Input
                placeholder="Search by brand name…"
                className="pl-8 h-9 bg-[var(--bg-panel)] border-[var(--line)] text-[12.5px]"
                value={brandNameFilter}
                onChange={(e) => setSearchParams(prev => ({ ...Object.fromEntries(prev), brandName: e.target.value }))}
              />
            </div>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="velvet-surface overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--bg-panel-2)]">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-[var(--indigo-500)]" />
              <span className="text-[12.5px] font-semibold tracking-tight text-[var(--text-1)]">Campaign list</span>
            </div>
            <span className="velvet-chip">{filteredCampaigns.length} campaigns</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <VelvetLoader size={28} label="Loading campaigns" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-[var(--neg-soft)] border border-[var(--neg)]/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-[var(--neg)]" strokeWidth={1.5} />
                </div>
                <p className="text-[12.5px] font-medium text-[var(--neg)]">{error}</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-[var(--bg-panel-2)] border border-[var(--line)] flex items-center justify-center">
                  <Inbox className="h-5 w-5 text-[var(--text-3)]" strokeWidth={1.5} />
                </div>
                <p className="text-[12.5px] font-medium text-[var(--text-2)]">No campaigns found</p>
                <p className="text-[11px] text-[var(--text-3)]">Try adjusting your filters or create a new campaign</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[var(--line)] hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[200px]">Brand</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[120px]">Status</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[80px] text-center">Live ads</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[120px]">Created</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[110px] text-right">Target impr.</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[110px] text-right">Live impr.</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[110px] text-right">Live clicks</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[90px] text-center">CTR</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[110px] text-right">Landings</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[90px] text-right">Budget</TableHead>
                    <TableHead className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-4 py-2 w-[80px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const m = campaignMetrics[campaign.campaignId];
                    const ctrValue = m && m.impressions > 0 ? ((m.clicks / m.impressions) * 100) : 0;
                    const statusInfo = statusMap[campaign.status as keyof typeof statusMap];
                    return (
                      <TableRow
                        key={campaign.campaignId}
                        onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
                        className="velvet-row-hover border-b border-[var(--line)] last:border-b-0 cursor-pointer hover:bg-[var(--bg-panel-2)] transition-colors"
                      >
                        <TableCell className="px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-1.5 w-1.5 rounded-full bg-[var(--violet-500)] flex-shrink-0" />
                            <span className="text-[12.5px] font-semibold text-[var(--text-1)] truncate">
                              {campaign.brandName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <StatusPill
                            status={statusInfo?.kind || 'muted'}
                            label={statusInfo?.label || 'Unknown'}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-center">
                          <span className={`text-[12px] font-semibold tabular-nums ${liveAdsCount[campaign.campaignId] > 0 ? 'text-[var(--pos)]' : 'text-[var(--text-3)]'}`}>
                            {liveAdsCount[campaign.campaignId] || 0}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-[11.5px] text-[var(--text-2)]">
                          {formatDate(campaign.createdAt)}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-[12px] font-semibold tabular-nums text-[var(--text-1)] text-right">
                          {formatCount(campaign.impressionTarget)}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-[12px] tabular-nums text-right">
                          {numCell(m?.impressions)}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-[12px] tabular-nums text-right">
                          {numCell(m?.clicks)}
                        </TableCell>
                        <TableCell className={`px-4 py-2.5 text-[12px] tabular-nums text-center ${ctrValue === 0 ? 'text-[var(--text-3)] font-normal' : 'text-[var(--indigo-500)] font-semibold'}`}>
                          {ctrValue === 0 ? '0.0%' : `${ctrValue.toFixed(1)}%`}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-[12px] tabular-nums text-right">
                          {numCell(m?.landingCount)}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-[12px] font-semibold tabular-nums text-[var(--text-1)] text-right">
                          ₹{parseFloat(campaign.totalBudget).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[var(--bg-tint)]">
                                <MoreHorizontal className="h-3.5 w-3.5 text-[var(--text-2)]" />
                              </Button>
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
                                    className="text-[12px] text-[var(--neg)] focus:text-[var(--neg)] focus:bg-[var(--neg-soft)]"
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
