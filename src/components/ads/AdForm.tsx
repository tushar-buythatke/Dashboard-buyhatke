import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Calendar as CalendarIcon, Clock, Target, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { CreativeUploadModal } from './CreativeUploadModal';
import { categories, brands } from '@/data/mockData';
import { toast } from 'sonner';
import { Slot } from '@/types';

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
  priority: z.number().min(0).max(1000),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  creativeUrl: z.string().url('Creative URL must be valid'),
  gender: z.enum(['Male', 'Female', 'Other']),
  status: z.number().min(0).max(1),
  isTestPhase: z.number().min(0).max(1)
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 65]);

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
      status: 1,
      isTestPhase: 0
    }
  });
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if a slot is selected
      if (!selectedSlot) {
        toast.error('Please select an ad slot first to determine required dimensions');
        event.target.value = ''; // Clear the file input
        return;
      }

      const img = new Image();
      img.onload = () => {
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

        // If dimensions match, proceed with the upload
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          setPreviewUrl(result);
          form.setValue('creativeUrl', result);
          toast.success('Image uploaded successfully!');
        };
        reader.readAsDataURL(file);
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
                // Convert date strings to Date objects if needed
                startDate: adData.startDate ? new Date(adData.startDate) : undefined,
                endDate: adData.endDate ? new Date(adData.endDate) : undefined,
                // Add any other necessary transformations
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

  console.log("ads page")
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

  const handleCreativeUpload = (url: string) => {
    form.setValue('creativeUrl', url);
    setShowUploadModal(false);
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
    
    // Update the input value to only contain valid characters
    e.target.value = numericValue;
    
    // Convert to number and always update the form state
    // Let form validation handle min/max validation and show error messages
    const num = parseFloat(numericValue);
    if (!isNaN(num)) {
      onChange(num);
    }
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

  if (formLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading ad data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>

      <div className="relative max-w-6xl mx-auto p-8 space-y-8">
        {/* Enhanced Header with Glass Effect */}
        <div className="backdrop-blur-sm bg-white/30 rounded-2xl border border-white/20 shadow-xl p-8">
          <div className="flex items-center space-x-6">
            <Button 
              variant="ghost"
              onClick={() => navigate(-1)}
              className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 transition-all duration-300 shadow-md"
            >
              <ArrowLeft className="h-5 w-5 text-blue-700" />
            </Button>
            <div>
              <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                {isEditMode ? 'Edit Ad' : 'Create New Ad'}
              </h2>
              <p className="text-slate-700 text-lg font-medium">
                {isEditMode 
                  ? 'Update your ad settings and targeting.' 
                  : 'Set up a new ad for your campaign.'}
              </p>
            </div>
          </div>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="backdrop-blur-sm bg-white/40 rounded-2xl border border-white/30 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <Target className="h-3 w-3" />
                </div>
                Ad Details
              </h3>
            </div>
            <div className="p-8 space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="slotId"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-slate-800 font-semibold text-lg flex items-center">
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
                        <SelectTrigger className="border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 bg-white h-12 text-lg rounded-xl shadow-sm transition-all duration-300">
                          <SelectValue placeholder="Select a slot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl rounded-lg">
                        {slots.map((slot) => (
                          <SelectItem 
                            key={slot.slotId} 
                            value={slot.slotId.toString()}
                            className="hover:bg-blue-50"
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
                  <FormLabel className="text-slate-800 font-semibold text-lg flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    Creative
                  </FormLabel>
                  {selectedSlot && (
                    <span className="text-sm text-gray-500">
                      Required: {selectedSlot.width} x {selectedSlot.height}px
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  {previewUrl ? (
                    <div className="relative group bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                      <img
                        src={previewUrl}
                        alt="Ad preview"
                        className="h-32 w-32 object-cover rounded-lg border border-white/30"
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
                    <label className="border-2 border-dashed border-blue-300 rounded-xl p-6 flex flex-col items-center justify-center space-y-2 w-40 h-32 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 bg-white/60 backdrop-blur-sm">
                      <Upload className="h-6 w-6 text-blue-500" />
                      <p className="text-sm text-blue-600 text-center font-medium">
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
                    <FormLabel>Impression Target</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="Enter impression target"
                        value={field.value || ''}
                        onChange={(e) => handleNumberInput(e, field.onChange, 1)}
                        onKeyPress={(e) => {
                          // Allow only numbers
                          if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                            e.preventDefault();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clickTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Click Target</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="Enter click target"
                        value={field.value || ''}
                        onChange={(e) => handleNumberInput(e, field.onChange, 1)}
                        onKeyPress={(e) => {
                          // Allow only numbers
                          if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                            e.preventDefault();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority (0-1000)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="Enter priority (0-1000)"
                        value={field.value || ''}
                        onChange={(e) => handleNumberInput(e, field.onChange, 0, 1000)}
                        onKeyPress={(e) => {
                          // Allow only numbers
                          if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                            e.preventDefault();
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Higher priority ads are shown more frequently
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
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Active</SelectItem>
                        <SelectItem value="0">Paused</SelectItem>
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
                            ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-800' 
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                          }
                        `}
                      >
                        <div className={`
                          relative w-12 h-6 rounded-full transition-all duration-200 mr-4
                          ${isTestMode 
                            ? 'bg-emerald-500' 
                            : 'bg-gray-300'
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
                          <FormLabel className={`font-semibold text-base cursor-pointer ${isTestMode ? 'text-emerald-800' : 'text-gray-700'}`}>
                            Test Phase
                          </FormLabel>
                          <FormDescription className={`mt-1 ${isTestMode ? 'text-emerald-600' : 'text-gray-500'}`}>
                            Enable to test this ad without affecting live traffic
                          </FormDescription>
                        </div>
                        {isTestMode && (
                          <div className="ml-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
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

          <Card className="backdrop-blur-sm bg-white/40 rounded-2xl border border-white/30 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <Target className="h-3 w-3" />
                </div>
                Targeting
              </h3>
            </div>
            <div className="p-8 space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel className="text-slate-800 font-semibold flex items-center">
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
                    />
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                        {ageRange[0]} years
                      </span>
                      <span className="text-gray-400 text-xs">-</span>
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

              <div className="space-y-2">
                <FormLabel>Price Range</FormLabel>
                <div className="flex space-x-4">
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
                              // Allow only numbers and decimal point
                              if (!/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                                e.preventDefault();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center">
                    <span className="text-muted-foreground">to</span>
                  </div>
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
                              // Allow only numbers and decimal point
                              if (!/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                                e.preventDefault();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="categories"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel>Categories</FormLabel>
                      <FormDescription>
                        Select the categories this ad targets
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(categories).map(([key, label]) => (
                        <FormField
                          key={key}
                          control={form.control}
                          name="categories"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={key}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <div
                                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                                  onClick={() => {
                                    const current = { ...field.value };
                                    if (current[key]) {
                                      delete current[key];
                                    } else {
                                      current[key] = 1;
                                    }
                                    field.onChange(current);
                                  }}
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    field.value[key]
                                      ? 'bg-blue-500 border-blue-500'
                                      : 'border-gray-300 bg-white hover:border-gray-400'
                                  }`}>
                                    {field.value[key] && (
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                  <FormLabel className="font-normal text-sm text-gray-700 cursor-pointer">
                                    {label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brandTargets"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel>Brands</FormLabel>
                      <FormDescription>
                        Select the brands this ad targets
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(brands).map(([key, label]) => (
                        <FormField
                          key={key}
                          control={form.control}
                          name="brandTargets"
                          render={({ field }) => {
                            const isSelected = !!field.value[key];
                            return (
                              <div
                                key={key}
                                onClick={() => {
                                  const current = { ...field.value };
                                  if (isSelected) {
                                    delete current[key];
                                  } else {
                                    current[key] = 1;
                                  }
                                  field.onChange(current);
                                }}
                                className={`
                                  flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                                  ${isSelected 
                                    ? 'bg-blue-500 border-blue-500 text-white' 
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                  }
                                `}
                              >
                                <div className={`
                                  w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-all duration-200
                                  ${isSelected 
                                    ? 'bg-blue-500 border-blue-500' 
                                    : 'bg-white border-gray-300'
                                  }
                                `}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <span className="font-medium">{label}</span>
                              </div>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel>Locations</FormLabel>
                      <FormDescription>
                        Select the locations this ad targets
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Hyderabad'].map((location) => (
                        <FormField
                          key={location}
                          control={form.control}
                          name="location"
                          render={({ field }) => {
                            const isSelected = !!field.value[location];
                            return (
                              <div
                                key={location}
                                onClick={() => {
                                  const current = { ...field.value };
                                  if (isSelected) {
                                    delete current[location];
                                  } else {
                                    current[location] = 1;
                                  }
                                  field.onChange(current);
                                }}
                                className={`
                                  flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                                  ${isSelected 
                                    ? 'bg-blue-500 border-blue-500 text-white' 
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                  }
                                `}
                              >
                                <div className={`
                                  w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-all duration-200
                                  ${isSelected 
                                    ? 'bg-blue-500 border-blue-500' 
                                    : 'bg-white border-gray-300'
                                  }
                                `}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <span className="font-medium">{location}</span>
                              </div>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            </div>
          </Card>

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

          <div className="flex justify-end space-x-6 pt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="px-8 py-3 h-12 text-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-xl transition-all duration-300 shadow-sm"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-8 py-3 h-12 text-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                  Saving...
                </span>
              ) : (
                <>
                  {isEditMode ? 'Update Ad' : 'Create Ad'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <CreativeUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleCreativeUpload}
        requiredDimensions={selectedSlot ? 
          { width: parseFloat(selectedSlot.width), height: parseFloat(selectedSlot.height) } : undefined
        }
      />
      </div>
    </div>
  );
}