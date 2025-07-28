const API_BASE_URL = 'https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns';

export interface Campaign {
  id: number;
  campaignId: number;
  name: string;
  status: number;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  // Add other campaign fields as needed
}

export interface UpdateCampaignData {
  name?: string;
  description?: string;
  status?: number;
  // Add other updatable fields as needed
}

class CampaignService {
  // Get campaigns with filters
  async getCampaigns(filters?: {
    campaignId?: number;
    status?: number;
    createdBy?: number;
  }): Promise<{ success: boolean; data?: Campaign[]; message?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters?.campaignId) params.append('campaignId', filters.campaignId.toString());
      if (filters?.status !== undefined) params.append('status', filters.status.toString());
      if (filters?.createdBy) params.append('createdBy', filters.createdBy.toString());

      const url = `${API_BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        data: result.data?.campaignList,
        message: result.message
      };
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return {
        success: false,
        message: 'Failed to fetch campaigns'
      };
    }
  }

  // Create a new campaign
  async createCampaign(campaignData: CreateCampaignData, userId: number = 1): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      console.log(`🚀 Creating new campaign...`);
      
      const response = await fetch(`${API_BASE_URL}?userId=${userId}`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData)
      });

      const result = await response.json();
      
      if (result.status === 1) {
        console.log(`✅ Campaign created successfully`);
        return {
          success: true,
          data: result.data,
          message: result.message || 'Campaign created successfully'
        };
      } else {
        console.error(`❌ Failed to create campaign:`, result.message);
        return {
          success: false,
          message: result.message || 'Failed to create campaign'
        };
      }
    } catch (error) {
      console.error(`❌ Error creating campaign:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred while creating campaign'
      };
    }
  }

  // Update a campaign
  async updateCampaign(campaignId: number, data: UpdateCampaignData, userId: number = 1): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      console.log(`📝 Updating campaign ${campaignId}...`);
      
      if (!campaignId || isNaN(campaignId) || campaignId < 0) {
        return {
          success: false,
          message: 'Invalid campaign ID'
        };
      }

      const response = await fetch(`${API_BASE_URL}?userId=${userId}`, {
        method: 'PUT',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          ...data
        })
      });

      const result = await response.json();
      
      if (result.status === 1) {
        console.log(`✅ Campaign ${campaignId} updated successfully`);
        return {
          success: true,
          data: result.data,
          message: result.message || 'Campaign updated successfully'
        };
      } else {
        console.error(`❌ Failed to update campaign ${campaignId}:`, result.message);
        return {
          success: false,
          message: result.message || 'Failed to update campaign'
        };
      }
    } catch (error) {
      console.error(`❌ Error updating campaign ${campaignId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred while updating campaign'
      };
    }
  }

  // Archive a campaign (and its associated ads)
  async archiveCampaign(campaignId: number, userId: number = 1): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      console.log(`📦 Archiving campaign ${campaignId}...`);
      
      if (!campaignId || isNaN(campaignId) || campaignId < 0) {
        return {
          success: false,
          message: 'Invalid campaign ID'
        };
      }

      const response = await fetch(`${API_BASE_URL}/archive?userId=${userId}`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId })
      });

      const result = await response.json();
      
      if (result.status === 1) {
        console.log(`✅ Campaign ${campaignId} and associated ads archived successfully`);
        return {
          success: true,
          data: result.data,
          message: result.message || 'Campaign and associated ads archived successfully'
        };
      } else {
        console.error(`❌ Failed to archive campaign ${campaignId}:`, result.message);
        return {
          success: false,
          message: result.message || 'Campaign archival failed'
        };
      }
    } catch (error) {
      console.error(`❌ Error archiving campaign ${campaignId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred while archiving campaign'
      };
    }
  }

  // Clone a campaign
  async cloneCampaign(campaignId: number, userId: number = 1): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      console.log(`📋 Cloning campaign ${campaignId}...`);
      
      if (!campaignId || isNaN(campaignId) || campaignId < 0) {
        return {
          success: false,
          message: 'Invalid campaign ID'
        };
      }

      const response = await fetch(`${API_BASE_URL}/clone?userId=${userId}`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId })
      });

      const result = await response.json();
      
      if (result.status === 1) {
        console.log(`✅ Campaign ${campaignId} cloned successfully`);
        return {
          success: true,
          data: result.data,
          message: result.message || 'Campaign cloned successfully'
        };
      } else {
        console.error(`❌ Failed to clone campaign ${campaignId}:`, result.message);
        return {
          success: false,
          message: result.message || 'Failed to clone campaign'
        };
      }
    } catch (error) {
      console.error(`❌ Error cloning campaign ${campaignId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred while cloning campaign'
      };
    }
  }
}

export const campaignService = new CampaignService();
