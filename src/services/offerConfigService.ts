import { getApiBaseUrl } from '@/config/api';

export interface OfferConfigItem {
  url_reg_arr: string[];
  start: number;
  end: number;
  heading_text?: string;
  image_url: string;
  main_text?: string;
  url: string;
  offer_id: string;
  button_text?: string;
  domain?: string;
  imageSize?: { width: number; height: number };
  bannerSize?: { width: number; height: number };
  bread_arr?: string[];
  price_range?: { min: number; max: number };
  pos: number;
  just_banner: number;
  auto_close_time: number;
  pixel_show?: string;
  pixel_click?: string;
}

export type OfferConfigMap = Record<string, OfferConfigItem[]>;

class OfferConfigService {
  private get baseUrl() {
    return `${getApiBaseUrl()}/offersConfig`;
  }

  async getConfig(): Promise<{ success: boolean; data?: OfferConfigMap; filePath?: string; message?: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      return {
        success: result.status === 1,
        data: result.data?.offersConfig || {},
        filePath: result.data?.filePath,
        message: result.err || result.message,
      };
    } catch (error) {
      console.error('getConfig error:', error);
      return { success: false, message: 'Failed to fetch offers config' };
    }
  }

  async uploadImage(file: File): Promise<{ success: boolean; imageUrl?: string; width?: number; height?: number; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${this.baseUrl}/uploadImage`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        imageUrl: result.data?.image_url,
        width: result.data?.width,
        height: result.data?.height,
        message: result.err || result.message,
      };
    } catch (error) {
      console.error('uploadImage error:', error);
      return { success: false, message: 'Failed to upload image' };
    }
  }

  async createOffer(payload: {
    posList: string[];
    offer: Partial<OfferConfigItem>;
  }): Promise<{ success: boolean; data?: OfferConfigMap; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        data: result.data?.offersConfig,
        message: result.err || result.message,
      };
    } catch (error) {
      console.error('createOffer error:', error);
      return { success: false, message: 'Failed to create offer' };
    }
  }

  async editOffer(payload: {
    posList: string[];
    offer: Partial<OfferConfigItem>;
    previousOfferId: string;
  }): Promise<{ success: boolean; data?: OfferConfigMap; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        data: result.data?.offersConfig,
        message: result.err || result.message,
      };
    } catch (error) {
      console.error('editOffer error:', error);
      return { success: false, message: 'Failed to edit offer' };
    }
  }

  async deleteOffer(offerId: string): Promise<{ success: boolean; data?: OfferConfigMap; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      const result = await response.json();
      return {
        success: result.status === 1,
        data: result.data?.offersConfig,
        message: result.err || result.message,
      };
    } catch (error) {
      console.error('deleteOffer error:', error);
      return { success: false, message: 'Failed to delete offer' };
    }
  }
}

export const offerConfigService = new OfferConfigService();
