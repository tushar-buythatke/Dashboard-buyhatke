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
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { offerConfigService, OfferConfigItem, OfferConfigMap } from '@/services/offerConfigService';
import { campaignService, Campaign } from '@/services/campaignService';
import { adService } from '@/services/adService';
import { isV2Active } from '@/utils/v2Normalizer';

// Tracking slot is fixed for OC floating banner. Mirrors hardcoded slotId='84' in
// Ext-138 utility_all2.js trackImpressionPixel / trackClickPixel calls.
const OC_TRACKING_SLOT_ID = 84;

type AdOption = { adId: string | number; name: string; label: string };

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
      <Label className="halo-label">
        {label} {required && <span style={{ color: 'var(--h-coral)' }}>*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'halo-field flex items-center justify-start text-left font-normal',
              !date && 'text-[var(--h-ink-3)]'
            )}
          >
            <CalendarIcon strokeWidth={1.75} className="mr-2 h-4 w-4" style={{ color: 'var(--h-iris-500)' }} />
            {date ? format(date, 'MMM d, yyyy  HH:mm') : 'Select date & time...'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 halo-card z-[60]" align="start">
          <Calendar mode="single" selected={date} onSelect={handleDaySelect} initialFocus />
          <hr className="halo-divider" />
          <div className="px-4 py-3 flex items-center gap-3 rounded-b-[var(--h-r-card)]" style={{ background: 'var(--h-surface-2)' }}>
            <Clock strokeWidth={1.75} className="h-4 w-4" style={{ color: 'var(--h-iris-500)' }} />
            <div className="flex items-center gap-1">
              <Input
                type="number" min={0} max={23} value={hours}
                onChange={(e) => handleTimeChange('h', e.target.value)}
                className="halo-field w-14 text-center h-8 text-sm num"
              />
              <span className="text-lg font-bold" style={{ color: 'var(--h-ink-3)' }}>:</span>
              <Input
                type="number" min={0} max={59} value={minutes}
                onChange={(e) => handleTimeChange('m', e.target.value)}
                className="halo-field w-14 text-center h-8 text-sm num"
              />
            </div>
            <span className="text-xs ml-auto" style={{ color: 'var(--h-ink-3)' }}>24h format</span>
          </div>
        </PopoverContent>
      </Popover>
      {epoch && (
        <p className="text-[10px] num" style={{ color: 'var(--h-iris-400)', fontFamily: 'var(--h-font-mono)' }}>epoch: {epoch}</p>
      )}
    </div>
  );
}

// --- Section header (panel-head pattern) ---
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="halo-chip">
        <Icon strokeWidth={1.75} className="h-3.5 w-3.5" />
      </div>
      <div>
        <h3 className="halo-heading">{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--h-ink-3)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// --- Field label ---
