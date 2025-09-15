import { useState, useEffect } from 'react';
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
import { getApiBaseUrl } from '@/config/api';

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
              const response = await fetch(`${getApiBaseUrl()}/campaigns?campaignId=${campaignId}`, {
          credentials: 'omit'
        });
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
        ? `${getApiBaseUrl()}/campaigns/update?userId=1`
        : `${getApiBaseUrl()}/campaigns?userId=1`;

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'omit',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg p-4 sm:p-6 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50">
          <Button 
            variant="ghost"
            onClick={() => navigate(-1)}
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 hover:from-blue-200 hover:to-indigo-200 dark:hover:from-blue-800 dark:hover:to-indigo-800 transition-all duration-300 shadow-md"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700 dark:text-blue-300" />
          </Button>
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white tracking-tight bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              {isEditMode ? 'Edit Campaign' : 'Create New Campaign'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base lg:text-lg">
              {isEditMode ? 'Update campaign details' : 'Set up a new advertising campaign'}
            </p>
          </div>
        </div>

        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg shadow-2xl border-0 ring-1 ring-white/30 dark:ring-gray-700/50 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white p-4 sm:p-6 lg:p-8">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-semibold flex items-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 dark:bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <Save className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
              </div>
              Campaign Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 lg:p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8 lg:space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-gray-800 dark:text-gray-200 font-semibold text-base sm:text-lg flex items-center">
                        <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-2"></div>
                        Brand Name
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter brand name" 
                          className="border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-10 sm:h-12 text-base sm:text-lg rounded-xl shadow-sm transition-all duration-300"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-gray-800 dark:text-gray-200 font-semibold text-base sm:text-lg flex items-center">
                        <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full mr-2"></div>
                        Status
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger className="border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-10 sm:h-12 text-base sm:text-lg rounded-xl shadow-sm transition-all duration-300">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 shadow-2xl rounded-xl">
                          <SelectItem value="0" className="hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg m-1 text-gray-900 dark:text-gray-100">
                            <span className="flex items-center text-base sm:text-lg">
                              <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500 mr-3 shadow-sm"></div>
                              Draft
                            </span>
                          </SelectItem>
                          <SelectItem value="1" className="hover:bg-green-50 dark:hover:bg-green-900/20 p-3 rounded-lg m-1 text-gray-900 dark:text-gray-100">
                            <span className="flex items-center text-base sm:text-lg">
                              <div className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-400 mr-3 shadow-sm"></div>
                              Live
                            </span>
                          </SelectItem>
                          <SelectItem value="2" className="hover:bg-blue-50 dark:hover:bg-blue-900/20 p-3 rounded-lg m-1 text-gray-900 dark:text-gray-100">
                            <span className="flex items-center text-base sm:text-lg">
                              <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 mr-3 shadow-sm"></div>
                              Test
                            </span>
                          </SelectItem>
                          <SelectItem value="3" className="hover:bg-orange-50 dark:hover:bg-orange-900/20 p-3 rounded-lg m-1 text-gray-900 dark:text-gray-100">
                            <span className="flex items-center text-base sm:text-lg">
                              <div className="w-3 h-3 rounded-full bg-orange-500 dark:bg-orange-400 mr-3 shadow-sm"></div>
                              Paused
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-500 dark:text-red-400 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="impressionTarget"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-gray-800 dark:text-gray-200 font-semibold text-base sm:text-lg flex items-center">
                        <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full mr-2"></div>
                        Impression Target
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          className="border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-10 sm:h-12 text-base sm:text-lg rounded-xl shadow-sm transition-all duration-300"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clickTarget"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-gray-800 dark:text-gray-200 font-semibold text-base sm:text-lg flex items-center">
                        <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full mr-2"></div>
                        Click Target
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          className="border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-10 sm:h-12 text-base sm:text-lg rounded-xl shadow-sm transition-all duration-300"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem className="space-y-3 lg:col-span-2">
                      <FormLabel className="text-gray-800 dark:text-gray-200 font-semibold text-base sm:text-lg flex items-center">
                        <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full mr-2"></div>
                        Total Budget (₹)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0} 
                          step="0.01" 
                          className="border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-10 sm:h-12 text-base sm:text-lg rounded-xl shadow-sm transition-all duration-300 w-full sm:max-w-md"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-6 sm:pt-8 lg:pt-10 border-t-2 border-gray-100 dark:border-gray-700">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 h-11 sm:h-12 text-base sm:text-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 dark:hover:from-blue-600 dark:hover:via-indigo-600 dark:hover:to-purple-600 text-white shadow-xl hover:shadow-2xl rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none order-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 sm:border-3 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Save className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                      {isEditMode ? 'Update' : 'Create'} Campaign
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/campaigns')}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 h-11 sm:h-12 text-base sm:text-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800 rounded-xl transition-all duration-300 shadow-sm order-2"
                >
                  Cancel
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