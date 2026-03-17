import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon, ImagePlus, Pencil, Plus, RefreshCw, Save, Trash2,
  X, Upload, Clock, Link, Globe, Eye, Zap, Hash, ChevronDown, ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePermissions } from '@/context/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label} {required && <span className="text-red-400">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left h-11 font-normal border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-purple-500" />
            {date ? format(date, 'MMM d, yyyy  HH:mm') : 'Select date & time...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-xl border-gray-200 dark:border-gray-700" align="start">
          <Calendar mode="single" selected={date} onSelect={handleDaySelect} initialFocus />
          <Separator />
          <div className="px-4 py-3 flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-md">
            <Clock className="h-4 w-4 text-purple-500" />
            <div className="flex items-center gap-1">
              <Input
                type="number" min={0} max={23} value={hours}
                onChange={(e) => handleTimeChange('h', e.target.value)}
                className="w-14 text-center h-8 text-sm"
              />
              <span className="text-lg font-bold text-gray-400">:</span>
              <Input
                type="number" min={0} max={59} value={minutes}
                onChange={(e) => handleTimeChange('m', e.target.value)}
                className="w-14 text-center h-8 text-sm"
              />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">24h format</span>
          </div>
        </PopoverContent>
      </Popover>
      {epoch && (
        <p className="text-[10px] text-purple-500/70 font-mono">epoch: {epoch}</p>
      )}
    </div>
  );
}

// --- Section header ---
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-1">
      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
        <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// --- Field label ---
