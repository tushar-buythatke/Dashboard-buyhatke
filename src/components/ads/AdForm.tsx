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
    <div className="space-y-6 p-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="backGhost"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            {isEditMode ? 'Edit Ad' : 'Create New Ad'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEditMode 
              ? 'Update your ad settings and targeting.' 
              : 'Set up a new ad for your campaign.'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-medium">Ad Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="slotId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad Slot</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const slot = slots.find(s => s.slotId === parseInt(value));
                        setSelectedSlot(slot || null);
                        field.onChange(parseInt(value));
                      }}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a slot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {slots.map((slot) => (
                          <SelectItem 
                            key={slot.slotId} 
                            value={slot.slotId.toString()}
                          >
                            {slot.name} ({slot.width} x {slot.height})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Creative</FormLabel>
                  {selectedSlot && (
                    <span className="text-sm text-gray-500">
                      Required dimensions: {Math.round(selectedSlot.width)} x {Math.round(selectedSlot.height)}px
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  {previewUrl ? (
                    <div className="relative group">
                      <img
                        src={previewUrl}
                        alt="Ad preview"
                        className="h-32 w-32 object-cover rounded-md border"
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
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setPreviewUrl('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center space-y-2 w-32 h-32 cursor-pointer">
                      <Upload className="h-6 w-6 text-gray-400" />
                      <p className="text-sm text-gray-500 text-center">
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
                  <p className="text-sm text-red-500">{form.formState.errors.creativeUrl.message}</p>
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
          </Card>

          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-medium">Targeting</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </Card>

          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-medium">Tracking & Pixels</h3>
            
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
          </Card>

          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-medium">Scheduling</h3>
            
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
          </Card>

          <div className="flex justify-end space-x-4">
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
              {isEditMode ? 'Update Ad' : 'Create Ad'}
            </Button>
          </div>
        </form>
      </Form>

      <CreativeUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleCreativeUpload}
        requiredDimensions={selectedSlot ? 
          { width: selectedSlot.width, height: selectedSlot.height } : undefined
        }
      />
    </div>
  );
}