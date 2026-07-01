import { getApiVersion } from '@/config/api';

export const isV2Active = () => getApiVersion() === 'v2';

const API_BASE = 'https://search-new.bitbns.com/buyhatkeAdDashboard';

/**
 * Normalize V2 ad objects to match V1 shape that existing components expect.
 * V2: { adId, categories: [], sites: [], location: [], brandTargets: [] }
 * V1: { id, adId, categories: {}, sites: {}, location: {}, brandTargets: {} }
 */
export function normalizeAd(ad: Record<string, unknown>): Record<string, unknown> {
  if (!isV2Active()) return ad;

  const normalized = { ...ad, id: ad.adId };

  const arrayFields = ['categories', 'sites', 'location', 'brandTargets'] as const;
  for (const field of arrayFields) {
    const val = ad[field];
    if (Array.isArray(val)) {
      normalized[field] = Object.fromEntries(val.map((v: string | number) => [String(v), String(v)]));
    }
  }

  // V2 ads have slotType instead of slotId. Map slotType → slotId for backward compat.
  if (ad.slotType !== undefined && ad.slotId === undefined) {
    normalized.slotId = String(ad.slotType);
  }

  return normalized;
}

export function normalizeAdList(ads: Record<string, unknown>[]): Record<string, unknown>[] {
  if (!isV2Active()) return ads;
  return ads.map(normalizeAd);
}

/**
 * V2 slot: { slotId: UUID, slotType: "3", ... }
 * V1 slot: { slotId: number, ... }
 * We keep slotId as string (UUID) but add a numeric fallback from slotType for compatibility.
 */
export function normalizeSlot(slot: Record<string, unknown>): Record<string, unknown> {
  if (!isV2Active()) return slot;
  const slotType = Number(slot.slotType);
  return {
    ...slot,
    slotIdNum: Number.isFinite(slotType) ? slotType : undefined,
  };
}

export function normalizeSlotList(slots: Record<string, unknown>[]): Record<string, unknown>[] {
  if (!isV2Active()) return slots;
  return slots.map(normalizeSlot);
}

/**
 * Compare a slot with a target ID. In V2 mode, matches by slotType.
 * In V1 mode, matches by numeric slotId.
 */
export function matchSlotId(
  slot: { slotId: string | number; slotType?: string },
  targetId: string | number
): boolean {
  if (isV2Active()) {
    return slot.slotType === String(targetId);
  }
  return String(slot.slotId) === String(targetId);
}

/**
 * Normalize an ID value from react-router params for API use.
 * V2: pass UUID string as-is. V1: convert to number.
 */
export function normalizeRouteId(raw: string | undefined, fallback: string | number = 0): string | number {
  if (!raw) return fallback;
  return isV2Active() ? raw : Number(raw);
}

/**
 * Convert a slot ID for lookup/map key use. 
 * V2: use string representation. V1: use number.
 */
export function toLookupKey(id: string | number): string | number {
  return isV2Active() ? String(id) : Number(id);
}

export function normalizeFilterIds(ids: (string | number)[]): (string | number)[] {
  if (!isV2Active()) return ids.map(Number).filter(n => !isNaN(n as number));
  return ids.map(String).filter(s => s.length > 0);
}

/**
 * Build a reverse lookup: catId → catName from the categoryDetails API response.
 * Input: { "Electronics": { catId: 1, path: "..." }, ... }
 * Output: { "1": "Electronics", "2": "Mobiles", ... }
 */
export function buildCatIdNameMap(categoryDetails: Record<string, { catId: number; path: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [name, detail] of Object.entries(categoryDetails)) {
    if (detail?.catId) {
      map[String(detail.catId)] = name;
    }
  }
  return map;
}

/**
 * Resolve a categories object (V2 normalized: { "catId": "catId" }) to display names.
 */
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

/**
 * V2 metrics: eventType is string ("0", "1", "2")
 * V1 metrics: eventType is number (0, 1, 2)
 */
export function normalizeMetricsAdStats(
  stats: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (!isV2Active()) return stats;
  return stats.map(s => ({
    ...s,
    eventType: Number(s.eventType),
    eventCount: Number(s.eventCount),
  }));
}

export function normalizeMetricsBreakdown(
  data: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (!isV2Active()) return data;
  return data.map(row => ({
    ...row,
    eventType: Number(row.eventType),
    eventCount: Number(row.eventCount),
  }));
}
