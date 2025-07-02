import { Campaign, TrendDataPoint, BreakdownData } from '@/types';

// Mock campaigns for filter dropdown (used for demo filtering in analytics)
export const mockCampaigns: Campaign[] = [
  {
    campaignId: 1,
    brandName: 'TechGear Pro',
    impressionTarget: 100000,
    clickTarget: 2500,
    totalBudget: '15000',
    status: 1,
    createdBy: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    campaignId: 2,
    brandName: 'Fashion Forward',
    impressionTarget: 75000,
    clickTarget: 1800,
    totalBudget: '10000',
    status: 1,
    createdBy: 1,
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    campaignId: 3,
    brandName: 'Home & Garden',
    impressionTarget: 50000,
    clickTarget: 1200,
    totalBudget: '8000',
    status: 2,
    createdBy: 1,
    createdAt: '2024-01-25T09:15:00Z',
    updatedAt: '2024-01-25T09:15:00Z'
  },
  {
    campaignId: 4,
    brandName: 'Sports Elite',
    impressionTarget: 120000,
    clickTarget: 3000,
    totalBudget: '20000',
    status: 3,
    createdBy: 1,
    createdAt: '2024-01-10T16:45:00Z',
    updatedAt: '2024-01-10T16:45:00Z'
  }
];

// Mock slots data
export const mockSlots = [
  { slotId: 1, name: 'Header Banner', platform: 'Web' },
  { slotId: 2, name: 'Sidebar Ad', platform: 'Web' },
  { slotId: 3, name: 'Footer Banner', platform: 'Web' },
  { slotId: 4, name: 'Mobile Banner', platform: 'Mobile' },
  { slotId: 5, name: 'In-Feed Ad', platform: 'Mobile' },
  { slotId: 6, name: 'Extension Popup', platform: 'Extension' }
];

// Mock POS data
export const mockPOS = [
  { posId: 1, name: 'Amazon' },
  { posId: 2, name: 'Flipkart' },
  { posId: 3, name: 'Myntra' },
  { posId: 4, name: 'Nykaa' },
  { posId: 5, name: 'BigBasket' }
];

// Mock data for analytics and dashboard charts
export const mockTrendData: TrendDataPoint[] = [
  { date: '2024-01-01', impressions: 12000, clicks: 300, conversions: 18, ctr: 2.5, conversionRate: 6.0, revenue: 1800 },
  { date: '2024-01-02', impressions: 13500, clicks: 338, conversions: 21, ctr: 2.5, conversionRate: 6.2, revenue: 2100 },
  { date: '2024-01-03', impressions: 11800, clicks: 295, conversions: 16, ctr: 2.5, conversionRate: 5.4, revenue: 1600 },
  { date: '2024-01-04', impressions: 14200, clicks: 355, conversions: 23, ctr: 2.5, conversionRate: 6.5, revenue: 2300 },
  { date: '2024-01-05', impressions: 15600, clicks: 390, conversions: 26, ctr: 2.5, conversionRate: 6.7, revenue: 2600 },
  { date: '2024-01-06', impressions: 13900, clicks: 347, conversions: 19, ctr: 2.5, conversionRate: 5.5, revenue: 1900 },
  { date: '2024-01-07', impressions: 16200, clicks: 405, conversions: 28, ctr: 2.5, conversionRate: 6.9, revenue: 2800 }
];

