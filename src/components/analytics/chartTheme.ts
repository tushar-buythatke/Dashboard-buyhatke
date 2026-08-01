/**
 * HALO chart theme — the single source of truth every analytics chart imports.
 *
 * Read src/styles/halo.css + docs/HALO_SPEC.md §6 before touching this file.
 * Everything here is derived from `--h-*` CSS custom properties at runtime so
 * charts recolor automatically when `.dark` toggles on <html> — call
 * `useHaloChartPalette(theme)` with the current theme string from
 * `useTheme()` (src/context/ThemeContext.tsx) so the palette is memoized per
 * theme, not re-read on every render.
 */
import { createElement, useMemo, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { BarChart3, type LucideProps } from 'lucide-react';

// This file is plain .ts (no JSX transform), so every component below is
// built with `createElement` instead of JSX syntax.

/* ============================================================
   PALETTE
   ============================================================ */

export interface HaloChartPalette {
  /** Ordered series colors — spec §6: iris, cyan, mint, amber, violet, coral. */
  series: string[];
  ink: string;
  ink2: string;
  ink3: string;
  inkInv: string;
  line: string;
  lineAccent: string;
  surface: string;
  surface2: string;
  surface3: string;
  pos: string;
  neg: string;
  warn: string;
  info: string;
  tint: string;
  tint2: string;
}

const FALLBACK_PALETTE: HaloChartPalette = {
  series: ['#5b4bff', '#00bfe0', '#10c78f', '#f5a524', '#9b5bff', '#ff4a5e'],
  ink: '#0b0b14',
  ink2: '#565a70',
  ink3: '#8f93a8',
  inkInv: '#ffffff',
  line: 'rgba(14,16,40,0.07)',
  lineAccent: 'rgba(91,75,255,0.22)',
  surface: '#ffffff',
  surface2: '#f7f8fb',
  surface3: '#eef0f6',
  pos: '#10c78f',
  neg: '#ff4a5e',
  warn: '#f5a524',
  info: '#00bfe0',
  tint: 'rgba(91,75,255,0.06)',
  tint2: 'rgba(91,75,255,0.11)',
};

/** Series order, spec §6: `--h-iris-500`, `--h-cyan`, `--h-mint`, `--h-amber`, `--h-violet`, `--h-coral`. */
const SERIES_VAR_NAMES = ['--h-iris-500', '--h-cyan', '--h-mint', '--h-amber', '--h-violet', '--h-coral'];

/**
 * Read the live palette off `document.documentElement`. Cheap but not free —
 * call through `useHaloChartPalette` in components so it only re-runs when
 * the theme actually flips.
 */
export function readHaloChartPalette(): HaloChartPalette {
  if (typeof window === 'undefined' || typeof document === 'undefined') return FALLBACK_PALETTE;
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    series: SERIES_VAR_NAMES.map((name, i) => v(name, FALLBACK_PALETTE.series[i])),
    ink: v('--h-ink', FALLBACK_PALETTE.ink),
    ink2: v('--h-ink-2', FALLBACK_PALETTE.ink2),
    ink3: v('--h-ink-3', FALLBACK_PALETTE.ink3),
    inkInv: v('--h-ink-inv', FALLBACK_PALETTE.inkInv),
    line: v('--h-line', FALLBACK_PALETTE.line),
    lineAccent: v('--h-line-accent', FALLBACK_PALETTE.lineAccent),
    surface: v('--h-surface', FALLBACK_PALETTE.surface),
    surface2: v('--h-surface-2', FALLBACK_PALETTE.surface2),
    surface3: v('--h-surface-3', FALLBACK_PALETTE.surface3),
    pos: v('--h-pos', FALLBACK_PALETTE.pos),
    neg: v('--h-neg', FALLBACK_PALETTE.neg),
    warn: v('--h-warn', FALLBACK_PALETTE.warn),
    info: v('--h-info', FALLBACK_PALETTE.info),
    tint: v('--h-tint', FALLBACK_PALETTE.tint),
    tint2: v('--h-tint-2', FALLBACK_PALETTE.tint2),
  };
}

/**
 * Memoized live palette. Pass the current theme value (e.g. from
 * `useTheme().theme`) as the dependency key so this re-reads the CSS custom
 * properties exactly once per theme flip, never per render.
 */