function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
      {children}
      {required && <span className="text-red-400">*</span>}
      {hint && <span className="normal-case tracking-normal font-normal text-gray-400">({hint})</span>}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-6 shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Offers Config</h1>
                <p className="text-purple-200 text-sm mt-1">Manage extension offer overlays</p>
                {filePath && <p className="text-purple-300/60 text-[10px] mt-2 font-mono break-all">{filePath}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex gap-2">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
                    <p className="text-xl font-bold text-white">{rows.length}</p>
                    <p className="text-[10px] text-purple-200 uppercase tracking-wider">Total</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
                    <p className="text-xl font-bold text-emerald-300">{activeCount}</p>
                    <p className="text-[10px] text-purple-200 uppercase tracking-wider">Active</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
                    <p className="text-xl font-bold text-red-300">{expiredCount}</p>
                    <p className="text-[10px] text-purple-200 uppercase tracking-wider">Expired</p>
                  </div>
                </div>
                <Button
                  onClick={loadConfig} disabled={loading}
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Form ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-b border-purple-100 dark:border-purple-800/30 pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
                  {editingOfferId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {editingOfferId ? 'Edit Offer' : 'Create New Offer'}
                  </span>
                  {editingOfferId && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-mono mt-0.5">{editingOfferId}</p>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              {/* ─ POS ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Hash} title="Position (POS)" subtitle="Which slot positions to show this offer on" />
                <div className="flex gap-2">
                  <Select onValueChange={addPos}>
                    <SelectTrigger className="flex-1 h-11 border-gray-200 dark:border-gray-700">
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
                      className="w-24 h-11"
                    />
                    <Button variant="outline" className="h-11 px-3" onClick={() => { addPos(newPosInput); setNewPosInput(''); }}>
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50"
                        >
                          <Hash className="h-3 w-3" />
                          {pos}
                          <button onClick={() => removePos(pos)} className="ml-0.5 hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Separator className="bg-gray-100 dark:bg-gray-700/50" />

              {/* ─ Identity ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Zap} title="Offer Details" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel required>Offer ID</FieldLabel>
                    <Input value={form.offer_id} onChange={(e) => setFormValue('offer_id', e.target.value)} disabled={!canEdit} placeholder="e.g. Amaz_MTLoanApple" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Domain</FieldLabel>
                    <Input value={form.domain} onChange={(e) => setFormValue('domain', e.target.value)} disabled={!canEdit} placeholder="e.g. amazon.in" className="h-11" />
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-100 dark:bg-gray-700/50" />

              {/* ─ Schedule ─ */}
              <div className="space-y-3">
                <SectionHeader icon={CalendarIcon} title="Schedule" subtitle="When should this offer be active?" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateTimePicker label="Start" date={startDate} onDateChange={setStartDate} required disabled={!canEdit} />
                  <DateTimePicker label="End" date={endDate} onDateChange={setEndDate} required disabled={!canEdit} />
                </div>
              </div>

              <Separator className="bg-gray-100 dark:bg-gray-700/50" />

              {/* ─ Creative ─ */}
              <div className="space-y-3">
                <SectionHeader icon={ImagePlus} title="Creative" subtitle="Upload banner image (100x100 to 300x300 px)" />

                {!imagePreview ? (
                  <div
                    className={cn(
                      'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                      dragActive
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 scale-[1.01]'
                        : 'border-purple-200 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50/60 dark:border-purple-700/50 dark:hover:border-purple-500 dark:bg-purple-900/10',
                      uploading && 'pointer-events-none opacity-60'
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className={cn('mx-auto h-10 w-10 mb-3', dragActive ? 'text-purple-500' : 'text-purple-300')} />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {uploading ? 'Uploading to server...' : 'Drag & drop your image here, or click to browse'}
                    </p>
                    <p className="text-[10px] text-gray-400">100x100 to 300x300 px</p>
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
                    className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="relative p-4">
                      <img src={imagePreview} alt="Preview" className="mx-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm max-h-40 object-contain" />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                          <div className="text-white flex items-center gap-2 text-sm">
                            <RefreshCw className="h-4 w-4 animate-spin" /> Uploading...
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-xs text-gray-500 font-mono">
                        {form.image_size_width && form.image_size_height
                          ? `${form.image_size_width} x ${form.image_size_height} px`
                          : 'Detecting...'}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-gray-500 hover:text-red-500"
                        onClick={clearImage}
                        disabled={uploading}
                      >
                        <X className="h-3 w-3 mr-1" /> Remove
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              <Separator className="bg-gray-100 dark:bg-gray-700/50" />

              {/* ─ URL & Destination ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Link} title="Destination" />
                <div className="space-y-1.5">
                  <FieldLabel required>Click URL</FieldLabel>
                  <Input value={form.url} onChange={(e) => setFormValue('url', e.target.value)} disabled={!canEdit} placeholder="https://..." className="h-11 font-mono text-sm" />
                </div>
              </div>

              <Separator className="bg-gray-100 dark:bg-gray-700/50" />

              {/* ─ Config ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Clock} title="Display & Tracking" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel>Auto Close</FieldLabel>
                    <div className="relative">
                      <Input type="number" min={1} max={20} value={form.auto_close_time} onChange={(e) => setFormValue('auto_close_time', e.target.value)} disabled={!canEdit} className="h-11 pr-8" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">sec</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Price Min</FieldLabel>
                    <Input type="number" value={form.price_min} onChange={(e) => setFormValue('price_min', e.target.value)} disabled={!canEdit} className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Price Max</FieldLabel>
                    <Input type="number" value={form.price_max} onChange={(e) => setFormValue('price_max', e.target.value)} disabled={!canEdit} className="h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel>Pixel Show</FieldLabel>
                    <Input value={form.pixel_show} onChange={(e) => setFormValue('pixel_show', e.target.value)} disabled={!canEdit} placeholder="Show tracking URL" className="h-11 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="optional">Pixel Click</FieldLabel>
                    <Input value={form.pixel_click} onChange={(e) => setFormValue('pixel_click', e.target.value)} disabled={!canEdit} placeholder="Click tracking URL" className="h-11 text-sm" />
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-100 dark:bg-gray-700/50" />

              {/* ─ URL Regex ─ */}
              <div className="space-y-3">
                <SectionHeader icon={Globe} title="URL Regex Patterns" subtitle="Pages where this offer should appear" />
                <div className="flex gap-2">
                  <Input
                    value={regexInput}
                    onChange={(e) => setRegexInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRegex(); } }}
                    placeholder="^https://in\.puma\.com"
                    className="flex-1 h-11 font-mono text-sm"
                    disabled={!canEdit}
                  />
                  <Button onClick={addRegex} disabled={!canEdit} className="h-11 bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <AnimatePresence>
                  {regexList.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {regexList.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 py-2.5 font-mono text-sm',
                            i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-gray-400 font-sans w-4 text-right">{i + 1}</span>
                            <span className="truncate text-gray-700 dark:text-gray-300">{r}</span>
                          </div>
                          <button onClick={() => removeRegex(i)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Separator className="bg-gray-100 dark:bg-gray-700/50" />

              {/* ─ Breadcrumbs ─ */}
              <div className="space-y-3">
                <SectionHeader icon={ChevronDown} title="Breadcrumbs" subtitle="Optional category targeting" />
                <div className="flex gap-2">
                  <Input
                    value={breadInput}
                    onChange={(e) => setBreadInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBread(); } }}
                    placeholder="Computers & Accessories*~Laptops*~Traditional Laptops"
                    className="flex-1 h-11 text-sm"
                    disabled={!canEdit}
                  />
                  <Button onClick={addBread} disabled={!canEdit} variant="outline" className="h-11">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <AnimatePresence>
                  {breadList.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {breadList.map((b, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 py-2.5 text-sm',
                            i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-gray-400 w-4 text-right">{i + 1}</span>
                            <span className="truncate text-gray-700 dark:text-gray-300">{b}</span>
                          </div>
                          <button onClick={() => removeBread(i)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
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
                  className="h-11 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/25 transition-all"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : editingOfferId ? 'Update Offer' : 'Create Offer'}
                </Button>
                <Button variant="ghost" onClick={resetForm} disabled={saving} className="h-11 text-gray-500 hover:text-gray-700">
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Existing Offers ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-gray-700/50 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Existing Offers</span>
                    <p className="text-xs text-gray-400 mt-0.5">{rows.length} offer{rows.length !== 1 ? 's' : ''}</p>
                  </div>
                </CardTitle>
                <Select value={selectedPosFilter} onValueChange={setSelectedPosFilter}>
                  <SelectTrigger className="w-36 h-9 text-sm">
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
            </CardHeader>
            <CardContent className="p-4 space-y-3">
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
                        'rounded-xl border overflow-hidden transition-all',
                        expired ? 'border-red-200/60 dark:border-red-800/30' : active ? 'border-emerald-200/60 dark:border-emerald-800/30' : 'border-gray-200 dark:border-gray-700'
                      )}
                    >
                      {/* Main row */}
                      <div
                        className={cn(
                          'flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors',
                          expired && 'bg-red-50/30 dark:bg-red-900/5',
                          active && 'bg-emerald-50/30 dark:bg-emerald-900/5'
                        )}
                        onClick={() => setExpandedOfferId(expanded ? null : row.offer.offer_id)}
                      >
                        {row.offer.image_url && (
                          <img src={row.offer.image_url} alt="" className="h-12 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{row.offer.offer_id}</span>
                            {expired && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">Expired</Badge>}
                            {active && <Badge className="text-[10px] px-1.5 py-0 h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100">Active</Badge>}
                            {!expired && !active && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Scheduled</Badge>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            POS: {row.posList.join(', ')} &middot; {formatEpochDisplay(row.offer.start)} → {formatEpochDisplay(row.offer.end)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-purple-600" onClick={(e) => { e.stopPropagation(); editRow(row); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(row.offer.offer_id); }} disabled={!canEdit || saving}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
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
                            <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              {row.offer.domain && (
                                <div>
                                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Domain</span>
                                  <p className="text-gray-700 dark:text-gray-300 mt-0.5">{row.offer.domain}</p>
                                </div>
                              )}
                              {row.offer.imageSize && (
                                <div>
                                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Image Size</span>
                                  <p className="text-gray-700 dark:text-gray-300 mt-0.5">{row.offer.imageSize.width}x{row.offer.imageSize.height}</p>
                                </div>
                              )}
                              {row.offer.bannerSize && (
                                <div>
                                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Banner Size</span>
                                  <p className="text-gray-700 dark:text-gray-300 mt-0.5">{row.offer.bannerSize.width}x{row.offer.bannerSize.height}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-400 uppercase tracking-wider text-[10px]">Auto Close</span>
                                <p className="text-gray-700 dark:text-gray-300 mt-0.5">{row.offer.auto_close_time}s</p>
                              </div>
                              {row.offer.price_range && (
                                <div>
                                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Price Range</span>
                                  <p className="text-gray-700 dark:text-gray-300 mt-0.5">{row.offer.price_range.min.toLocaleString()} - {row.offer.price_range.max.toLocaleString()}</p>
                                </div>
                              )}
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-gray-400 uppercase tracking-wider text-[10px]">URL</span>
                                <p className="text-gray-700 dark:text-gray-300 mt-0.5 truncate font-mono">{row.offer.url}</p>
                              </div>
                              {(row.offer.url_reg_arr?.length ?? 0) > 0 && (
                                <div className="col-span-2 md:col-span-4">
                                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Regex ({row.offer.url_reg_arr.length})</span>
                                  <div className="mt-1 space-y-1">
                                    {row.offer.url_reg_arr.map((r, i) => (
                                      <p key={i} className="font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded px-2 py-0.5">{r}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(row.offer.bread_arr?.length ?? 0) > 0 && (
                                <div className="col-span-2 md:col-span-4">
                                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Breadcrumbs ({row.offer.bread_arr!.length})</span>
                                  <div className="mt-1 space-y-1">
                                    {row.offer.bread_arr!.map((b, i) => (
                                      <p key={i} className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded px-2 py-0.5">{b}</p>
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
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                    <ImagePlus className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">No offers found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent className="rounded-2xl border-red-200 dark:border-red-800/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Offer
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <span className="font-semibold text-gray-800 dark:text-gray-200">{deleteConfirmId}</span>? This will remove it from all POS positions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="rounded-lg bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
