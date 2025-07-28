// CSV Export Utility Functions

export interface CSVExportData {
  filename: string;
  data: Record<string, any>[];
  headers?: Record<string, string>; // mapping from key to display name
}

/**
 * Converts an array of objects to CSV format
 */
export function convertToCSV(data: Record<string, any>[], headers?: Record<string, string>): string {
  if (data.length === 0) return '';

  // Get all unique keys from all objects
  const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
  
  // Create header row - use custom headers if provided, otherwise use keys
  const headerRow = allKeys.map(key => {
    const headerName = headers?.[key] || key;
    return `"${headerName.replace(/"/g, '""')}"`;
  }).join(',');

  // Create data rows
  const dataRows = data.map(item => {
    return allKeys.map(key => {
      const value = item[key];
      if (value === null || value === undefined) return '""';
      
      // Convert value to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Downloads CSV content as a file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    // Create download link
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up object URL
    URL.revokeObjectURL(url);
  }
}

/**
 * Main export function that handles the full CSV export process
 */
export function exportToCSV({ filename, data, headers }: CSVExportData): void {
  try {
    const csvContent = convertToCSV(data, headers);
    downloadCSV(csvContent, filename);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export CSV file');
  }
}

/**
 * Simple wrapper function for quick CSV exports
 */
export function exportToCsv(data: Record<string, any>[], filename: string): void {
  exportToCSV({ filename, data });
}

/**
 * Helper function to format metrics data for CSV export with clean, specific structure
 */
export function formatMetricsForCSV(metricsData: any, breakdownData: any, trendData: any[], topLocations: any[], topSlots: any[]): Record<string, any>[] {
  const exportData: Record<string, any>[] = [];
  const exportDate = new Date().toISOString().split('T')[0];

  // 1. OVERALL METRICS SUMMARY
  if (metricsData) {
    exportData.push({
      sheet_section: 'OVERALL_METRICS',
      metric_name: 'Total Impressions',
      value: metricsData.impressions || 0,
      description: 'Total number of ad impressions',
      export_date: exportDate
    });
    
    exportData.push({
      sheet_section: 'OVERALL_METRICS',
      metric_name: 'Total Clicks',
      value: metricsData.clicks || 0,
      description: 'Total number of ad clicks',
      export_date: exportDate
    });
    
    exportData.push({
      sheet_section: 'OVERALL_METRICS',
      metric_name: 'Click Through Rate',
      value: `${(metricsData.ctr || 0).toFixed(2)}%`,
      description: 'Percentage of impressions that resulted in clicks',
      export_date: exportDate
    });
    
    exportData.push({
      sheet_section: 'OVERALL_METRICS',
      metric_name: 'Total Conversions',
      value: metricsData.conversions || 0,
      description: 'Total number of conversions',
      export_date: exportDate
    });

    // Calculate and add derived metrics
    const conversionRate = (metricsData.clicks > 0) ? ((metricsData.conversions || 0) / metricsData.clicks * 100) : 0;
    exportData.push({
      sheet_section: 'OVERALL_METRICS',
      metric_name: 'Conversion Rate',
      value: `${conversionRate.toFixed(2)}%`,
      description: 'Percentage of clicks that resulted in conversions',
      export_date: exportDate
    });
  }

  // 2. GENDER BREAKDOWN (Only if has meaningful data)
  if (breakdownData?.gender && breakdownData.gender.length > 0) {
    const validGenderData = breakdownData.gender.filter((item: any) => 
      item.gender && item.gender !== 'Unknown' && (item.eventCount || 0) > 0
    );
    
    if (validGenderData.length > 0) {
      const genderMetrics = processBreakdownByEvent(validGenderData);
      Object.entries(genderMetrics).forEach(([gender, metrics]: [string, any]) => {
        exportData.push({
          sheet_section: 'GENDER_BREAKDOWN',
          demographic: gender,
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          conversions: metrics.conversions || 0,
          ctr_percent: metrics.impressions > 0 ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2) : '0.00',
          export_date: exportDate
        });
      });
    }
  }

  // 3. PLATFORM BREAKDOWN (Only if has meaningful data)
  if (breakdownData?.platform && breakdownData.platform.length > 0) {
    const validPlatformData = breakdownData.platform.filter((item: any) => 
      item.platform && item.platform !== 'Unknown' && (item.eventCount || 0) > 0
    );
    
    if (validPlatformData.length > 0) {
      const platformMetrics = processBreakdownByEvent(validPlatformData);
      Object.entries(platformMetrics).forEach(([platform, metrics]: [string, any]) => {
        exportData.push({
          sheet_section: 'PLATFORM_BREAKDOWN',
          platform: platform,
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          conversions: metrics.conversions || 0,
          ctr_percent: metrics.impressions > 0 ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2) : '0.00',
          export_date: exportDate
        });
      });
    }
  }

  // 4. AGE BREAKDOWN (Only if has meaningful data)
  if (breakdownData?.age && breakdownData.age.length > 0) {
    const validAgeData = breakdownData.age.filter((item: any) => 
      item.age && item.age !== 'Unknown' && (item.eventCount || 0) > 0
    );
    
    if (validAgeData.length > 0) {
      const ageMetrics = processBreakdownByEvent(validAgeData);
      Object.entries(ageMetrics).forEach(([ageGroup, metrics]: [string, any]) => {
        exportData.push({
          sheet_section: 'AGE_BREAKDOWN',
          age_group: ageGroup,
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          conversions: metrics.conversions || 0,
          ctr_percent: metrics.impressions > 0 ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2) : '0.00',
          export_date: exportDate
        });
      });
    }
  }

  // 5. TREND DATA (Only dates with actual data)
  if (trendData && trendData.length > 0) {
    const validTrendData = trendData.filter((trend: any) => 
      trend.date && (trend.impressions > 0 || trend.clicks > 0 || trend.conversions > 0)
    );
    
    validTrendData.forEach((trend: any) => {
      exportData.push({
        sheet_section: 'TREND_DATA',
        date: trend.date,
        impressions: trend.impressions || 0,
        clicks: trend.clicks || 0,
        conversions: trend.conversions || 0,
        ctr_percent: trend.impressions > 0 ? ((trend.clicks / trend.impressions) * 100).toFixed(2) : '0.00',
        export_date: exportDate
      });
    });
  }

  // 6. TOP PERFORMING LOCATIONS
  if (topLocations && topLocations.length > 0) {
    const validLocations = topLocations.filter((location: any) => 
      location.name || location.location
    );
    
    validLocations.forEach((location: any, index: number) => {
      const impressions = location.impressions || 0;
      const clicks = location.clicks || 0;
      
      exportData.push({
        sheet_section: 'TOP_LOCATIONS',
        rank: index + 1,
        location_name: location.name || location.location,
        impressions: impressions,
        clicks: clicks,
        ctr_percent: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
        performance_score: impressions + clicks, // Simple performance metric
        export_date: exportDate
      });
    });
  }

  // 7. TOP PERFORMING SLOTS
  if (topSlots && topSlots.length > 0) {
    const validSlots = topSlots.filter((slot: any) => 
      slot.name || slot.slotId
    );
    
    validSlots.forEach((slot: any, index: number) => {
      const impressions = slot.impressions || 0;
      const clicks = slot.clicks || 0;
      
      exportData.push({
        sheet_section: 'TOP_SLOTS',
        rank: index + 1,
        slot_identifier: slot.name || `Slot ${slot.slotId}`,
        impressions: impressions,
        clicks: clicks,
        ctr_percent: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
        performance_score: impressions + clicks, // Simple performance metric
        export_date: exportDate
      });
    });
  }

  return exportData;
}

