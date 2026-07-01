import { getApiVersion } from '@/config/api';

export const isV2Active = () => getApiVersion() === 'v2';

const API_BASE = 'https://search-new.bitbns.com/buyhatkeAdDashboard';

export function normalizeAd(ad: any): any {
  if (!isV2Active()) return ad;

  const normalized = { ...ad, id: ad.adId };

  const arrayFields = ['categories', 'sites', 'location', 'brandTargets'] as const;
  for (const field of arrayFields) {
    const val = ad[field];
    if (Array.isArray(val)) {
      (normalized as any)[field] = Object.fromEntries(val.map((v: string | number) => [String(v), String(v)]));
    }
  }

  if (ad.slotType !== undefined && ad.slotId === undefined) {
    normalized.slotId = String(ad.slotType);
  }

  return normalized;
}

export function normalizeAdList(ads: any[]): any[] {
  if (!isV2Active()) return ads;
  return ads.map(normalizeAd);
}

export function normalizeSlot(slot: any): any {
  if (!isV2Active()) return slot;
  const slotType = Number(slot.slotType);
  return {
    ...slot,
    slotIdNum: Number.isFinite(slotType) ? slotType : undefined,
  };
}

export function normalizeSlotList(slots: any[]): any[] {
  if (!isV2Active()) return slots;
  return slots.map(normalizeSlot);
}

export function matchSlotId(
  slot: { slotId: string | number; slotType?: string },
  targetId: string | number
): boolean {
  if (isV2Active()) {
    return slot.slotType === String(targetId);
  }
  return String(slot.slotId) === String(targetId);
}

export function normalizeRouteId(raw: string | undefined, fallback: string | number = 0): string | number {
  if (!raw) return fallback;
  return isV2Active() ? raw : Number(raw);
}

export function toLookupKey(id: string | number): string | number {
  return isV2Active() ? String(id) : Number(id);
}

export function normalizeFilterIds(ids: (string | number)[]): (string | number)[] {
  if (!isV2Active()) return ids.map(Number).filter(n => !isNaN(n as number));
  return ids.map(String).filter(s => s.length > 0);
}

export function buildCatIdNameMap(categoryDetails: Record<string, { catId: number; path: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [name, detail] of Object.entries(categoryDetails)) {
    if (detail?.catId) {
      map[String(detail.catId)] = name;
    }
  }
  return map;
}

export function resolveCategoryNames(
  categories: Record<string, string | number> | undefined,
  catIdNameMap: Record<string, string>
): string {
  if (!categories) return 'N/A';
  return Object.keys(categories)
    .map(catId => catIdNameMap[catId] || catId)
    .join(', ');
}

export async function resolveCatIds(catIds: (string | number)[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(catIds.map(String))];
  if (uniqueIds.length === 0) return {};

  const response = await fetch(`${API_BASE}/v2/ads/catNames`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catIds: uniqueIds.map(Number) }),
  });

  const result = await response.json();
  const map: Record<string, string> = {};

  if (result.status === 1 && Array.isArray(result.data?.categories)) {
    for (const cat of result.data.categories) {
      map[String(cat.catId)] = cat.catName;
    }
  }

  return map;
}

export function matchesId(a: string | number, b: string | number): boolean {
  return String(a) === String(b);
}

export function normalizeMetricsAdStats(stats: any[]): any[] {
  if (!isV2Active()) return stats;
  return stats.map(s => ({
    ...s,
    eventType: Number(s.eventType),
    eventCount: Number(s.eventCount),
  }));
}

export function normalizeMetricsBreakdown(data: any[]): any[] {
  if (!isV2Active()) return data;
  return data.map(row => ({
    ...row,
    eventType: Number(row.eventType),
    eventCount: Number(row.eventCount),
  }));
}
