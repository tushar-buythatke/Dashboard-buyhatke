const API_BASE_URL = 'https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads';

export interface SiteDetail {
  domain: string[];
  name: string;
  image: string;
}

export interface SiteDetails {
  [key: string]: SiteDetail;
}

export interface LocationDetails {
  [locationName: string]: number;
}

export interface CategoryDetail {
  path: string;
  catId: number;
}

export interface CategoryDetails {
  [categoryName: string]: CategoryDetail;
}

export interface CreativeUploadResponse {
  status: number;
  message?: string;
  data?: {
    creativeUrl: string;
  };
}

export interface CreateAdData {
  campaignId: number;
  slotId: number;
  label: string;
  impressionTarget: number;
  clickTarget: number;
  impressionPixel?: string;
  clickPixel?: string;
  categories: { [key: string]: number };
  sites: { [key: string]: number };
  location: { [key: string]: number };
  brandTargets?: { [key: string]: number };
  priceRangeMin?: number;
  priceRangeMax?: number;
  ageRangeMin?: number;
  ageRangeMax?: number;
  priority: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  creativeUrl: string;
  gender?: string;
  status: number;
  isTestPhase: number;
  serveStrategy: number;
}

export interface UpdateAdData {
  campaignId?: number;
  slotId?: number;
  label?: string;
  impressionTarget?: number;
  clickTarget?: number;
  impressionPixel?: string;
  clickPixel?: string;
  categories?: { [key: string]: number };
  sites?: { [key: string]: number };
  location?: { [key: string]: number };
  brandTargets?: { [key: string]: number };
  priceRangeMin?: number;
  priceRangeMax?: number;
  ageRangeMin?: number;
  ageRangeMax?: number;
  priority?: number;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  creativeUrl?: string;
  gender?: string;
  status?: number;
  isTestPhase?: number;
  serveStrategy?: number;
}

