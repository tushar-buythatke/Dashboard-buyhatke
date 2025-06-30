import React, { useState, useEffect } from 'react';
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
import { categories } from '@/data/mockData';
import { toast } from 'sonner';
import { Slot } from '@/types';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

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
  const { theme } = useTheme();
  
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
  slotId: z.number().min(1, 'Slot selection is required'),
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
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  creativeUrl: z.string().url('Creative URL must be valid'),
  gender: z.string().optional(),
  noGenderSpecificity: z.boolean().optional(),
  noSpecificity: z.boolean().optional(),
  status: z.number().min(0).max(1),
  isTestPhase: z.number().min(0).max(1)
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

export function AdForm() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { adId } = useParams<{ adId?: string }>();
  const isEditMode = !!adId;
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 65]);
  const [priceRangeHighlighted, setPriceRangeHighlighted] = useState(false);

  const form = useForm<AdFormData>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      slotId: 0,
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
      startTime: '09:00',
      endTime: '21:00',
      creativeUrl: '',
      gender: 'Male',
      noGenderSpecificity: false,
      noSpecificity: false,
      status: 1,
      isTestPhase: 0
    }
  });
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if a slot is selected
      if (!selectedSlot) {
        toast.error('Please select an ad slot first to determine required dimensions');
        event.target.value = ''; // Clear the file input
        return;
      }

      const img = new Image();
      img.onload = async () => {
        const requiredWidth = parseFloat(selectedSlot.width);
        const requiredHeight = parseFloat(selectedSlot.height);
        
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
          const result = await adService.uploadCreative(file, selectedSlot.slotId);
          
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
        
        // If editing and we have an adId, set the selected slot
        if (isEditMode && adId && form.getValues('slotId')) {
          const slot = result.data.slotList.find(
            (s: Slot) => s.slotId === form.getValues('slotId')
          );
          if (slot) setSelectedSlot(slot);
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
              `https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads?${params.toString()}`
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
                startTime: adData.startTime ? adData.startTime.slice(0, 5) : '09:00',
                endTime: adData.endTime ? adData.endTime.slice(0, 5) : '21:00',
              });
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

  const onSubmit = async (data: AdFormData) => {
    try {
      setLoading(true);
      const url = isEditMode 
        ? `https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads/update?userId=1`
        : `https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads?userId=1`;

      const method = 'POST';
      const body = {
        ...data,
        campaignId: Number(campaignId),
        ...(isEditMode && { adId: Number(adId) })
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading ad data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Modern Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost"
                onClick={() => navigate(-1)}
                className="h-100 w-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isEditMode ? 'Edit Ad' : 'Create New Ad'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {isEditMode 
                    ? 'Update your ad settings and targeting.' 
                    : 'Set up a new ad for your campaign.'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-lg text-sm font-medium">
                {isEditMode ? 'Edit Mode' : 'Create Mode'}
              </div>
            </div>
          </div>
        </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <Target className="h-4 w-4" />
                  </div>
                  Ad Details
                </h3>
              </div>
              <div className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="slotId"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold text-lg flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Ad Slot
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const slot = slots.find(s => s.slotId === parseInt(value));
                        setSelectedSlot(slot || null);
                        field.onChange(parseInt(value));
                      }}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 bg-white dark:bg-gray-700 h-12 text-lg rounded-xl shadow-sm transition-all duration-300">
                          <SelectValue placeholder="Select a slot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg">
                        {slots.map((slot) => (
                          <SelectItem 
                            key={slot.slotId} 
                            value={slot.slotId.toString()}
                            className="hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {slot.name} ({slot.width} x {slot.height})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-500 font-medium" />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold text-lg flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    Creative
                  </FormLabel>
                  {selectedSlot && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Required: {selectedSlot.width} x {selectedSlot.height}px
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  {previewUrl ? (
                    <div className="relative group bg-gray-100 dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                      <img
                        src={previewUrl}
                        alt="Ad preview"
                        className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'https://example.com/placeholder-moon.png';
                        }}
                      />
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
                        accept="image/*"
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

              <FormField
                control={form.control}
                name="impressionTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Impression Target</FormLabel>
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
                        className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
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
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Click Target</FormLabel>
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
                        className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
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
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Priority Score (0-1000)</FormLabel>
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
                          className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
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
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Status</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
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
                render={({ field, fieldState }) => {
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
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-visible">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white flex items-center">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                      <Settings className="h-4 w-4" />
                    </div>
                    Targeting & Audience
                  </h3>
                </div>
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
                      
                      // Get current form values
                      const formValues = form.getValues();
                      
                      if (checked) {
                        // If enabling master toggle, set default values and highlight price range
                        form.setValue('gender', '', { shouldValidate: true });
                        form.setValue('ageRangeMin', 13, { shouldValidate: true });
                        form.setValue('ageRangeMax', 100, { shouldValidate: true });
                        setAgeRange([13, 100]);
                        setPriceRangeHighlighted(true);
                        
                        // Set no-specificity for all target sections
                        form.setValue('sites', { 'no-specificity': 1 }, { shouldValidate: true });
                        form.setValue('brandTargets', { 'no-specificity': 1 }, { shouldValidate: true });
                        form.setValue('location', { 'no-specificity': 1 }, { shouldValidate: true });
                        form.setValue('categories', { 'no-specificity': 1 }, { shouldValidate: true });
                        
                        // Show highlighting for 3 seconds
                        setTimeout(() => setPriceRangeHighlighted(false), 3000);
                      } else {
                        // If disabling master toggle, reset to defaults
                        form.setValue('gender', 'Male', { shouldValidate: true });
                        form.setValue('ageRangeMin', 18, { shouldValidate: true });
                        form.setValue('ageRangeMax', 65, { shouldValidate: true });
                        setAgeRange([18, 65]);
                        setPriceRangeHighlighted(false);
                        
                        // Reset no-specificity for all target sections
                        form.setValue('sites', {}, { shouldValidate: true });
                        form.setValue('brandTargets', {}, { shouldValidate: true });
                        form.setValue('location', {}, { shouldValidate: true });
                        form.setValue('categories', {}, { shouldValidate: true });
                      }
                    }}
                    label="Master No Specificity"
                    description="Apply broad targeting to all categories. When enabled, focus on price range settings below."
                    size="lg"
                    variant="primary"
                  />
                </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="gender"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Gender Targeting</FormLabel>
                    <div className="space-y-3">
                      <FormControl>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (value === 'N/A') {
                              form.setValue('noGenderSpecificity', true, { shouldValidate: true });
                            }
                          }} 
                          value={field.value}
                          disabled={form.watch('noSpecificity')}
                        >
                          <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                            <SelectValue placeholder={form.watch('noSpecificity') ? "All Genders (No Specificity)" : "Select gender"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            <SelectItem value="N/A">All Genders</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      
                      <ElegantToggle
                        checked={form.watch('noGenderSpecificity') || false}
                        onChange={(checked) => {
                          form.setValue('noGenderSpecificity', checked, { shouldValidate: true });
                          if (checked) {
                            form.setValue('gender', '', { shouldValidate: true });
                          } else {
                            form.setValue('gender', 'Male', { shouldValidate: true });
                          }
                        }}
                        label="No Gender Specificity"
                        description="Target all genders equally"
                        disabled={form.watch('noSpecificity')}
                        variant="success"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold text-lg flex items-center">
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
                className={`space-y-4 p-4 rounded-xl border-2 transition-all duration-500 ${
                  priceRangeHighlighted 
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
                  <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold text-lg flex items-center">
                    <div className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mr-2"></div>
                    Price Range
                  </FormLabel>
                  {priceRangeHighlighted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium"
                    >
                      🎯 Focus Here!
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
                                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
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
                                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
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
                        value={field.value}
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
                      Search and select product categories to target.
                    </FormDescription>
                    <FormControl>
                      <CategoryAutoSuggest
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Search categories..."
                      />
                    </FormControl>
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
                        value={field.value}
                        onChange={field.onChange}
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
                      Search and select locations to target for your ad.
                    </FormDescription>
                    <FormControl>
                      <LocationAutoSuggest
                        value={field.value}
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

          <Card className="backdrop-blur-sm bg-white/40 rounded-2xl border border-white/30 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <Target className="h-3 w-3" />
                </div>
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
            </div>
            </div>
          </Card>

          <Card className="backdrop-blur-sm bg-white/40 rounded-2xl border border-white/30 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <CalendarIcon className="h-3 w-3" />
                </div>
                Scheduling
              </h3>
            </div>
            <div className="p-8 space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <div className="relative">
                      <Input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        className="pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        ref={field.ref}
                        onChange={(e) => {
                          field.onChange(e);
                          handleDateChange('startDate', e.target.value);
                        }}
                        onBlur={field.onBlur}
                        value={field.value}
                        id="start-date-input"
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
                          const input = document.getElementById('start-date-input') as HTMLInputElement;
                          if (input) {
                            // Focus the input first to establish context
                            input.focus();
                            // Small delay to ensure focus is established
                            setTimeout(() => {
                              input.showPicker?.();
                            }, 10);
                          }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors bg-transparent border-none outline-none p-0 m-0 z-10"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
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
                    <div className="relative">
                      <Input 
                        type="date" 
                        min={form.getValues('startDate') || new Date().toISOString().split('T')[0]}
                        className="pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        ref={field.ref}
                        onChange={(e) => {
                          field.onChange(e);
                          handleDateChange('endDate', e.target.value);
                        }}
                        onBlur={field.onBlur}
                        value={field.value}
                        id="end-date-input"
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
                          const input = document.getElementById('end-date-input') as HTMLInputElement;
                          if (input) {
                            // Focus the input first to establish context
                            input.focus();
                            // Small delay to ensure focus is established
                            setTimeout(() => {
                              input.showPicker?.();
                            }, 10);
                          }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors bg-transparent border-none outline-none p-0 m-0 z-10"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
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
            className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="px-6 py-3 h-11 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-8 py-3 h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </span>
              ) : (
                <>
                  {isEditMode ? 'Update Ad' : 'Create Ad'}
                </>
              )}
            </Button>
          </motion.div>
        </form>
              </Form>


      </div>
    </div>
  );
}