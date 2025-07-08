import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Calendar as CalendarIcon, Clock, Target, Loader2, X, Settings, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { LocationAutoSuggest, CategoryAutoSuggest, BrandInput } from '@/components/ui/auto-suggest';
import { SiteSelect } from '@/components/ui/site-select';
import { adService } from '@/services/adService';
import { toast } from 'sonner';
import { Slot, Ad } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreativeUploadModal from './CreativeUploadModal';
import { Badge } from '@/components/ui/badge';

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
        <div className={`font-semibold transition-colors duration-200 ${
          checked 
            ? 'text-blue-900 dark:text-blue-100' 
            : 'text-gray-700 dark:text-gray-300'
        }`}>
          {label}
        </div>
        {description && (
          <div className={`text-sm mt-1 transition-colors duration-200 ${
            checked 
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
  slotId: z.union([z.undefined(), z.number().min(1, 'Slot selection is required')]).refine((val) => val !== undefined && val > 0, {
    message: 'Slot selection is required'
  }),
  name: z.string().min(1, 'Ad name is required'),
  impressionTarget: z.number().min(1, 'Impression target is required'),
  clickTarget: z.number().min(1, 'Click target is required'),
  impressionPixel: z.string().url('Must be a valid URL'),
  clickPixel: z.string().url('Must be a valid URL'),
  categories: z.record(z.number().min(0)),
  sites: z.record(z.number().min(0)),
  location: z.record(z.number().min(0)),
  brandTargets: z.record(z.number().min(0)),
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
  gender: z.string().optional(),
  noGenderSpecificity: z.boolean().optional(),
  noSpecificity: z.boolean().optional(),
  status: z.number().min(0).max(1),
  isTestPhase: z.number().min(0).max(1),
  serveStrategy: z.number().min(0).max(1)
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
});



type AdFormData = z.infer<typeof adSchema>;

interface AdFormProps {
  initialData?: Ad;
  campaignId?: number;
  onSuccess?: () => void;
}

interface AdLabelSuggestion {
  name: string;
  label: string;
}

export default function AdForm({ initialData, campaignId, onSuccess }: AdFormProps) {
  const { adId } = useParams<{ adId?: string }>();
  const isEditMode = !!adId;
  const navigate = useNavigate();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 65]);
  const [priceRangeHighlighted, setPriceRangeHighlighted] = useState(false);
  const [existingAdLabels, setExistingAdLabels] = useState<AdLabelSuggestion[]>([]);
  const [labelSuggestions, setLabelSuggestions] = useState<string[]>([]);
  const [openLabelSuggestions, setOpenLabelSuggestions] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [isCreativeModalOpen, setIsCreativeModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    adId: initialData?.adId || 0,
    campaignId: initialData?.campaignId || campaignId || 0,
    label: initialData?.label || '',
    slotId: initialData?.slotId || 0,
    impressionTarget: initialData?.impressionTarget || 0,
    clickTarget: initialData?.clickTarget || 0,
    impressionPixel: initialData?.impressionPixel || '',
    clickPixel: initialData?.clickPixel || '',
    status: initialData?.status || 1,
    categories: initialData?.categories || {},
    sites: initialData?.sites || {},
    location: initialData?.location || {},
    brandTargets: initialData?.brandTargets || {},
    priceRangeMin: initialData?.priceRangeMin || 0,
    priceRangeMax: initialData?.priceRangeMax || 1000,
    ageRangeMin: initialData?.ageRangeMin || 13,
    ageRangeMax: initialData?.ageRangeMax || 100,
    priority: initialData?.priority || 500,
    startDate: initialData?.startDate || '',
    startTime: initialData?.startTime || '00:00:00',
    endDate: initialData?.endDate || '',
    endTime: initialData?.endTime || '00:00:00',
    creativeUrl: initialData?.creativeUrl || '',
    gender: initialData?.gender || 'NA',
    isTestPhase: initialData?.isTestPhase || 0,
    serveStrategy: initialData?.serveStrategy || 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adLabelSuggestions, setAdLabelSuggestions] = useState<AdLabelSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const form = useForm<AdFormData>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      slotId: undefined,
      name: '',
      impressionTarget: 1000,
      clickTarget: 100,
      impressionPixel: '',
      clickPixel: '',
      categories: {},
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
      gender: 'Male',
      noGenderSpecificity: false,
      noSpecificity: false,
      status: 1,
      isTestPhase: 0,
      serveStrategy: 0
    }
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if a slot is selected - use form value as fallback
      const currentSlotId = form.getValues('slotId');
      const currentSlot = selectedSlot || slots.find(s => s.slotId === currentSlotId);
      
      if (!currentSlot) {
        toast.error('Please select an ad slot first to determine required dimensions');
        event.target.value = ''; // Clear the file input
        return;
      }

      const img = new Image();
      img.onload = async () => {
        const requiredWidth = parseFloat(currentSlot.width);
        const requiredHeight = parseFloat(currentSlot.height);
        
        // Check if image dimensions match the selected slot
        if (img.width !== requiredWidth || img.height !== requiredHeight) {
          toast.error(
            `Image dimensions (${img.width}x${img.height}) don't match the required slot dimensions (${requiredWidth}x${requiredHeight}). Please upload an image with the correct dimensions.`
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
            toast.success('Image uploaded successfully!');
          } else {
            toast.error(result.message || 'Failed to upload image');
          }
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('Failed to upload image. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      img.onerror = () => {
        toast.error('Failed to load image. Please select a valid image file.');
        event.target.value = ''; // Clear the file input
      };

      // Create object URL to load the image
      img.src = URL.createObjectURL(file);
    }
  };

  const fetchSlots = async () => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/slots');
      if (!response.ok) throw new Error('Failed to fetch slots');
      
      const result = await response.json();
      if (result.status === 1 && result.data?.slotList) {
        setSlots(result.data.slotList);
        
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

  // Fetch slots and ad data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFormLoading(true);

        // Fetch campaign name
        if (campaignId) {
          try {
            const response = await fetch(`https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns?campaignId=${campaignId}`);
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

            const response = await fetch(
              `https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads?campaignId=${campaignId}&slotId=${adId}&status=${formData.status}`
            );

            if (!response.ok) {
              throw new Error('Failed to fetch ad');
            }

            const result = await response.json();

            if (result.status === 1 && result.data?.adsList?.[0]) {
              const adData = result.data.adsList[0];

              // Format the data for the form
              form.reset({
                ...adData,
                startDate: adData.startDate ? adData.startDate.split('T')[0] : undefined,
                endDate: adData.endDate ? adData.endDate.split('T')[0] : undefined,
                startTime: '', // Blank by default on edit/update
                endTime: '', // Blank by default on edit/update
              });

              // Set the selected slot for editing mode
              if (adData.slotId && slots.length > 0) {
                const slot = slots.find(s => s.slotId === adData.slotId);
                if (slot) setSelectedSlot(slot);
              }

              // Set preview URL if creative exists
              if (adData.creativeUrl) {
                setPreviewUrl(adData.creativeUrl);
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
    if (currentSlotId && slots.length > 0 && (!selectedSlot || selectedSlot.slotId !== currentSlotId)) {
      const slot = slots.find(s => s.slotId === currentSlotId);
      if (slot) setSelectedSlot(slot);
    }
  }, [form.watch('slotId'), slots, selectedSlot]);

  // Initialize labelInputValue from form value when it's loaded
  useEffect(() => {
    const currentLabel = form.getValues('name');
  }, [form]);

  // Fetch existing ad labels for the current campaign
  useEffect(() => {
    const fetchExistingAdLabels = async () => {
      try {
        if (!campaignId) return;
        
        const result = await adService.getAdLabels(Number(campaignId));
        if (result.success && result.data) {
          setExistingAdLabels(result.data);
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
    const labelInputValue = form.watch('name');
    if (!labelInputValue) {
      setLabelSuggestions([]);
      return;
    }

    const baseLabel = labelInputValue.trim();
    
    // Filter existing labels that include the input value
    const matchingLabels = existingAdLabels.filter(label =>
      label.label.toLowerCase().includes(baseLabel.toLowerCase())
    );

    // Use a Set to handle uniqueness. Add the user's typed label as a suggestion.
    const suggestions = new Set<string>();
    if (baseLabel) {
      suggestions.add(baseLabel);
    }
    matchingLabels.forEach(label => suggestions.add(label.label));

    setLabelSuggestions(Array.from(suggestions));
  }, [form.watch('name'), existingAdLabels]);

  // Backend will handle auto-numbering when an existing name is used

  const onSubmit = async (data: AdFormData) => {
    try {
      setLoading(true);
      const url = isEditMode 
        ? `https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads/update?userId=1`
        : `https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads?userId=1`;

      const method = 'POST';
      const body = {
        ...data,
        label: data.name,
        campaignId: Number(campaignId),
        ...(isEditMode && { adId: Number(adId) })
      };
      delete (body as { name?: string }).name;

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Show suggestions when typing in the label field
    if (name === 'label') {
      setShowSuggestions(value.length > 0);
    }
  };

  const handleSelectChange = (name: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked ? 1 : 0 }));
  };

  const handleLabelSuggestionClick = (label: string) => {
    setFormData(prev => ({ ...prev, label }));
    setShowSuggestions(false);
  };

  const handleCreativeUpload = (url: string) => {
    setFormData(prev => ({ ...prev, creativeUrl: url }));
    setIsCreativeModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let result;
      if (isEditMode) {
        result = await adService.updateAd(formData.adId, {
          ...formData,
          campaignId: Number(formData.campaignId),
          slotId: Number(formData.slotId)
        });
      } else {
        result = await adService.createAd({
          ...formData,
          campaignId: Number(formData.campaignId),
          slotId: Number(formData.slotId)
        });
      }

      if (result.success) {
        setSuccess(isEditMode ? 'Ad updated successfully!' : 'Ad created successfully!');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            navigate(`/ads/${result.data.adId}`);
          }
        }, 1500);
      } else {
        setError(result.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter suggestions based on input
  const filteredSuggestions = adLabelSuggestions.filter(
    suggestion => suggestion.label.toLowerCase().includes(formData.label.toLowerCase())
  );

  if (formLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading ad data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Modern Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
        >
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Button 
                variant="ghost"
                onClick={() => navigate(`/campaigns/${campaignId}/ads`)}
                className="h-100 w-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {isEditMode ? 'Edit Ad' : 'Create New Ad'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                  for campaign <span className="font-semibold text-purple-600 dark:text-purple-400">{campaignName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-lg text-xs sm:text-sm font-medium">
                {isEditMode ? 'Edit Mode' : 'Create Mode'}
              </div>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="targeting">Targeting</TabsTrigger>
            <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
            <TabsTrigger value="creative">Creative</TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit}>
            <TabsContent value="basic">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                  <Label htmlFor="label">Ad Label</Label>
                              <Input
                    id="label"
                    name="label"
                    value={formData.label}
                    onChange={handleChange}
                    onFocus={() => setShowSuggestions(formData.label.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Enter ad label"
                    className="bg-white dark:bg-gray-800"
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        Previously used ad labels
                      </div>
                      {filteredSuggestions.map((suggestion, index) => (
                        <div
                                      key={index}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                          onClick={() => handleLabelSuggestionClick(suggestion.label)}
                        >
                          <div>
                            <span className="font-medium">{suggestion.label}</span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Used in: {suggestion.name}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            Select
                          </Badge>
                        </div>
                      ))}
                              </div>
                            )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The label is used as the base name for your ad. The system will automatically add a suffix if needed.
                  </p>
                          </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slotId">Slot</Label>
                    <Select
                    value={formData.slotId.toString()}
                    onValueChange={(value) => handleSelectChange('slotId', parseInt(value))}
                  >
                    <SelectTrigger>
                          <SelectValue placeholder="Select a slot" />
                        </SelectTrigger>
                    <SelectContent>
                        {slots.map((slot) => (
                        <SelectItem key={slot.slotId} value={slot.slotId.toString()}>
                          {slot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="impressionTarget">Impression Target</Label>
                      <Input 
                    id="impressionTarget"
                    name="impressionTarget"
                    type="number"
                    value={formData.impressionTarget}
                    onChange={handleChange}
                        placeholder="Enter impression target"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clickTarget">Click Target</Label>
                      <Input 
                    id="clickTarget"
                    name="clickTarget"
                    type="number"
                    value={formData.clickTarget}
                    onChange={handleChange}
                        placeholder="Enter click target"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="impressionPixel">Impression Pixel</Label>
                        <Input 
                    id="impressionPixel"
                    name="impressionPixel"
                    value={formData.impressionPixel}
                    onChange={handleChange}
                    placeholder="Enter impression pixel URL"
                          />
                        </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clickPixel">Click Pixel</Label>
                  <Input
                    id="clickPixel"
                    name="clickPixel"
                    value={formData.clickPixel}
                    onChange={handleChange}
                    placeholder="Enter click pixel URL"
                  />
                              </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (1-1000)</Label>
                  <Input
                    id="priority"
                    name="priority"
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.priority}
                    onChange={handleChange}
                    placeholder="Enter priority (1-1000)"
              />
            </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isTestPhase"
                      checked={formData.isTestPhase === 1}
                      onCheckedChange={(checked) => handleCheckboxChange('isTestPhase', !!checked)}
                    />
                    <Label htmlFor="isTestPhase" className="text-sm">Test Phase</Label>
                </div>
            
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="status"
                      checked={formData.status === 1}
                      onCheckedChange={(checked) => handleCheckboxChange('status', !!checked)}
                    />
                    <Label htmlFor="status" className="text-sm">Active</Label>
                    </div>
                  </div>
                    </div>
            </TabsContent>
            
            {/* Other tabs content */}
            <TabsContent value="targeting">
              {/* Targeting fields */}
              <div className="text-center text-gray-500 py-8">
                Targeting options coming soon...
              </div>
            </TabsContent>
            
            <TabsContent value="scheduling">
              {/* Scheduling fields */}
              <div className="text-center text-gray-500 py-8">
                Scheduling options coming soon...
                </div>
            </TabsContent>

            <TabsContent value="creative">
                <div className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 bg-gray-50 dark:bg-gray-800/50">
                  {formData.creativeUrl ? (
                    <div className="space-y-4 w-full">
                      <div className="relative mx-auto max-w-xs">
                        <img
                          src={formData.creativeUrl}
                          alt="Ad creative"
                          className="rounded-md max-h-60 mx-auto"
                    />
                  </div>
                      <div className="text-center">
                        <Button
                      type="button"
                          variant="outline"
                          onClick={() => setIsCreativeModalOpen(true)}
                        >
                          Change Creative
                        </Button>
                  </div>
                  </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        No creative uploaded yet
                      </p>
                      <Button
                      type="button"
                        onClick={() => setIsCreativeModalOpen(true)}
                      >
                        Upload Creative
                      </Button>
                  </div>
                  )}
                  </div>
          </div>
            </TabsContent>
            
            <div className="mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
                onClick={() => navigate(-1)}
            disabled={loading}
          >
            Cancel
          </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update' : 'Create'} Ad
              </Button>
            </div>
      </form>
        </Tabs>
      </div>
      
      <CreativeUploadModal
        isOpen={isCreativeModalOpen}
        onClose={() => setIsCreativeModalOpen(false)}
        onUpload={handleCreativeUpload}
        adId={formData.adId}
      />
    </div>
  );
}