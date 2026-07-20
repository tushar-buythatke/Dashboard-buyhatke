import { CategoryPath } from '@/types';

/**
 * Converts an API date string (ISO or plain YYYY-MM-DD) to a YYYY-MM-DD string
 * in the browser's local timezone. This prevents the UTC-midnight → local-previous-day
 * shift that occurs when the server stores IST midnight as T18:30:00Z.
 */
export const toLocalDateInput = (dateString: string): string => {
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Extracts categories into a Record<number, string> format (catId -> catName)
 * suitable for the ad update API payload.
 */
export const extractCategoriesForUpdate = (categories: any): Record<number, string> => {
  if (!categories) return {};

  // Case 1: CategoryPath format (with selections) used in UI
  if (typeof categories === 'object' && 'selections' in categories) {
    const categoryPath = categories as CategoryPath;
    const catMap: Record<number, string> = {};
    if (categoryPath.selections) {
      categoryPath.selections.forEach(sel => {
        // Ensure we have valid data
        if (sel.selected && sel.selected.catId) {
          catMap[sel.selected.catId] = sel.selected.catName;
        }
      });
    }
    return catMap;
  }

  // Case 2: API format { ln: [{catId, catName}], l0: [...] } 
  // Commonly found in raw API responses
  if (typeof categories === 'object' && 'ln' in categories && Array.isArray(categories.ln)) {
    const catMap: Record<number, string> = {};
    categories.ln.forEach((cat: any) => {
      if (cat && cat.catId) {
        catMap[cat.catId] = cat.catName;
      }
    });
    return catMap;
  }

  // Case 3: Array of objects [{catId, catName}]
  if (Array.isArray(categories)) {
    const catMap: Record<number, string> = {};
    categories.forEach((cat: any) => {
      if (cat && cat.catId) {
        catMap[cat.catId] = cat.catName;
      }
    });
    return catMap;
  }

  // Case 4: Already in Record format or simple object { "123": "Name" }
  // We return it largely as is, assuming it's the correct format if none of the above matched
  return categories as Record<number, string>;
};

/**
 * Appends a cache-busting timestamp to a URL.
 * Checks if the URL is valid and doesn't already have a timestamp.
 */
export const getCacheBustedUrl = (url: string | undefined): string => {
  if (!url) return '';

  // Only add timestamp to remote URLs, not data URLs or blobs
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  try {
    const separator = url.includes('?') ? '&' : '?';
    // Use a unique timestamp to force cache refresh
    return `${url}${separator}t=${Date.now()}`;
  } catch (error) {
    return url;
  }
};

/**
 * Resolves a brand/site name to a logo image URL via the shared brand-logo
 * service. The endpoint returns an image directly (image/jpeg) with permissive
 * CORS, so the result can be dropped straight into an <img src>. Returns '' for
 * an empty name so callers can fall back to their own placeholder.
 */
const BRAND_LOGO_ENDPOINT = 'https://dashboard-combined.vercel.app/api/brand-logo';
export const brandLogoUrl = (name: string | undefined): string => {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  return `${BRAND_LOGO_ENDPOINT}?brand=${encodeURIComponent(trimmed)}`;
};
