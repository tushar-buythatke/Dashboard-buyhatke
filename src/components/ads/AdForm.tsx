import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Calendar as CalendarIcon, Clock, Target, Loader2, X, Settings, Zap, CheckCircle2, Plus, Image as ImageIcon, Package, Ticket, Plane, Lock, AlertTriangle, IndianRupee, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VelvetBackButton } from '@/components/ui/velvet-back-button';
import { VelvetLoader } from '@/components/ui/velvet-loader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { LocationAutoSuggest, BrandInput } from '@/components/ui/auto-suggest';
import { MultiHierarchicalCategorySelector } from '@/components/ui/multi-hierarchical-category-selector';
import { SiteSelect } from '@/components/ui/site-select';
import { adService } from '@/services/adService';
import { buildApiUrl } from '@/config/api';
import { normalizeAd, matchSlotId, normalizeRouteId, isV2Active, resolveCatIds } from '@/utils/v2Normalizer';
import { toast } from 'sonner';
import { Slot, Ad, CategoryPath } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getPlatformName, PLATFORM_OPTIONS } from '@/utils/platform';
import { getCacheBustedUrl, toLocalDateInput } from '@/utils/adUtils';
import { usePermissions } from '@/context/PermissionsContext';
import { FileUpload } from '@/components/ui/file-upload';

// Elegant Toggle Component
interface ElegantToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'primary';
}

const ElegantToggle: React.FC<ElegantToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  variant = 'default'
}) => {

  const sizeClasses = {
    sm: { toggle: 'w-8 h-4', thumb: 'w-3 h-3', translateX: 'translate-x-4' },
    md: { toggle: 'w-10 h-5', thumb: 'w-4 h-4', translateX: 'translate-x-5' },
    lg: { toggle: 'w-12 h-6', thumb: 'w-5 h-5', translateX: 'translate-x-6' }
  };

  const variantClasses = {
    default: checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600',
    success: checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600',
    warning: checked ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600',
    primary: checked ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
  };

  return (
    <motion.div
      onClick={() => !disabled && onChange(!checked)}
      className={`
        flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 group
        ${disabled
          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          : checked
            ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-700 hover:shadow-lg'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
        }
      `}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      <div className={`
        relative ${sizeClasses[size].toggle} rounded-full transition-all duration-300 mr-3 flex-shrink-0
        ${variantClasses[variant]}
      `}>
        <motion.div
          className={`
            absolute top-0.5 ${sizeClasses[size].thumb} bg-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center
          `}
          animate={{
            x: checked ? (size === 'sm' ? 16 : size === 'md' ? 20 : 24) : 2
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {checked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <CheckCircle2 className={`${size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'} text-${variant === 'default' ? 'blue' : variant === 'success' ? 'green' : variant === 'warning' ? 'orange' : 'purple'}-500`} />
            </motion.div>
          )}
        </motion.div>
      </div>
      <div className="flex-1">
        <div className={`font-semibold transition-colors duration-200 ${checked
          ? 'text-blue-900 dark:text-blue-100'
          : 'text-gray-700 dark:text-gray-300'
          }`}>
          {label}
        </div>
        {description && (
          <div className={`text-sm mt-1 transition-colors duration-200 ${checked
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400'
            }`}>
            {description}
          </div>
        )}
      </div>
      {checked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-3"
        >
          <Zap className="h-5 w-5 text-blue-500" />
        </motion.div>
      )}
    </motion.div>
  );
};

// Schema validation
const adSchema = z.object({
  slotId: z.union([z.string().min(1, 'Slot selection is required'), z.number().min(1, 'Slot selection is required')]),
  label: z.string().min(1, 'Ad label is required'),
  impressionTarget: z.number().min(1, 'Impression target is required'),
  clickTarget: z.number().min(1, 'Click target is required'),
  impressionPixel: z.string().url('Must be a valid URL'),
  clickPixel: z.string().url('Must be a valid URL'),
  targetUrl: z.string().url('Must be a valid URL'),
  categories: z.union([
    z.record(z.union([z.string(), z.number()])),
    z.object({
      selections: z.array(z.object({
        path: z.array(z.object({ catId: z.number(), catName: z.string() })),
        selected: z.object({ catId: z.number(), catName: z.string() })
      }))
    })
  ]),
  sites: z.record(z.union([z.string(), z.number()])),
  location: z.record(z.union([z.string(), z.number()])),
  brandTargets: z.record(z.union([z.string(), z.number()])),
  priceRangeMin: z.number().min(0, 'Minimum price must be 0 or greater'),
  priceRangeMax: z.number().min(1, 'Maximum price must be greater than 0'),
  ageRangeMin: z.number().min(13, 'Minimum age must be at least 13'),
  ageRangeMax: z.number().min(13, 'Maximum age must be at least 13'),
  priority: z.number().min(0, 'Priority must be at least 0').max(1000, 'Priority cannot exceed 1000'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  creativeUrl: z.string().url('Creative URL must be valid'),
  logo: z.string().optional(),
  couponCode: z.string().optional(),
  impressionCharge: z.number().min(0).optional(),
  clickCharge: z.number().min(0).optional(),
  minBid: z.number().min(0).optional(),
  maxBid: z.number().min(0).optional(),
  bidModel: z.number().min(0).optional(),
  otherDetails: z.record(z.any()).optional(),
  gender: z.string().optional(),
  noGenderSpecificity: z.boolean().optional(),
  noSpecificity: z.boolean().optional(),
  status: z.number().min(0).max(1).optional().default(1),
  isTestPhase: z.number().min(0).max(1).optional().default(0),
  serveStrategy: z.number().min(0).max(4).optional().default(0),
  isModelType: z.number().min(0).max(1).optional().default(0)
}).refine((data) => {
  // Validate impression target >= click target
  if (data.impressionTarget && data.clickTarget) {
    return data.impressionTarget >= data.clickTarget;
  }
  return true;
}, {
  message: "Impression target must be greater than or equal to click target",
  path: ["impressionTarget"]
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true; // Let required validation handle empty dates
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return endDate >= startDate;
}, {
  message: "End date must be equal to or later than start date",
  path: ["endDate"]
}).refine((data) => {
  // Validate that maximum price is greater than or equal to minimum price
  if (data.priceRangeMin && data.priceRangeMax) {
    return data.priceRangeMax >= data.priceRangeMin;
  }
  return true;
}, {
  message: "Maximum price must be equal to or greater than minimum price",
  path: ["priceRangeMax"]
}).refine((data) => {
  // Validate that maximum age is greater than or equal to minimum age
  if (data.ageRangeMin && data.ageRangeMax) {
    return data.ageRangeMax >= data.ageRangeMin;
  }
  return true;
}, {
  message: "Maximum age must be equal to or greater than minimum age",
  path: ["ageRangeMax"]
}).refine((data) => {
  // Coupon ads (serveStrategy=2) require a location match to ever serve (guide §5/§7).
  if (data.serveStrategy === 2) {
    return data.location && Object.keys(data.location).length > 0;
  }
  return true;
}, {
  message: "Coupon ads require at least one location, or they never serve.",
  path: ["location"]
});


// ── Gender (guide §4): API stores only u / m / f. Anything else is rejected on
// create, so the form must speak u/m/f — not the old Male/Female/Other/NA.
const GENDER_OPTIONS = [
  { value: 'u', label: 'All genders', hint: 'Served to everyone (no gender gate)' },
  { value: 'm', label: 'Male only', hint: 'Serves only to users resolved as male' },
  { value: 'f', label: 'Female only', hint: 'Serves only to users resolved as female' },
] as const;

// Map any legacy/stored gender value onto the canonical u/m/f the form understands.
const toFormGender = (raw: unknown): string => {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'm' || v === 'male') return 'm';
  if (v === 'f' || v === 'female') return 'f';
  return 'u'; // u, na, '', other, or anything unrecognized → unrestricted
};