// Slot-wise analytics data
export const mockSlotAnalytics = {
  'Header Banner': [
    { date: '2024-01-01', impressions: 4500, clicks: 135, conversions: 8, ctr: 3.0, conversionRate: 5.9 },
    { date: '2024-01-02', impressions: 4800, clicks: 144, conversions: 9, ctr: 3.0, conversionRate: 6.3 },
    { date: '2024-01-03', impressions: 4200, clicks: 126, conversions: 6, ctr: 3.0, conversionRate: 4.8 },
    { date: '2024-01-04', impressions: 5100, clicks: 153, conversions: 10, ctr: 3.0, conversionRate: 6.5 },
    { date: '2024-01-05', impressions: 5600, clicks: 168, conversions: 12, ctr: 3.0, conversionRate: 7.1 },
    { date: '2024-01-06', impressions: 4900, clicks: 147, conversions: 8, ctr: 3.0, conversionRate: 5.4 },
    { date: '2024-01-07', impressions: 5800, clicks: 174, conversions: 13, ctr: 3.0, conversionRate: 7.5 }
  ],
  'Sidebar Ad': [
    { date: '2024-01-01', impressions: 3200, clicks: 80, conversions: 4, ctr: 2.5, conversionRate: 5.0 },
    { date: '2024-01-02', impressions: 3600, clicks: 90, conversions: 5, ctr: 2.5, conversionRate: 5.6 },
    { date: '2024-01-03', impressions: 3100, clicks: 78, conversions: 3, ctr: 2.5, conversionRate: 3.8 },
    { date: '2024-01-04', impressions: 3800, clicks: 95, conversions: 6, ctr: 2.5, conversionRate: 6.3 },
    { date: '2024-01-05', impressions: 4200, clicks: 105, conversions: 7, ctr: 2.5, conversionRate: 6.7 },
    { date: '2024-01-06', impressions: 3700, clicks: 93, conversions: 4, ctr: 2.5, conversionRate: 4.3 },
    { date: '2024-01-07', impressions: 4300, clicks: 108, conversions: 8, ctr: 2.5, conversionRate: 7.4 }
  ],
  'Mobile Banner': [
    { date: '2024-01-01', impressions: 4300, clicks: 86, conversions: 6, ctr: 2.0, conversionRate: 7.0 },
    { date: '2024-01-02', impressions: 5100, clicks: 102, conversions: 7, ctr: 2.0, conversionRate: 6.9 },
    { date: '2024-01-03', impressions: 4500, clicks: 90, conversions: 7, ctr: 2.0, conversionRate: 7.8 },
    { date: '2024-01-04', impressions: 5300, clicks: 106, conversions: 7, ctr: 2.0, conversionRate: 6.6 },
    { date: '2024-01-05', impressions: 5800, clicks: 116, conversions: 7, ctr: 2.0, conversionRate: 6.0 },
    { date: '2024-01-06', impressions: 5300, clicks: 106, conversions: 7, ctr: 2.0, conversionRate: 6.6 },
    { date: '2024-01-07', impressions: 6100, clicks: 122, conversions: 7, ctr: 2.0, conversionRate: 5.7 }
  ]
};

// Campaign-wise analytics data
export const mockCampaignAnalytics = {
  'TechGear Pro': [
    { date: '2024-01-01', impressions: 5200, clicks: 156, conversions: 12, ctr: 3.0, conversionRate: 7.7 },
    { date: '2024-01-02', impressions: 5800, clicks: 174, conversions: 14, ctr: 3.0, conversionRate: 8.0 },
    { date: '2024-01-03', impressions: 5100, clicks: 153, conversions: 10, ctr: 3.0, conversionRate: 6.5 },
    { date: '2024-01-04', impressions: 6200, clicks: 186, conversions: 16, ctr: 3.0, conversionRate: 8.6 },
    { date: '2024-01-05', impressions: 6800, clicks: 204, conversions: 18, ctr: 3.0, conversionRate: 8.8 },
    { date: '2024-01-06', impressions: 6100, clicks: 183, conversions: 13, ctr: 3.0, conversionRate: 7.1 },
    { date: '2024-01-07', impressions: 7200, clicks: 216, conversions: 19, ctr: 3.0, conversionRate: 8.8 }
  ],
  'Fashion Forward': [
    { date: '2024-01-01', impressions: 3800, clicks: 95, conversions: 4, ctr: 2.5, conversionRate: 4.2 },
    { date: '2024-01-02', impressions: 4200, clicks: 105, conversions: 5, ctr: 2.5, conversionRate: 4.8 },
    { date: '2024-01-03', impressions: 3600, clicks: 90, conversions: 4, ctr: 2.5, conversionRate: 4.4 },
    { date: '2024-01-04', impressions: 4400, clicks: 110, conversions: 5, ctr: 2.5, conversionRate: 4.5 },
    { date: '2024-01-05', impressions: 4800, clicks: 120, conversions: 6, ctr: 2.5, conversionRate: 5.0 },
    { date: '2024-01-06', impressions: 4300, clicks: 108, conversions: 4, ctr: 2.5, conversionRate: 3.7 },
    { date: '2024-01-07', impressions: 5000, clicks: 125, conversions: 7, ctr: 2.5, conversionRate: 5.6 }
  ],
  'Sports Elite': [
    { date: '2024-01-01', impressions: 3000, clicks: 49, conversions: 2, ctr: 1.8, conversionRate: 4.1 },
    { date: '2024-01-02', impressions: 3500, clicks: 59, conversions: 2, ctr: 1.8, conversionRate: 3.4 },
    { date: '2024-01-03', impressions: 3100, clicks: 52, conversions: 2, ctr: 1.8, conversionRate: 3.8 },
    { date: '2024-01-04', impressions: 3600, clicks: 59, conversions: 2, ctr: 1.8, conversionRate: 3.4 },
    { date: '2024-01-05', impressions: 4000, clicks: 66, conversions: 2, ctr: 1.8, conversionRate: 3.0 },
    { date: '2024-01-06', impressions: 3500, clicks: 58, conversions: 2, ctr: 1.8, conversionRate: 3.4 },
    { date: '2024-01-07', impressions: 4000, clicks: 64, conversions: 2, ctr: 1.8, conversionRate: 3.1 }
  ]
};

