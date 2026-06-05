import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon, ImagePlus, Pencil, Plus, RefreshCw, Save, Trash2,
  X, Upload, Clock, Link, Globe, Eye, Zap, Hash, ChevronDown, ChevronUp,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePermissions } from '@/context/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { offerConfigService, OfferConfigItem, OfferConfigMap } from '@/services/offerConfigService';
import { campaignService, Campaign } from '@/services/campaignService';
import { adService } from '@/services/adService';

// Tracking slot is fixed for OC floating banner. Mirrors hardcoded slotId='84' in
// Ext-138 utility_all2.js trackImpressionPixel / trackClickPixel calls.
const OC_TRACKING_SLOT_ID = 84;

type AdOption = { adId: number; name: string; label: string };

type OfferRow = { offer: OfferConfigItem; posList: string[] };

type OfferFormState = {
  offer_id: string;
  url: string;
  image_url: string;
  domain: string;
  auto_close_time: string;
  pixel_show: string;
  pixel_click: string;
  image_size_width: string;
  image_size_height: string;
  banner_size_width: string;
  banner_size_height: string;
  price_min: string;
  price_max: string;
  campaign_id: string;
  ad_id: string;
};

const emptyForm: OfferFormState = {
  offer_id: '',
  url: '',
  image_url: '',
  domain: '',
  auto_close_time: '15',
  pixel_show: '',
  pixel_click: '',
  image_size_width: '',
  image_size_height: '',
  banner_size_width: '',
  banner_size_height: '',
  price_min: '0',
  price_max: '100000',
  campaign_id: '',
  ad_id: '',
};

// --- DateTimePicker ---
function DateTimePicker({
  label,
  date,
  onDateChange,
  required,
  disabled,
}: {
  label: string;
  date: Date | undefined;
  onDateChange: (d: Date | undefined) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [hours, setHours] = useState(date ? String(date.getHours()).padStart(2, '0') : '00');
  const [minutes, setMinutes] = useState(date ? String(date.getMinutes()).padStart(2, '0') : '00');
  const [open, setOpen] = useState(false);

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) { onDateChange(undefined); return; }
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const nd = new Date(day);
    nd.setHours(h, m, 0, 0);
    onDateChange(nd);
  };

  const handleTimeChange = (type: 'h' | 'm', val: string) => {
    const num = parseInt(val) || 0;
    if (type === 'h') {
      const c = Math.max(0, Math.min(23, num));
      setHours(String(c).padStart(2, '0'));
      if (date) { const nd = new Date(date); nd.setHours(c); onDateChange(nd); }
    } else {
      const c = Math.max(0, Math.min(59, num));
      setMinutes(String(c).padStart(2, '0'));
      if (date) { const nd = new Date(date); nd.setMinutes(c); onDateChange(nd); }
    }
  };

  useEffect(() => {
    if (date) {
      setHours(String(date.getHours()).padStart(2, '0'));
      setMinutes(String(date.getMinutes()).padStart(2, '0'));
    }
  }, [date]);

  const epoch = date ? Math.floor(date.getTime() / 1000) : null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[var(--text-3)] uppercase tracking-wider">
        {label} {required && <span className="text-[var(--neg)]">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left h-9 font-normal border-[var(--line)] hover:border-[var(--violet-400)] transition-colors',
              !date && 'text-[var(--text-3)]'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-[var(--violet-500)]" />
            {date ? format(date, 'MMM d, yyyy  HH:mm') : 'Select date & time...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-xl border-[var(--line)] bg-[var(--bg-panel)] z-[60]" align="start">
          <Calendar mode="single" selected={date} onSelect={handleDaySelect} initialFocus />
          <Separator />
          <div className="px-4 py-3 flex items-center gap-3 bg-[var(--bg-panel-2)] rounded-b-md">
            <Clock className="h-4 w-4 text-[var(--violet-500)]" />
            <div className="flex items-center gap-1">
              <Input
                type="number" min={0} max={23} value={hours}
                onChange={(e) => handleTimeChange('h', e.target.value)}
                className="w-14 text-center h-8 text-sm"
              />
              <span className="text-lg font-bold text-[var(--text-3)]">:</span>
              <Input
                type="number" min={0} max={59} value={minutes}
                onChange={(e) => handleTimeChange('m', e.target.value)}
                className="w-14 text-center h-8 text-sm"
              />
            </div>
            <span className="text-xs text-[var(--text-3)] ml-auto">24h format</span>
          </div>
        </PopoverContent>
      </Popover>
      {epoch && (
        <p className="text-[10px] text-[var(--violet-400)] font-mono">epoch: {epoch}</p>
      )}
    </div>
  );
}

