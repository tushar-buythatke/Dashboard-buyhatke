export interface Campaign {
  campaignId: number;
  brandName: string;
  impressionTarget: number;
  clickTarget: number;
  totalBudget: string;
  status: number; // 0: draft, 1: live, 2: test, 3: paused
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface Slot {
  slotId: number;
  name: string;
  platform: number;
  width: string;
  height: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ad {
  adId: number;
  campaignId: number;
  name: string;
  label: string;
  slotId: number;
  slotName?: string;
  slotWidth?: string;
  slotHeight?: string;
  impressionTarget: number;
  clickTarget: number;
  impressionPixel: string;
  clickPixel: string;
  targetUrl: string;
  status: number; // 0: inactive, 1: active
  categories: Record<string, number> | CategoryPath;
  sites: Record<string, number>;
  location: Record<string, number>;
  brandTargets: Record<string, number>;
  priceRangeMin: number;
  priceRangeMax: number;
  ageRangeMin: number;
  ageRangeMax: number;
  priority: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  creativeUrl: string;
  gender: string;
  isTestPhase: number;
  serveStrategy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAd {
  adId: number;
  campaignId: number;
  name: string;
  label: string;
  slotId: number;
  slotName?: string;
  slotWidth?: string;
  slotHeight?: string;
  impressionTarget: number;
  clickTarget: number;
  impressionPixel: string;
  clickPixel: string;
  targetUrl: string;
  status: number;
  categories: Record<string, number>;
  sites: Record<string, number>;
  location: Record<string, number>;
  brandTargets: Record<string, number>;
  priceRangeMin: number;
  priceRangeMax: number;
  ageRangeMin: number;
  ageRangeMax: number;
  priority: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  creativeUrl: string;
  gender: string;
  isTestPhase: number;
  serveStrategy: number;
  createdAt: string;
  updatedAt: string;
}

export const mapApiAdToAd = (apiAd: ApiAd): Ad => ({
  ...apiAd
});

export interface SlotListResponse {
  status: number;
  message: string;
  data: {
    slotList: Slot[];
  };
}

export interface CampaignResponse {
  status: number;
  message: string;
  data: {
    campaignList: Campaign[];
  };
}

export interface MetricsData {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
}

export interface TrendDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
}

export interface BreakdownData {
  name: string;
  value: number;
  percentage: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface FilterState {
  dateRange: {
    from: string;
    to: string;
  };
  periodType: string;
  campaigns: string[];
  platforms: string[];
  gender: string[];
  ageGroups: string[];
  adNames: string[];
}

export interface CategoryDetail {
  path: string;
  catId: number;
}

export interface CategoryDetails {
  [categoryName: string]: CategoryDetail;
}

export interface HierarchicalCategory {
  catId: number;
  catName: string;
}

export interface CategoryLevel {
  catId: number;
  catName: string;
}

export interface CategorySelection {
  path: CategoryLevel[];  // Full breadcrumb path
  selected: CategoryLevel;  // The actually selected category
}

export interface CategoryPath {
  selections: CategorySelection[];
}

export interface LocationDetails {
  [locationName: string]: number;
}

export interface TrendChartSeries {
  name: string;
  data: TrendDataPoint[];
}