function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <Label className="halo-label flex items-center gap-1.5">
      {children}
      {required && <span style={{ color: 'var(--h-coral)' }}>*</span>}
      {hint && <span className="normal-case font-normal" style={{ color: 'var(--h-ink-3)' }}>({hint})</span>}
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
    const cid: string | number = isV2Active() ? form.campaign_id : Number(form.campaign_id);
    if (!cid) { setAds([]); return; }
    setLoadingAds(true);
    adService.getAds({ campaignId: cid as any, slotId: OC_TRACKING_SLOT_ID }).then((res) => {
      if (res.success && res.data?.adsList) {
        const list: AdOption[] = (res.data.adsList || [])
          .map((a: any) => ({
            adId: isV2Active() ? String(a.adId) : Number(a.adId),
            label: String(a.label || a.name || ''),
            name: String(a.name || a.label || `Ad ${a.adId}`),
          }))
          .filter((a: AdOption) => isV2Active() ? !!a.adId : (!isNaN(a.adId as number) && (a.adId as number) > 0));
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
      campaignId: (isV2Active() ? form.campaign_id : Number(form.campaign_id)) as any,
      slotId: OC_TRACKING_SLOT_ID,
      adId: (isV2Active() ? form.ad_id : Number(form.ad_id)) as any,
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
    <div className="halo-page">
      <div className="space-y-5">

        <PageHeader
          eyebrow="Configuration"
          title="Offers config"
          subhead={filePath ? `Manage extension offer overlays — ${filePath}` : 'Manage extension offer overlays.'}
          actions={
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-center">
                  <p className="halo-metric num" style={{ fontSize: '1.125rem' }}>{rows.length}</p>
                  <p className="halo-eyebrow">Total</p>
                </div>
                <div className="text-center">
                  <p className="halo-metric num" style={{ fontSize: '1.125rem', color: 'var(--h-mint)' }}>{activeCount}</p>
                  <p className="halo-eyebrow">Active</p>
                </div>
                <div className="text-center">
                  <p className="halo-metric num" style={{ fontSize: '1.125rem', color: 'var(--h-coral)' }}>{expiredCount}</p>
                  <p className="halo-eyebrow">Expired</p>
                </div>
              </div>
              <button onClick={loadConfig} disabled={loading} className="btn-halo-outline btn-halo-sm">
                <RefreshCw strokeWidth={1.75} className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                Refresh
              </button>
            </div>
          }
        />

        {/* ── Form ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="halo-card overflow-hidden">
            <div className="halo-panel-head halo-rail-full">
              <div className="halo-panel-head-title">
                <span className="halo-chip">
                  {editingOfferId ? <Pencil strokeWidth={1.75} className="h-3.5 w-3.5" /> : <Plus strokeWidth={1.75} className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <span className="halo-heading">
                    {editingOfferId ? 'Edit offer' : 'Create new offer'}
                  </span>
                  {editingOfferId && (
                    <p className="text-[10px] num mt-0.5" style={{ color: 'var(--h-iris-500)', fontFamily: 'var(--h-font-mono)' }}>{editingOfferId}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5 space-y-5">

              {/* ─ POS ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Hash} title="Position (POS)" subtitle="Which slot positions to show this offer on" />
                <div className="flex gap-2">
                  <Select onValueChange={addPos}>
                    <SelectTrigger className="halo-field flex-1 h-9">
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
                      className="halo-field w-24 h-9"
                    />
                    <button className="btn-halo-outline btn-halo-sm" onClick={() => { addPos(newPosInput); setNewPosInput(''); }}>
                      <Plus strokeWidth={1.75} className="h-4 w-4" /> Add
                    </button>
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
                          className="halo-badge halo-badge-iris"
                        >
                          <Hash strokeWidth={1.75} className="h-3 w-3" />
                          {pos}
                          <button onClick={() => removePos(pos)} className="ml-0.5 transition-colors hover:opacity-70">
                            <X strokeWidth={1.75} className="h-3 w-3" />
                          </button>
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <hr className="halo-divider" />

              {/* ─ Identity ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Zap} title="Offer details" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel required>Offer ID</FieldLabel>
                    <Input value={form.offer_id} onChange={(e) => setFormValue('offer_id', e.target.value)} disabled={!canEdit} placeholder="e.g. Amaz_MTLoanApple" className="halo-field h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Domain</FieldLabel>
                    <Input value={form.domain} onChange={(e) => setFormValue('domain', e.target.value)} disabled={!canEdit} placeholder="e.g. amazon.in" className="halo-field h-9" />
                  </div>
                </div>
              </div>

              <hr className="halo-divider" />

              {/* ─ Schedule ─ */}
              <div className="space-y-3">
                <SectionHeader icon={CalendarIcon} title="Schedule" subtitle="When should this offer be active?" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateTimePicker label="Start" date={startDate} onDateChange={setStartDate} required disabled={!canEdit} />
                  <DateTimePicker label="End" date={endDate} onDateChange={setEndDate} required disabled={!canEdit} />
                </div>
              </div>

              <hr className="halo-divider" />

              {/* ─ Creative ─ */}
              <div className="space-y-3">
                <SectionHeader icon={ImagePlus} title="Creative" subtitle="Upload banner image (100x100 to 300x300 px)" />

                {!imagePreview ? (
                  <div
                    className={cn(
                      'halo-inset relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                      uploading && 'pointer-events-none opacity-60'
                    )}
                    style={{ borderColor: dragActive ? 'var(--h-iris-500)' : 'var(--h-line-accent)' }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload strokeWidth={1.75} className="mx-auto h-10 w-10 mb-3" style={{ color: dragActive ? 'var(--h-iris-500)' : 'var(--h-iris-300)' }} />
                    <p className="text-sm mb-1" style={{ color: 'var(--h-ink-2)' }}>
                      {uploading ? 'Uploading to server...' : 'Drag & drop your image here, or click to browse'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--h-ink-3)' }}>100x100 to 300x300 px</p>
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
                    className="halo-inset overflow-hidden"
                  >
                    <div className="relative p-4">
                      <img src={imagePreview} alt="Preview" className="mx-auto rounded-lg max-h-40 object-contain" style={{ border: '1px solid var(--h-line)' }} />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(11,11,20,0.4)' }}>
                          <div className="text-white flex items-center gap-2 text-sm">
                            <span className="halo-spinner" /> Uploading...
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid var(--h-line)' }}>
                      <div className="text-xs num" style={{ color: 'var(--h-ink-3)', fontFamily: 'var(--h-font-mono)' }}>
                        {form.image_size_width && form.image_size_height
                          ? `${form.image_size_width} x ${form.image_size_height} px`
                          : 'Detecting...'}
                      </div>
                      <button
                        className="btn-halo-ghost btn-halo-sm"
                        onClick={clearImage}
                        disabled={uploading}
                      >
                        <X strokeWidth={1.75} className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <hr className="halo-divider" />

              {/* ─ URL & Destination ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Link} title="Destination" />
                <div className="space-y-1.5">
                  <FieldLabel required>Click URL</FieldLabel>
                  <Input value={form.url} onChange={(e) => setFormValue('url', e.target.value)} disabled={!canEdit} placeholder="https://..." className="halo-field h-9" style={{ fontFamily: 'var(--h-font-mono)' }} />
                </div>
              </div>

              <hr className="halo-divider" />

              {/* ─ Tracking (campaign + ad on fixed slot 84) ─ */}
              <div className="space-y-3">
                <SectionHeader
                  icon={Target}
                  title="Ad-backend tracking"
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
                      <SelectTrigger className="halo-field h-9">
                        <SelectValue placeholder="Select campaign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map((c) => {
                          const cid = String(c.campaignId ?? c.id);
                          // Backend returns brandName; older typing claims `name`. Tolerate both.
                          const label = (c as any).brandName || (c as any).name || `Campaign ${cid}`;
                          return (
                            <SelectItem key={cid} value={cid}>
                              {label} <span style={{ color: 'var(--h-ink-3)' }} className="ml-1">#{cid}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel required hint={loadingAds ? 'loading…' : `slot ${OC_TRACKING_SLOT_ID} only`}>Tracking ad</FieldLabel>
                    <Select
                      value={form.ad_id}
                      onValueChange={(v) => setFormValue('ad_id', v)}
                      disabled={!canEdit || !form.campaign_id || loadingAds}
                    >
                      <SelectTrigger className="halo-field h-9">
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
                            {a.label || a.name} <span style={{ color: 'var(--h-ink-3)' }} className="ml-1">#{a.adId}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.campaign_id && form.ad_id && (
                  <p className="text-[11px] num" style={{ color: 'var(--h-iris-500)', fontFamily: 'var(--h-font-mono)' }}>
                    Will fire: campaignId={form.campaign_id} · slotId={OC_TRACKING_SLOT_ID} · adId={form.ad_id}
                  </p>
                )}
              </div>

              <hr className="halo-divider" />

              {/* ─ Config ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Clock} title="Display & tracking" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel>Auto close</FieldLabel>
                    <div className="relative">
                      <Input type="number" min={1} max={20} value={form.auto_close_time} onChange={(e) => setFormValue('auto_close_time', e.target.value)} disabled={!canEdit} className="halo-field h-9 pr-8 num" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--h-ink-3)' }}>sec</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Price min</FieldLabel>
                    <Input type="number" value={form.price_min} onChange={(e) => setFormValue('price_min', e.target.value)} disabled={!canEdit} className="halo-field h-9 num" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Price max</FieldLabel>
                    <Input type="number" value={form.price_max} onChange={(e) => setFormValue('price_max', e.target.value)} disabled={!canEdit} className="halo-field h-9 num" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                  <div className="space-y-1.5">
                    <FieldLabel hint="legacy · 3rd-party only">Pixel show</FieldLabel>
                    <Input
                      value={form.pixel_show}
                      onChange={(e) => setFormValue('pixel_show', e.target.value)}
                      disabled={!canEdit}
                      placeholder="External pixel URL (optional — ad-backend tracking is above)"
                      className="halo-field h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="legacy · 3rd-party only">Pixel click</FieldLabel>
                    <Input
                      value={form.pixel_click}
                      onChange={(e) => setFormValue('pixel_click', e.target.value)}
                      disabled={!canEdit}
                      placeholder="External pixel URL (optional — ad-backend tracking is above)"
                      className="halo-field h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              <hr className="halo-divider" />

              {/* ─ URL Regex ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Globe} title="URL regex patterns" subtitle="Pages where this offer should appear" />
                <div className="flex gap-2">
                  <Input
                    value={regexInput}
                    onChange={(e) => setRegexInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRegex(); } }}
                    placeholder="^https://in\.puma\.com"
                    className="halo-field flex-1 h-9 text-sm"
                    style={{ fontFamily: 'var(--h-font-mono)' }}
                    disabled={!canEdit}
                  />
                  <button onClick={addRegex} disabled={!canEdit} className="btn-halo btn-halo-sm">
                    <Plus strokeWidth={1.75} className="h-4 w-4" /> Add
                  </button>
                </div>
                <AnimatePresence>
                  {regexList.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="halo-inset overflow-hidden divide-y" style={{ borderColor: 'var(--h-line)' }}>
                      {regexList.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                          style={{ borderBottom: '1px solid var(--h-line)', fontFamily: 'var(--h-font-mono)' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] w-4 text-right num" style={{ color: 'var(--h-ink-3)', fontFamily: 'var(--h-font)' }}>{i + 1}</span>
                            <span className="truncate" style={{ color: 'var(--h-ink-2)' }}>{r}</span>
                          </div>
                          <button onClick={() => removeRegex(i)} className="flex-shrink-0 transition-colors" style={{ color: 'var(--h-ink-3)' }}>
                            <X strokeWidth={1.75} className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <hr className="halo-divider" />

              {/* ─ Breadcrumbs ─ */}
              <div className="space-y-3">
                <SectionHeader icon={ChevronDown} title="Breadcrumbs" subtitle="Optional category targeting" />
                <div className="flex gap-2">
                  <Input
                    value={breadInput}
                    onChange={(e) => setBreadInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBread(); } }}
                    placeholder="Computers & Accessories*~Laptops*~Traditional Laptops"
                    className="halo-field flex-1 h-9 text-sm"
                    disabled={!canEdit}
                  />
                  <button onClick={addBread} disabled={!canEdit} className="btn-halo-outline btn-halo-sm">
                    <Plus strokeWidth={1.75} className="h-4 w-4" /> Add
                  </button>
                </div>
                <AnimatePresence>
                  {breadList.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="halo-inset overflow-hidden">
                      {breadList.map((b, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                          style={{ borderBottom: '1px solid var(--h-line)' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] w-4 text-right num" style={{ color: 'var(--h-ink-3)' }}>{i + 1}</span>
                            <span className="truncate" style={{ color: 'var(--h-ink-2)' }}>{b}</span>
                          </div>
                          <button onClick={() => removeBread(i)} className="flex-shrink-0 transition-colors" style={{ color: 'var(--h-ink-3)' }}>
                            <X strokeWidth={1.75} className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ─ Actions ─ */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!canEdit || saving}
                  className="btn-halo"
                >
                  {saving ? <span className="halo-spinner" /> : <Save strokeWidth={1.75} className="h-4 w-4" />}
                  {saving ? 'Saving...' : editingOfferId ? 'Update offer' : 'Create offer'}
                </button>
                <button onClick={resetForm} disabled={saving} className="btn-halo-ghost">
                  Clear
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Existing Offers ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="halo-card overflow-hidden">
            <div className="halo-panel-head halo-rail-full flex-wrap gap-3">
              <div className="halo-panel-head-title">
                <span className="halo-chip">
                  <Eye strokeWidth={1.75} className="h-3.5 w-3.5" />
                </span>
                <div>
                  <span className="halo-heading">Existing offers</span>
                  <p className="text-xs mt-0.5 num" style={{ color: 'var(--h-ink-3)' }}>{rows.length} offer{rows.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Select value={selectedPosFilter} onValueChange={setSelectedPosFilter}>
                <SelectTrigger className="halo-field w-36 h-9 text-sm">
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
            <div className="p-5 space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => <div key={i} className="halo-skeleton h-16 w-full" />)}
                </div>
              ) : (
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
                        className="halo-inset overflow-hidden mb-3 last:mb-0"
                        style={{
                          borderColor: expired ? 'var(--h-neg-soft)' : active ? 'var(--h-pos-soft)' : 'var(--h-line)',
                        }}
                      >
                        {/* Main row */}
                        <div
                          className="flex items-center gap-4 p-3.5 cursor-pointer transition-all"
                          style={{ background: expired ? 'var(--h-neg-soft)' : active ? 'var(--h-pos-soft)' : 'transparent' }}
                          onClick={() => setExpandedOfferId(expanded ? null : row.offer.offer_id)}
                        >
                          {row.offer.image_url && (
                            <img src={row.offer.image_url} alt="" className="h-12 w-20 object-cover rounded-lg flex-shrink-0" style={{ border: '1px solid var(--h-line)' }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm" style={{ color: 'var(--h-ink)' }}>{row.offer.offer_id}</span>
                              {expired && <span className="halo-badge halo-badge-neg">Expired</span>}
                              {active && <span className="halo-badge halo-badge-pos">Active</span>}
                              {!expired && !active && <span className="halo-badge">Scheduled</span>}
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--h-ink-3)' }}>
                              POS: {row.posList.join(', ')} &middot; {formatEpochDisplay(row.offer.start)} &rarr; {formatEpochDisplay(row.offer.end)}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] num" style={{ fontFamily: 'var(--h-font-mono)' }}>
                              {row.offer.campaignId && <span className="halo-badge halo-badge-iris">c{row.offer.campaignId}</span>}
                              {row.offer.adId && <span className="halo-badge halo-badge-iris">ad{row.offer.adId}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button className="btn-halo-ghost btn-halo-icon btn-halo-sm" onClick={(e) => { e.stopPropagation(); editRow(row); }}>
                              <Pencil strokeWidth={1.75} className="h-3.5 w-3.5" />
                            </button>
                            <button className="btn-halo-ghost btn-halo-icon btn-halo-sm" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(row.offer.offer_id); }} disabled={!canEdit || saving}>
                              <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" style={{ color: 'var(--h-coral)' }} />
                            </button>
                            {expanded ? <ChevronUp strokeWidth={1.75} className="h-4 w-4" style={{ color: 'var(--h-ink-3)' }} /> : <ChevronDown strokeWidth={1.75} className="h-4 w-4" style={{ color: 'var(--h-ink-3)' }} />}
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
                              <div className="px-4 pb-4 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs" style={{ borderTop: '1px solid var(--h-line)' }}>
                                {row.offer.campaignId && (
                                  <div>
                                    <span className="halo-eyebrow">Campaign ID</span>
                                    <p className="num font-semibold mt-0.5" style={{ color: 'var(--h-iris-500)', fontFamily: 'var(--h-font-mono)' }}>{row.offer.campaignId}</p>
                                  </div>
                                )}
                                {row.offer.adId && (
                                  <div>
                                    <span className="halo-eyebrow">Ad ID</span>
                                    <p className="num font-semibold mt-0.5" style={{ color: 'var(--h-iris-500)', fontFamily: 'var(--h-font-mono)' }}>{row.offer.adId}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="halo-eyebrow">Slot ID</span>
                                  <p className="num font-semibold mt-0.5" style={{ color: 'var(--h-iris-500)', fontFamily: 'var(--h-font-mono)' }}>{row.offer.slotId ?? 84}</p>
                                </div>
                                {row.offer.domain && (
                                  <div>
                                    <span className="halo-eyebrow">Domain</span>
                                    <p className="mt-0.5" style={{ color: 'var(--h-ink-2)' }}>{row.offer.domain}</p>
                                  </div>
                                )}
                                {row.offer.imageSize && (
                                  <div>
                                    <span className="halo-eyebrow">Image size</span>
                                    <p className="num mt-0.5" style={{ color: 'var(--h-ink-2)' }}>{row.offer.imageSize.width}x{row.offer.imageSize.height}</p>
                                  </div>
                                )}
                                {row.offer.bannerSize && (
                                  <div>
                                    <span className="halo-eyebrow">Banner size</span>
                                    <p className="num mt-0.5" style={{ color: 'var(--h-ink-2)' }}>{row.offer.bannerSize.width}x{row.offer.bannerSize.height}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="halo-eyebrow">Auto close</span>
                                  <p className="num mt-0.5" style={{ color: 'var(--h-ink-2)' }}>{row.offer.auto_close_time}s</p>
                                </div>
                                {row.offer.price_range && (
                                  <div>
                                    <span className="halo-eyebrow">Price range</span>
                                    <p className="num mt-0.5" style={{ color: 'var(--h-ink-2)' }}>{row.offer.price_range.min.toLocaleString()} - {row.offer.price_range.max.toLocaleString()}</p>
                                  </div>
                                )}
                                <div className="col-span-2 md:col-span-4">
                                  <span className="halo-eyebrow">URL</span>
                                  <p className="mt-0.5 truncate" style={{ color: 'var(--h-ink-2)', fontFamily: 'var(--h-font-mono)' }}>{row.offer.url}</p>
                                </div>
                                {(row.offer.url_reg_arr?.length ?? 0) > 0 && (
                                  <div className="col-span-2 md:col-span-4">
                                    <span className="halo-eyebrow">Regex ({row.offer.url_reg_arr.length})</span>
                                    <div className="mt-1 space-y-1">
                                      {row.offer.url_reg_arr.map((r, i) => (
                                        <p key={i} className="rounded px-2 py-0.5" style={{ color: 'var(--h-ink-2)', background: 'var(--h-surface-2)', fontFamily: 'var(--h-font-mono)' }}>{r}</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {(row.offer.bread_arr?.length ?? 0) > 0 && (
                                  <div className="col-span-2 md:col-span-4">
                                    <span className="halo-eyebrow">Breadcrumbs ({row.offer.bread_arr!.length})</span>
                                    <div className="mt-1 space-y-1">
                                      {row.offer.bread_arr!.map((b, i) => (
                                        <p key={i} className="rounded px-2 py-0.5" style={{ color: 'var(--h-ink-2)', background: 'var(--h-surface-2)' }}>{b}</p>
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
              )}
              {!loading && !rows.length && (
                <div className="text-center py-12">
                  <div className="halo-chip-lg mx-auto mb-4">
                    <ImagePlus strokeWidth={1.75} className="h-5 w-5" />
                  </div>
                  <h3 className="halo-heading">No offers found</h3>
                  <p className="halo-subtitle mt-1.5">Create your first offer above to get started.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent className="halo-card rounded-[var(--h-r-xl)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: 'var(--h-coral)' }}>
              <Trash2 strokeWidth={1.75} className="h-5 w-5" />
              Delete offer
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--h-ink-2)' }}>
              Are you sure you want to delete <span className="font-semibold" style={{ color: 'var(--h-ink)' }}>{deleteConfirmId}</span>? This will remove it from all POS positions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-halo-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="btn-halo-danger"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
