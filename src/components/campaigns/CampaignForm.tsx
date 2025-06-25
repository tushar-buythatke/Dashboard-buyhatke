import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Campaign } from '@/types';

const campaignFormSchema = z.object({
  brandName: z.string().min(1, 'Brand name is required'),
  impressionTarget: z.coerce.number().min(1, 'Must be at least 1'),
  clickTarget: z.coerce.number().min(1, 'Must be at least 1'),
  totalBudget: z.coerce.number().min(0, 'Must be 0 or more'),
  status: z.coerce.number().min(0).max(3),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export function CampaignForm() {
  const { campaignId } = useParams<{ campaignId?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      brandName: '',
      impressionTarget: 1000,
      clickTarget: 100,
      totalBudget: 0,
      status: 0,
    },
  });

  useEffect(() => {
    if (campaignId) {
      setIsEditMode(true);
      fetchCampaign();
    }
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns?campaignId=${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      
      const result = await response.json();
      if (result.status === 1 && result.data?.campaignList?.[0]) {
        const campaign = result.data.campaignList[0];
        form.reset({
          brandName: campaign.brandName,
          impressionTarget: campaign.impressionTarget,
          clickTarget: campaign.clickTarget,
          totalBudget: parseFloat(campaign.totalBudget),
          status: campaign.status,
        });
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign');
    }
  };

  const onSubmit = async (data: CampaignFormValues) => {
    try {
      setLoading(true);
      
      // Prepare the payload according to the API requirements
      const payload = isEditMode 
        ? {
            campaignId: Number(campaignId),
            brandName: data.brandName,
            impressionTarget: Number(data.impressionTarget),
            clickTarget: Number(data.clickTarget),
            totalBudget: Number(data.totalBudget),
            status: Number(data.status)
          }
        : {
            brandName: data.brandName,
            impressionTarget: Number(data.impressionTarget),
            clickTarget: Number(data.clickTarget),
            totalBudget: Number(data.totalBudget),
            status: Number(data.status)
          };

      // Determine the URL based on whether we're creating or updating
      const url = isEditMode 
        ? 'https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns/update?userId=1'
        : 'https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns?userId=1';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.status === 1) {
        toast.success(`Campaign ${isEditMode ? 'updated' : 'created'} successfully`);
        navigate('/campaigns');
      } else {
        throw new Error(result.message || 'Operation failed');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} campaign:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-5xl mx-auto p-8 space-y-10">
        <div className="flex items-center space-x-6 bg-white/95 backdrop-blur-lg p-6 rounded-2xl shadow-xl border border-white/20">
          <Button 
            variant="ghost"
            onClick={() => navigate(-1)}
            className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 transition-all duration-300 shadow-md"
          >
            <ArrowLeft className="h-5 w-5 text-blue-700" />
          </Button>
          <div>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
              {isEditMode ? 'Edit Campaign' : 'Create New Campaign'}
            </h2>
            <p className="text-gray-600 mt-2 text-lg">
              {isEditMode ? 'Update campaign details' : 'Set up a new advertising campaign'}
            </p>
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-lg shadow-2xl border-0 ring-1 ring-white/30 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
            <CardTitle className="text-2xl font-semibold flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <Save className="h-4 w-4" />
              </div>
              Campaign Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-gray-800 font-semibold text-lg flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Brand Name
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter brand name" 
                          className="border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 bg-white h-12 text-lg rounded-xl shadow-sm transition-all duration-300"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-gray-800 font-semibold text-lg flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Status
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger className="border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 bg-white h-12 text-lg rounded-xl shadow-sm transition-all duration-300">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white border-2 border-gray-200 shadow-2xl rounded-xl">
                          <SelectItem value="0" className="hover:bg-gray-50 p-3 rounded-lg m-1">
                            <span className="flex items-center text-lg">
                              <div className="w-3 h-3 rounded-full bg-gray-400 mr-3 shadow-sm"></div>
                              Draft
                            </span>
                          </SelectItem>
                          <SelectItem value="1" className="hover:bg-green-50 p-3 rounded-lg m-1">
                            <span className="flex items-center text-lg">
                              <div className="w-3 h-3 rounded-full bg-green-500 mr-3 shadow-sm"></div>
                              Live
                            </span>
                          </SelectItem>
                          <SelectItem value="2" className="hover:bg-blue-50 p-3 rounded-lg m-1">
                            <span className="flex items-center text-lg">
                              <div className="w-3 h-3 rounded-full bg-blue-500 mr-3 shadow-sm"></div>
                              Test
                            </span>
                          </SelectItem>
                          <SelectItem value="3" className="hover:bg-orange-50 p-3 rounded-lg m-1">
                            <span className="flex items-center text-lg">
                              <div className="w-3 h-3 rounded-full bg-orange-500 mr-3 shadow-sm"></div>
                              Paused
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-500 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="impressionTarget"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-gray-800 font-semibold text-lg flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                        Impression Target
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          className="border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 bg-white h-12 text-lg rounded-xl shadow-sm transition-all duration-300"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clickTarget"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-gray-800 font-semibold text-lg flex items-center">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                        Click Target
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          className="border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 bg-white h-12 text-lg rounded-xl shadow-sm transition-all duration-300"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem className="space-y-3 md:col-span-2">
                      <FormLabel className="text-gray-800 font-semibold text-lg flex items-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                        Total Budget (₹)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0} 
                          step="0.01" 
                          className="border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 bg-white h-12 text-lg rounded-xl shadow-sm transition-all duration-300 max-w-md"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-6 pt-10 border-t-2 border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/campaigns')}
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
                      <Save className="mr-3 h-5 w-5" />
                      {isEditMode ? 'Update' : 'Create'} Campaign
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}