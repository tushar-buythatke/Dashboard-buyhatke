// Slot management service
const API_BASE_URL = 'https://ext1.buyhatke.com/buhatkeAdDashboard-test';

export interface Slot {
  slotId: number;
  name: string;
  platform: number;
  width: string | number; // API returns string, but we can accept both
  height: string | number; // API returns string, but we can accept both
  isActive: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSlotPayload {
  name: string;
  platform: number;
  width: number;
  height: number;
}

export interface UpdateSlotPayload {
  slotId: number;
  name?: string;
  platform?: number;
  width?: number;
  height?: number;
  isActive?: number;
}

export interface SlotsResponse {
  success: boolean;
  data: Slot[];
  message?: string;
}

export interface SlotResponse {
  success: boolean;
  data: Slot;
  message?: string;
}

class SlotService {
  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get all slots with optional filters
  async getSlots(slotId?: number, isActive?: number): Promise<SlotsResponse> {
    const params = new URLSearchParams();
    if (slotId !== undefined) params.append('slotId', slotId.toString());
    if (isActive !== undefined) params.append('isActive', isActive.toString());
    
    const url = `${API_BASE_URL}/slots${params.toString() ? `?${params.toString()}` : ''}`;
    
    try {
      const response = await this.makeRequest<any>(url);
      
      // Handle the nested response structure
      let slotsData: Slot[] = [];
      if (response.status === 1 && response.data?.slotList) {
        slotsData = Array.isArray(response.data.slotList) ? response.data.slotList : [];
      } else if (Array.isArray(response.data)) {
        slotsData = response.data;
      } else if (Array.isArray(response)) {
        slotsData = response;
      }
      
      return {
        success: response.status === 1 || response.success === true,
        data: slotsData,
        message: response.message || 'Slots fetched successfully'
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Failed to fetch slots'
      };
    }
  }

  // Create a new slot
  async createSlot(payload: CreateSlotPayload): Promise<SlotResponse> {
    const url = `${API_BASE_URL}/slots`;
    
    try {
      const response = await this.makeRequest<any>(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      return {
        success: true,
        data: response.data || response,
        message: response.message || 'Slot created successfully'
      };
    } catch (error) {
      return {
        success: false,
        data: {} as Slot,
        message: error instanceof Error ? error.message : 'Failed to create slot'
      };
    }
  }

  // Update an existing slot
  async updateSlot(payload: UpdateSlotPayload): Promise<SlotResponse> {
    const url = `${API_BASE_URL}/slots/update`;
    
    try {
      const response = await this.makeRequest<any>(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      return {
        success: true,
        data: response.data || response,
        message: response.message || 'Slot updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        data: {} as Slot,
        message: error instanceof Error ? error.message : 'Failed to update slot'
      };
    }
  }

  // Get platform name
  getPlatformName(platformId: number): string {
    switch (platformId) {
      case 0:
        return 'Web Extension';
      case 1:
        return 'Mobile Extension';
      case 2:
        return 'Desktop Site';
      case 3:
        return 'Mobile Site';
      case 4:
        return 'Mobile App Overlay';
      case 5:
        return 'Mobile App';
      default:
        return 'Unknown Platform';
    }
  }

  // Get platform options for forms
  getPlatformOptions(): { value: number; label: string }[] {
    return [
      { value: 0, label: 'Web Extension' },
      { value: 1, label: 'Mobile Extension' },
      { value: 2, label: 'Desktop Site' },
      { value: 3, label: 'Mobile Site' },
      { value: 4, label: 'Mobile App Overlay' },
      { value: 5, label: 'Mobile App' }
    ];
  }
}

export const slotService = new SlotService();