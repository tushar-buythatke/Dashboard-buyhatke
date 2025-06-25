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
  console.log("comapign page")
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
    <div className="w-full space-y-6 p-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="backGhost"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            {isEditMode ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? 'Update campaign details' : 'Set up a new advertising campaign'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter brand name" {...field} />
                      </FormControl>
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
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Draft</SelectItem>
                          <SelectItem value="1">Live</SelectItem>
                          <SelectItem value="2">Test</SelectItem>
                          <SelectItem value="3">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="impressionTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impression Target</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
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
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Budget ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/campaigns')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
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
  );
}