// Top 5 Locations by Impressions
export const mockTopLocations = [
  { location: 'Mumbai', impressions: 28450, clicks: 1422, conversions: 85 },
  { location: 'Delhi', impressions: 24680, clicks: 1234, conversions: 74 },
  { location: 'Bangalore', impressions: 18920, clicks: 946, conversions: 57 },
  { location: 'Chennai', impressions: 15670, clicks: 783, conversions: 47 },
  { location: 'Pune', impressions: 12890, clicks: 644, conversions: 39 }
];

// Top 5 Landing URLs by Clicks
export const mockTopLandingUrls = [
  { landingUrl: '/product/electronics/smartphones', clicks: 2450, impressions: 45600, conversions: 147 },
  { landingUrl: '/product/fashion/mens-clothing', clicks: 2180, impressions: 42300, conversions: 131 },
  { landingUrl: '/product/home/furniture', clicks: 1950, impressions: 38900, conversions: 117 },
  { landingUrl: '/product/sports/fitness-equipment', clicks: 1720, impressions: 35400, conversions: 103 },
  { landingUrl: '/product/beauty/skincare', clicks: 1560, impressions: 32100, conversions: 94 }
];

// Top Slots Performance
export const mockTopSlots = [
  { slotName: 'Header Banner', impressions: 34200, clicks: 1026, conversionRate: 6.5 },
  { slotName: 'Mobile Banner', impressions: 36200, clicks: 724, conversionRate: 6.8 },
  { slotName: 'Sidebar Ad', impressions: 25900, clicks: 649, conversionRate: 5.4 },
  { slotName: 'Footer Banner', impressions: 18600, clicks: 372, conversionRate: 4.2 },
  { slotName: 'In-Feed Ad', impressions: 15800, clicks: 316, conversionRate: 5.8 },
  { slotName: 'Extension Popup', impressions: 12400, clicks: 248, conversionRate: 7.2 }
];

// Device/Platform breakdown with KPIs
export const mockDeviceBreakdown = [
  { 
    name: 'Mobile', 
    value: 48920, 
    percentage: 55.2,
    impressions: 48920,
    clicks: 1468,
    conversions: 103,
    ctr: 3.0,
    conversionRate: 7.0
  },
  { 
    name: 'Desktop', 
    value: 32450, 
    percentage: 36.6,
    impressions: 32450,
    clicks: 973,
    conversions: 58,
    ctr: 3.0,
    conversionRate: 6.0
  },
  { 
    name: 'Tablet', 
    value: 7230, 
    percentage: 8.2,
    impressions: 7230,
    clicks: 217,
    conversions: 12,
    ctr: 3.0,
    conversionRate: 5.5
  }
];

// Age-wise distribution with multiple metrics
export const mockAgeAnalytics = [
  { ageGroup: '18-24', impressions: 15234, clicks: 457, conversions: 32, percentage: 17.4 },
  { ageGroup: '25-34', impressions: 28945, clicks: 868, conversions: 61, percentage: 33.1 },
  { ageGroup: '35-44', impressions: 23567, clicks: 707, conversions: 49, percentage: 27.0 },
  { ageGroup: '45-54', impressions: 14876, clicks: 446, conversions: 31, percentage: 17.0 },
  { ageGroup: '55+', impressions: 4778, clicks: 143, conversions: 10, percentage: 5.5 }
];

