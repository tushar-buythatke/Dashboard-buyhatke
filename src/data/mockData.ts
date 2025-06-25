import { Campaign, Ad, Slot, TrendDataPoint, BreakdownData } from '@/types';

export const mockSlots: Slot[] = [
  { id: '1', name: 'Banner Top', platform: 'Web', width: 728, height: 90, isActive: true },
  { id: '2', name: 'Banner Bottom', platform: 'Web', width: 728, height: 90, isActive: true },
  { id: '3', name: 'Sidebar', platform: 'Web', width: 300, height: 250, isActive: true },
  { id: '4', name: 'Mobile Banner', platform: 'Mobile', width: 320, height: 50, isActive: true },
  { id: '5', name: 'App Interstitial', platform: 'Mobile', width: 320, height: 480, isActive: true },
  { id: '6', name: 'Extension Popup', platform: 'Extension', width: 400, height: 300, isActive: true }
];

export const mockCampaigns: Campaign[] = [
  {
    id: '1',
    brandName: 'TechGear Pro',
    impressionTarget: 100000,
    clickTarget: 2500,
    totalBudget: 15000,
    status: 'live',
    createdBy: 'admin@company.com',
    createdAt: '2024-01-15T10:00:00Z',
    impressions: 87342,
    clicks: 2156,
    ctr: 2.47,
    spend: 12450,
    conversions: 124
  },
  {
    id: '2',
    brandName: 'Fashion Forward',
    impressionTarget: 75000,
    clickTarget: 1800,
    totalBudget: 10000,
    status: 'live',
    createdBy: 'admin@company.com',
    createdAt: '2024-01-20T14:30:00Z',
    impressions: 68925,
    clicks: 1654,
    ctr: 2.4,
    spend: 8200,
    conversions: 89
  },
  {
    id: '3',
    brandName: 'Home & Garden',
    impressionTarget: 50000,
    clickTarget: 1200,
    totalBudget: 8000,
    status: 'test',
    createdBy: 'admin@company.com',
    createdAt: '2024-01-25T09:15:00Z',
    impressions: 34521,
    clicks: 876,
    ctr: 2.54,
    spend: 4320,
    conversions: 45
  },
  {
    id: '4',
    brandName: 'Sports Elite',
    impressionTarget: 120000,
    clickTarget: 3000,
    totalBudget: 20000,
    status: 'paused',
    createdBy: 'admin@company.com',
    createdAt: '2024-01-10T16:45:00Z',
    impressions: 92134,
    clicks: 2287,
    ctr: 2.48,
    spend: 14600,
    conversions: 156
  }
];

export const mockAds: Ad[] = [
  {
    id: '1',
    campaignId: '1',
    slotId: '1',
    slotName: 'Banner Top',
    impressionTarget: 25000,
    clickTarget: 625,
    categories: ['Electronics', 'Computers'],
    priceRangeMin: 100,
    priceRangeMax: 2000,
    location: ['Mumbai', 'Delhi', 'Bangalore'],
    startDate: '2024-01-15',
    endDate: '2024-02-15',
    startTime: '09:00',
    endTime: '21:00',
    brandTargets: ['Apple', 'Samsung', 'HP'],
    priority: 750,
    creativeUrl: 'https://images.pexels.com/photos/3184306/pexels-photo-3184306.jpeg',
    ageRangeMin: 25,
    ageRangeMax: 45,
    gender: 'all',
    status: 'active',
    isTestPhase: false,
    platform: 'Web',
    impressions: 21856,
    clicks: 539,
    ctr: 2.47,
    conversions: 31,
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    campaignId: '1',
    slotId: '2',
    slotName: 'Banner Bottom',
    impressionTarget: 25000,
    clickTarget: 625,
    categories: ['Electronics', 'Gadgets'],
    priceRangeMin: 50,
    priceRangeMax: 1500,
    location: ['Mumbai', 'Delhi'],
    startDate: '2024-01-15',
    endDate: '2024-02-15',
    startTime: '09:00',
    endTime: '21:00',
    brandTargets: ['Apple', 'Samsung'],
    priority: 680,
    creativeUrl: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg',
    ageRangeMin: 22,
    ageRangeMax: 50,
    gender: 'male',
    status: 'active',
    isTestPhase: false,
    platform: 'Web',
    impressions: 19742,
    clicks: 487,
    ctr: 2.47,
    conversions: 28,
    createdAt: '2024-01-15T11:00:00Z'
  },
  {
    id: '3',
    campaignId: '2',
    slotId: '4',
    slotName: 'Mobile Banner',
    impressionTarget: 37500,
    clickTarget: 900,
    categories: ['Fashion', 'Clothing'],
    priceRangeMin: 25,
    priceRangeMax: 500,
    location: ['Mumbai', 'Delhi', 'Pune', 'Chennai'],
    startDate: '2024-01-20',
    endDate: '2024-02-20',
    startTime: '08:00',
    endTime: '22:00',
    brandTargets: ['Zara', 'H&M', 'Forever21'],
    priority: 820,
    creativeUrl: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg',
    ageRangeMin: 18,
    ageRangeMax: 35,
    gender: 'female',
    status: 'active',
    isTestPhase: false,
    platform: 'Mobile',
    impressions: 34462,
    clicks: 827,
    ctr: 2.4,
    conversions: 44,
    createdAt: '2024-01-20T15:00:00Z'
  }
];

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

export const categories = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Beauty', 'Books', 'Automotive'];
export const brands = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Zara', 'H&M', 'HP', 'Dell', 'Sony'];
export const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Kolkata', 'Hyderabad', 'Ahmedabad'];
export const platforms = ['Web', 'Mobile', 'Extension'];