export function useHaloChartPalette(themeKey: string | number = 'light'): HaloChartPalette {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => readHaloChartPalette(), [themeKey]);
}

/** Get the Nth series color, wrapping around the 6-color order. */
export function seriesColor(palette: HaloChartPalette, index: number): string {
  return palette.series[index % palette.series.length];
}

/** Stable, collision-free gradient/filter id for a chart instance. */
export function haloGradientId(kind: string, uid: string, index?: number | string): string {
  return `halo-${kind}-${uid}${index !== undefined ? `-${index}` : ''}`;
}

/* ============================================================
   RECHARTS PROP PRESETS — spec §6
   ============================================================ */

/** Horizontal-only dashed grid, no vertical lines. */
export const haloGridProps = {
  horizontal: true,
  vertical: false,
  stroke: 'var(--h-line)',
  strokeDasharray: '3 6',
} as const;

/** Axis: 11px tertiary-ink ticks, no axis line, no tick line. */
export const haloAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: 'var(--h-ink-3)' },
} as const;

export const haloXAxisProps = { ...haloAxisProps, dy: 8 } as const;
export const haloYAxisProps = { ...haloAxisProps, dx: -4 } as const;

/** Bars: rounded caps, capped width. Combine with a gradient `fill`. */
export const haloBarProps = {
  radius: [6, 6, 0, 0] as [number, number, number, number],
  maxBarSize: 34,
} as const;

/** Lines: 2.5px stroke, no resting dots, active dot with a white ring. */
export function haloLineProps(color: string, palette: HaloChartPalette) {
  return {
    strokeWidth: 2.5,
    dot: false,
    activeDot: { r: 4, fill: color, stroke: palette.surface, strokeWidth: 2 },
  } as const;
}

/** Mount-only entrance animation — never on re-render. */
export const haloAnimationProps = { isAnimationActive: true, animationDuration: 600, animationEasing: 'ease-out' } as const;
export const haloNoAnimationProps = { isAnimationActive: false } as const;

/* ============================================================
   GRADIENT <defs> HELPERS
   ============================================================ */

/** Bar fill: iris 90% opacity → 25% opacity, top to bottom. */
export function HaloBarGradient({ id, color }: { id: string; color: string }) {
  return createElement(
    'linearGradient',
    { id, x1: '0', y1: '0', x2: '0', y2: '1' },
    createElement('stop', { offset: '0%', stopColor: color, stopOpacity: 0.9 }),
    createElement('stop', { offset: '100%', stopColor: color, stopOpacity: 0.25 })
  );
}

/** Area fill: 22% opacity → 0%, top to bottom. */
export function HaloAreaGradient({ id, color }: { id: string; color: string }) {
  return createElement(
    'linearGradient',
    { id, x1: '0', y1: '0', x2: '0', y2: '1' },
    createElement('stop', { offset: '0%', stopColor: color, stopOpacity: 0.22 }),
    createElement('stop', { offset: '100%', stopColor: color, stopOpacity: 0 })
  );
}

/* ============================================================
   TOOLTIP — replaces every default Recharts tooltip
   ============================================================ */

export interface HaloTooltipEntry {
  color?: string;
  fill?: string;
  name?: ReactNode;
  value?: number | string | Array<number | string>;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface HaloTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: HaloTooltipEntry[];
  /** Format the top label (defaults to raw label, uppercased by CSS). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelFormatter?: (label: string | number, ...rest: any[]) => ReactNode;
  /** Format one entry's value. Defaults to raw value with `.num`. */
  valueFormatter?: (value: HaloTooltipEntry['value'], entry: HaloTooltipEntry) => ReactNode;
  /** Override the dot color per entry (defaults to entry.color ?? entry.fill). */
  colorForEntry?: (entry: HaloTooltipEntry) => string;
  /** Override the series name per entry. */
  nameForEntry?: (entry: HaloTooltipEntry) => ReactNode;
  /** Cap the number of rows shown before collapsing into "+N more". */
  maxRows?: number;
}

/**
 * The `.halo-card` tooltip shell — 12px radius, `--h-sh-3`, uppercase 10px
 * label, `.num` values with a colored dot per series. Pass this as the
 * `content` prop of Recharts' `<Tooltip>` on every chart. Never render the
 * library default.
 */
