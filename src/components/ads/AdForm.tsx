import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Calendar as CalendarIcon, Target, Star, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { CreativeUploadModal } from './CreativeUploadModal';
import { categories, brands } from '@/data/mockData';
import { toast } from 'sonner';
import { Ad, Slot } from '@/types';

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
  ageRangeMax: z.number().max(100, 'Maximum age must be 100 or less'),
  priority: z.number().min(0).max(1000),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  creativeUrl: z.string().url('Creative URL must be valid'),
  gender: z.enum(['Male', 'Female', 'Other']),
  status: z.number().min(0).max(1),
  isTestPhase: z.number().min(0).max(1)
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
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        form.setValue('creativeUrl', result);
      };
      reader.readAsDataURL(file);
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
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                        type="number" 
                        min="0" 
                        max="1000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value === 1}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Test Phase</FormLabel>
                      <FormDescription>
                        Enable to test this ad without affecting live traffic
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
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

              <div className="space-y-2">
                <FormLabel>Age Range</FormLabel>
                <div className="flex space-x-4">
                  <FormField
                    control={form.control}
                    name="ageRangeMin"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            type="number" 
                            min="13" 
                            max="100"
                            placeholder="Min age"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
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
                    name="ageRangeMax"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            type="number" 
                            min="13" 
                            max="100"
                            placeholder="Max age"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                            type="number" 
                            min="0"
                            placeholder="Min price"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
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
                            type="number" 
                            min="1"
                            placeholder="Max price"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
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
                                <FormControl>
                                  <Checkbox
                                    checked={!!field.value[key]}
                                    onCheckedChange={(checked) => {
                                      const current = { ...field.value };
                                      if (checked) {
                                        current[key] = 1;
                                      } else {
                                        delete current[key];
                                      }
                                      field.onChange(current);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {label}
                                </FormLabel>
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
                            return (
                              <FormItem
                                key={key}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={!!field.value[key]}
                                    onCheckedChange={(checked) => {
                                      const current = { ...field.value };
                                      if (checked) {
                                        current[key] = 1;
                                      } else {
                                        delete current[key];
                                      }
                                      field.onChange(current);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {label}
                                </FormLabel>
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
                name="location"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel>Locations</FormLabel>
                      <FormDescription>
                        Select the locations this ad targets
                      </FormDescription>
                    </div>
                    <div className="space-y-2">
                      {['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Hyderabad'].map((location) => (
                        <FormField
                          key={location}
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`location-${location}`}
                                checked={!!field.value[location]}
                                onCheckedChange={(checked) => {
                                  const current = { ...field.value };
                                  if (checked) {
                                    current[location] = 1;
                                  } else {
                                    delete current[location];
                                  }
                                  field.onChange(current);
                                }}
                              />
                              <label
                                htmlFor={`location-${location}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {location}
                              </label>
                            </div>
                          )}
                        />
                      ))}
                    </div>
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
                        className="pr-10"
                        ref={field.ref}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        value={field.value}
                        id="start-date-input"
                      />
                      <label 
                        htmlFor="start-date-input" 
                        className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 cursor-pointer"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </label>
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
                        className="pr-10"
                        ref={field.ref}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        value={field.value}
                        id="end-date-input"
                      />
                      <label 
                        htmlFor="end-date-input" 
                        className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 cursor-pointer"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </label>
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
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field}
                      />
                    </FormControl>
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
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field}
                      />
                    </FormControl>
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