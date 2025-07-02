const API_BASE_URL = 'https://ext1.buyhatke.com/buhatkeAdDashboard-test';

export interface MetricsPayload {
  from: string;
  to: string;
  campaignId?: number;
  adId?: number;
  by?: string; // for breakdown endpoint: platform, age, location, etc.
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
      const response = await fetch(`${API_BASE_URL}/metrics/all?userId=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
      const response = await fetch(`${API_BASE_URL}/metrics/trend?userId=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
      const response = await fetch(`${API_BASE_URL}/metrics/breakdown?userId=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result: MetricsResponse = await response.json();
      
      if (result.status === 1 && result.data) {
        const processedData = this.processBreakdownData(result.data);
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

  // Process raw metrics data and calculate derived metrics
  private processMetricsData(rawData: any): MetricsData {
    // Assuming the API returns events with eventType: 0 for impressions, 1 for clicks
    let impressions = 0;
    let clicks = 0;
    let conversions = 0; // You might need to define how conversions are calculated
    
    if (Array.isArray(rawData)) {
      rawData.forEach((event: any) => {
        if (event.eventType === 0) {
          impressions += event.count || 1;
        } else if (event.eventType === 1) {
          clicks += event.count || 1;
        }
        // Add logic for conversions based on your data structure
      });
    }

    // Calculate derived metrics
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const revenue = conversions * 100; // Assuming ₹100 per conversion, adjust as needed
    const roi = revenue > 0 ? ((revenue - (impressions * 0.1)) / (impressions * 0.1)) * 100 : 0; // Example calculation

    return {
      impressions,
      clicks,
      ctr,
      conversions,
      revenue,
      roi
    };
  }

  // Process trend data for charts
  private processTrendData(rawData: any): TrendDataPoint[] {
    // Group data by date and calculate metrics
    const groupedData: { [date: string]: { impressions: number; clicks: number; conversions: number } } = {};
    
    if (Array.isArray(rawData)) {
      rawData.forEach((event: any) => {
        const date = event.date || event.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];
        
        if (!groupedData[date]) {
          groupedData[date] = { impressions: 0, clicks: 0, conversions: 0 };
        }
        
        if (event.eventType === 0) {
          groupedData[date].impressions += event.count || 1;
        } else if (event.eventType === 1) {
          groupedData[date].clicks += event.count || 1;
        }
        // Add conversion logic based on your data structure
      });
    }

    // Convert to array format and calculate derived metrics
    return Object.entries(groupedData).map(([date, data]) => ({
      date,
      impressions: data.impressions,
      clicks: data.clicks,
      conversions: data.conversions,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      conversionRate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0,
      revenue: data.conversions * 100 // Adjust based on your revenue calculation
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Process breakdown data for pie charts
  private processBreakdownData(rawData: any): BreakdownData[] {
    const breakdownMap: { [key: string]: { impressions: number; clicks: number; conversions: number } } = {};
    
    if (Array.isArray(rawData)) {
      rawData.forEach((event: any) => {
        const key = event.platform || event.age || event.location || event.category || 'Unknown';
        
        if (!breakdownMap[key]) {
          breakdownMap[key] = { impressions: 0, clicks: 0, conversions: 0 };
        }
        
        if (event.eventType === 0) {
          breakdownMap[key].impressions += event.count || 1;
        } else if (event.eventType === 1) {
          breakdownMap[key].clicks += event.count || 1;
        }
      });
    }

    const totalImpressions = Object.values(breakdownMap).reduce((sum, data) => sum + data.impressions, 0);
    
    return Object.entries(breakdownMap).map(([name, data]) => ({
      name,
      value: data.impressions,
      percentage: totalImpressions > 0 ? (data.impressions / totalImpressions) * 100 : 0,
      impressions: data.impressions,
      clicks: data.clicks,
      conversions: data.conversions
    })).sort((a, b) => b.value - a.value);
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
}

export const analyticsService = new AnalyticsService(); 