/**
 * Helper function to process breakdown data by event type
 */
function processBreakdownByEvent(breakdownArray: any[]): Record<string, any> {
  const result: Record<string, any> = {};
  
  breakdownArray.forEach((item: any) => {
    const key = item.gender || item.platform || item.age || 'Unknown';
    if (!result[key]) {
      result[key] = { impressions: 0, clicks: 0, conversions: 0 };
    }
    
    switch (item.eventType) {
      case 0: // Impressions
        result[key].impressions = item.eventCount || 0;
        break;
      case 1: // Clicks
        result[key].clicks = item.eventCount || 0;
        break;
      case 2: // Conversions
        result[key].conversions = item.eventCount || 0;
        break;
    }
  });
  
  return result;
}

/**
 * Helper function to format dashboard data for CSV export with clean structure
 */
export function formatDashboardForCSV(metricsData: any, breakdownData: any, trendData: any[]): Record<string, any>[] {
  const exportData: Record<string, any>[] = [];
  const exportDate = new Date().toISOString().split('T')[0];

  // 1. DASHBOARD SUMMARY (Last 7 Days)
  if (metricsData) {
    exportData.push({
      sheet_section: 'DASHBOARD_SUMMARY',
      time_period: 'Last 7 Days',
      metric_name: 'Total Impressions',
      value: metricsData.impressions || 0,
      description: 'Total ad impressions in the last 7 days',
      export_date: exportDate
    });
    
    exportData.push({
      sheet_section: 'DASHBOARD_SUMMARY',
      time_period: 'Last 7 Days',
      metric_name: 'Total Clicks',
      value: metricsData.clicks || 0,
      description: 'Total ad clicks in the last 7 days',
      export_date: exportDate
    });
    
    exportData.push({
      sheet_section: 'DASHBOARD_SUMMARY',
      time_period: 'Last 7 Days',
      metric_name: 'Click Through Rate',
      value: `${(metricsData.ctr || 0).toFixed(2)}%`,
      description: 'CTR percentage for the last 7 days',
      export_date: exportDate
    });
    
    exportData.push({
      sheet_section: 'DASHBOARD_SUMMARY',
      time_period: 'Last 7 Days',
      metric_name: 'Total Conversions',
      value: metricsData.conversions || 0,
      description: 'Total conversions in the last 7 days',
      export_date: exportDate
    });

    // Add derived metrics
    const conversionRate = (metricsData.clicks > 0) ? ((metricsData.conversions || 0) / metricsData.clicks * 100) : 0;
    exportData.push({
      sheet_section: 'DASHBOARD_SUMMARY',
      time_period: 'Last 7 Days',
      metric_name: 'Conversion Rate',
      value: `${conversionRate.toFixed(2)}%`,
      description: 'Percentage of clicks that converted',
      export_date: exportDate
    });
  }

  // 2. GENDER BREAKDOWN (Only if has data)
  if (breakdownData?.gender && breakdownData.gender.length > 0) {
    const validGenderData = breakdownData.gender.filter((item: any) => 
      item.name && item.name !== 'Unknown' && (item.value || 0) > 0
    );
    
    if (validGenderData.length > 0) {
      const totalValue = validGenderData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      
      validGenderData.forEach((item: any) => {
        const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0';
        exportData.push({
          sheet_section: 'GENDER_BREAKDOWN',
          demographic: item.name,
          impressions: item.value || 0,
          percentage: `${percentage}%`,
          description: `Gender-based ad performance distribution`,
          export_date: exportDate
        });
      });
    }
  }

  // 3. PLATFORM BREAKDOWN (Only if has data)
  if (breakdownData?.platform && breakdownData.platform.length > 0) {
    const validPlatformData = breakdownData.platform.filter((item: any) => 
      item.name && item.name !== 'Unknown' && (item.value || 0) > 0
    );
    
    if (validPlatformData.length > 0) {
      const totalValue = validPlatformData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      
      validPlatformData.forEach((item: any) => {
        const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0';
        exportData.push({
          sheet_section: 'PLATFORM_BREAKDOWN',
          platform: item.name,
          impressions: item.value || 0,
          percentage: `${percentage}%`,
          description: `Platform-based ad performance distribution`,
          export_date: exportDate
        });
      });
    }
  }

  // 4. DAILY TREND (Only days with actual data)
  if (trendData && trendData.length > 0) {
    const validTrendData = trendData.filter((trend: any) => 
      trend.date && (trend.impressions > 0 || trend.clicks > 0 || trend.conversions > 0)
    );
    
    if (validTrendData.length > 0) {
      validTrendData.forEach((trend: any) => {
        const ctrPercent = trend.impressions > 0 ? ((trend.clicks / trend.impressions) * 100).toFixed(2) : '0.00';
        const conversionRate = trend.clicks > 0 ? ((trend.conversions / trend.clicks) * 100).toFixed(2) : '0.00';
        
        exportData.push({
          sheet_section: 'DAILY_TREND',
          date: trend.date,
          impressions: trend.impressions || 0,
          clicks: trend.clicks || 0,
          conversions: trend.conversions || 0,
          ctr_percent: ctrPercent,
          conversion_rate_percent: conversionRate,
          export_date: exportDate
        });
      });
    } else {
      // If no valid trend data, add a note
      exportData.push({
        sheet_section: 'DAILY_TREND',
        date: 'No Data Period',
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr_percent: '0.00',
        conversion_rate_percent: '0.00',
        note: 'No activity recorded in the last 7 days',
        export_date: exportDate
      });
    }
  }

  return exportData;
}