class AdService {
  // Get ads with filters
  async getAds(filters?: {
    campaignId?: number;
    slotId?: number;
    adId?: number;
    status?: number;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters?.campaignId) params.append('campaignId', filters.campaignId.toString());
      if (filters?.slotId) params.append('slotId', filters.slotId.toString());
      if (filters?.adId) params.append('adId', filters.adId.toString());
      if (filters?.status !== undefined) params.append('status', filters.status.toString());

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
        data: result.data,
        message: result.message
      };
    } catch (error) {
      console.error('Error fetching ads:', error);
      return {
        success: false,
        message: 'Failed to fetch ads'
      };
    }
  }

  // Get site details for dropdown
  async getSiteDetails(): Promise<{ success: boolean; data?: SiteDetails; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/siteDetails`, {
        method: 'GET',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        data: result.data?.siteDetails,
        message: result.message
      };
    } catch (error) {
      console.error('Error fetching site details:', error);
      return {
        success: false,
        message: 'Failed to fetch site details'
      };
    }
  }

  // Get location details for auto-suggestion
  async getLocationDetails(): Promise<{ success: boolean; data?: LocationDetails; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/locationDetails`, {
        method: 'GET',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      // Convert string values to numbers to match the interface
      let locationDetails: LocationDetails = {};
      if (result.status === 1 && result.data?.locationDetails) {
        locationDetails = Object.entries(result.data.locationDetails).reduce((acc, [locationName, value]) => {
          acc[locationName] = parseInt(value as string, 10) || 0;
          return acc;
        }, {} as LocationDetails);
      }

      return {
        success: result.status === 1,
        data: locationDetails,
        message: result.message
      };
    } catch (error) {
      console.error('Error fetching location details:', error);
      return {
        success: false,
        message: 'Failed to fetch location details'
      };
    }
  }

  // Get category suggestions based on search term
  async getCategoryDetails(searchTerm: string): Promise<{ success: boolean; data?: CategoryDetails; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/categoryDetails?param=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        data: result.data?.categoryDetails,
        message: result.message
      };
    } catch (error) {
      console.error('Error fetching category details:', error);
      return {
        success: false,
        message: 'Failed to fetch category details'
      };
    }
  }

  // Upload creative file
  async uploadCreative(file: File, slotId: number): Promise<{ success: boolean; creativeUrl?: string; message?: string }> {
    const formData = new FormData();
    formData.append('image', file); // Using 'image' key instead of 'file'
    formData.append('slotId', slotId.toString());

    try {
      const response = await fetch(`${API_BASE_URL}/uploadCreative?userId=1`, {
        method: 'POST',
        body: formData,
      });

      const result: CreativeUploadResponse = await response.json();
      
      if (result.status === 1 && result.data?.creativeUrl) {
        return {
          success: true,
          creativeUrl: result.data.creativeUrl,
        };
      } else {
        return {
          success: false,
          message: result.message || 'File upload failed'
        };
      }
    } catch (error) {
      console.error('Error uploading creative:', error);
      return {
        success: false,
        message: 'An unexpected error occurred'
      };
    }
  }

  // Create new ad
  async createAd(adData: CreateAdData, userId: number = 1): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}?userId=${userId}`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adData),
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        data: result.data,
        message: result.message
      };
    } catch (error) {
      console.error('Error creating ad:', error);
      return {
        success: false,
        message: 'Failed to create ad'
      };
    }
  }

  // Update an existing ad
  async updateAd(adId: number, data: UpdateAdData): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/${adId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.status === 1) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to update ad'
        };
      }
    } catch (error) {
      console.error('Error updating ad:', error);
      return {
        success: false,
        message: 'An unexpected error occurred'
      };
    }
  }

  // Clone existing ad
  async cloneAd(adId: number, userId: number = 1): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/clone?userId=${userId}`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adId }),
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        data: result.data,
        message: result.message
      };
    } catch (error) {
      console.error('Error cloning ad:', error);
      return {
        success: false,
        message: 'Failed to clone ad'
      };
    }
  }

  // Get ad labels for suggestion
  async getAdLabels(campaignId: number): Promise<{ success: boolean; data?: Array<{ name: string; label: string }>; message?: string }> {
    try {
      console.log(`🔍 Fetching ad labels for campaign ID: ${campaignId}`);
      
      // Using the correct API endpoint
      const response = await fetch(`${API_BASE_URL}?campaignId=${campaignId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`📊 Raw API response for campaign ${campaignId}:`, result);

      if (result.status === 1 && result.data?.adsList) {
        console.log(`📝 Found ${result.data.adsList.length} ads in campaign ${campaignId}`);
        
        // Extract both name and label for each ad with better error handling
        const adInfo = result.data.adsList
          .map((ad: any, index: number) => {
            console.log(`🔍 Processing ad ${index + 1}:`, ad);
            
            // Use label as name if name is missing (common pattern)
            const name = ad.name || ad.label || `Ad ${ad.adId || index + 1}`;
            const label = ad.label || ad.name || `Label ${ad.adId || index + 1}`;
            
            return {
              name: String(name).trim(),
              label: String(label).trim()
            };
          })
          .filter((info: { name: string; label: string }) => {
            const isValid = info.name && info.name !== '' && info.label && info.label !== '';
            if (!isValid) {
              console.warn(`⚠️ Filtered out invalid ad info:`, info);
            }
            return isValid;
          });
        
        console.log(`✅ Processed ${adInfo.length} valid ad labels for campaign ${campaignId}:`, adInfo);
        
        return {
          success: true,
          data: adInfo,
          message: `Found ${adInfo.length} ads`
        };
      } else {
        const message = result.message || 'No ads found in this campaign';
        console.log(`ℹ️ No ads found for campaign ${campaignId}:`, message);
        
        return {
          success: true, // Changed to true since this is not an error, just no data
          data: [],
          message: message,
        };
      }
    } catch (error) {
      console.error(`❌ Error fetching ad labels for campaign ${campaignId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }
}

export const adService = new AdService(); 