import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VelvetBackButton } from '@/components/ui/velvet-back-button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { buildApiUrl } from '@/config/api';
import { isV2Active } from '@/utils/v2Normalizer';
import { usePermissions } from '@/context/PermissionsContext';

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
  const { canEdit } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Redirect view-only users
  useEffect(() => {
    if (!canEdit) {
      toast.error('You do not have permission to create or edit campaigns.');
      navigate('/campaigns');
    }
  }, [canEdit, navigate]);
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
      const response = await fetch(`${buildApiUrl('/campaigns')}?campaignId=${campaignId}`, {
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
          campaignId: isV2Active() ? campaignId : Number(campaignId),
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
? `${buildApiUrl('/campaigns/update')}?userId=1`
          : `${buildApiUrl('/campaigns')}?userId=1`;

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
    <div className="halo-page">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-4">
          <VelvetBackButton
            label="Back"
            onClick={() => navigate(-1)}
          />
          <div>
            <p className="halo-eyebrow mb-1">Campaigns</p>
            <h2 className="halo-title">
              {isEditMode ? 'Edit campaign' : 'Create new campaign'}
            </h2>
            <p className="halo-subtitle mt-1">
              {isEditMode ? 'Update campaign details' : 'Set up a new advertising campaign'}
            </p>
          </div>
        </div>

        <div className="halo-card halo-rail overflow-hidden">
          <div className="halo-panel-head halo-rail-full">
            <div className="halo-panel-head-title">
              <span className="halo-chip"><Megaphone size={16} strokeWidth={1.75} /></span>
              <h3 className="halo-heading">Campaign information</h3>
            </div>
          </div>
          <div className="p-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="halo-label">Brand name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter brand name"
                            className="halo-field"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[var(--h-coral)] text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="halo-label">Status</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                          disabled={loading}
                        >
                          <FormControl>
                            <SelectTrigger className="halo-field">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">
                              <span className="flex items-center gap-2">
                                <span className="halo-dot" style={{ color: 'var(--h-ink-3)' }} />
                                Draft
                              </span>
                            </SelectItem>
                            <SelectItem value="1">
                              <span className="flex items-center gap-2">
                                <span className="halo-dot halo-dot-live" style={{ color: 'var(--h-mint)' }} />
                                Live
                              </span>
                            </SelectItem>
                            <SelectItem value="2">
                              <span className="flex items-center gap-2">
                                <span className="halo-dot" style={{ color: 'var(--h-cyan)' }} />
                                Test
                              </span>
                            </SelectItem>
                            <SelectItem value="3">
                              <span className="flex items-center gap-2">
                                <span className="halo-dot" style={{ color: 'var(--h-amber)' }} />
                                Paused
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[var(--h-coral)] text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="impressionTarget"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="halo-label">Impression target</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            className="halo-field num"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[var(--h-coral)] text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clickTarget"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="halo-label">Click target</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            className="halo-field num"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[var(--h-coral)] text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalBudget"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 md:col-span-2">
                        <FormLabel className="halo-label">Total budget (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="halo-field num md:max-w-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[var(--h-coral)] text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-5 border-t border-[var(--h-line)]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/campaigns')}
                    disabled={loading}
                    className="btn-halo-ghost order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="btn-halo order-1 sm:order-2"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="halo-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.35)' }} />
                        Saving…
                      </span>
                    ) : (
                      <>
                        <Save size={16} strokeWidth={1.75} />
                        {isEditMode ? 'Update campaign' : 'Create campaign'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
