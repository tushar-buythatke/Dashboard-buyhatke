export interface ServeStrategyMeta {
  value: number;
  label: string;
  desc: string;
}

// Mirrors V2_API_DOCS.md §2 (serveStrategy valid values) / ADS_V2_FIELD_GUIDE.md §7.
export const SERVE_STRATEGY_META: ServeStrategyMeta[] = [
  { value: 0, label: 'Banner', desc: 'Creative + landing URL only. No product list.' },
  { value: 1, label: 'Product', desc: 'Serves with a product list matched to user interest.' },
  { value: 2, label: 'Coupon', desc: 'Coupon offer. Requires a location match to serve.' },
  { value: 3, label: 'Flight', desc: 'Served via the separate flight path, not the normal query.' },
  { value: 4, label: 'Category-locked', desc: "Banner that serves only when the request's category is in this ad's categories." },
  { value: 5, label: 'Deals', desc: 'Deals-style ad — served as a special offer listing.' },
  { value: 6, label: 'Keyword-targeted', desc: 'Matched against the serve request keywords. Requires at least one keyword.' },
];

export const getServeStrategyLabel = (value: number | undefined | null): string =>
  SERVE_STRATEGY_META.find((s) => s.value === value)?.label ?? 'Unknown';