// serveStrategy (guide §7): the five real ad types and what each does when served.
const SERVE_STRATEGIES = [
  { value: 0, label: 'Banner', icon: ImageIcon, tone: 'violet', desc: 'Creative + landing URL only. No product list.' },
  { value: 1, label: 'Product', icon: Package, tone: 'sky', desc: 'Serves with a product list matched to user interest.' },
  { value: 2, label: 'Coupon', icon: Ticket, tone: 'amber', desc: 'Coupon offer. Requires a location match to serve.' },
  { value: 3, label: 'Flight', icon: Plane, tone: 'teal', desc: 'Served via the separate flight path, not the normal query.' },
  { value: 4, label: 'Category-locked', icon: Lock, tone: 'plum', desc: "Banner that serves only when the request's category is in this ad's categories." },
] as const;

// ── Date helpers: the form stores dates as local YYYY-MM-DD strings. Parse/format
// via local Y/M/D parts to avoid the UTC-midnight timezone shift.
const ymdToDate = (s?: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};
const dateToYmd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatDateDisplay = (s?: string): string => {
  const d = ymdToDate(s);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // 20 Jul 2026
};
const startOfToday = (): Date => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

// Velvet calendar popover — a toggle button that opens a styled month calendar,
// replacing the native browser date picker so dates match the rest of the form.
function VelvetDatePicker({
  value,
  onChange,
  min,
  disabled,
  placeholder = 'Select date',
}: {
  value?: string;
  onChange: (v: string) => void;
  min?: Date;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = ymdToDate(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="w-full h-10 rounded-[10px] border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 text-[13px] text-left flex items-center justify-between transition-[border-color,box-shadow] duration-200 hover:border-[var(--line-violet)] focus:outline-none focus:border-[var(--violet-500)] focus:ring-2 focus:ring-[var(--violet-500)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={selected ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]'}>
            {selected ? formatDateDisplay(value) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-[var(--text-3)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? min}
          disabled={min ? { before: min } : undefined}
          onSelect={(d) => {
            if (d) {
              onChange(dateToYmd(d));
              setOpen(false);
            }
          }}
          classNames={{
            day_selected:
              'bg-[var(--indigo-500)] text-white hover:bg-[var(--indigo-500)] hover:text-white focus:bg-[var(--indigo-500)] focus:text-white',
            day_today: 'bg-[var(--bg-tint)] text-[var(--indigo-500)] font-semibold',
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type AdFormData = z.infer<typeof adSchema>;


export function AdForm() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { adId } = useParams<{ adId?: string }>();
  const isEditMode = !!adId;
  const navigate = useNavigate();
  const { canEdit } = usePermissions();

  // Redirect view-only users
  useEffect(() => {
    if (!canEdit) {
      toast.error('You do not have permission to create or edit ads.');
      navigate(`/campaigns/${campaignId}/ads`);
    }
  }, [canEdit, navigate, campaignId]);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 65]);
  const [priceRangeHighlighted, setPriceRangeHighlighted] = useState(false);
  const [existingAdLabels, setExistingAdLabels] = useState<string[]>([]);
  const [labelSuggestions, setLabelSuggestions] = useState<string[]>([]);
  const [openLabelSuggestions, setOpenLabelSuggestions] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [otherDetailsFields, setOtherDetailsFields] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }]);

  // New states for slot filtering
  const [slotFilterPlatform, setSlotFilterPlatform] = useState<number | undefined>(undefined);

  // OC-newest tracking mode: locks slot=84, status=paused, isTestPhase=test so this
  // ad becomes pure tracking bookkeeping and never serves via /ads/serve. Safety
  // is enforced again at submit time (onSubmit force-overrides regardless of
  // whether the user toggled it back off after filling fields).
  const OC_TRACKING_SLOT_NAME = 'Pop up ads';
  const OC_TRACKING_END_DATE = '2099-12-31';
  const OC_TRACKING_PIXEL_PLACEHOLDER = 'https://buyhatke.com/_oc_tracking';
  const [isOCTracking, setIsOCTracking] = useState(false);

  const form = useForm<AdFormData>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      slotId: undefined,
      label: '',
      impressionTarget: 1000,
      clickTarget: 100,
      impressionPixel: '',
      clickPixel: '',
      targetUrl: '',
      categories: { selections: [] },
      sites: {},
      location: {},
      brandTargets: {},
      priceRangeMin: 0,
      priceRangeMax: 1000,
      ageRangeMin: 18,
      ageRangeMax: 65,
      priority: 500,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: '', // Blank by default
      endTime: '', // Blank by default
      creativeUrl: '',
      logo: '',
      couponCode: '',
      impressionCharge: 0,
      clickCharge: 0,
      minBid: 0,
      maxBid: 0,
      bidModel: 0,
      otherDetails: {},
      gender: 'u',
      noGenderSpecificity: true,
      noSpecificity: false,
      status: 1,
      isTestPhase: 0,
      serveStrategy: 0,
      isModelType: 0
    }
  });
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if a slot is selected - use form value as fallback
      const currentSlotId = form.getValues('slotId');
      const currentSlot = selectedSlot || slots.find(s => matchSlotId(s, currentSlotId));

      if (!currentSlot) {
        toast.error('Please select an ad slot first to determine required dimensions');
        event.target.value = ''; // Clear the file input
        return;
      }

      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        toast.error('Please select a valid image or video file.');
        event.target.value = '';
        return;
      }

      const requiredWidth = parseFloat(currentSlot.width);
      const requiredHeight = parseFloat(currentSlot.height);

      const validateAndUpload = async (width: number, height: number) => {
        // Check if dimensions match the selected slot
        if (width !== requiredWidth || height !== requiredHeight) {
          toast.error(
            `${isVideo ? 'Video' : 'Image'} dimensions (${width}x${height}) don't match the required slot dimensions (${requiredWidth}x${requiredHeight}). Please upload a file with the correct dimensions.`
          );
          event.target.value = ''; // Clear the file input
          return;
        }

        // Upload to server using the API
        try {
          setLoading(true);
          const result = await adService.uploadCreative(file, currentSlot.slotId);

          if (result.success && result.creativeUrl) {
            setPreviewUrl(result.creativeUrl);
            form.setValue('creativeUrl', result.creativeUrl);
            toast.success(`${isVideo ? 'Video' : 'Image'} uploaded successfully!`);
          } else {
            toast.error(result.message || `Failed to upload ${isVideo ? 'video' : 'image'}`);
          }
        } catch (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${isVideo ? 'video' : 'image'}. Please try again.`);
        } finally {
          setLoading(false);
        }
      };

      if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          validateAndUpload(video.videoWidth, video.videoHeight);
        };

        video.onerror = () => {
          toast.error('Failed to load video. Please select a valid video file.');
          event.target.value = '';
        };

        video.src = URL.createObjectURL(file);
      } else {
        const img = new Image();

        img.onload = () => {
          validateAndUpload(img.width, img.height);
        };

        img.onerror = () => {
          toast.error('Failed to load image. Please select a valid image file.');
          event.target.value = '';
        };

        // Create object URL to load the image
        img.src = URL.createObjectURL(file);
      }
    }
  };

  const uploadLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file for the logo.');
      return;
    }
    try {
      setLoading(true);
      const currentSlotId = form.getValues('slotId');
      const result = await adService.uploadLogo(file, currentSlotId || 0);
      if (result.success && result.creativeUrl) {
        setLogoPreviewUrl(result.creativeUrl);
        form.setValue('logo', result.creativeUrl);
        toast.success('Logo uploaded successfully!');
      } else {
        toast.error(result.message || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadLogoFile(file);
      event.target.value = '';
    }
  };

  const fetchSlots = async () => {
    try {
      const response = await fetch(`${buildApiUrl('/slots')}?isActive=1`);
      if (!response.ok) throw new Error('Failed to fetch slots');

      const result = await response.json();
      if (result.status === 1 && result.data?.slotList) {
        setSlots(result.data.slotList);
        setFilteredSlots(result.data.slotList); // Initialize filtered slots

        // If editing and we have an adId, set the selected slot after form data is loaded
        if (isEditMode && adId) {
          // We'll set the selected slot after the ad data is loaded in the fetchAd function
        }
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to load slot information');
    }
  };

  // Filter slots based on platform and name search
  useEffect(() => {
    let filtered = slots;

    // Filter by platform
    if (slotFilterPlatform !== undefined) {
      filtered = filtered.filter(slot => slot.platform === slotFilterPlatform);
    }

    // Dedupe by the SAME key we use as each option's value (slotType in V2, slotId
    // in V1). Multiple slots can share a slotType; without this the Select renders
    // duplicate values — selecting one checks them all and the trigger stacks every
    // match. One entry per serving target keeps values unique.
    const seen = new Set<string>();
    filtered = filtered.filter((slot) => {
      const key = String(slot.slotType ?? slot.slotId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setFilteredSlots(filtered);
  }, [slots, slotFilterPlatform]);

  // Fetch slots and ad data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFormLoading(true);

        // Fetch campaign name
        if (campaignId) {
          try {
            const response = await fetch(`${buildApiUrl('/campaigns')}?campaignId=${campaignId}`);
            if (response.ok) {
              const result = await response.json();
              if (result.status === 1 && result.data?.campaignList?.[0]) {
                setCampaignName(result.data.campaignList[0].brandName);
              }
            }
          } catch (error) {
            console.error('Error fetching campaign name:', error);
          }
        }

        await fetchSlots();

        // Fetch ad data
        const fetchAd = async () => {
          if (!adId) return;

          try {
            setFormLoading(true);

            const params = new URLSearchParams({
              campaignId: campaignId || '',
              slotId: '',
              adId: adId,
              status: ''
            });

            const response = await fetch(
              `${buildApiUrl('/ads')}?${params.toString()}`
            );

            if (!response.ok) {
              throw new Error('Failed to fetch ad');
            }

            const result = await response.json();

            if (result.status === 1 && result.data?.adsList?.[0]) {
              const adData = normalizeAd(result.data.adsList[0]);

              // Transform categories from API format to form format
              let categoriesForForm: { selections: Array<{ path: Array<{ catId: number; catName: string }>; selected: { catId: number; catName: string } }> } = { selections: [] };

              if (adData.categories && typeof adData.categories === 'object') {
                // Handle the API format: { l0: [], ln: [{ catId, catName }] }
                if ('ln' in adData.categories && Array.isArray(adData.categories.ln)) {
                  categoriesForForm.selections = adData.categories.ln.map((cat: { catId: number; catName: string }) => ({
                    path: [{ catId: cat.catId, catName: cat.catName }],
                    selected: { catId: cat.catId, catName: cat.catName }
                  }));
                } else if (!('ln' in adData.categories) && !('l0' in adData.categories)) {
                  let catNameMap: Record<string, string> = {};
                  if (isV2Active()) {
                    try {
                      catNameMap = await resolveCatIds(Object.keys(adData.categories));
                    } catch {}
                  }
                  categoriesForForm.selections = Object.entries(adData.categories).map(([catId, catName]) => ({
                    path: [{ catId: Number(catId), catName: catNameMap[catId] || String(catName) }],
                    selected: { catId: Number(catId), catName: catNameMap[catId] || String(catName) }
                  }));
                }
              }

              // Format the data for the form
              form.reset({
                ...adData,
                categories: categoriesForForm,
                gender: toFormGender(adData.gender), // stored may be legacy Male/NA/etc → u/m/f
                noGenderSpecificity: toFormGender(adData.gender) === 'u',
                startDate: adData.startDate ? toLocalDateInput(adData.startDate) : undefined,
                endDate: adData.endDate ? toLocalDateInput(adData.endDate) : undefined,
                startTime: '', // Blank by default on edit/update
                endTime: '', // Blank by default on edit/update,
                logo: adData.logo || '',
                couponCode: adData.couponCode || '',
                impressionCharge: adData.impressionCharge ?? 0,
                clickCharge: adData.clickCharge ?? 0,
                minBid: adData.minBid ?? 0,
                maxBid: adData.maxBid ?? 0,
                bidModel: adData.bidModel ?? 0,
                otherDetails: adData.otherDetails || {}
              });

              // Set the selected slot for editing mode
if (adData.slotId && slots.length > 0) {
            const slot = slots.find(s => matchSlotId(s, adData.slotId));
                if (slot) setSelectedSlot(slot);
              }

              // Set preview URL if creative exists
              if (adData.creativeUrl) {
                setPreviewUrl(adData.creativeUrl);
              }

              // Set logo preview URL if logo exists
              if (adData.logo) {
                setLogoPreviewUrl(adData.logo);
              }

              // Set otherDetails fields
              if (adData.otherDetails && typeof adData.otherDetails === 'object') {
                const fields = Object.entries(adData.otherDetails).map(([key, value]) => ({
                  key,
                  value: typeof value === 'object' ? JSON.stringify(value) : String(value).replace(/\n/g, '\\n')
                }));
                setOtherDetailsFields(fields.length > 0 ? fields : [{ key: '', value: '' }]);
              }
            }
          } catch (error) {
            console.error('Error fetching ad:', error);
            toast.error('Failed to load ad data');
          } finally {
            setFormLoading(false);
          }
        };

        await fetchAd();
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load required data');
      } finally {
        setFormLoading(false);
      }
    };

    fetchData();
  }, [adId, isEditMode, form]);

  // Sync age range state with form values
  useEffect(() => {
    const minAge = form.getValues('ageRangeMin') || 18;
    const maxAge = form.getValues('ageRangeMax') || 65;
    setAgeRange([minAge, maxAge]);
  }, [form.getValues('ageRangeMin'), form.getValues('ageRangeMax')]);

  // Watch for slot changes and update selectedSlot
  useEffect(() => {
    const currentSlotId = form.watch('slotId');
if (currentSlotId && slots.length > 0 && (!selectedSlot || !matchSlotId(selectedSlot, currentSlotId))) {
          const slot = slots.find(s => matchSlotId(s, currentSlotId));
      if (slot) setSelectedSlot(slot);
    }
  }, [form.watch('slotId'), slots, selectedSlot]);

  // Initialize labelInputValue from form value when it's loaded
  useEffect(() => {
    const currentLabel = form.getValues('label');
  }, [form]);

  // Fetch existing ad labels for the current campaign
  useEffect(() => {
    const fetchExistingAdLabels = async () => {
      try {
        if (!campaignId) return;

        const result = await adService.getAdLabels(normalizeRouteId(campaignId));
        if (result.success && result.data) {
          setExistingAdLabels(result.data.map(item => item.label));
        } else {
          console.error('Failed to fetch ad labels:', result.message);
        }
      } catch (error) {
        console.error('Error fetching existing ad labels:', error);
      }
    };

    fetchExistingAdLabels();
  }, [campaignId]);

  // Generate label suggestions based on input
  useEffect(() => {
    const labelInputValue = form.watch('label');
    if (!labelInputValue) {
      setLabelSuggestions([]);
      return;
    }

    const baseLabel = labelInputValue.trim();

    // Filter existing labels that include the input value
    const matchingLabels = existingAdLabels.filter(label =>
      label.toLowerCase().includes(baseLabel.toLowerCase())
    );

    // Use a Set to handle uniqueness. Add the user's typed label as a suggestion.
    const suggestions = new Set<string>();
    if (baseLabel) {
      suggestions.add(baseLabel);
    }
    matchingLabels.forEach(label => suggestions.add(label));

    setLabelSuggestions(Array.from(suggestions));
  }, [form.watch('label'), existingAdLabels]);

  const applyOCTrackingDefaults = () => {
    // Auto-pick Pop up ads slot so creative upload validates against its dims (300x173).
    setSlotFilterPlatform(undefined);
    const trackingSlot = slots.find((s) => s.name === OC_TRACKING_SLOT_NAME);
    if (trackingSlot) setSelectedSlot(trackingSlot);
    form.setValue('slotId', trackingSlot?.slotId as string | number);
    form.setValue('status', 0);          // paused → /ads/serve filters it out
    form.setValue('isTestPhase', 1);     // test phase → /ads/serve filters it out
    form.setValue('endDate', OC_TRACKING_END_DATE);
    // Required-by-schema fields the user shouldn't have to think about for a stub
    if (!form.getValues('impressionPixel')) form.setValue('impressionPixel', OC_TRACKING_PIXEL_PLACEHOLDER);
    if (!form.getValues('clickPixel')) form.setValue('clickPixel', OC_TRACKING_PIXEL_PLACEHOLDER);
    if (!form.getValues('targetUrl')) form.setValue('targetUrl', 'https://buyhatke.com/');
  };

  const onSubmit = async (data: AdFormData) => {
    console.log('🚀 onSubmit called with data:', data);
    try {
      setLoading(true);
      // Safety latch: if the OC-tracking toggle is on, re-apply the safety fields
      // server-side regardless of any post-toggle edits. This is the only thing
      // that keeps the stub ad from accidentally going live.
      if (isOCTracking) {
        const trackingSlot = slots.find((s) => s.name === OC_TRACKING_SLOT_NAME);
        data = {
          ...data,
          slotId: trackingSlot?.slotId || data.slotId,
          status: 0,
          isTestPhase: 1,
          endDate: OC_TRACKING_END_DATE,
        };
      }
      const url = isEditMode
? `${buildApiUrl('/ads/update')}?userId=1`
          : `${buildApiUrl('/ads')}?userId=1`;

      const method = 'POST';

      // Transform categories from selections format to {catId: catName}
      let transformedCategories: Record<number, string> = {};
      if (typeof data.categories === 'object' && 'selections' in data.categories) {
        const categoryPath = data.categories as CategoryPath;
        categoryPath.selections.forEach((selection) => {
          transformedCategories[selection.selected.catId] = selection.selected.catName;
        });
      } else if (typeof data.categories === 'object') {
        transformedCategories = data.categories as unknown as Record<number, string>;
      }

      // Build otherDetails object from key-value pairs
      const parsedOtherDetails: Record<string, any> = {};
      otherDetailsFields.forEach(field => {
        if (field.key.trim()) {
          // Try to parse value as JSON, if it fails use as string
          try {
            parsedOtherDetails[field.key] = JSON.parse(field.value);
          } catch {
            // Replace literal '\n' typed by user with actual newline character
            parsedOtherDetails[field.key] = field.value.replace(/\\n/g, '\n');
          }
        }
      });

      const { slotId: formSlotId, ...restData } = data;

      const body = {
        ...restData,
        // V1 expects `slotId`; V2 expects `slotType`
        ...(isV2Active() ? { slotType: formSlotId } : { slotId: formSlotId }),
        gender: toFormGender(data.gender), // guarantee u/m/f — API rejects anything else on create
        categories: transformedCategories,
        campaignId: normalizeRouteId(campaignId),
        logo: data.logo || '',
        otherDetails: parsedOtherDetails,
        ...(isEditMode && { adId: isV2Active() ? adId : Number(adId) })
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} ad`);

      const result = await response.json();
      if (result.status === 1) {
        toast.success(`Ad ${isEditMode ? 'updated' : 'created'} successfully`);
        navigate(`/campaigns/${campaignId}/ads`);
      } else {
        throw new Error(result.message || 'Operation failed');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} ad:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} ad: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };



  // Date validation handler
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    form.setValue(field, value);

    // Get both dates
    const startDate = field === 'startDate' ? value : form.getValues('startDate');
    const endDate = field === 'endDate' ? value : form.getValues('endDate');

    // Validate if both dates are present
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        // This will trigger the form validation on the next render
        setTimeout(() => {
          form.trigger(['startDate', 'endDate']);
        }, 0);
      }
    }
  };

  // Number input validation handler
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: number) => void, min?: number, max?: number) => {
    const value = e.target.value;

    // Allow empty string for clearing
    if (value === '') {
      onChange(0);
      return;
    }

    // Only allow digits (and decimal point for decimal numbers)
    const numericValue = value.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const decimalCount = (numericValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      return;
    }

    // Convert to number to check bounds
    const num = parseFloat(numericValue);

    // Check if the number is valid
    if (isNaN(num)) {
      return;
    }

    // Enforce minimum value
    if (min !== undefined && num < min) {
      e.target.value = min.toString();
      onChange(min);
      return;
    }

    // Enforce maximum value
    if (max !== undefined && num > max) {
      e.target.value = max.toString();
      onChange(max);
      return;
    }

    // Update the input value to only contain valid characters
    e.target.value = numericValue;

    // Update form state with the valid number
    onChange(num);
  };

  // Price range validation handler
  const handlePriceChange = (field: 'priceRangeMin' | 'priceRangeMax', value: number) => {
    // Get both price values
    const minPrice = field === 'priceRangeMin' ? value : form.getValues('priceRangeMin');
    const maxPrice = field === 'priceRangeMax' ? value : form.getValues('priceRangeMax');

    // Trigger validation if both prices are present (check for numeric values, not truthiness)
    if (minPrice !== undefined && maxPrice !== undefined && minPrice !== null && maxPrice !== null) {
      setTimeout(() => {
        form.trigger(['priceRangeMin', 'priceRangeMax']);
      }, 0);
    }
  };

  // Age range validation handler
  const handleAgeChange = (field: 'ageRangeMin' | 'ageRangeMax', value: number) => {
    // Get both age values
    const minAge = field === 'ageRangeMin' ? value : form.getValues('ageRangeMin');
    const maxAge = field === 'ageRangeMax' ? value : form.getValues('ageRangeMax');

    // Trigger validation if both ages are present (check for numeric values, not truthiness)
    if (minAge !== undefined && maxAge !== undefined && minAge !== null && maxAge !== null) {
      setTimeout(() => {
        form.trigger(['ageRangeMin', 'ageRangeMax']);
      }, 0);
    }
  };

  // Impression/Click target validation handler
  const handleTargetChange = (field: 'impressionTarget' | 'clickTarget', value: number) => {
    // Get both target values
    const impressionTarget = field === 'impressionTarget' ? value : form.getValues('impressionTarget');
    const clickTarget = field === 'clickTarget' ? value : form.getValues('clickTarget');

    // Trigger validation if both targets are present
    if (impressionTarget !== undefined && clickTarget !== undefined && impressionTarget !== null && clickTarget !== null) {
      setTimeout(() => {
        form.trigger(['impressionTarget', 'clickTarget']);
      }, 0);
    }
  };

  if (formLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <VelvetLoader label="Loading ad data" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Velvet Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="velvet-surface p-5"
        >
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <VelvetBackButton
                label="Back"
                onClick={() => navigate(`/campaigns/${campaignId}/ads`)}
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--text-1)]">
                  {isEditMode ? 'Edit Ad' : 'Create New Ad'}
                </h1>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  for campaign <span className="font-semibold text-[var(--indigo-500)]">{campaignName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="velvet-chip">
                {isEditMode ? 'Edit Mode' : 'Create Mode'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* OC-newest tracking mode toggle */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <ElegantToggle
            checked={isOCTracking}
            onChange={(v) => {
              setIsOCTracking(v);
              if (v) applyOCTrackingDefaults();
            }}
            variant="primary"
            label="OC-newest Tracking Ad"
            description={
              isOCTracking
                ? `Locked: Pop up ads · paused · test phase · end ${OC_TRACKING_END_DATE}. This ad will NOT be served by /ads/serve — it exists only to receive impression/click tracking from the extension's floating banner.`
                : 'Turn this on if this ad is just a tracking row for an OC-newest floating banner offer. We will auto-pause it and put it in test phase so it never gets served as a real ad.'
            }
          />
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error('Form validation errors:', errors);
            const firstError = Object.values(errors)[0];
            if (firstError?.message) {
              toast.error(`Validation error: ${firstError.message}`);
            } else {
              toast.error('Please fill in all required fields correctly');
            }
          })} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="velvet-surface velvet-micro-shadow rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--line)] flex items-center gap-3">
                  <div className="metric-icon-tone metric-icon-tone--violet !static">
                    <Target className="h-4 w-4" />
                  </div>
                  <h3 className="velvet-section-title !my-0 !before:hidden text-[15px] font-semibold tracking-tight text-[var(--text-1)]">
                    Ad Details
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-6 sm:space-y-8">
                    <FormField
                      control={form.control}
                      name="label"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[var(--text-2)] font-semibold text-sm flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            Ad Name
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                placeholder="e.g., Summer Sale Ad"
                                {...field}
                                onFocus={() => setOpenLabelSuggestions(true)}
                                onBlur={() => setTimeout(() => setOpenLabelSuggestions(false), 150)}
                                className="transition-shadow duration-200 focus:shadow-md"
                              />
                            </FormControl>
                            {openLabelSuggestions && labelSuggestions.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg dark:bg-gray-800 dark:border-gray-700">
                                <ul className="py-1">
                                  {labelSuggestions.map((suggestion, index) => (
                                    <li
                                      key={index}
                                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                      onMouseDown={() => {
                                        form.setValue('label', suggestion);
                                        setOpenLabelSuggestions(false);
                                      }}
                                    >
                                      {suggestion}
                                      {existingAdLabels.includes(suggestion) && (
                                        <span className="ml-2 text-xs text-yellow-600">(Exists)</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <FormDescription className="text-gray-500 dark:text-gray-400">
                            A unique name for your ad within this campaign.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="slotId"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[var(--text-2)] font-semibold text-sm flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            Ad Slot
                          </FormLabel>

                          {/* Platform Filter */}
                          <Select
                            value={slotFilterPlatform?.toString() || "all"}
                            onValueChange={(value) => {
                              setSlotFilterPlatform(value === "all" ? undefined : parseInt(value));
                            }}
                          >
                            <SelectTrigger className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200">
                              <SelectValue placeholder="All Platforms" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Platforms</SelectItem>
                              {PLATFORM_OPTIONS.map((platform) => (
                                <SelectItem key={platform.value} value={platform.value.toString()}>
                                  {platform.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Slot Selection */}
                          <Select
                            onValueChange={(value) => {
                              const slot = filteredSlots.find(s => String(s.slotType ?? s.slotId) === value);
                              setSelectedSlot(slot || null);
                              field.onChange(value);
                            }}
                            value={field.value != null ? String(field.value) : ""}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200">
                                <SelectValue placeholder="Select a slot" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {filteredSlots.map((slot) => (
                                <SelectItem
                                  key={slot.slotId}
                                  value={String(slot.slotType ?? slot.slotId)}
                                  className="py-2.5"
                                >
                                  {/* Single line: rich content here is cloned into the trigger,
                                      so keep it on one row. The slotId is a full UUID — cap and
                                      truncate it in a monospace pill so it can't blow out the row. */}
                                  <span className="flex items-center gap-2 min-w-0 w-full">
                                    <span className="font-medium whitespace-nowrap shrink-0">{slot.name}</span>
                                    <span className="text-xs text-[var(--text-3)] whitespace-nowrap shrink-0">
                                      {getPlatformName(slot.platform)} · {parseFloat(slot.width.toString()).toFixed(0)}×{parseFloat(slot.height.toString()).toFixed(0)}
                                    </span>
                                    <span
                                      title={String(slot.slotId)}
                                      className="ml-auto shrink truncate max-w-[340px] font-mono text-[11px] leading-none text-[var(--indigo-500)] bg-[var(--bg-tint)] px-2 py-1 rounded"
                                    >
                                      {slot.slotId}
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                              {filteredSlots.length === 0 && (
                                <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                  No slots found matching your filters
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-500 font-medium" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[var(--text-2)] font-semibold text-sm flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                        Creative
                      </FormLabel>
                      {(() => {
                        const currentSlot = selectedSlot || filteredSlots.find(s => matchSlotId(s, form.watch('slotId')));
                        return currentSlot ? (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Required: {parseFloat(currentSlot.width.toString()).toFixed(0)} x {parseFloat(currentSlot.height.toString()).toFixed(0)} px
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <div className="flex items-center space-x-4">
                      {previewUrl ? (
                        <div className="relative group bg-gray-100 dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                          {(() => {
                            const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(previewUrl) || previewUrl.includes('video');
                            return isVideo ? (
                              <video
                                src={getCacheBustedUrl(previewUrl)}
                                controls
                                className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                              >
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                              <img
                                src={getCacheBustedUrl(previewUrl)}
                                alt="Ad preview"
                                className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.src = 'https://example.com/placeholder-moon.png';
                                }}
                              />
                            );
                          })()}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full h-6 w-6 p-0"
                            onClick={() => setPreviewUrl('')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl p-6 flex flex-col items-center justify-center space-y-2 w-40 h-32 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-all duration-200 bg-gray-50 dark:bg-gray-800">
                          <Upload className="h-6 w-6 text-blue-500" />
                          <p className="text-sm text-blue-600 dark:text-blue-400 text-center font-medium">
                            Click to upload
                          </p>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                      )}
                    </div>
                    {form.formState.errors.creativeUrl && (
                      <p className="text-sm text-red-500 font-medium">{form.formState.errors.creativeUrl.message}</p>
                    )}
                  </div>

                  {/* Logo Upload Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[var(--text-2)] font-semibold text-sm flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Logo (Optional)
                      </FormLabel>
                    </div>

                    <div className="flex items-center space-x-4">
                      {getCacheBustedUrl(logoPreviewUrl) ? (
                        <div className="relative group bg-gray-100 dark:bg-gray-700 rounded-xl p-4 shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <img
                            src={getCacheBustedUrl(logoPreviewUrl)}
                            alt="Logo preview"
                            className="h-24 w-24 object-contain rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.dataset.fallback) {
                                target.dataset.fallback = 'true';
                                target.src = 'https://example.com/placeholder-logo.png';
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full h-6 w-6 p-0"
                            onClick={() => {
                              setLogoPreviewUrl('');
                              form.setValue('logo', '');
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full max-w-md rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
                          <FileUpload
                            maxFiles={1}
                            accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] }}
                            onChange={(files) => {
                              if (files[0]) void uploadLogoFile(files[0]);
                            }}
                            className="p-2"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Upload a logo for this ad. No dimension requirements.
                    </p>
                  </div>


                  <FormField
                    control={form.control}
                    name="impressionTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[var(--text-2)] font-semibold text-sm">Impression Target</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter impression target"
                            value={field.value || ''}
                            onChange={(e) => handleNumberInput(e, (value) => {
                              field.onChange(value);
                              handleTargetChange('impressionTarget', value);
                            }, 1)}
                            onKeyPress={(e) => {
                              // Allow only numbers
                              if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                                e.preventDefault();
                              }
                            }}
                            className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus-visible:ring-4 focus-visible:ring-purple-500/10 transition-all duration-200"
                          />
                        </FormControl>
                        <FormDescription className="text-gray-500 dark:text-gray-400">
                          Must be greater than or equal to click target
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clickTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[var(--text-2)] font-semibold text-sm">Click Target</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter click target"
                            value={field.value || ''}
                            onChange={(e) => handleNumberInput(e, (value) => {
                              field.onChange(value);
                              handleTargetChange('clickTarget', value);
                            }, 1)}
                            onKeyPress={(e) => {
                              // Allow only numbers
                              if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                                e.preventDefault();
                              }
                            }}
                            className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus-visible:ring-4 focus-visible:ring-purple-500/10 transition-all duration-200"
                          />
                        </FormControl>
                        <FormDescription className="text-gray-500 dark:text-gray-400">
                          Must be less than or equal to impression target
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[var(--text-2)] font-semibold text-sm">Priority Score (0-1000)</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <Input
                              type="number"
                              min={0}
                              max={1000}
                              placeholder="Enter priority score (0-1000)"
                              value={field.value || ''}
                              onChange={(e) => handleNumberInput(e, field.onChange, 0, 1000)}
                              onKeyPress={(e) => {
                                // Allow only numbers
                                if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                                  e.preventDefault();
                                }
                              }}
                              className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus-visible:ring-4 focus-visible:ring-purple-500/10 transition-all duration-200"
                            />
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min((field.value || 0) / 1000 * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription className="text-gray-500 dark:text-gray-400">
                          Higher priority ads are shown more frequently (0 = lowest, 1000 = highest)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[var(--text-2)] font-semibold text-sm">Status</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus-visible:ring-4 focus-visible:ring-purple-500/10 transition-all duration-200">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <SelectItem value="1" className="text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">Active</SelectItem>
                            <SelectItem value="0" className="text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">Paused</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isTestPhase"
                    render={({ field }) => {
                      const isTestMode = field.value === 1;
                      return (
                        <FormItem>
                          <div
                            onClick={() => field.onChange(isTestMode ? 0 : 1)}
                            className={`
                          flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg
                          ${isTestMode
                                ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }
                        `}
                          >
                            <div className={`
                          relative w-12 h-6 rounded-full transition-all duration-200 mr-4
                          ${isTestMode
                                ? 'bg-emerald-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                              }
                        `}>
                              <div className={`
                            absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 transform
                            ${isTestMode
                                  ? 'translate-x-6'
                                  : 'translate-x-0.5'
                                }
                          `}>
                                {isTestMode && (
                                  <div className="flex items-center justify-center h-full">
                                    <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <FormLabel className={`font-semibold text-base cursor-pointer ${isTestMode ? 'text-emerald-800 dark:text-emerald-200' : 'text-gray-700 dark:text-gray-300'}`}>
                                Test Phase
                              </FormLabel>
                              <FormDescription className={`mt-1 ${isTestMode ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                Enable to test this ad without affecting live traffic
                              </FormDescription>
                            </div>
                            {isTestMode && (
                              <div className="ml-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                                  Active
                                </span>
                              </div>
                            )}
                          </div>
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="serveStrategy"
                    render={({ field }) => {
                      const selected = SERVE_STRATEGIES.find((s) => s.value === field.value) ?? SERVE_STRATEGIES[0];
                      return (
                        <FormItem>
                          <FormLabel className="text-[var(--text-2)] font-semibold text-sm">Serve Strategy</FormLabel>
                          <FormDescription className="text-[var(--text-3)]">
                            The ad type. Determines how it's selected and rendered when served.
                          </FormDescription>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                            {SERVE_STRATEGIES.map((s) => {
                              const active = field.value === s.value;
                              const Icon = s.icon;
                              return (
                                <button
                                  key={s.value}
                                  type="button"
                                  onClick={() => field.onChange(s.value)}
                                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 ${
                                    active
                                      ? 'border-[var(--line-violet)] bg-[var(--bg-tint)] shadow-[var(--shadow-ring)]'
                                      : 'border-[var(--line)] bg-[var(--bg-panel)] hover:border-[var(--line-violet)]'
                                  }`}
                                >
                                  <span className={`metric-icon-tone metric-icon-tone--${s.tone} !static shrink-0`}>
                                    <Icon className="h-4 w-4" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className={`block text-[13px] font-semibold ${active ? 'text-[var(--indigo-500)]' : 'text-[var(--text-1)]'}`}>
                                      {s.label}
                                    </span>
                                    <span className="block text-[10.5px] leading-tight text-[var(--text-3)] mt-0.5">{s.desc}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Serve-behavior warnings (guide §5, §7) */}
                          {field.value === 2 && (
                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/40 p-3">
                              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <p className="text-[12px] leading-snug text-amber-800 dark:text-amber-200">
                                <strong>Coupon ads require a location.</strong> With an empty Locations field a coupon ad never serves — set at least one location below.
                              </p>
                            </div>
                          )}
                          {field.value === 3 && (
                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-teal-300/60 bg-teal-50 dark:border-teal-700/50 dark:bg-teal-950/40 p-3">
                              <Plane className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                              <p className="text-[12px] leading-snug text-teal-800 dark:text-teal-200">
                                Flight ads serve through the separate flight path and are excluded from the normal product/banner query.
                              </p>
                            </div>
                          )}
                          {field.value === 4 && (
                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--line-violet)] bg-[var(--bg-tint)] p-3">
                              <Lock className="h-4 w-4 text-[var(--indigo-500)] shrink-0 mt-0.5" />
                              <p className="text-[12px] leading-snug text-[var(--text-2)]">
                                Category-locked ads serve only when the request's category is in this ad's Categories. Make sure Categories below is set.
                              </p>
                            </div>
                          )}
                          <input type="hidden" value={selected.value} readOnly />
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {/* Coupon code — fallback coupon for serveStrategy=2 (guide §3) */}
                  {form.watch('serveStrategy') === 2 && (
                    <FormField
                      control={form.control}
                      name="couponCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[var(--text-2)] font-semibold text-sm">Coupon Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., SAVE20"
                              {...field}
                              className="bg-[var(--bg-panel)] border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                            />
                          </FormControl>
                          <FormDescription className="text-[var(--text-3)]">
                            Fallback coupon shown when a product has no per-product coupon.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="isModelType"
                    render={({ field }) => {
                      const isModel = field.value === 1;
                      return (
                        <FormItem>
                          <div
                            onClick={() => field.onChange(isModel ? 0 : 1)}
                            className={`
                              flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg
                              ${isModel
                                ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 shadow-blue-100 dark:shadow-blue-900/20'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }
                            `}
                          >
                            <div className={`
                              relative w-12 h-6 rounded-full transition-all duration-200 mr-4 shadow-md
                              ${isModel
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-purple-200 dark:shadow-purple-800'
                                : 'bg-gray-300 dark:bg-gray-600'
                              }
                            `}>
                              <div className={`
                                absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-200 transform
                                ${isModel
                                  ? 'translate-x-6'
                                  : 'translate-x-0.5'
                                }
                              `}>
                                {isModel && (
                                  <div className="flex items-center justify-center h-full">
                                    <svg className="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <FormLabel className={`font-semibold text-base cursor-pointer ${isModel ? 'text-purple-800 dark:text-purple-200' : 'text-gray-700 dark:text-gray-300'}`}>
                                Is Model Type ad
                              </FormLabel>
                              <FormDescription className={`mt-1 ${isModel ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                Enable if this ad is a model type
                              </FormDescription>
                            </div>
                            {isModel && (
                              <div className="ml-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700 shadow-sm">
                                  Model Active
                                </span>
                              </div>
                            )}
                          </div>
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="velvet-surface velvet-micro-shadow rounded-2xl overflow-visible">
                <div className="px-6 py-4 border-b border-[var(--line)] flex items-center gap-3">
                  <div className="metric-icon-tone metric-icon-tone--plum !static">
                    <Settings className="h-4 w-4" />
                  </div>
                  <h3 className="velvet-section-title !my-0 !before:hidden text-[15px] font-semibold tracking-tight text-[var(--text-1)]">
                    Targeting & Audience
                  </h3>
                </div>
                <div className="p-6 space-y-6">

                  {/* Master No Specificity Toggle */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                    <ElegantToggle
                      checked={form.watch('noSpecificity') || false}
                      onChange={(checked) => {
                        form.setValue('noSpecificity', checked, { shouldValidate: true });

                        // Toggle all specificity toggles
                        form.setValue('noGenderSpecificity', checked, { shouldValidate: true });

                        if (checked) {
                          // If enabling master toggle, set default values and highlight price range
                          form.setValue('gender', 'u', { shouldValidate: true });
                          form.setValue('ageRangeMin', 13, { shouldValidate: true });
                          form.setValue('ageRangeMax', 100, { shouldValidate: true });
                          setAgeRange([13, 100]);
                          setPriceRangeHighlighted(true);

                          // Set empty objects for all target sections (no specificity)
                          form.setValue('sites', {}, { shouldValidate: true });
                          form.setValue('brandTargets', {}, { shouldValidate: true });
                          form.setValue('location', {}, { shouldValidate: true });
                          form.setValue('categories', { selections: [] }, { shouldValidate: true });

                          // Show highlighting for 3 seconds
                          setTimeout(() => setPriceRangeHighlighted(false), 3000);
                        } else {
                          // If disabling master toggle, reset to defaults
                          form.setValue('gender', 'm', { shouldValidate: true });
                          form.setValue('ageRangeMin', 18, { shouldValidate: true });
                          form.setValue('ageRangeMax', 65, { shouldValidate: true });
                          setAgeRange([18, 65]);
                          setPriceRangeHighlighted(false);

                          // Reset no-specificity for all target sections
                          form.setValue('sites', {}, { shouldValidate: true });
                          form.setValue('brandTargets', {}, { shouldValidate: true });
                          form.setValue('location', {}, { shouldValidate: true });
                          form.setValue('categories', { selections: [] }, { shouldValidate: true });
                        }
                      }}
                      label="Master No Specificity"
                      description="Apply broad targeting to all categories. When enabled, focus on price range settings below."
                      size="lg"
                      variant="primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => {
                        const current = toFormGender(field.value);
                        const disabled = form.watch('noSpecificity');
                        return (
                          <FormItem>
                            <FormLabel className="text-[var(--text-2)] font-semibold text-sm">Gender Targeting</FormLabel>
                            <FormDescription className="text-[var(--text-3)]">
                              Only a positive match serves — a Male/Female ad skips users whose gender is unknown. Use “All genders” to show it to everyone.
                            </FormDescription>
                            <div className="grid grid-cols-3 gap-2 pt-1">
                              {GENDER_OPTIONS.map((opt) => {
                                const active = current === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      field.onChange(opt.value);
                                      form.setValue('noGenderSpecificity', opt.value === 'u', { shouldValidate: true });
                                    }}
                                    title={opt.hint}
                                    className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                      active
                                        ? 'border-[var(--line-violet)] bg-[var(--bg-tint)] shadow-[var(--shadow-ring)]'
                                        : 'border-[var(--line)] bg-[var(--bg-panel)] hover:border-[var(--line-violet)]'
                                    }`}
                                  >
                                    <span className={`text-[13px] font-semibold ${active ? 'text-[var(--indigo-500)]' : 'text-[var(--text-1)]'}`}>
                                      {opt.label}
                                    </span>
                                    <span className="text-[10.5px] leading-tight text-[var(--text-3)]">{opt.hint}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <div className="space-y-3">
                      <FormLabel className="text-[var(--text-2)] font-semibold text-sm flex items-center">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                        Age Range
                      </FormLabel>

                      <div className="space-y-3">
                        <div className="px-2 py-3">
                          <Slider
                            value={ageRange}
                            onValueChange={(value) => {
                              const [min, max] = value as [number, number];
                              setAgeRange([min, max]);
                              form.setValue('ageRangeMin', min);
                              form.setValue('ageRangeMax', max);
                              handleAgeChange('ageRangeMin', min);
                              handleAgeChange('ageRangeMax', max);
                            }}
                            min={13}
                            max={100}
                            step={1}
                            className="w-full"
                            disabled={form.watch('noSpecificity')}
                          />
                        </div>

                        <div className="flex justify-center">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                              {ageRange[0]} years
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                              {ageRange[1]} years
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Display age range validation error prominently */}
                      {(form.formState.errors.ageRangeMax || form.formState.errors.ageRangeMin) && (
                        <p className="text-sm text-red-500 font-medium mt-2">
                          {form.formState.errors.ageRangeMax?.message || form.formState.errors.ageRangeMin?.message}
                        </p>
                      )}
                    </div>

                    <motion.div
                      className={`space-y-4 p-4 rounded-xl border-2 transition-all duration-500 ${priceRangeHighlighted
                        ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 shadow-lg'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                        }`}
                      animate={priceRangeHighlighted ? {
                        scale: [1, 1.02, 1],
                        boxShadow: ['0 0 0 0 rgba(255, 193, 7, 0)', '0 0 0 10px rgba(255, 193, 7, 0.1)', '0 0 0 0 rgba(255, 193, 7, 0)']
                      } : {}}
                      transition={{ duration: 0.6, repeat: priceRangeHighlighted ? 2 : 0 }}
                    >
                      <div className="flex items-center space-x-2">
                        <FormLabel className="text-[var(--text-2)] font-semibold text-sm flex items-center">
                          <div className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mr-2"></div>
                          Price Range
                        </FormLabel>
                        {priceRangeHighlighted && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="velvet-chip"
                          >
                            <Target className="h-3 w-3" />
                            Focus here
                          </motion.div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="px-2 py-3">
                          <Slider
                            value={[
                              Math.min(form.getValues('priceRangeMin'), 400000),
                              Math.min(form.getValues('priceRangeMax'), 400000),
                            ]}
                            onValueChange={(value) => {
                              const [min, max] = value as [number, number];
                              form.setValue('priceRangeMin', min);
                              form.setValue('priceRangeMax', max);
                              handlePriceChange('priceRangeMin', min);
                              handlePriceChange('priceRangeMax', max);
                            }}
                            min={1}
                            max={400000}
                            step={1}
                            className="w-full"
                            disabled={form.watch('noSpecificity')}
                          />
                        </div>

                        <div className="flex justify-center">
                          <div className="flex items-center space-x-4">
                            <FormField
                              control={form.control}
                              name="priceRangeMin"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      type="text"
                                      placeholder="Min price"
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        handleNumberInput(e, (value) => {
                                          field.onChange(value);
                                          handlePriceChange('priceRangeMin', value);
                                        }, 0);
                                      }}
                                      onKeyPress={(e) => {
                                        if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                                          e.preventDefault();
                                        }
                                      }}
                                      disabled={form.watch('noSpecificity')}
                                      className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus-visible:ring-4 focus-visible:ring-purple-500/10 transition-all duration-200"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <span className="text-gray-400 dark:text-gray-500 text-sm">to</span>
                            <FormField
                              control={form.control}
                              name="priceRangeMax"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      type="text"
                                      placeholder="Max price"
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        handleNumberInput(e, (value) => {
                                          field.onChange(value);
                                          handlePriceChange('priceRangeMax', value);
                                        }, 1);
                                      }}
                                      onKeyPress={(e) => {
                                        if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                                          e.preventDefault();
                                        }
                                      }}
                                      disabled={form.watch('noSpecificity')}
                                      className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus-visible:ring-4 focus-visible:ring-purple-500/10 transition-all duration-200"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {(form.formState.errors.priceRangeMax || form.formState.errors.priceRangeMin) && (
                          <p className="text-sm text-red-500 font-medium mt-2">
                            {form.formState.errors.priceRangeMax?.message || form.formState.errors.priceRangeMin?.message}
                          </p>
                        )}
                      </div>
                    </motion.div>

                    <FormField
                      control={form.control}
                      name="sites"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sites</FormLabel>
                          <FormDescription>
                            Select the sites where you want your ads to appear.
                          </FormDescription>
                          <FormControl>
                            <SiteSelect
                              value={field.value as any}
                              onChange={field.onChange}
                              placeholder="Select sites..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categories</FormLabel>
                          <FormDescription>
                            Select multiple categories at any level. Navigate through the hierarchy and click "Select" to add each category you want to target.
                          </FormDescription>
                          <FormControl>
                            <MultiHierarchicalCategorySelector
                              value={typeof field.value === 'object' && 'selections' in field.value ? field.value as CategoryPath : { selections: [] }}
                              onChange={field.onChange}
                              placeholder="Select categories..."
                            />
                          </FormControl>
                          {(() => {
                            const cats = field.value;
                            const isEmpty =
                              !cats ||
                              (typeof cats === 'object' && 'selections' in cats
                                ? (cats as CategoryPath).selections.length === 0
                                : Object.keys(cats).length === 0);
                            return isEmpty ? (
                              <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/40 p-3">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-[12px] leading-snug text-amber-800 dark:text-amber-200">
                                  An ad with <strong>no categories</strong> fails the category filter and won't serve. Add at least one.
                                </p>
                              </div>
                            ) : null;
                          })()}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brandTargets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand Targets</FormLabel>
                          <FormDescription>
                            Type brand names like Apple, Samsung, etc...
                          </FormDescription>
                          <FormControl>
                            <BrandInput
                              value={field.value as any}
                              onChange={field.onChange}
                              placeholder="Type brand names..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Locations</FormLabel>
                          <FormDescription>
                            Search and select locations, or type any country, state, city, or pincode and press Enter.
                          </FormDescription>
                          <FormControl>
                            <LocationAutoSuggest
                              value={field.value as any}
                              onChange={field.onChange}
                              placeholder="Search locations..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>

            <Card className="velvet-surface velvet-micro-shadow rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--line)] flex items-center gap-3">
                <div className="metric-icon-tone metric-icon-tone--teal !static">
                  <Target className="h-4 w-4" />
                </div>
                <h3 className="velvet-section-title !my-0 !before:hidden text-[15px] font-semibold tracking-tight text-[var(--text-1)]">
                  Tracking & Pixels
                </h3>
              </div>
              <div className="p-8 space-y-8">

                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="impressionPixel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impression Pixel URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/impression-pixel"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          URL to track ad impressions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clickPixel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Click Pixel URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/click-pixel"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          URL to track ad clicks
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Landing URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/landing-page"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          URL where users will be redirected when they click the ad
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>

            {/* Billing & Bidding — per-event charges + bidding bookkeeping (guide §3) */}
            <Card className="velvet-surface velvet-micro-shadow rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--line)] flex items-center gap-3">
                <div className="metric-icon-tone metric-icon-tone--amber !static">
                  <IndianRupee className="h-4 w-4" />
                </div>
                <h3 className="velvet-section-title !my-0 !before:hidden text-[15px] font-semibold tracking-tight text-[var(--text-1)]">
                  Billing &amp; Bidding <span className="text-[var(--text-3)] font-normal">(Optional)</span>
                </h3>
              </div>
              <div className="p-8 space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="velvet-section-title">Billing</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="impressionCharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Impression Charge</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="0.00"
                              value={field.value ?? ''}
                              onChange={(e) => handleNumberInput(e, field.onChange, 0)}
                              className="bg-[var(--bg-panel)] border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                            />
                          </FormControl>
                          <FormDescription>Deducted from balance per impression.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clickCharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Click Charge</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="0.00"
                              value={field.value ?? ''}
                              onChange={(e) => handleNumberInput(e, field.onChange, 0)}
                              className="bg-[var(--bg-panel)] border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                            />
                          </FormControl>
                          <FormDescription>Deducted from balance per click.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Gavel className="h-3.5 w-3.5 text-[var(--text-3)]" />
                    <span className="velvet-section-title !before:hidden">Bidding</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-3)] mb-4">
                    Stored for bidding bookkeeping — not used by the current serve scoring.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="minBid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Bid</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="0.00"
                              value={field.value ?? ''}
                              onChange={(e) => handleNumberInput(e, field.onChange, 0)}
                              className="bg-[var(--bg-panel)] border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxBid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Bid</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="0.00"
                              value={field.value ?? ''}
                              onChange={(e) => handleNumberInput(e, field.onChange, 0)}
                              className="bg-[var(--bg-panel)] border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bidModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bid Model</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="0"
                              value={field.value ?? ''}
                              onChange={(e) => handleNumberInput(e, field.onChange, 0)}
                              className="bg-[var(--bg-panel)] border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="velvet-surface velvet-micro-shadow rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--line)] flex items-center gap-3">
                <div className="metric-icon-tone metric-icon-tone--violet !static">
                  <Settings className="h-4 w-4" />
                </div>
                <h3 className="velvet-section-title !my-0 !before:hidden text-[15px] font-semibold tracking-tight text-[var(--text-1)]">
                  Other Details <span className="text-[var(--text-3)] font-normal">(Optional)</span>
                </h3>
              </div>
              <div className="p-8 space-y-6">
                {otherDetailsFields.map((field, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
                  >
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Key</Label>
                      <Input
                        placeholder="e.g., dealType"
                        value={field.key}
                        onChange={(e) => {
                          const newFields = [...otherDetailsFields];
                          newFields[index].key = e.target.value;
                          setOtherDetailsFields(newFields);
                        }}
                        className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus-visible:ring-4 focus-visible:ring-purple-500/10 transition-all duration-200"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-gray-700 dark:text-gray-300">Value</Label>
                        <Input
                          placeholder="e.g., flash-sale"
                          value={field.value}
                          onChange={(e) => {
                            const newFields = [...otherDetailsFields];
                            newFields[index].value = e.target.value;
                            setOtherDetailsFields(newFields);
                          }}
                          className="bg-white dark:bg-[var(--bg-panel-2)] border-slate-200 dark:border-[var(--line)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus-visible:ring-4 focus-visible:ring-purple-500/10 transition-all duration-200"
                        />
                      </div>
                      {otherDetailsFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newFields = otherDetailsFields.filter((_, i) => i !== index);
                            setOtherDetailsFields(newFields);
                          }}
                          className="h-10 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOtherDetailsFields([...otherDetailsFields, { key: '', value: '' }]);
                  }}
                  className="w-full border-dashed border-2 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Field
                </Button>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Add custom key-value pairs for any additional details you want to store with this ad.
                </p>
              </div>
            </Card>

            <Card className="velvet-surface velvet-micro-shadow rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--line)] flex items-center gap-3">
                <div className="metric-icon-tone metric-icon-tone--accent !static">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <h3 className="velvet-section-title !my-0 !before:hidden text-[15px] font-semibold tracking-tight text-[var(--text-1)]">
                  Scheduling
                </h3>
              </div>
              <div className="p-8 space-y-8">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <VelvetDatePicker
                          value={field.value}
                          min={startOfToday()}
                          onChange={(v) => {
                            field.onChange(v);
                            handleDateChange('startDate', v);
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <VelvetDatePicker
                          value={field.value}
                          min={ymdToDate(form.getValues('startDate')) ?? startOfToday()}
                          onChange={(v) => {
                            field.onChange(v);
                            handleDateChange('endDate', v);
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <div className="relative">
                          <Input
                            type="time"
                            step="60"
                            className="pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                            ref={field.ref}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            value={field.value}
                            id="start-time-input"
                            style={{
                              colorScheme: 'light',
                              direction: 'ltr'
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const input = document.getElementById('start-time-input') as HTMLInputElement;
                              if (input) {
                                input.focus();
                                setTimeout(() => {
                                  input.showPicker?.();
                                }, 10);
                              }
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors bg-transparent border-none outline-none p-0 m-0 z-10"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <div className="relative">
                          <Input
                            type="time"
                            step="60"
                            className="pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                            ref={field.ref}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            value={field.value}
                            id="end-time-input"
                            style={{
                              colorScheme: 'light',
                              direction: 'ltr'
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const input = document.getElementById('end-time-input') as HTMLInputElement;
                              if (input) {
                                input.focus();
                                setTimeout(() => {
                                  input.showPicker?.();
                                }, 10);
                              }
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors bg-transparent border-none outline-none p-0 m-0 z-10"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-[var(--line)]"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/campaigns/${campaignId}/ads`)}
                disabled={loading}
                className="w-full sm:w-auto px-6 h-11 rounded-xl border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)] transition-all duration-200 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 h-11 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white font-semibold shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 order-1 sm:order-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isEditMode ? 'Update Ad' : 'Create Ad'}
                  </span>
                )}
              </Button>
            </motion.div>
          </form>
        </Form>
      </div>
    </div>
  );
}