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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>

      <div className="relative max-w-7xl mx-auto p-8 space-y-8">
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
                {campaign?.brandName || 'Campaign'} Ads
              </h2>
              <p className="text-slate-700 text-lg font-medium">
                Manage ads for {campaign?.brandName || 'this campaign'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center backdrop-blur-sm bg-white/30 rounded-2xl border border-white/20 shadow-lg p-6">
          <div className="flex items-center space-x-6">
            <Input
              placeholder="Search ads..."
              className="w-72 bg-white/90 border-0 shadow-md hover:shadow-lg focus:shadow-xl transition-all duration-200 rounded-lg text-slate-700 font-medium placeholder:text-slate-500"
            />
          </div>
          <Button 
            onClick={() => navigate(`/campaigns/${campaignId}/ads/new`)} 
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white border-0 px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Plus className="w-5 h-5 mr-3" />
            Create Ad
          </Button>
        </div>

      <Card className="backdrop-blur-sm bg-white/40 rounded-2xl border border-white/30 shadow-xl overflow-hidden">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
                <TableHead className="text-slate-700 font-semibold">Creative</TableHead>
                <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                <TableHead className="text-slate-700 font-semibold">Slot</TableHead>
                <TableHead className="text-slate-700 font-semibold">Impressions</TableHead>
                <TableHead className="text-slate-700 font-semibold">Clicks</TableHead>
                <TableHead className="text-slate-700 font-semibold">CTR</TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="text-slate-500 bg-slate-50 rounded-lg p-6 inline-block">
                      <span className="font-medium text-lg">No ads found. Create your first ad to get started.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                ads.map((ad, index) => (
                  <TableRow 
                    key={ad.adId}
                    className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-md ${
                      index % 2 === 0 ? 'bg-white/50' : 'bg-slate-50/50'
                    } border-slate-100`}
                  >
                    <TableCell>
                      <div className="h-16 w-20 flex items-center justify-center overflow-hidden bg-white/60 backdrop-blur-sm rounded-lg border border-white/30 shadow-sm">
                        {ad.creativeUrl ? (
                          <img 
                            src={ad.creativeUrl} 
                            alt="Ad creative" 
                            className="h-full w-full object-contain rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.dataset.fallback) {
                                target.dataset.fallback = 'true';
                                target.src = PLACEHOLDER_IMAGE;
                              }
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-blue-400">
                            <ImageIcon className="h-5 w-5 mb-1" />
                            <span className="text-xs font-medium">No Image</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${ad.status === 1 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'} font-medium shadow-sm`}>
                        {ad.status === 1 ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {ad.slotName && (
                        <div className="flex flex-col">
                          <span className="font-semibold">{ad.slotName}</span>
                          {ad.slotWidth && ad.slotHeight && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full inline-block mt-1 w-fit">
                              {ad.slotWidth} x {ad.slotHeight}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">{ad.impressionTarget.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-700 font-medium">{ad.clickTarget.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-sm font-semibold">
                        {ad.impressionTarget > 0 
                          ? ((ad.clickTarget / ad.impressionTarget) * 100).toFixed(2) + '%' 
                          : '0.00%'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full transition-colors duration-200">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4 text-slate-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl rounded-lg">
                          <DropdownMenuItem
                            onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}/edit`)}
                            className="hover:bg-blue-50 transition-colors duration-200"
                          >
                            <Edit className="mr-2 h-4 w-4 text-blue-600" />
                            <span className="text-slate-700 font-medium">Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCloneAd(ad.adId)}
                            className="hover:bg-purple-50 transition-colors duration-200"
                          >
                            <Copy className="mr-2 h-4 w-4 text-purple-600" />
                            <span className="text-slate-700 font-medium">Clone</span>
                          </DropdownMenuItem>
                          {ad.status === 1 ? (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(ad.adId, 0)}
                              className="hover:bg-orange-50 transition-colors duration-200"
                            >
                              <Pause className="mr-2 h-4 w-4 text-orange-600" />
                              <span className="text-slate-700 font-medium">Pause</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(ad.adId, 1)}
                              className="hover:bg-green-50 transition-colors duration-200"
                            >
                              <Play className="mr-2 h-4 w-4 text-green-600" />
                              <span className="text-slate-700 font-medium">Activate</span>
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
    </div>
  );
}