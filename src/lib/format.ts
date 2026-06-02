/**
 * Smart number formatting — picks the right unit (K / M / B / T)
 * so values never get absurdly long (no "9886.6K", instead "9.9M").
 */
export function formatCompactNumber(
  value: number | string | null | undefined,
  opts: { decimals?: number; fallback?: string } = {}
): string {
  const { decimals = 1, fallback = '0' } = opts;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;

  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(decimals)}T`;
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(decimals)}B`;
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 100 ? Math.round(v) : v.toFixed(decimals)}M`;
  }
  if (abs >= 1_000) {
    const v = n / 1_000;
    return `${v >= 100 ? Math.round(v) : v.toFixed(decimals)}K`;
  }
  return Math.round(n).toLocaleString('en-US');
}

/**
 * Smart percentage formatter — up to 4 decimal places, no trailing zeros.
 * 0.21      → "0.21%"
 * 0.2142    → "0.2142%"
 * 0.21000   → "0.21%"
 * 12.3456   → "12.3456%"
 */
export function formatSmartPercent(
  value: number | string | null | undefined,
  maxDecimals = 4
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  const fixed = n.toFixed(maxDecimals);
  // Strip trailing zeros but keep at least 2 decimal places for sub-1 numbers
  const trimmed = fixed.replace(/\.?0+$/, '');
  if (n > 0 && n < 1) {
    const minTwo = n.toFixed(2).replace(/\.?0+$/, '');
    return `${trimmed.length < minTwo.length ? minTwo : trimmed}%`;
  }
  return `${trimmed}%`;
}

/**
 * Coerce any value to a displayable string.
 * Objects become JSON-ish but readable; arrays get joined.
 * NA / null / empty values fall through to "Unspecified".
 */
export function coerceName(value: unknown, fallback = 'Unknown'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const lower = trimmed.toLowerCase();
    // Treat literal "NA", "N/A", "none", "null", "-" as missing
    if (lower === 'na' || lower === 'n/a' || lower === 'none' || lower === 'null' || lower === '-') {
      return 'Unspecified';
    }
    return trimmed;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fallback;
    return String(value);
  }
  if (Array.isArray(value)) {
    const joined = value.map((v) => coerceName(v, '')).filter(Boolean).join(', ');
    return joined || fallback;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Try common shape: { city, state } or { name, label } etc.
    const parts: string[] = [];
    for (const key of ['name', 'label', 'city', 'state', 'country', 'region', 'displayName', 'title']) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim()) {
        const lower = v.trim().toLowerCase();
        if (lower === 'na' || lower === 'n/a' || lower === 'none' || lower === 'null' || lower === '-') continue;
        parts.push(v.trim());
      }
      if (typeof v === 'number' && Number.isFinite(v)) parts.push(String(v));
    }
    if (parts.length > 0) return parts.join(', ');
    // Last resort: shallow join of all string values
    const strs = Object.values(obj).filter((v) => typeof v === 'string' || typeof v === 'number') as (string | number)[];
    if (strs.length > 0) return strs.map(String).join(' · ');
    return fallback;
  }
  return fallback;
}

/**
 * Quick boolean check: is this value effectively "missing"?
 */
export function isUnspecified(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const t = value.trim().toLowerCase();
    return !t || t === 'na' || t === 'n/a' || t === 'none' || t === 'null' || t === '-';
  }
  if (typeof value === 'number') return !Number.isFinite(value);
  return false;
}

/**
 * Format a value for display inside a chart tooltip.
 * Strict rules:
 *   - Percentages → exactly 2 decimal places (0.485698... → "0.49")
 *   - CTR / rate  → 2 decimal places
 *   - Counts      → compact with up to 1 decimal (1.2K, 4.5M)
 *   - null/undef  → "0"
 *
 * Pass `dataKey` (e.g. 'ctr', 'impressions', 'clicks', 'landingCount',
 * 'conversions') so the formatter picks the right rule.
 */
export function formatChartValue(
  value: number | string | null | undefined,
  dataKey?: string
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const key = String(dataKey || '').toLowerCase();
  if (key === 'ctr' || key.includes('rate') || key.includes('percent')) {
    return `${n.toFixed(2)}%`;
  }
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
