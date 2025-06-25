import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Edit, Copy, MoreHorizontal, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Ad, Slot, SlotListResponse } from '@/types';

// Placeholder image URL
const PLACEHOLDER_IMAGE = 'https://eos.org/wp-content/uploads/2023/10/moon-2.jpg';

export function AdList() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Record<number, Slot>>({});
  const [campaign, setCampaign] = useState<{ brandName?: string }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (campaignId) {
        try {
          await Promise.all([
            fetchCampaign(),
            fetchSlots(),
            fetchAds()
          ]);
        } catch (error) {
          console.error('Error fetching data:', error);
          setError('Failed to load data. Please try again.');
        }
      } else {
        setError('No campaign ID provided');
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId]);

  const fetchSlots = async () => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/slots');
      if (!response.ok) throw new Error('Failed to fetch slots');
      
      const result: SlotListResponse = await response.json();
      if (result.status === 1 && result.data?.slotList) {
        const slotsMap = result.data.slotList.reduce((acc, slot) => ({
          ...acc,
          [slot.slotId]: slot
        }), {} as Record<number, Slot>);
        setSlots(slotsMap);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to load slot information');
    }
  };

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns?campaignId=${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      
      const result = await response.json();
      if (result.status === 1 && result.data?.campaignList?.[0]) {
        setCampaign(result.data.campaignList[0]);
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
    }
  };
  console.log("im herererere")
  const fetchAds = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams({
        campaignId: campaignId || '',
        slotId: '',
        adId: '',
        status: ''
      });

      const response = await fetch(
        `https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch ads');
      }
      
      const result = await response.json();
      
      if (result.status === 1 && result.data?.adsList) {
        // Enrich ads with slot information
        const enrichedAds = result.data.adsList.map((ad: Ad) => {
          const slot = slots[ad.slotId];
          return {
            ...ad,
            slotName: slot?.name || `Slot-${ad.slotId}`,
            slotWidth: slot?.width,
            slotHeight: slot?.height
          };
        });
        setAds(enrichedAds);
      } else {
        setAds([]);
        setError('No ads found for this campaign');
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
      setError('Failed to load ads. Please try again.');
      toast.error('Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneAd = async (adId: number) => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads/clone?userId=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId })
      });

      if (!response.ok) throw new Error('Failed to clone ad');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success('Ad cloned successfully');
        fetchAds();
      }
    } catch (error) {
      console.error('Error cloning ad:', error);
      toast.error('Failed to clone ad');
    }
  };

  const handleStatusChange = async (adId: number, newStatus: 0 | 1) => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads/update?userId=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update ad status');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success(`Ad ${newStatus === 1 ? 'activated' : 'paused'} successfully`);
        fetchAds();
      }
    } catch (error) {
      console.error('Error updating ad status:', error);
      toast.error('Failed to update ad status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

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
            {campaign?.brandName || 'Campaign'} Ads
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage ads for {campaign?.brandName || 'this campaign'}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search ads..."
            className="w-64"
            // Add search functionality if needed
          />
        </div>
        <Button 
          onClick={() => navigate(`/campaigns/${campaignId}/ads/new`)} 
          className="bg-purple-600 hover:bg-purple-700 text-white border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Ad
        </Button>
      </div>

      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creative</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No ads found. Create your first ad to get started.
                  </TableCell>
                </TableRow>
              ) : (
                ads.map((ad) => (
                  <TableRow key={ad.adId}>
                    <TableCell>
                      <div className="h-16 w-20 flex items-center justify-center overflow-hidden bg-gray-50 rounded">
                        {ad.creativeUrl ? (
                          <img 
                            src={ad.creativeUrl} 
                            alt="Ad creative" 
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.dataset.fallback) {
                                target.dataset.fallback = 'true';
                                target.src = PLACEHOLDER_IMAGE;
                              }
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <ImageIcon className="h-5 w-5 mb-1" />
                            <span className="text-xs">No Image</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ad.status === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {ad.status === 1 ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ad.slotName && (
                        <div className="flex flex-col">
                          <span>{ad.slotName}</span>
                          {ad.slotWidth && ad.slotHeight && (
                            <span className="text-xs text-gray-500">
                              {ad.slotWidth} x {ad.slotHeight}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{ad.impressionTarget.toLocaleString()}</TableCell>
                    <TableCell>{ad.clickTarget.toLocaleString()}</TableCell>
                    <TableCell>
                      {ad.impressionTarget > 0 
                        ? ((ad.clickTarget / ad.impressionTarget) * 100).toFixed(2) + '%' 
                        : '0.00%'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCloneAd(ad.adId)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Clone
                          </DropdownMenuItem>
                          {ad.status === 1 ? (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(ad.adId, 0)}
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(ad.adId, 1)}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}