// Per-Brand Age-wise data
export const mockBrandAgeData = [
  { ageGroup: '18-24', 'TechGear Pro': 245, 'Fashion Forward': 189, 'Sports Elite': 123, 'Home & Garden': 98 },
  { ageGroup: '25-34', 'TechGear Pro': 456, 'Fashion Forward': 378, 'Sports Elite': 234, 'Home & Garden': 189 },
  { ageGroup: '35-44', 'TechGear Pro': 378, 'Fashion Forward': 298, 'Sports Elite': 198, 'Home & Garden': 156 },
  { ageGroup: '45-54', 'TechGear Pro': 234, 'Fashion Forward': 167, 'Sports Elite': 134, 'Home & Garden': 123 },
  { ageGroup: '55+', 'TechGear Pro': 89, 'Fashion Forward': 56, 'Sports Elite': 45, 'Home & Garden': 67 }
];

// Combo chart data (Impressions vs Conversions)
export const mockImpressionsVsConversions = [
  { period: 'Week 1', impressions: 42500, conversions: 89 },
  { period: 'Week 2', impressions: 38900, conversions: 94 },
  { period: 'Week 3', impressions: 45600, conversions: 112 },
  { period: 'Week 4', impressions: 51200, conversions: 128 }
];

// Combo chart data (Impressions vs CTR)
export const mockImpressionsVsCTR = [
  { period: 'Week 1', impressions: 42500, ctr: 2.8 },
  { period: 'Week 2', impressions: 38900, ctr: 3.1 },
  { period: 'Week 3', impressions: 45600, ctr: 2.9 },
  { period: 'Week 4', impressions: 51200, ctr: 3.2 }
];

export const mockGenderBreakdown: BreakdownData[] = [
  { name: 'Male', value: 45680, percentage: 52.3, impressions: 45680, clicks: 1370, conversions: 82 },
  { name: 'Female', value: 41720, percentage: 47.7, impressions: 41720, clicks: 1252, conversions: 75 }
];

export const mockAgeBreakdown: BreakdownData[] = [
  { name: '18-24', value: 15234, percentage: 17.4, impressions: 15234, clicks: 457, conversions: 32 },
  { name: '25-34', value: 28945, percentage: 33.1, impressions: 28945, clicks: 868, conversions: 61 },
  { name: '35-44', value: 23567, percentage: 27.0, impressions: 23567, clicks: 707, conversions: 49 },
  { name: '45-54', value: 14876, percentage: 17.0, impressions: 14876, clicks: 446, conversions: 31 },
  { name: '55+', value: 4778, percentage: 5.5, impressions: 4778, clicks: 143, conversions: 10 }
];

export const mockPlatformBreakdown: BreakdownData[] = [
  { name: 'Web', value: 42350, percentage: 48.5, impressions: 42350, clicks: 1270, conversions: 76 },
  { name: 'Mobile', value: 38920, percentage: 44.5, impressions: 38920, clicks: 1168, conversions: 70 },
  { name: 'Extension', value: 6130, percentage: 7.0, impressions: 6130, clicks: 184, conversions: 11 }
];

export const mockLocationBreakdown: BreakdownData[] = [
  { name: 'Mumbai', value: 28450, percentage: 32.6, impressions: 28450, clicks: 854, conversions: 51 },
  { name: 'Delhi', value: 24680, percentage: 28.3, impressions: 24680, clicks: 740, conversions: 44 },
  { name: 'Bangalore', value: 18920, percentage: 21.7, impressions: 18920, clicks: 568, conversions: 34 },
  { name: 'Chennai', value: 9870, percentage: 11.3, impressions: 9870, clicks: 296, conversions: 18 },
  { name: 'Others', value: 5480, percentage: 6.1, impressions: 5480, clicks: 164, conversions: 10 }
];

// Static data for forms, filters and dropdowns
export const categories = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Beauty', 'Books', 'Automotive'];
export const brands = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Zara', 'H&M', 'HP', 'Dell', 'Sony'];
export const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Kolkata', 'Hyderabad', 'Ahmedabad'];
export const platforms = ['Web', 'Mobile', 'Extension'];