// --- Section header ---
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-1 relative pl-3 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded-full before:bg-gradient-to-b before:from-[var(--violet-500)] before:to-[var(--plum-500)]">
      <div className="p-1.5 rounded-lg bg-[var(--bg-tint)] border border-[var(--line-violet)]">
        <Icon className="h-3.5 w-3.5 text-[var(--violet-500)]" />
      </div>
      <div>
        <h3 className="text-[13px] font-bold text-[var(--text-1)] tracking-wide uppercase">{title}</h3>
        {subtitle && <p className="text-[10px] text-[var(--text-3)] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// --- Field label ---
function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <Label className="text-xs font-medium text-[var(--text-3)] uppercase tracking-wider flex items-center gap-1.5">
      {children}
      {required && <span className="text-[var(--neg)]">*</span>}
      {hint && <span className="normal-case tracking-normal font-normal text-[var(--text-3)]">({hint})</span>}
    </Label>
  );
}

function formatEpochDisplay(epoch: number): string {
  if (!epoch || epoch <= 0) return '-';
  return new Date(epoch * 1000).toLocaleString();
}

export default function OffersConfig() {
  const { canEdit } = usePermissions();

  const [configMap, setConfigMap] = useState<OfferConfigMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filePath, setSourceUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const [selectedPosFilter, setSelectedPosFilter] = useState<string>('all');
  const [selectedPosList, setSelectedPosList] = useState<string[]>([]);
  const [newPosInput, setNewPosInput] = useState('');

  const [form, setForm] = useState<OfferFormState>(emptyForm);
  const [editingOfferId, setEditingOfferId] = useState('');

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const [regexInput, setRegexInput] = useState('');
  const [regexList, setRegexList] = useState<string[]>([]);
  const [breadInput, setBreadInput] = useState('');
  const [breadList, setBreadList] = useState<string[]>([]);

  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ads, setAds] = useState<AdOption[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);

  const posOptions = useMemo(
    () => Object.keys(configMap || {}).sort((a, b) => Number(a) - Number(b)),
    [configMap]
  );

  const rows = useMemo<OfferRow[]>(() => {
    const map = new Map<string, OfferRow>();
    Object.entries(configMap || {}).forEach(([pos, offers]) => {
      if (selectedPosFilter !== 'all' && selectedPosFilter !== pos) return;
      (offers || []).forEach((offer) => {
        if (!offer?.offer_id) return;
        const existing = map.get(offer.offer_id);
        if (existing) {
          if (!existing.posList.includes(pos)) existing.posList.push(pos);
        } else {
          map.set(offer.offer_id, { offer, posList: [pos] });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.offer.start - a.offer.start);
  }, [configMap, selectedPosFilter]);

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedPosList([]);
    setEditingOfferId('');
    setStartDate(undefined);
    setEndDate(undefined);
    setRegexList([]);
    setRegexInput('');
    setBreadList([]);
    setBreadInput('');
    setImagePreview('');
  };

  const loadConfig = async () => {
    setLoading(true);
    const result = await offerConfigService.getConfig();
    if (result.success && result.data) {
      setConfigMap(result.data);
      setSourceUrl(result.filePath || '');
      toast.success('Config loaded');
    } else {
      toast.error(result.message || 'Failed to load config');
    }
    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  // Campaigns list for the tracking selector
  useEffect(() => {
    campaignService.getCampaigns().then((res) => {
      if (res.success && res.data) setCampaigns(res.data);
    });
  }, []);

  // Load ads for the selected campaign, filtered to OC tracking slot (84)
  useEffect(() => {
    const cid = Number(form.campaign_id);
    if (!cid) { setAds([]); return; }
    setLoadingAds(true);
    adService.getAds({ campaignId: cid, slotId: OC_TRACKING_SLOT_ID }).then((res) => {
      if (res.success && res.data?.adsList) {
        const list: AdOption[] = (res.data.adsList || [])
          .map((a: any) => ({
            adId: Number(a.adId),
            label: String(a.label || a.name || ''),
            name: String(a.name || a.label || `Ad ${a.adId}`),
          }))
          .filter((a: AdOption) => !isNaN(a.adId) && a.adId > 0);
        setAds(list);
      } else {
        setAds([]);
      }
      setLoadingAds(false);
    });
  }, [form.campaign_id]);

  const addPos = (posRaw: string) => {
    const pos = posRaw.trim();
    if (!pos) return;
    if (selectedPosList.includes(pos)) { toast.error('POS already added'); return; }
    setSelectedPosList((prev) => [...prev, pos]);
  };
  const removePos = (pos: string) => setSelectedPosList((prev) => prev.filter((i) => i !== pos));
  const setFormValue = (key: keyof OfferFormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const addRegex = () => {
    const val = regexInput.trim();
    if (!val) return;
    try { new RegExp(val); } catch { toast.error('Invalid regex'); return; }
    if (regexList.includes(val)) { toast.error('Already added'); return; }
    setRegexList((prev) => [...prev, val]);
    setRegexInput('');
  };
  const removeRegex = (idx: number) => setRegexList((prev) => prev.filter((_, i) => i !== idx));

  const addBread = () => {
    const val = breadInput.trim();
    if (!val) return;
    if (breadList.includes(val)) { toast.error('Already added'); return; }
    setBreadList((prev) => [...prev, val]);
    setBreadInput('');
  };
  const removeBread = (idx: number) => setBreadList((prev) => prev.filter((_, i) => i !== idx));

  const editRow = (row: OfferRow) => {
    const { offer, posList } = row;
    setEditingOfferId(offer.offer_id);
    setSelectedPosList(posList);
    setRegexList(offer.url_reg_arr || []);
    setBreadList(offer.bread_arr || []);
    setImagePreview(offer.image_url || '');
    setStartDate(offer.start ? new Date(offer.start * 1000) : undefined);
    setEndDate(offer.end ? new Date(offer.end * 1000) : undefined);
    setForm({
      offer_id: offer.offer_id,
      url: offer.url || '',
      image_url: offer.image_url || '',
      domain: offer.domain || '',
      auto_close_time: String(offer.auto_close_time || 15),
      pixel_show: offer.pixel_show || '',
      pixel_click: offer.pixel_click || '',
      image_size_width: String(offer.imageSize?.width || ''),
      image_size_height: String(offer.imageSize?.height || ''),
      banner_size_width: String(offer.bannerSize?.width || ''),
      banner_size_height: String(offer.bannerSize?.height || ''),
      price_min: String(offer.price_range?.min ?? 0),
      price_max: String(offer.price_range?.max ?? 100000),
      campaign_id: offer.campaignId ? String(offer.campaignId) : '',
      ad_id: offer.adId ? String(offer.adId) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStartEpoch = () => startDate ? Math.floor(startDate.getTime() / 1000) : 0;
  const getEndEpoch = () => endDate ? Math.floor(endDate.getTime() / 1000) : 0;

  const validateForm = () => {
    if (!selectedPosList.length) return 'Select at least one POS';
    if (!form.offer_id.trim()) return 'Offer ID is required';
    if (!editingOfferId) {
      const ids = new Set<string>();
      Object.values(configMap || {}).forEach((o) => o.forEach((x) => ids.add(x.offer_id)));
      if (ids.has(form.offer_id.trim())) return 'Offer ID already exists';
    }
    const s = getStartEpoch(), e = getEndEpoch();
    if (!s) return 'Select start date & time';
    if (!e || e <= s) return 'End must be after start';
    if (!form.campaign_id || !form.ad_id) return 'Pick a tracking Campaign and Ad';
    if (!regexList.length) return 'Add at least one URL regex';
    if (!form.url.trim()) return 'URL is required';
    try { new URL(form.url.trim()); } catch { return 'Invalid URL'; }
    if (!form.image_url.trim()) return 'Upload an image first';
    const ac = Number(form.auto_close_time);
    if (!Number.isInteger(ac) || ac < 1 || ac > 20) return 'Auto close: 1-20s';
    if (!Number(form.image_size_width) || !Number(form.image_size_height)) return 'Upload image to detect size';
    const pMin = Number(form.price_min), pMax = Number(form.price_max);
    if (!Number.isFinite(pMin) || !Number.isFinite(pMax) || pMin < 0 || pMax < pMin) return 'Invalid price range';
    return '';
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) { toast.error(err); return; }
    setSaving(true);
    const iW = Number(form.image_size_width), iH = Number(form.image_size_height);
    const offerData = {
      offer_id: form.offer_id.trim(),
      start: getStartEpoch(), end: getEndEpoch(),
      url_reg_arr: regexList, heading_text: 'T',
      image_url: form.image_url.trim(), main_text: 'T',
      url: form.url.trim(), button_text: 'T',
      domain: form.domain.trim(),
      auto_close_time: Number(form.auto_close_time),
      pixel_show: form.pixel_show.trim(),
      pixel_click: form.pixel_click.trim(),
      imageSize: { width: iW, height: iH },
      bannerSize: { width: Number(form.banner_size_width) || iW + 20, height: Number(form.banner_size_height) || iH + 20 },
      bread_arr: breadList,
      price_range: { min: Number(form.price_min), max: Number(form.price_max) },
      campaignId: Number(form.campaign_id),
      slotId: OC_TRACKING_SLOT_ID,
      adId: Number(form.ad_id),
    };

    let result;
    if (editingOfferId) {
      // Edit: update in-place, safe POS handling
      result = await offerConfigService.editOffer({
        posList: selectedPosList,
        offer: offerData,
        previousOfferId: editingOfferId,
      });
    } else {
      // Create: only append, never remove
      result = await offerConfigService.createOffer({
        posList: selectedPosList,
        offer: offerData,
      });
    }

    if (result.success && result.data) {
      setConfigMap(result.data);
      toast.success(editingOfferId ? 'Offer updated' : 'Offer created');
      resetForm();
    } else {
      toast.error(result.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleDelete = async (offerId: string) => {
    if (!canEdit) return;
    setDeleteConfirmId(null);
    setSaving(true);
    const result = await offerConfigService.deleteOffer(offerId);
    if (result.success && result.data) {
      setConfigMap(result.data);
      if (editingOfferId === offerId) resetForm();
      toast.success('Deleted');
    } else {
      toast.error(result.message || 'Delete failed');
    }
    setSaving(false);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const localUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = async () => {
      const w = image.width, h = image.height;
      if (w < 100 || h < 100 || w > 300 || h > 300) {
        toast.error(`Size must be 100x100 - 300x300. Got ${w}x${h}`);
        URL.revokeObjectURL(localUrl);
        return;
      }
      // Show local preview immediately
      setImagePreview(localUrl);
      setFormValue('image_size_width', String(w));
      setFormValue('image_size_height', String(h));
      setFormValue('banner_size_width', String(w + 20));
      setFormValue('banner_size_height', String(h + 20));

      // Upload to temp on server
      setUploading(true);
      const result = await offerConfigService.uploadImage(file);
      if (result.success && result.imageUrl) {
        setFormValue('image_url', result.imageUrl);
        toast.success(`Uploaded ${w}x${h}`);
      } else {
        toast.error(result.message || 'Upload failed');
        setImagePreview('');
        setFormValue('image_size_width', '');
        setFormValue('image_size_height', '');
        setFormValue('banner_size_width', '');
        setFormValue('banner_size_height', '');
      }
      setUploading(false);
    };
    image.onerror = () => { toast.error('Invalid image file'); URL.revokeObjectURL(localUrl); };
    image.src = localUrl;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
    event.target.value = '';
  };

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const clearImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
    setFormValue('image_url', '');
    setFormValue('image_size_width', '');
    setFormValue('image_size_height', '');
    setFormValue('banner_size_width', '');
    setFormValue('banner_size_height', '');
  };

  const isExpired = (end: number) => end * 1000 < Date.now();
  const isActive = (start: number, end: number) => { const n = Date.now(); return start * 1000 <= n && end * 1000 >= n; };

  const activeCount = rows.filter((r) => isActive(r.offer.start, r.offer.end)).length;
  const expiredCount = rows.filter((r) => isExpired(r.offer.end)).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="page-eyebrow">Configuration</p>
              <h1 className="page-display">
                <span className="velvet-header-gradient">Offers</span>
                <span className="page-display-serif gradient-text">Config</span>
              </h1>
              <p className="page-subhead">Manage extension offer overlays</p>
              {filePath && <p className="text-[10px] text-[var(--text-3)] mt-1.5 font-mono break-all">{filePath}</p>}
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-3 mr-2">
                <div className="text-center">
                  <p className="text-[18px] font-bold tabular-nums text-[var(--text-1)]">{rows.length}</p>
                  <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">Total</p>
                </div>
                <span className="text-[var(--text-3)] text-[10px]">·</span>
                <div className="text-center">
                  <p className="text-[18px] font-bold tabular-nums text-[var(--pos)]">{activeCount}</p>
                  <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">Active</p>
                </div>
                <span className="text-[var(--text-3)] text-[10px]">·</span>
                <div className="text-center">
                  <p className="text-[18px] font-bold tabular-nums text-rose-500">{expiredCount}</p>
                  <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">Expired</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadConfig}
                disabled={loading}
                className="h-8 gap-1.5 text-[12px] text-[var(--text-2)]"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── Form ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="velvet-surface velvet-micro-shadow rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--line)] flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-tint)] border border-[var(--line-violet)]">
                {editingOfferId ? <Pencil className="h-3.5 w-3.5 text-[var(--violet-500)]" /> : <Plus className="h-3.5 w-3.5 text-[var(--violet-500)]" />}
              </span>
              <div>
                <span className="text-[13px] font-semibold text-[var(--text-1)]">
                  {editingOfferId ? 'Edit Offer' : 'Create New Offer'}
                </span>
                {editingOfferId && (
                  <p className="text-[10px] text-[var(--indigo-500)] font-mono mt-0.5">{editingOfferId}</p>
                )}
              </div>
            </div>
            <div className="p-5 space-y-5">

              {/* ─ POS ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Hash} title="Position (POS)" subtitle="Which slot positions to show this offer on" />
                <div className="flex gap-2">
                  <Select onValueChange={addPos}>
                      <SelectTrigger className="flex-1 h-9 border-[var(--line)]">
                      <SelectValue placeholder="Select existing POS..." />
                    </SelectTrigger>
                    <SelectContent>
                      {posOptions.map((pos) => (
                        <SelectItem key={pos} value={pos}>POS {pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1.5">
                    <Input
                      value={newPosInput}
                      onChange={(e) => setNewPosInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPos(newPosInput); setNewPosInput(''); } }}
                      placeholder="Custom"
                      className="w-24 h-9"
                    />
                    <Button variant="outline" className="h-9 px-3 border-[var(--line-violet)] text-[var(--violet-600)] hover:bg-[var(--bg-tint)] hover:border-[var(--violet-400)] text-xs font-semibold" onClick={() => { addPos(newPosInput); setNewPosInput(''); }}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
                <AnimatePresence>
                  {selectedPosList.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2">
                      {selectedPosList.map((pos) => (
                        <motion.span
                          key={pos}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-tint)] text-[var(--violet-600)] border border-[var(--line-violet)]"
                        >
                          <Hash className="h-3 w-3" />
                          {pos}
                          <button onClick={() => removePos(pos)} className="ml-0.5 hover:text-[var(--neg)] transition-colors"><X className="h-3 w-3" /></button>
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative py-1"><div className="h-px bg-gradient-to-r from-transparent via-[var(--line-violet)] to-transparent" /></div>

              {/* ─ Identity ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Zap} title="Offer Details" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel required>Offer ID</FieldLabel>
                    <Input value={form.offer_id} onChange={(e) => setFormValue('offer_id', e.target.value)} disabled={!canEdit} placeholder="e.g. Amaz_MTLoanApple" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Domain</FieldLabel>
                    <Input value={form.domain} onChange={(e) => setFormValue('domain', e.target.value)} disabled={!canEdit} placeholder="e.g. amazon.in" className="h-9" />
                  </div>
                </div>
              </div>

              <div className="relative py-1"><div className="h-px bg-gradient-to-r from-transparent via-[var(--line-violet)] to-transparent" /></div>

              {/* ─ Schedule ─ */}
              <div className="space-y-3">
                <SectionHeader icon={CalendarIcon} title="Schedule" subtitle="When should this offer be active?" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateTimePicker label="Start" date={startDate} onDateChange={setStartDate} required disabled={!canEdit} />
                  <DateTimePicker label="End" date={endDate} onDateChange={setEndDate} required disabled={!canEdit} />
                </div>
              </div>

              <div className="relative py-1"><div className="h-px bg-gradient-to-r from-transparent via-[var(--line-violet)] to-transparent" /></div>

              {/* ─ Creative ─ */}
              <div className="space-y-3">
                <SectionHeader icon={ImagePlus} title="Creative" subtitle="Upload banner image (100x100 to 300x300 px)" />

                {!imagePreview ? (
                  <div
                    className={cn(
                      'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                      dragActive
                        ? 'border-[var(--violet-500)] bg-[var(--bg-tint)] scale-[1.01]'
                        : 'border-[var(--line-violet)] hover:border-[var(--violet-400)] bg-[var(--bg-tint)] hover:bg-[rgba(99,76,230,0.08)]',
                      uploading && 'pointer-events-none opacity-60'
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className={cn('mx-auto h-10 w-10 mb-3', dragActive ? 'text-[var(--violet-500)]' : 'text-[var(--violet-300)]')} />
                    <p className="text-sm text-[var(--text-2)] mb-1">
                      {uploading ? 'Uploading to server...' : 'Drag & drop your image here, or click to browse'}
                    </p>
                    <p className="text-[10px] text-[var(--text-3)]">100x100 to 300x300 px</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={!canEdit || uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl border border-[var(--line)] overflow-hidden bg-[var(--bg-panel-2)]"
                  >
                    <div className="relative p-4">
                      <img src={imagePreview} alt="Preview" className="mx-auto rounded-lg border border-[var(--line)] shadow-sm max-h-40 object-contain" />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                          <div className="text-white flex items-center gap-2 text-sm">
                            <RefreshCw className="h-4 w-4 animate-spin" /> Uploading...
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-panel)] border-t border-[var(--line)]">
                      <div className="text-xs text-[var(--text-3)] font-mono">
                        {form.image_size_width && form.image_size_height
                          ? `${form.image_size_width} x ${form.image_size_height} px`
                          : 'Detecting...'}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-[var(--text-3)] hover:text-[var(--neg)]"
                        onClick={clearImage}
                        disabled={uploading}
                      >
                        <X className="h-3 w-3 mr-1" /> Remove
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="relative py-1"><div className="h-px bg-gradient-to-r from-transparent via-[var(--line-violet)] to-transparent" /></div>

              {/* ─ URL & Destination ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Link} title="Destination" />
                <div className="space-y-1.5">
                  <FieldLabel required>Click URL</FieldLabel>
                  <Input value={form.url} onChange={(e) => setFormValue('url', e.target.value)} disabled={!canEdit} placeholder="https://..." className="h-9 font-mono text-sm" />
                </div>
              </div>

              <div className="relative py-1"><div className="h-px bg-gradient-to-r from-transparent via-[var(--line-violet)] to-transparent" /></div>

              {/* ─ Tracking (campaign + ad on fixed slot 84) ─ */}
              <div className="space-y-3">
                <SectionHeader
                  icon={Target}
                  title="Ad-Backend Tracking"
                  subtitle={`Slot ${OC_TRACKING_SLOT_ID} is fixed; pick the campaign + tracking ad you created for OC`}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel required>Campaign</FieldLabel>
                    <Select
                      value={form.campaign_id}
                      onValueChange={(v) => {
                        setFormValue('campaign_id', v);
                        setFormValue('ad_id', '');
                      }}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-9 border-[var(--line)]">
                        <SelectValue placeholder="Select campaign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map((c) => {
                          const cid = String(c.campaignId ?? c.id);
                          // Backend returns brandName; older typing claims `name`. Tolerate both.
                          const label = (c as any).brandName || (c as any).name || `Campaign ${cid}`;
                          return (
                            <SelectItem key={cid} value={cid}>
                              {label} <span className="text-[var(--text-3)] ml-1">#{cid}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel required hint={loadingAds ? 'loading…' : `slot ${OC_TRACKING_SLOT_ID} only`}>Tracking Ad</FieldLabel>
                    <Select
                      value={form.ad_id}
                      onValueChange={(v) => setFormValue('ad_id', v)}
                      disabled={!canEdit || !form.campaign_id || loadingAds}
                    >
                      <SelectTrigger className="h-9 border-[var(--line)]">
                        <SelectValue
                          placeholder={
                            !form.campaign_id
                              ? 'Pick campaign first'
                              : ads.length === 0
                                ? 'No ads on slot 84 for this campaign'
                                : 'Select ad...'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {ads.map((a) => (
                          <SelectItem key={a.adId} value={String(a.adId)}>
                            {a.label || a.name} <span className="text-[var(--text-3)] ml-1">#{a.adId}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.campaign_id && form.ad_id && (
                  <p className="text-[11px] text-[var(--violet-500)] font-mono">
                    Will fire: campaignId={form.campaign_id} · slotId={OC_TRACKING_SLOT_ID} · adId={form.ad_id}
                  </p>
                )}
              </div>

              <div className="relative py-1"><div className="h-px bg-gradient-to-r from-transparent via-[var(--line-violet)] to-transparent" /></div>

              {/* ─ Config ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Clock} title="Display & Tracking" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel>Auto Close</FieldLabel>
                    <div className="relative">
                      <Input type="number" min={1} max={20} value={form.auto_close_time} onChange={(e) => setFormValue('auto_close_time', e.target.value)} disabled={!canEdit} className="h-9 pr-8" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-3)]">sec</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Price Min</FieldLabel>
                    <Input type="number" value={form.price_min} onChange={(e) => setFormValue('price_min', e.target.value)} disabled={!canEdit} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Price Max</FieldLabel>
                    <Input type="number" value={form.price_max} onChange={(e) => setFormValue('price_max', e.target.value)} disabled={!canEdit} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                  <div className="space-y-1.5">
                    <FieldLabel hint="legacy · 3rd-party only">Pixel Show</FieldLabel>
                    <Input
                      value={form.pixel_show}
                      onChange={(e) => setFormValue('pixel_show', e.target.value)}
                      disabled={!canEdit}
                      placeholder="External pixel URL (optional — ad-backend tracking is above)"
                      className="h-9 text-sm bg-[var(--bg-panel-2)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="legacy · 3rd-party only">Pixel Click</FieldLabel>
                    <Input
                      value={form.pixel_click}
                      onChange={(e) => setFormValue('pixel_click', e.target.value)}
                      disabled={!canEdit}
                      placeholder="External pixel URL (optional — ad-backend tracking is above)"
                      className="h-9 text-sm bg-[var(--bg-panel-2)]"
                    />
                  </div>
                </div>
              </div>

              <div className="relative py-1"><div className="h-px bg-gradient-to-r from-transparent via-[var(--line-violet)] to-transparent" /></div>

              {/* ─ URL Regex ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Globe} title="URL Regex Patterns" subtitle="Pages where this offer should appear" />
                <div className="flex gap-2">
                  <Input
                    value={regexInput}
                    onChange={(e) => setRegexInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRegex(); } }}
                    placeholder="^https://in\.puma\.com"
                    className="flex-1 h-9 font-mono text-sm"
                    disabled={!canEdit}
                  />
                  <Button onClick={addRegex} disabled={!canEdit} className="h-9 px-4 bg-[var(--g-button)] hover:bg-[var(--g-button-hover)] text-[var(--text-inv)] shadow-sm shadow-[rgba(99,76,230,0.2)] text-xs font-semibold">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <AnimatePresence>
                  {regexList.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl border border-[var(--line)] overflow-hidden">
                      {regexList.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 py-2.5 font-mono text-sm',
                            i % 2 === 0 ? 'bg-[var(--bg-panel-2)]' : 'bg-[var(--bg-panel)]'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-[var(--text-3)] font-sans w-4 text-right">{i + 1}</span>
                            <span className="truncate text-[var(--text-2)]">{r}</span>
                          </div>
                          <button onClick={() => removeRegex(i)} className="text-[var(--text-3)] hover:text-[var(--neg)] transition-colors flex-shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative py-1"><div className="h-px bg-gradient-to-r from-transparent via-[var(--line-violet)] to-transparent" /></div>

              {/* ─ Breadcrumbs ─ */}
              <div className="space-y-3">
                <SectionHeader icon={ChevronDown} title="Breadcrumbs" subtitle="Optional category targeting" />
                <div className="flex gap-2">
                  <Input
                    value={breadInput}
                    onChange={(e) => setBreadInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBread(); } }}
                    placeholder="Computers & Accessories*~Laptops*~Traditional Laptops"
                    className="flex-1 h-9 text-sm"
                    disabled={!canEdit}
                  />
                  <Button onClick={addBread} disabled={!canEdit} variant="outline" className="h-9">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <AnimatePresence>
                  {breadList.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl border border-[var(--line)] overflow-hidden">
                      {breadList.map((b, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 py-2.5 text-sm',
                            i % 2 === 0 ? 'bg-[var(--bg-panel-2)]' : 'bg-[var(--bg-panel)]'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-[var(--text-3)] w-4 text-right">{i + 1}</span>
                            <span className="truncate text-[var(--text-2)]">{b}</span>
                          </div>
                          <button onClick={() => removeBread(i)} className="text-[var(--text-3)] hover:text-[var(--neg)] transition-colors flex-shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ─ Actions ─ */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={!canEdit || saving}
                  className="h-9 px-6 bg-[var(--g-button)] hover:bg-[var(--g-button-hover)] text-[var(--text-inv)] shadow-lg shadow-[rgba(99,76,230,0.25)] transition-all"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : editingOfferId ? 'Update Offer' : 'Create Offer'}
                </Button>
                <Button variant="ghost" onClick={resetForm} disabled={saving} className="h-9 text-[var(--text-3)] hover:text-[var(--text-1)]">
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Existing Offers ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="velvet-surface velvet-micro-shadow rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--line)] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-tint)] border border-[var(--line-violet)]">
                  <Eye className="h-3.5 w-3.5 text-[var(--violet-500)]" />
                </span>
                <div>
                  <span className="text-[13px] font-semibold text-[var(--text-1)]">Existing Offers</span>
                  <p className="text-[10px] text-[var(--text-3)] mt-0.5">{rows.length} offer{rows.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Select value={selectedPosFilter} onValueChange={setSelectedPosFilter}>
                <SelectTrigger className="w-36 h-9 text-sm border-[var(--line)]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All POS</SelectItem>
                  {posOptions.map((pos) => (
                    <SelectItem key={pos} value={pos}>POS {pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 space-y-3">
              <AnimatePresence>
                {rows.map((row, idx) => {
                  const expired = isExpired(row.offer.end);
                  const active = isActive(row.offer.start, row.offer.end);
                  const expanded = expandedOfferId === row.offer.offer_id;
                  return (
                    <motion.div
                      key={row.offer.offer_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        'rounded-xl border overflow-hidden transition-all hover:shadow-[0_2px_12px_-4px_rgba(99,76,230,0.15)]',
                        expired ? 'border-[var(--neg-soft)]' : active ? 'border-[var(--pos-soft)]' : 'border-[var(--line)] hover:border-[var(--line-violet)]'
                      )}
                    >
                      {/* Main row */}
                      <div
                        className={cn(
                          'flex items-center gap-4 p-3.5 cursor-pointer hover:bg-[var(--bg-tint)] transition-all group/row',
                          expired && 'bg-[var(--neg-soft)]',
                          active && 'bg-[var(--pos-soft)]'
                        )}
                        onClick={() => setExpandedOfferId(expanded ? null : row.offer.offer_id)}
                      >
                        {row.offer.image_url && (
                          <img src={row.offer.image_url} alt="" className="h-12 w-20 object-cover rounded-lg border border-[var(--line)] flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-[var(--text-1)]">{row.offer.offer_id}</span>
                            {expired && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">Expired</Badge>}
                            {active && <Badge className="text-[10px] px-1.5 py-0 h-5 bg-[var(--pos-soft)] text-[var(--pos)] hover:bg-[var(--pos-soft)]">Active</Badge>}
                            {!expired && !active && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Scheduled</Badge>}
                          </div>
                          <p className="text-xs text-[var(--text-3)] mt-0.5">
                            POS: {row.posList.join(', ')} &middot; {formatEpochDisplay(row.offer.start)} → {formatEpochDisplay(row.offer.end)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-3)] font-mono">
                            {row.offer.campaignId && <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tint)] text-[var(--violet-500)]">c{row.offer.campaignId}</span>}
                            {row.offer.adId && <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tint)] text-[var(--violet-500)]">ad{row.offer.adId}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[var(--text-3)] hover:text-[var(--violet-600)]" onClick={(e) => { e.stopPropagation(); editRow(row); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[var(--text-3)] hover:text-[var(--neg)]" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(row.offer.offer_id); }} disabled={!canEdit || saving}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {expanded ? <ChevronUp className="h-4 w-4 text-[var(--text-3)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-3)]" />}
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 border-t border-[var(--line)] grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              {row.offer.campaignId && (
                                <div>
                                  <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Campaign ID</span>
                                  <p className="text-[var(--violet-500)] font-mono font-semibold mt-0.5">{row.offer.campaignId}</p>
                                </div>
                              )}
                              {row.offer.adId && (
                                <div>
                                  <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Ad ID</span>
                                  <p className="text-[var(--violet-500)] font-mono font-semibold mt-0.5">{row.offer.adId}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Slot ID</span>
                                <p className="text-[var(--violet-500)] font-mono font-semibold mt-0.5">{row.offer.slotId ?? 84}</p>
                              </div>
                              {row.offer.domain && (
                                <div>
                                  <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Domain</span>
                                  <p className="text-[var(--text-2)] mt-0.5">{row.offer.domain}</p>
                                </div>
                              )}
                              {row.offer.imageSize && (
                                <div>
                                  <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Image Size</span>
                                  <p className="text-[var(--text-2)] mt-0.5">{row.offer.imageSize.width}x{row.offer.imageSize.height}</p>
                                </div>
                              )}
                              {row.offer.bannerSize && (
                                <div>
                                  <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Banner Size</span>
                                  <p className="text-[var(--text-2)] mt-0.5">{row.offer.bannerSize.width}x{row.offer.bannerSize.height}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Auto Close</span>
                                <p className="text-[var(--text-2)] mt-0.5">{row.offer.auto_close_time}s</p>
                              </div>
                              {row.offer.price_range && (
                                <div>
                                  <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Price Range</span>
                                  <p className="text-[var(--text-2)] mt-0.5">{row.offer.price_range.min.toLocaleString()} - {row.offer.price_range.max.toLocaleString()}</p>
                                </div>
                              )}
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">URL</span>
                                <p className="text-[var(--text-2)] mt-0.5 truncate font-mono">{row.offer.url}</p>
                              </div>
                              {(row.offer.url_reg_arr?.length ?? 0) > 0 && (
                                <div className="col-span-2 md:col-span-4">
                                  <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Regex ({row.offer.url_reg_arr.length})</span>
                                  <div className="mt-1 space-y-1">
                                    {row.offer.url_reg_arr.map((r, i) => (
                                      <p key={i} className="font-mono text-[var(--text-2)] bg-[var(--bg-panel-2)] rounded px-2 py-0.5">{r}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(row.offer.bread_arr?.length ?? 0) > 0 && (
                                <div className="col-span-2 md:col-span-4">
                                  <span className="text-[var(--text-3)] uppercase tracking-wider text-[10px]">Breadcrumbs ({row.offer.bread_arr!.length})</span>
                                  <div className="mt-1 space-y-1">
                                    {row.offer.bread_arr!.map((b, i) => (
                                      <p key={i} className="text-[var(--text-2)] bg-[var(--bg-panel-2)] rounded px-2 py-0.5">{b}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!rows.length && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-panel-2)] mb-3">
                    <ImagePlus className="h-5 w-5 text-[var(--text-3)]" />
                  </div>
                  <p className="text-sm text-[var(--text-3)]">No offers found</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent className="rounded-2xl border-[var(--neg)]/20 bg-[var(--bg-panel)] shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[var(--neg)]">
              <Trash2 className="h-5 w-5" />
              Delete Offer
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-2)]">
              Are you sure you want to delete <span className="font-semibold text-[var(--text-1)]">{deleteConfirmId}</span>? This will remove it from all POS positions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="rounded-lg bg-[var(--neg)] hover:bg-[var(--neg)] text-[var(--text-inv)]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
