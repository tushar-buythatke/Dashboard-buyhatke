const API_BASE_URL = 'https://ext1.buyhatke.com/buhatkeAdDashboard-test';

export interface MetricsPayload {
  from: string;
  to: string;
  /** Campaign filter – single id or array */
  campaignId?: number | number[];
  /** Slot filter */
  slotId?: number | number[];
  /** Marketplace / POS filter */
  siteId?: number | number[];
  /** Ad filter */
  adId?: number | number[];
  /** Interval bucket for trend endpoint → one of "1d", "7d", "30d" */
  interval?: string;
  /** Field for breakdown grouping → gender | age | platform | location */
  by?: string;
}

export interface MetricsResponse {
  status: number;
  message: string;
  data: any;
}

export interface TrendDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  revenue?: number;
}

export interface BreakdownData {
  name: string;
  value: number;
  percentage: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface MetricsData {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  roi: number;
}

class AnalyticsService {
  // Get overall metrics
  async getMetrics(payload: MetricsPayload): Promise<{ success: boolean; data?: MetricsData; message?: string }> {
    try {
      const body = this.preparePayloadForAll(payload);
      const response = await fetch(`${API_BASE_URL}/metrics/all?userId=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result: MetricsResponse = await response.json();
      
      if (result.status === 1 && result.data) {
        // Process the raw data and calculate metrics
        const processedData = this.processMetricsData(result.data);
        return {
          success: true,
          data: processedData,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to fetch metrics'
        };
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return {
        success: false,
        message: 'Failed to fetch metrics'
      };
    }
  }

  // Get trend data over time
  async getTrendData(payload: MetricsPayload): Promise<{ success: boolean; data?: TrendDataPoint[]; message?: string }> {
    try {
      const body = this.preparePayloadForTrend(payload);
      const response = await fetch(`${API_BASE_URL}/metrics/trend?userId=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result: MetricsResponse = await response.json();
      
      if (result.status === 1 && result.data) {
        const processedData = this.processTrendData(result.data);
        return {
          success: true,
          data: processedData,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to fetch trend data'
        };
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
      return {
        success: false,
        message: 'Failed to fetch trend data'
      };
    }
  }

  // Get breakdown data (platform, age, location, etc.)
  async getBreakdownData(payload: MetricsPayload): Promise<{ success: boolean; data?: BreakdownData[]; message?: string }> {
    try {
      const body = this.preparePayloadForBreakdown(payload);
      const response = await fetch(`${API_BASE_URL}/metrics/breakdown?userId=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result: MetricsResponse = await response.json();
      
      if (result.status === 1 && result.data) {
        const processedData = this.processBreakdownData(result.data, payload.by);
        return {
          success: true,
          data: processedData,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to fetch breakdown data'
        };
      }
    } catch (error) {
      console.error('Error fetching breakdown data:', error);
      return {
        success: false,
        message: 'Failed to fetch breakdown data'
      };
    }
  }

  // Get campaigns for dropdown
  async getCampaigns(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns`);
      const result = await response.json();
      
      if (result.status === 1 && result.data?.campaignList) {
        return {
          success: true,
          data: result.data.campaignList,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to fetch campaigns'
        };
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return {
        success: false,
        message: 'Failed to fetch campaigns'
      };
    }
  }

  // Get slots for dropdown
  async getSlots(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/slots`);
      const result = await response.json();
      
      if (result.status === 1 && result.data?.slotList) {
        return {
          success: true,
          data: result.data.slotList,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to fetch slots'
        };
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      return {
        success: false,
        message: 'Failed to fetch slots'
      };
    }
  }

  // Get sites for dropdown (marketplaces/POS)
  async getSites(): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/ads/siteDetails`);
      const result = await response.json();
      
      if (result.status === 1 && result.data?.siteDetails) {
        // Convert siteDetails object to array format for dropdown
        const sitesArray = Object.entries(result.data.siteDetails).map(([id, site]: [string, any]) => ({
          posId: id,
          name: site.name,
          domain: site.domain,
          image: site.image
        }));
        
        return {
          success: true,
          data: sitesArray,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to fetch sites'
        };
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      return {
        success: false,
        message: 'Failed to fetch sites'
      };
    }
  }

  // Fetch tabular aggregated data (location, slot, ad etc.)
  async getTableData(type: 'location' | 'slotId' | 'adId', sortBy: 'impressions' | 'clicks' = 'impressions'): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/metrics/table?userId=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, sortBy })
      });

      const result: MetricsResponse = await response.json();

      if (result.status === 1 && result.data?.tableData) {
        // Convert object to array format for table
        const tableArray = Object.entries(result.data.tableData).map(([key, value]: [string, any]) => ({
          [type]: key,
          impressions: value.impressions || 0,
          clicks: value.clicks || 0,
        }));
        
        return {
          success: true,
          data: tableArray,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to fetch table data'
        };
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
      return {
        success: false,
        message: 'Failed to fetch table data'
      };
    }
  }

  // Process metrics data
  private processMetricsData(rawData: any): MetricsData {
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;

    if (rawData) {
      // Extract conversion count if present
      if (rawData.conversionStats?.conversionCount !== undefined) {
        conversions = Number(rawData.conversionStats.conversionCount) || 0;
      }

      // Aggregate impressions & clicks from adStats (eventType mapping: 0 → impression, 1 → click)
      if (Array.isArray(rawData.adStats)) {
        rawData.adStats.forEach((event: any) => {
          const type = Number(event.eventType);
          if (type === 0) {
            impressions += Number(event.eventCount) || 0;
          } else if (type === 1) {
            clicks += Number(event.eventCount) || 0;
          }
        });
      }
    }

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    // Basic revenue & ROI placeholders – adapt as per business logic
    const revenue = conversions * 100; // ₹100 per conversion (example)
    const adSpend = impressions * 0.1; // ₹0.1 CPM proxy spend (example)
    const roi = adSpend > 0 ? ((revenue - adSpend) / adSpend) * 100 : 0;

    return {
      impressions,
      clicks,
      ctr,
      conversions,
      revenue,
      roi
    };
  }

  // Process trend data
  private processTrendData(rawData: any): TrendDataPoint[] {
    if (!rawData || !rawData.total) return [];

    const { impression = {}, click = {}, conversion = {} } = rawData.total;

    // Collect all unique buckets (dates / weeks / months)
    const buckets = new Set<string>([
      ...Object.keys(impression),
      ...Object.keys(click),
      ...Object.keys(conversion)
    ]);

    const trend: TrendDataPoint[] = [];
    buckets.forEach((bucket) => {
      const impressions = impression[bucket] ?? 0;
      const clicks = click[bucket] ?? 0;
      const conversions = conversion[bucket] ?? 0;

      trend.push({
        date: bucket,
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        revenue: conversions * 100 // example revenue calculation
      });
    });

    // Sort chronologically
    trend.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return a.date.localeCompare(b.date);
      }
      return dateA.getTime() - dateB.getTime();
    });
    return trend;
  }

  // Process breakdown data
  private processBreakdownData(rawData: any, groupBy?: string): BreakdownData[] {
    const map: { [key: string]: { impressions: number; clicks: number; conversions: number } } = {};

    if (Array.isArray(rawData)) {
      rawData.forEach((row: any) => {
        // Determine the grouping key based on the breakdown type
        let key = 'Unknown';
        
        if (groupBy === 'gender' && row.gender !== undefined) {
          key = row.gender;
        } else if (groupBy === 'platform' && row.platform !== undefined) {
          key = row.platform;
        } else if (groupBy === 'location' && row.location !== undefined) {
          key = row.location;
        } else if (groupBy === 'age') {
          // Handle age buckets
          const ageBuckets = [
            row.ageBucket0, row.ageBucket1, row.ageBucket2, row.ageBucket3,
            row.ageBucket4, row.ageBucket5, row.ageBucket6, row.ageBucket7
          ];
          
          ageBuckets.forEach((count, index) => {
            if (count && count > 0) {
              const ageGroup = this.getAgeGroupLabel(index);
              if (!map[ageGroup]) {
                map[ageGroup] = { impressions: 0, clicks: 0, conversions: 0 };
              }
              
              const type = Number(row.eventType);
              if (type === 0) {
                map[ageGroup].impressions += Number(count) || 0;
              } else if (type === 1) {
                map[ageGroup].clicks += Number(count) || 0;
              } else if (type === 2) {
                map[ageGroup].conversions += Number(count) || 0;
              }
            }
          });
          return; // Skip the normal processing for age buckets
        }

        if (!map[key]) {
          map[key] = { impressions: 0, clicks: 0, conversions: 0 };
        }

        const type = Number(row.eventType);
        if (type === 0) {
          map[key].impressions += Number(row.eventCount) || 0;
        } else if (type === 1) {
          map[key].clicks += Number(row.eventCount) || 0;
        } else if (type === 2) {
          map[key].conversions += Number(row.eventCount) || 0;
        }
      });
    }

    const totalImpressions = Object.values(map).reduce((sum, d) => sum + d.impressions, 0);

    return Object.entries(map).map(([name, d]) => ({
      name,
      value: d.impressions,
      percentage: totalImpressions > 0 ? Number(((d.impressions / totalImpressions) * 100).toFixed(2)) : 0,
      impressions: d.impressions,
      clicks: d.clicks,
      conversions: d.conversions
    })).sort((a, b) => b.value - a.value);
  }

  // Helper to get age group labels
  private getAgeGroupLabel(bucketIndex: number): string {
    const ageGroups = ['13-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'NA'];
    return ageGroups[bucketIndex] || 'Unknown';
  }

  // Helper function to get date range based on time period
  getDateRange(timeRange: string): { from: string; to: string } {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: string;

    switch (timeRange) {
      case '1d':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { from, to };
  }

  // Prepare payload for /metrics/all endpoint
  private preparePayloadForAll(payload: MetricsPayload): Record<string, any> {
    const body: any = {
      from: payload.from,
      to: payload.to
    };

    // Add filters if they exist - backend expects arrays
    if (payload.campaignId !== undefined) {
      body.campaignId = Array.isArray(payload.campaignId) ? payload.campaignId : [payload.campaignId];
    }
    
    if (payload.slotId !== undefined) {
      body.slotId = Array.isArray(payload.slotId) ? payload.slotId : [payload.slotId];
    }
    
    if (payload.siteId !== undefined) {
      body.siteId = Array.isArray(payload.siteId) ? payload.siteId : [payload.siteId];
    }
    
    if (payload.adId !== undefined) {
      body.adId = Array.isArray(payload.adId) ? payload.adId : [payload.adId];
    }

    return body;
  }

  // Prepare payload for /metrics/trend endpoint
  private preparePayloadForTrend(payload: MetricsPayload): Record<string, any> {
    const body: any = {
      interval: payload.interval || '7d'
    };

    // Add filters if they exist - backend expects arrays
    if (payload.campaignId !== undefined) {
      body.campaignId = Array.isArray(payload.campaignId) ? payload.campaignId : [payload.campaignId];
    }
    
    if (payload.slotId !== undefined) {
      body.slotId = Array.isArray(payload.slotId) ? payload.slotId : [payload.slotId];
    }
    
    if (payload.siteId !== undefined) {
      body.siteId = Array.isArray(payload.siteId) ? payload.siteId : [payload.siteId];
    }
    
    if (payload.adId !== undefined) {
      body.adId = Array.isArray(payload.adId) ? payload.adId : [payload.adId];
    }

    return body;
  }

  // Prepare payload for /metrics/breakdown endpoint
  private preparePayloadForBreakdown(payload: MetricsPayload): Record<string, any> {
    const body: any = {
      from: payload.from,
      to: payload.to,
      by: payload.by || 'platform'
    };

    // Add filters if they exist - backend expects arrays
    if (payload.campaignId !== undefined) {
      body.campaignId = Array.isArray(payload.campaignId) ? payload.campaignId : [payload.campaignId];
    }
    
    if (payload.slotId !== undefined) {
      body.slotId = Array.isArray(payload.slotId) ? payload.slotId : [payload.slotId];
    }
    
    if (payload.siteId !== undefined) {
      body.siteId = Array.isArray(payload.siteId) ? payload.siteId : [payload.siteId];
    }
    
    if (payload.adId !== undefined) {
      body.adId = Array.isArray(payload.adId) ? payload.adId : [payload.adId];
    }

    return body;
  }
}

export const analyticsService = new AnalyticsService(); 