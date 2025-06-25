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
    <div className="w-full space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-slate-600 mt-1">Manage and monitor your advertising campaigns</p>
        </div>
        <Button 
          onClick={() => navigate('/campaigns/new')} 
          className="bg-purple-600 hover:bg-purple-700 text-white border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <Card className="p-4 border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Select 
              value={statusFilter} 
              onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value === 'all' ? '' : value }))}
            >
              <SelectTrigger className="w-40 border-slate-300 focus:border-purple-500 focus:ring-purple-500">
                <Filter className="w-4 h-4 mr-2 text-purple-600" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border-slate-200">
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search by brand name"
              className="w-64 border-slate-300 focus:border-purple-500 focus:ring-purple-500"
              value={brandNameFilter}
              onChange={(e) => setSearchParams(prev => ({ ...prev, brandName: e.target.value }))}
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading campaigns...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-red-500">
                    {error}
                  </TableCell>
                </TableRow>
              ) : filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No campaigns found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <TableRow 
                    key={campaign.campaignId}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/campaigns/${campaign.campaignId}/ads`)}
                  >
                    <TableCell className="font-medium">
                      {campaign.brandName}
                    </TableCell>
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Badge className={statusMap[campaign.status as keyof typeof statusMap]?.color || 'bg-gray-100'}>
                          {statusMap[campaign.status as keyof typeof statusMap]?.label || 'Unknown'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(campaign.createdAt)}
                    </TableCell>
                    <TableCell>{campaign.impressionTarget.toLocaleString()}</TableCell>
                    <TableCell>{campaign.clickTarget.toLocaleString()}</TableCell>
                    <TableCell>${parseFloat(campaign.totalBudget).toLocaleString()}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/campaigns/${campaign.campaignId}/edit`);
                              {console.log(campaign.campaignId)}
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloneCampaign(campaign.campaignId);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Clone
                          </DropdownMenuItem>
                          {campaign.status !== 3 && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(campaign.campaignId, 3);
                              }}
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 3 && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(campaign.campaignId, 1);
                              }}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Resume
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