import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Filter, Play, Pause, Edit, Copy, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Campaign, CampaignResponse } from '@/types';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: '0', label: 'Draft' },
  { value: '1', label: 'Live' },
  { value: '2', label: 'Test' },
  { value: '3', label: 'Paused' },
];

const statusMap = {
  0: { label: 'Draft', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  1: { label: 'Live', color: 'bg-green-100 text-green-800 border-green-200' },
  2: { label: 'Test', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  3: { label: 'Paused', color: 'bg-gray-100 text-gray-800 border-gray-200' },
} as const;

export function CampaignList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const statusFilter = searchParams.get('status') || 'all';
  const brandNameFilter = searchParams.get('brandName') || '';

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, brandNameFilter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns');
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      const result: CampaignResponse = await response.json();
      
      if (result.status === 1 && result.data?.campaignList) {
        setCampaigns(result.data.campaignList);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneCampaign = async (campaignId: number) => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns/clone?userId=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      });

      if (!response.ok) throw new Error('Failed to clone campaign');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success('Campaign cloned successfully');
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error cloning campaign:', error);
      toast.error('Failed to clone campaign');
    }
  };
  const handleStatusChange = async (campaignId: number, newStatus: number) => {
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns/update?userId=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update campaign status');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success(`Campaign ${statusMap[newStatus as keyof typeof statusMap]?.label?.toLowerCase()} successfully`);
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast.error('Failed to update campaign status');
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesStatus = statusFilter === 'all' || campaign.status.toString() === statusFilter;
    const matchesBrand = campaign.brandName.toLowerCase().includes(brandNameFilter.toLowerCase());
    return matchesStatus && matchesBrand;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  console.log("campaign listsdfasdfasdfasdf")
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>

      <div className="relative max-w-7xl mx-auto p-8 space-y-10">
        {/* Enhanced Header with Glass Effect */}
        <div className="backdrop-blur-sm bg-white/30 rounded-2xl border border-white/20 shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                Campaigns
              </h1>
              <p className="text-slate-700 text-lg font-medium">Manage and monitor your advertising campaigns</p>
            </div>
            <Button 
              onClick={() => navigate('/campaigns/new')} 
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white border-0 px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-5 h-5 mr-3" />
              Create Campaign
            </Button>
          </div>
        </div>

      <Card className="backdrop-blur-sm bg-white/40 rounded-2xl border border-white/30 shadow-xl p-8">
        {/* Colored header for the filters section */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 mb-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value === 'all' ? '' : value }))}
                >
                  <SelectTrigger className="w-48 bg-white/90 border-0 shadow-md hover:shadow-lg transition-all duration-200 rounded-lg text-slate-700 font-medium">
                    <Filter className="w-4 h-4 mr-2 text-emerald-600" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="border-white/20 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl">
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value} className="hover:bg-emerald-50">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse animation-delay-500"></div>
                <Input
                  placeholder="Search by brand name"
                  className="w-72 bg-white/90 border-0 shadow-md hover:shadow-lg focus:shadow-xl transition-all duration-200 rounded-lg text-slate-700 font-medium placeholder:text-slate-500"
                  value={brandNameFilter}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, brandName: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
                <TableHead className="text-slate-700 font-semibold">Brand</TableHead>
                <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                <TableHead className="text-slate-700 font-semibold">Created</TableHead>
                <TableHead className="text-slate-700 font-semibold">Impressions</TableHead>
                <TableHead className="text-slate-700 font-semibold">Clicks</TableHead>
                <TableHead className="text-slate-700 font-semibold">Budget</TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex items-center justify-center space-x-2 text-slate-600">
                      <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce animation-delay-200"></div>
                      <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce animation-delay-400"></div>
                      <span className="ml-3 text-lg font-medium">Loading campaigns...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="text-red-500 bg-red-50 rounded-lg p-4 inline-block">
                      <span className="font-medium">{error}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="text-slate-500 bg-slate-50 rounded-lg p-4 inline-block">
                      <span className="font-medium">No campaigns found</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign, index) => (
                  <TableRow 
                    key={campaign.campaignId}
                    className={`cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-md ${
                      index % 2 === 0 ? 'bg-white/50' : 'bg-slate-50/50'
                    } border-slate-100`}
                    onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
                  >
                    <TableCell className="font-semibold text-slate-800">
                      {campaign.brandName}
                    </TableCell>
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Badge className={`${statusMap[campaign.status as keyof typeof statusMap]?.color || 'bg-gray-100'} font-medium shadow-sm`}>
                          {statusMap[campaign.status as keyof typeof statusMap]?.label || 'Unknown'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {formatDate(campaign.createdAt)}
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">{campaign.impressionTarget.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-700 font-medium">{campaign.clickTarget.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-700 font-medium">${parseFloat(campaign.totalBudget).toLocaleString()}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full transition-colors duration-200">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4 text-slate-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl rounded-lg">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/campaigns/${campaign.campaignId}/edit`);
                              {console.log(campaign.campaignId)}
                            }}
                            className="hover:bg-blue-50 transition-colors duration-200"
                          >
                            <Edit className="mr-2 h-4 w-4 text-blue-600" />
                            <span className="text-slate-700 font-medium">Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloneCampaign(campaign.campaignId);
                            }}
                            className="hover:bg-purple-50 transition-colors duration-200"
                          >
                            <Copy className="mr-2 h-4 w-4 text-purple-600" />
                            <span className="text-slate-700 font-medium">Clone</span>
                          </DropdownMenuItem>
                          {campaign.status !== 3 && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(campaign.campaignId, 3);
                              }}
                              className="hover:bg-orange-50 transition-colors duration-200"
                            >
                              <Pause className="mr-2 h-4 w-4 text-orange-600" />
                              <span className="text-slate-700 font-medium">Pause</span>
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 3 && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(campaign.campaignId, 1);
                              }}
                              className="hover:bg-green-50 transition-colors duration-200"
                            >
                              <Play className="mr-2 h-4 w-4 text-green-600" />
                              <span className="text-slate-700 font-medium">Resume</span>
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