import { CategoryPath } from '@/types';

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