export function HaloTooltip({
  active,
  label,
  payload,
  labelFormatter,
  valueFormatter,
  colorForEntry,
  nameForEntry,
  maxRows = 8,
}: HaloTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.slice(0, maxRows);
  const overflow = payload.length - rows.length;

  const shellStyle: CSSProperties = {
    borderRadius: 12,
    boxShadow: 'var(--h-sh-3)',
    background: 'var(--h-surface)',
    padding: '10px 12px',
    minWidth: 168,
    maxWidth: 280,
  };

  const labelNode =
    label !== undefined && label !== null
      ? createElement(
          'div',
          {
            className: 'halo-eyebrow',
            style: { marginBottom: 7, paddingBottom: 6, borderBottom: '1px solid var(--h-line)' },
          },
          labelFormatter ? labelFormatter(label) : String(label)
        )
      : null;

  const rowNodes = rows.map((entry, i) => {
    const color = colorForEntry ? colorForEntry(entry) : entry.color || entry.fill || FALLBACK_PALETTE.series[0];
    const name = nameForEntry ? nameForEntry(entry) : entry.name;
    const value = Array.isArray(entry.value) ? entry.value[0] : entry.value;
    return createElement(
      'div',
      {
        key: `${String(entry.dataKey ?? entry.name)}-${i}`,
        // minWidth: 0 overrides the browser default of `min-width: auto` on
        // flex/grid items — without it, a row never shrinks below its content's
        // natural width no matter what overflow/ellipsis rules its children have,
        // and the value column gets pushed outside the tooltip shell.
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, minWidth: 0 },
      },
      createElement(
        'span',
        { style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: '1 1 auto', overflow: 'hidden' } },
        createElement('span', {
          style: { width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 },
          'aria-hidden': true,
        }),
        createElement(
          'span',
          {
            style: {
              fontSize: 11.5,
              color: 'var(--h-ink-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          name
        )
      ),
      createElement(
        'span',
        { className: 'num', style: { fontSize: 12, fontWeight: 600, color: 'var(--h-ink)', flexShrink: 0 } },
        valueFormatter ? valueFormatter(value, entry) : String(value)
      )
    );
  });

  const overflowNode =
    overflow > 0
      ? createElement(
          'div',
          {
            style: {
              fontSize: 10,
              color: 'var(--h-ink-3)',
              textAlign: 'center',
              paddingTop: 4,
              borderTop: '1px solid var(--h-line)',
            },
          },
          `+${overflow} more`
        )
      : null;

  return createElement(
    'div',
    { className: 'halo-card', style: shellStyle },
    labelNode,
    createElement('div', { style: { display: 'grid', gap: 5, minWidth: 0 } }, ...rowNodes, overflowNode)
  );
}

/** Cursor highlight for bar charts — soft iris tint behind the hovered bar. */
export const haloBarCursor = { fill: 'var(--h-tint)', radius: 6 } as const;
/** Cursor highlight for line/area charts — dashed iris guide line. */
export const haloLineCursor = { stroke: 'var(--h-iris-500)', strokeWidth: 1.5, strokeDasharray: '4 3', strokeOpacity: 0.35 } as const;

/* ============================================================
   LOADING / EMPTY STATES
   ============================================================ */

/** `.halo-skeleton` block shaped like the chart it's replacing. */
export function HaloChartSkeleton({ height = 280 }: { height?: number }) {
  return createElement(
    'div',
    {
      style: { height, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'flex-end', padding: '0 4px 4px' },
    },
    createElement('div', { className: 'halo-skeleton', style: { height: '100%', width: '100%' } })
  );
}

/** The spec's empty-state pattern, scaled down for a chart panel. Never render an axis with no data. */
export function HaloChartEmpty({
  height = 280,
  title = 'No data yet',
  subtitle = 'Try a different date range or filter',
  icon: Icon = BarChart3,
}: {
  height?: number;
  title?: string;
  subtitle?: string;
  icon?: ComponentType<LucideProps>;
}) {
  return createElement(
    'div',
    { style: { height }, className: 'flex flex-col items-center justify-center gap-2.5 text-center' },
    createElement('div', { className: 'halo-chip halo-chip-lg' }, createElement(Icon, { className: 'h-5 w-5', strokeWidth: 1.75 })),
    createElement(
      'div',
      null,
      createElement('p', { className: 'halo-heading', style: { fontSize: 13 } }, title),
      createElement('p', { className: 'halo-subtitle mt-0.5' }, subtitle)
    )
  );
}
