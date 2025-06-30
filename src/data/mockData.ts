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

// Mock data for analytics and dashboard charts
export const mockTrendData: TrendDataPoint[] = [
  { date: '2024-01-01', impressions: 12000, clicks: 300, conversions: 18, revenue: 1800 },
  { date: '2024-01-02', impressions: 13500, clicks: 338, conversions: 21, revenue: 2100 },
  { date: '2024-01-03', impressions: 11800, clicks: 295, conversions: 16, revenue: 1600 },
  { date: '2024-01-04', impressions: 14200, clicks: 355, conversions: 23, revenue: 2300 },
  { date: '2024-01-05', impressions: 15600, clicks: 390, conversions: 26, revenue: 2600 },
  { date: '2024-01-06', impressions: 13900, clicks: 347, conversions: 19, revenue: 1900 },
  { date: '2024-01-07', impressions: 16200, clicks: 405, conversions: 28, revenue: 2800 }
];

export const mockGenderBreakdown: BreakdownData[] = [
  { name: 'Male', value: 45680, percentage: 52.3 },
  { name: 'Female', value: 41720, percentage: 47.7 }
];

export const mockAgeBreakdown: BreakdownData[] = [
  { name: '18-24', value: 15234, percentage: 17.4 },
  { name: '25-34', value: 28945, percentage: 33.1 },
  { name: '35-44', value: 23567, percentage: 27.0 },
  { name: '45-54', value: 14876, percentage: 17.0 },
  { name: '55+', value: 4778, percentage: 5.5 }
];

export const mockPlatformBreakdown: BreakdownData[] = [
  { name: 'Web', value: 42350, percentage: 48.5 },
  { name: 'Mobile', value: 38920, percentage: 44.5 },
  { name: 'Extension', value: 6130, percentage: 7.0 }
];

export const mockLocationBreakdown: BreakdownData[] = [
  { name: 'Mumbai', value: 28450, percentage: 32.6 },
  { name: 'Delhi', value: 24680, percentage: 28.3 },
  { name: 'Bangalore', value: 18920, percentage: 21.7 },
  { name: 'Chennai', value: 9870, percentage: 11.3 },
  { name: 'Others', value: 5480, percentage: 6.1 }
];

// Static data for forms, filters and dropdowns
export const categories = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Beauty', 'Books', 'Automotive'];
export const brands = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Zara', 'H&M', 'HP', 'Dell', 'Sony'];
export const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Kolkata', 'Hyderabad', 'Ahmedabad'];
export const platforms = ['Web', 'Mobile', 'Extension'];