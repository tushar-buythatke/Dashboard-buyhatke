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

export interface CreateAdData {
  campaignId: number;
  slotId: number;
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

export interface UpdateAdData extends CreateAdData {
  adId: number;
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
      return {
        success: result.status === 1,
        data: result.data?.locationDetails,
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
  async uploadCreative(file: File, slotId: number, userId: number = 1): Promise<{ success: boolean; creativeUrl?: string; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('slotId', slotId.toString());

      const response = await fetch(`${API_BASE_URL}/uploadCreative?userId=${userId}`, {
        method: 'POST',
        credentials: 'omit',
        body: formData,
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        creativeUrl: result.data?.creativeUrl,
        message: result.message
      };
    } catch (error) {
      console.error('Error uploading creative:', error);
      return {
        success: false,
        message: 'Failed to upload creative'
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

  // Update existing ad
  async updateAd(adData: UpdateAdData, userId: number = 1): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/update?userId=${userId}`, {
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
      console.error('Error updating ad:', error);
      return {
        success: false,
        message: 'Failed to update ad'
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

  // Get ad names for suggestion
  async getAdNames(campaignId?: number): Promise<{ success: boolean; data?: string[]; message?: string }> {
    try {
      const params = new URLSearchParams();
      if (campaignId) params.append('campaignId', campaignId.toString());
      params.append('status', ''); // Get all ads regardless of status

      const url = `${API_BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.status === 1 && result.data?.adsList) {
        const adNames = result.data.adsList.map((ad: any) => ad.name).filter(Boolean);
        return {
          success: true,
          data: adNames,
          message: 'Ad names fetched successfully'
        };
      }
      
      return {
        success: false,
        message: result.message || 'Failed to fetch ad names'
      };
    } catch (error) {
      console.error('Error fetching ad names:', error);
      return {
        success: false,
        message: 'Failed to fetch ad names'
      };
    }
  }
}

export const adService = new AdService(); 