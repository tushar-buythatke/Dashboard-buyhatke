import { getApiBaseUrl } from '@/config/api';

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
      const response = await fetch(`${getApiBaseUrl()}/metrics/all?userId=1`, {
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
      console.log('📈 Making trend API call with payload:', body);
      
      const response = await fetch(`${getApiBaseUrl()}/metrics/trend?userId=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result: MetricsResponse = await response.json();
      console.log('📈 Trend API raw response:', result);
      
      if (result.status === 1 && result.data) {
        const processedData = this.processTrendData(result.data, payload.interval);
        console.log('📊 Processed trend data:', processedData);
        return {
          success: true,
          data: processedData,
          message: result.message
        };
      } else {
        console.error('❌ Trend API failed:', result);
        return {
          success: false,
          message: result.message || 'Failed to fetch trend data'
        };
      }
    } catch (error) {
      console.error('❌ Error fetching trend data:', error);
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
      console.log(`Making breakdown API call for ${payload.by}:`, body);
      
      const response = await fetch(`${getApiBaseUrl()}/metrics/breakdown?userId=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result: MetricsResponse = await response.json();
      console.log(`Breakdown API response for ${payload.by}:`, result);
      
      if (result.status === 1 && result.data) {
        const processedData = this.processBreakdownData(result.data, payload.by);
        return {
          success: true,
          data: processedData,
          message: result.message
        };
      } else {
        console.error(`Breakdown API failed for ${payload.by}:`, result);
        return {
          success: false,
          message: result.message || 'Failed to fetch breakdown data'
        };
      }
    } catch (error) {
      console.error(`Error fetching breakdown data for ${payload.by}:`, error);
      return {
        success: false,
        message: 'Failed to fetch breakdown data'
      };
    }
  }

  // Get campaigns for dropdown
  async getCampaigns(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/campaigns`);
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
      const response = await fetch(`${getApiBaseUrl()}/slots`);
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
      const response = await fetch(`${getApiBaseUrl()}/ads/siteDetails`);
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
      const response = await fetch(`${getApiBaseUrl()}/metrics/table?userId=1`, {
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

  // Get all metrics data (simplified endpoint)
  async getAllMetrics(): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/metrics/all?userId=1`);
      const result = await response.json();
      
      if (result.status === 1 && result.data) {
        // Process the data to extract metrics
        let impressions = 0;
        let clicks = 0;
        const conversions = result.data.conversionStats?.conversionCount || 0;
        
        // Extract impressions and clicks from adStats
        if (Array.isArray(result.data.adStats)) {
          result.data.adStats.forEach((stat: any) => {
            if (stat.eventType === "0") {
              impressions = Number(stat.eventCount) || 0;
            } else if (stat.eventType === "1") {
              clicks = Number(stat.eventCount) || 0;
            }
          });
        }
        
        // Calculate derived metrics
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
        const revenue = conversions * 100; // Example: ₹100 per conversion
        const adSpend = impressions * 0.1; // Example: ₹0.1 CPM
        const roi = adSpend > 0 ? ((revenue - adSpend) / adSpend) * 100 : 0;
        
        const processedData = {
          impressions,
          clicks,
          ctr,
          conversions,
          revenue,
          roi
        };
        
        return {
          success: true,
          data: processedData,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to fetch all metrics'
        };
      }
    } catch (error) {
      console.error('Error fetching all metrics:', error);
      return {
        success: false,
        message: 'Failed to fetch all metrics'
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
  private processTrendData(rawData: any, interval?: string): TrendDataPoint[] {
    if (!rawData || !rawData.total) return [];

    const { impression = {}, click = {}, conversion = {} } = rawData.total;

    // Collect all unique buckets (dates / weeks / months)
    const buckets = new Set<string>([
      ...Object.keys(impression),
      ...Object.keys(click),
      ...Object.keys(conversion)
    ]);

    console.log('📅 Raw date buckets from API:', Array.from(buckets));
    console.log('📊 Processing with interval:', interval);

    const trend: TrendDataPoint[] = [];
    buckets.forEach((bucket) => {
      const impressions = impression[bucket] ?? 0;
      const clicks = click[bucket] ?? 0;
      const conversions = conversion[bucket] ?? 0;

      // Normalize the date/bucket format for consistent parsing
      const normalizedDate = this.normalizeDateBucket(bucket);
      console.log(`📅 Normalized bucket '${bucket}' to '${normalizedDate}'`);

      trend.push({
        date: normalizedDate,
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        revenue: conversions * 100 // example revenue calculation
      });
    });

    // Sort chronologically using normalized dates
    trend.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return a.date.localeCompare(b.date);
      }
      return dateA.getTime() - dateB.getTime();
    });

    // Apply client-side grouping if needed based on interval
    const groupedTrend = this.forceDataGrouping(trend, interval);
    
    console.log('📊 Final processed trend data:', groupedTrend);
    return groupedTrend;
  }

  // Force client-side data grouping - always group to ensure consistency
  private forceDataGrouping(data: TrendDataPoint[], interval?: string): TrendDataPoint[] {
    if (!interval || !data.length) return data;

    console.log(`� Forcing ${interval} grouping on ${data.length} data points`);

    const grouped = new Map<string, TrendDataPoint>();

    data.forEach(point => {
      const date = new Date(point.date);
      if (isNaN(date.getTime())) {
        console.warn('Skipping invalid date:', point.date);
        return;
      }

      let groupKey: string;

      switch (interval) {
        case '1d': // Daily - keep individual days
          groupKey = point.date;
          break;
        
        case '7d': // Weekly - group by week starting Sunday
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          groupKey = weekStart.toISOString().split('T')[0];
          break;
        
        case '30d': // Monthly - group by first day of month
          const year = date.getFullYear();
          const month = date.getMonth();
          const monthStart = new Date(year, month, 1);
          groupKey = monthStart.toISOString().split('T')[0];
          break;
        
        default:
          groupKey = point.date;
      }

      if (grouped.has(groupKey)) {
        // Aggregate the data
        const existing = grouped.get(groupKey)!;
        existing.impressions += point.impressions;
        existing.clicks += point.clicks;
        existing.conversions += point.conversions;
        existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.conversionRate = existing.clicks > 0 ? (existing.conversions / existing.clicks) * 100 : 0;
        existing.revenue = (existing.revenue || 0) + (point.revenue || 0);
      } else {
        // Create new group
        grouped.set(groupKey, {
          date: groupKey,
          impressions: point.impressions,
          clicks: point.clicks,
          conversions: point.conversions,
          ctr: point.impressions > 0 ? (point.clicks / point.impressions) * 100 : 0,
          conversionRate: point.clicks > 0 ? (point.conversions / point.clicks) * 100 : 0,
          revenue: point.revenue || 0
        });
      }
    });

    // Convert back to array and sort
    const result = Array.from(grouped.values()).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    console.log(`📊 Forced ${interval} grouping:`, {
      originalDataPoints: data.length,
      groupedDataPoints: result.length,
      interval,
      sampleOriginalDates: data.slice(0, 5).map(d => d.date),
      sampleGroupedDates: result.slice(0, 5).map(d => d.date),
      groupingKeys: Array.from(grouped.keys()).slice(0, 5)
    });
    
    return result;
  }

  // Normalize different date bucket formats to ISO date strings
  private normalizeDateBucket(bucket: string): string {
    // Handle ISO date format (YYYY-MM-DD) - already good
    if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) {
      return bucket;
    }

    // Handle year-month format (YYYY-MM) - assume first day of month
    if (/^\d{4}-\d{2}$/.test(bucket)) {
      return `${bucket}-01`;
    }

    // Handle week format (YYYY-W##) - convert to first day of that week
    const weekMatch = bucket.match(/^(\d{4})-W(\d{1,2})$/);
    if (weekMatch) {
      const year = parseInt(weekMatch[1]);
      const week = parseInt(weekMatch[2]);
      try {
        const firstDayOfYear = new Date(year, 0, 1);
        const daysToAdd = (week - 1) * 7 - firstDayOfYear.getDay() + 1;
        const weekStart = new Date(year, 0, 1 + daysToAdd);
        return weekStart.toISOString().split('T')[0];
      } catch (error) {
        console.warn('Error parsing week format:', bucket, error);
        return `${year}-01-01`; // Fallback to start of year
      }
    }

    // Handle alternative week format like "Week 30 2024"
    const altWeekMatch = bucket.match(/^Week (\d+) (\d{4})$/);
    if (altWeekMatch) {
      const week = parseInt(altWeekMatch[1]);
      const year = parseInt(altWeekMatch[2]);
      try {
        const firstDayOfYear = new Date(year, 0, 1);
        const daysToAdd = (week - 1) * 7 - firstDayOfYear.getDay() + 1;
        const weekStart = new Date(year, 0, 1 + daysToAdd);
        return weekStart.toISOString().split('T')[0];
      } catch (error) {
        console.warn('Error parsing alternative week format:', bucket, error);
        return `${year}-01-01`; // Fallback to start of year
      }
    }

    // Handle month names like "July 2024" - assume first day of month
    const monthNameMatch = bucket.match(/^(\w+) (\d{4})$/);
    if (monthNameMatch) {
      const monthName = monthNameMatch[1];
      const year = monthNameMatch[2];
      try {
        const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      } catch (error) {
        console.warn('Error parsing month name format:', bucket, error);
        return `${year}-01-01`; // Fallback to start of year
      }
    }

    // Handle numeric timestamps (Unix timestamps in seconds or milliseconds)
    const numericBucket = Number(bucket);
    if (!isNaN(numericBucket) && numericBucket > 0) {
      try {
        // Assume it's a Unix timestamp (handle both seconds and milliseconds)
        const timestamp = numericBucket > 1e10 ? numericBucket : numericBucket * 1000;
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (error) {
        console.warn('Error parsing numeric timestamp:', bucket, error);
      }
    }

    // If we can't parse it, try to create a valid date or return a fallback
    try {
      const attemptedDate = new Date(bucket);
      if (!isNaN(attemptedDate.getTime())) {
        return attemptedDate.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('Error attempting date parsing:', bucket, error);
    }

    // Final fallback - create a predictable date based on the bucket string
    // This ensures we don't break the chart even with completely invalid dates
    const today = new Date();
    const fallbackDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    console.warn('⚠️ Could not normalize date bucket, using fallback:', bucket, '→', fallbackDate);
    return fallbackDate;
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
      from: payload.from,
      to: payload.to,
      interval: payload.interval || '1d'
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