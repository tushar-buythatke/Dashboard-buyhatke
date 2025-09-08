import { Slot } from '@/types';
import { getApiBaseUrl } from '@/config/api';

// Types for the new category format
interface CategoryDetail {
  path: string;
  catId: number;
}

interface CategoryResponse {
  status: number;
  message: string;
  data: {
    categoryDetails: Record<string, CategoryDetail>;
  };
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private readonly CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  private readonly SLOTS_CACHE_KEY = 'buyhatke_slots_cache';
  private readonly SITES_CACHE_KEY = 'buyhatke_sites_cache';
  private readonly CATEGORIES_CACHE_KEY = 'buyhatke_categories_cache';

  constructor() {
    // Clean up expired cache on initialization
    this.cleanExpiredCache();
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    [this.SLOTS_CACHE_KEY, this.SITES_CACHE_KEY, this.CATEGORIES_CACHE_KEY].forEach(key => {
      const cached = this.getFromCache(key);
      if (cached && now - cached.timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(key);
      }
    });
  }

  private getFromCache<T>(key: string): CacheItem<T> | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const parsedCache = JSON.parse(cached) as CacheItem<T>;
      const now = Date.now();
      
      // Check if cache is expired
      if (now - parsedCache.timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      
      return parsedCache;
    } catch (error) {
      console.error(`Error reading cache for ${key}:`, error);
      return null;
    }
  }

  private saveToCache<T>(key: string, data: T): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error(`Error saving cache for ${key}:`, error);
    }
  }

  // Slots Cache Management
  async getSlots(): Promise<Slot[]> {
    const cached = this.getFromCache<Slot[]>(this.SLOTS_CACHE_KEY);
    if (cached) {
      console.debug('✅ Using cached slots data');
      return cached.data;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/slots`);
      if (!response.ok) throw new Error('Failed to fetch slots');
      
      const result = await response.json();
      if (result.status === 1 && result.data?.slotList) {
        this.saveToCache(this.SLOTS_CACHE_KEY, result.data.slotList);
        return result.data.slotList;
      }
      throw new Error('Invalid slots data');
    } catch (error) {
      console.error('Error fetching slots:', error);
      throw error;
    }
  }

  // Sites Cache Management
  async getSites(): Promise<string[]> {
    const cached = this.getFromCache<string[]>(this.SITES_CACHE_KEY);
    if (cached) {
      console.debug('✅ Using cached sites data');
      return cached.data;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/sites`);
      if (!response.ok) throw new Error('Failed to fetch sites');
      
      const result = await response.json();
      if (result.status === 1 && result.data?.siteList) {
        this.saveToCache(this.SITES_CACHE_KEY, result.data.siteList);
        return result.data.siteList;
      }
      throw new Error('Invalid sites data');
    } catch (error) {
      console.error('Error fetching sites:', error);
      throw error;
    }
  }

  // Categories Cache Management with new format
  async getCategories(searchParam?: string): Promise<Record<string, CategoryDetail>> {
    // If no search param, return cached results
    if (!searchParam) {
      const cached = this.getFromCache<Record<string, CategoryDetail>>(this.CATEGORIES_CACHE_KEY);
      if (cached) {
        console.debug('✅ Using cached categories data');
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/ads/categoryDetails?param=${encodeURIComponent(searchParam || '')}`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const result = await response.json() as CategoryResponse;
      if (result.status === 1 && result.data?.categoryDetails) {
        // Only cache if this was a non-search request
        if (!searchParam) {
          this.saveToCache(this.CATEGORIES_CACHE_KEY, result.data.categoryDetails);
        }
        return result.data.categoryDetails;
      }
      throw new Error('Invalid categories data');
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Force refresh all caches
  async refreshAllCaches(): Promise<void> {
    console.debug('🔄 Refreshing all caches...');
    try {
      await Promise.all([
        this.getSlots(),
        this.getSites(),
        this.getCategories()
      ]);
      console.debug('✅ All caches refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing caches:', error);
      throw error;
    }
  }

  // Clear all caches
  clearAllCaches(): void {
    localStorage.removeItem(this.SLOTS_CACHE_KEY);
    localStorage.removeItem(this.SITES_CACHE_KEY);
    localStorage.removeItem(this.CATEGORIES_CACHE_KEY);
    console.debug('🗑️ All caches cleared');
  }

  // Debug info
  getDebugInfo(): any {
    const now = Date.now();
    const getCacheInfo = (key: string) => {
      const cached = localStorage.getItem(key);
      if (!cached) return { exists: false };
      
      try {
        const { timestamp } = JSON.parse(cached);
        const age = now - timestamp;
        const expiresIn = Math.max(0, this.CACHE_DURATION - age);
        
        return {
          exists: true,
          ageMs: age,
          ageMinutes: Math.round(age / 1000 / 60),
          expiresInMs: expiresIn,
          expiresInMinutes: Math.round(expiresIn / 1000 / 60),
          isExpired: age > this.CACHE_DURATION
        };
      } catch (error) {
        return { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    };

    return {
      slots: getCacheInfo(this.SLOTS_CACHE_KEY),
      sites: getCacheInfo(this.SITES_CACHE_KEY),
      categories: getCacheInfo(this.CATEGORIES_CACHE_KEY),
      settings: {
        cacheDurationMs: this.CACHE_DURATION,
        cacheDurationHours: this.CACHE_DURATION / 1000 / 60 / 60
      }
    };
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Global debug functions
if (typeof window !== 'undefined') {
  (window as any).debugCache = () => {
    const debugInfo = cacheService.getDebugInfo();
    console.group('🔍 Cache Debug Information');
    console.log('📦 Slots Cache:', debugInfo.slots);
    console.log('🌐 Sites Cache:', debugInfo.sites);
    console.log('🗂️ Categories Cache:', debugInfo.categories);
    console.log('⚙️ Cache Duration:', debugInfo.settings.cacheDurationHours, 'hours');
    console.log('📊 Full Debug Data:', debugInfo);
    console.groupEnd();
    return debugInfo;
  };

  (window as any).refreshCaches = async () => {
    console.log('🔄 Refreshing all caches...');
    await cacheService.refreshAllCaches();
  };

  (window as any).clearCaches = () => {
    cacheService.clearAllCaches();
    console.log('🗑️ All caches cleared');
  };
} 