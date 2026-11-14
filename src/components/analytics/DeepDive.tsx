import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Crown, Flame, Grid3x3, PieChart, Activity, Trophy } from 'lucide-react';
import type { TrendChartSeries } from '@/types';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';

type Metric = 'impressions' | 'clicks' | 'ctr';
type Tab = 'leaderboard' | 'heat' | 'share' | 'momentum' | 'pulse';

const TABS: { key: Tab; label: string; icon: typeof Trophy }[] = [
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { key: 'heat', label: 'Heat grid', icon: Grid3x3 },
  { key: 'share', label: 'Share of voice', icon: PieChart },
  { key: 'momentum', label: 'Momentum', icon: Flame },
  { key: 'pulse', label: 'Pulse', icon: Activity },
];

const SHARE_COLORS = ['#e5603f', '#141413', '#2f6bff', '#f39a6a', '#7a7870', '#e2477f', '#14a35f', '#eba12b'];

interface Row {
  name: string;
  impressions: number;
  clicks: number;
  ctr: number;
  points: { date: string; impressions: number; clicks: number; ctr: number }[];
}

const fmt = (m: Metric, v: number) => (m === 'ctr' ? `${v.toFixed(2)}%` : formatCount(v));
const shortDate = (d: string) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function useRows(series: TrendChartSeries[]): { rows: Row[]; dates: string[] } {
  return useMemo(() => {
    const dateSet = new Set<string>();
    const rows = series.map((s) => {
      const points = (s.data || []).map((p) => {
        dateSet.add(p.date);
        const impressions = Number(p.impressions) || 0;
        const clicks = Number(p.clicks) || 0;
        return { date: p.date, impressions, clicks, ctr: impressions > 0 ? (clicks / impressions) * 100 : 0 };
      });
      const impressions = points.reduce((a, p) => a + p.impressions, 0);
      const clicks = points.reduce((a, p) => a + p.clicks, 0);
      return { name: s.name, impressions, clicks, ctr: impressions > 0 ? (clicks / impressions) * 100 : 0, points };
    });
    const dates = [...dateSet].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return { rows, dates };
  }, [series]);
}

function Spark({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <span className={cn('block h-7 w-24', className)} />;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 96},${26 - (v / max) * 24}`).join(' ');
  return (
    <svg viewBox="0 0 96 28" className={cn('h-7 w-24 overflow-visible', className)} preserveAspectRatio="none">
      <polyline points={`0,28 ${pts} 96,28`} fill="var(--h-tint-2)" stroke="none" />
      <polyline points={pts} fill="none" stroke="var(--h-iris-500)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Leaderboard({ rows, metric }: { rows: Row[]; metric: Metric }) {
  const [all, setAll] = useState(false);
  const sorted = [...rows].sort((a, b) => b[metric] - a[metric]).filter((r) => r.impressions > 0 || r[metric] > 0);
  const shown = all ? sorted : sorted.slice(0, 10);
  const max = Math.max(...sorted.map((r) => r[metric]), 1);
  const total = sorted.reduce((a, r) => a + r.impressions, 0) || 1;

  return (
    <div>
      <div className="space-y-1.5">
        {shown.map((r, i) => (
          <motion.div
            key={r.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.35 }}
            className="group grid grid-cols-[36px_minmax(0,1.4fr)_minmax(0,2fr)_96px_72px] items-center gap-4 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-[var(--h-surface-2)] max-md:grid-cols-[36px_minmax(0,1fr)_72px]"
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold num',
                i === 0 ? 'bg-[var(--h-iris-500)] text-white' : i < 3 ? 'bg-[var(--e-ink-pill)] text-[var(--h-canvas)]' : 'bg-[var(--h-surface-3)] text-[var(--h-ink-2)]'
              )}
            >
              {i === 0 ? <Crown className="h-4 w-4" /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-[var(--h-ink)]" title={r.name}>{r.name}</p>
              <p className="text-[11.5px] text-[var(--h-ink-3)] num">
                {((r.impressions / total) * 100).toFixed(1)}% share · {formatCount(r.clicks)} clicks
              </p>
            </div>
            <div className="relative h-9 overflow-hidden rounded-full bg-[var(--h-surface-2)] max-md:hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, (r[metric] / max) * 100)}%` }}
                transition={{ duration: 0.8, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                className={cn('h-full rounded-full', i === 0 ? 'bg-[var(--h-iris-500)]' : 'e-hatch bg-[var(--h-tint)] text-[var(--h-iris-200)]')}
              />
              <span className="absolute inset-y-0 left-1 flex items-center">
                <span className="rounded-full bg-[var(--h-surface)] px-3 py-1 text-[12.5px] font-bold text-[var(--h-ink)] shadow-[0_1px_0_var(--h-line),0_4px_10px_-4px_rgba(0,0,0,.25)] num">
                  {fmt(metric, r[metric])}
                </span>
              </span>
            </div>
            <Spark values={r.points.map((p) => p[metric])} className="max-md:hidden" />
            <span
              className={cn(
                'justify-self-end rounded-full px-2.5 py-1 text-[11.5px] font-bold num',
                r.ctr >= 3 ? 'bg-[var(--h-pos-soft)] text-[var(--h-mint)]' : r.ctr >= 1 ? 'bg-[var(--h-warn-soft)] text-[var(--h-amber)]' : 'bg-[var(--h-surface-3)] text-[var(--h-ink-2)]'
              )}
            >
              {r.ctr.toFixed(1)}%
            </span>
          </motion.div>
        ))}
      </div>
      {sorted.length > 10 && (
        <button onClick={() => setAll((v) => !v)} className="btn-halo-ghost btn-halo-sm mx-auto mt-4 flex">
          {all ? 'Show top 10' : `Show all ${sorted.length}`}
        </button>
      )}
    </div>
  );
}

function HeatGrid({ rows, dates, metric }: { rows: Row[]; dates: string[]; metric: Metric }) {
  const top = [...rows].sort((a, b) => b.impressions - a.impressions).slice(0, 14);
  const [hover, setHover] = useState<{ r: string; d: string; v: number } | null>(null);
  const max = Math.max(...top.flatMap((r) => r.points.map((p) => p[metric])), 1);
  const lookup = (r: Row, d: string) => r.points.find((p) => p.date === d)?.[metric] ?? 0;
  const step = Math.ceil(dates.length / 10);

  return (
    <div className="relative">
      <div className="mb-4 flex h-6 items-center text-[12.5px] text-[var(--h-ink-2)]">
        {hover ? (
          <span>
            <b className="text-[var(--h-ink)]">{hover.r}</b> · {shortDate(hover.d)} · <b className="text-[var(--h-iris-500)] num">{fmt(metric, hover.v)}</b>
          </span>
        ) : (
          <span className="text-[var(--h-ink-3)]">Hover a cell. Top 14 by impressions, darker = more {metric === 'ctr' ? 'CTR' : metric}.</span>
        )}
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[640px]">
          {top.map((r) => (
            <div key={r.name} className="grid items-center gap-3" style={{ gridTemplateColumns: '180px 1fr' }}>
              <span className="truncate py-[3px] text-[12.5px] font-medium text-[var(--h-ink-2)]" title={r.name}>{r.name}</span>
              <div className="grid gap-[4px]" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0,1fr))` }}>
                {dates.map((d) => {
                  const v = lookup(r, d);
                  const t = v / max;
                  return (
                    <span
                      key={d}
                      onMouseEnter={() => setHover({ r: r.name, d, v })}
                      onMouseLeave={() => setHover(null)}
                      className="aspect-square min-h-[14px] rounded-[5px] transition-transform hover:scale-125 hover:ring-2 hover:ring-[var(--h-ink)]"
                      style={{
                        background: v === 0 ? 'var(--h-surface-3)' : `color-mix(in srgb, var(--h-iris-500) ${Math.round(14 + t * 86)}%, var(--h-surface-2))`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-2 grid gap-3" style={{ gridTemplateColumns: '180px 1fr' }}>
            <span />
            <div className="grid gap-[4px]" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0,1fr))` }}>
              {dates.map((d, i) => (
                <span key={d} className="truncate text-center text-[10px] text-[var(--h-ink-3)]">{i % step === 0 ? shortDate(d) : ''}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareOfVoice({ rows, metric }: { rows: Row[]; metric: Exclude<Metric, 'ctr'> }) {
  const sorted = [...rows].sort((a, b) => b[metric] - a[metric]);
  const total = sorted.reduce((a, r) => a + r[metric], 0) || 1;
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7).reduce((a, r) => a + r[metric], 0);
  const parts = [...top.map((r) => ({ name: r.name, v: r[metric] })), ...(rest > 0 ? [{ name: `${sorted.length - 7} others`, v: rest }] : [])];

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] text-[var(--h-ink-3)]">Leader owns</p>
          <p className="font-[var(--h-font-display)] text-[clamp(3rem,6vw,5rem)] font-medium leading-none tracking-[-0.04em] text-[var(--h-ink)] num">
            {((parts[0]?.v ?? 0) / total * 100).toFixed(0)}<span className="text-[var(--h-iris-500)]">%</span>
          </p>
          <p className="mt-1 max-w-xs truncate text-[13px] font-bold text-[var(--h-ink-2)]">{parts[0]?.name}</p>
        </div>
        <p className="text-right text-[12px] text-[var(--h-ink-3)]">Total {metric}<br /><b className="text-[18px] text-[var(--h-ink)] num">{formatCount(total)}</b></p>
      </div>
      <div className="mt-6 flex h-16 w-full overflow-hidden rounded-[18px]">
        {parts.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ flexGrow: 0 }}
            animate={{ flexGrow: p.v }}
            transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            title={`${p.name}: ${((p.v / total) * 100).toFixed(1)}%`}
            className={cn('relative h-full min-w-[3px] border-r-2 border-[var(--h-surface)] last:border-r-0', i === parts.length - 1 && rest > 0 && 'e-hatch text-[var(--h-ink-3)]')}
            style={{ flexBasis: 0, background: i === parts.length - 1 && rest > 0 ? 'var(--h-surface-3)' : SHARE_COLORS[i % SHARE_COLORS.length] }}
          />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {parts.map((p, i) => (
          <div key={p.name} className="flex min-w-0 items-center gap-2.5">
            <span className="h-3 w-3 flex-none rounded-full" style={{ background: i === parts.length - 1 && rest > 0 ? 'var(--h-ink-3)' : SHARE_COLORS[i % SHARE_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--h-ink-2)]" title={p.name}>{p.name}</span>
            <span className="text-[12.5px] font-bold text-[var(--h-ink)] num">{((p.v / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Momentum({ rows, metric }: { rows: Row[]; metric: Metric }) {
  // Compare the latest third of the period against the earliest third.
  const moves = rows
    .map((r) => {
      const n = r.points.length;
      if (n < 2) return null;
      const k = Math.max(1, Math.floor(n / 3));
      const avg = (ps: typeof r.points) => ps.reduce((a, p) => a + p[metric], 0) / ps.length;
      const before = avg(r.points.slice(0, k));
      const after = avg(r.points.slice(-k));
      if (before === 0 && after === 0) return null;
      const change = before === 0 ? 100 : ((after - before) / before) * 100;
      return { name: r.name, change, after, values: r.points.map((p) => p[metric]) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const risers = [...moves].sort((a, b) => b.change - a.change).filter((m) => m.change > 0).slice(0, 6);
  const fallers = [...moves].sort((a, b) => a.change - b.change).filter((m) => m.change < 0).slice(0, 6);

  const col = (title: string, list: typeof moves, up: boolean) => (
    <div className="rounded-[22px] bg-[var(--h-surface-2)] p-4">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-white', up ? 'bg-[var(--h-mint)]' : 'bg-[var(--h-coral)]')}>
          {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        </span>
        <p className="font-[var(--h-font-display)] text-[18px] font-medium text-[var(--h-ink)]">{title}</p>
      </div>
      {list.length === 0 ? (
        <p className="px-1 py-6 text-[12.5px] text-[var(--h-ink-3)]">Nothing moving this way.</p>
      ) : (
        <div className="space-y-1">
          {list.map((m) => (
            <div key={m.name} className="flex items-center gap-3 rounded-[14px] bg-[var(--h-surface)] px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[var(--h-ink)]" title={m.name}>{m.name}</p>
                <p className="text-[11px] text-[var(--h-ink-3)] num">now {fmt(metric, m.after)} / interval</p>
              </div>
              <Spark values={m.values} className="h-6 w-16" />
              <span className={cn('w-16 text-right text-[14px] font-bold num', up ? 'text-[var(--h-mint)]' : 'text-[var(--h-coral)]')}>
                {up ? '+' : ''}{Math.abs(m.change) >= 1000 ? `${(m.change / 1000).toFixed(1)}k` : m.change.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {col('Risers', risers, true)}
      {col('Fallers', fallers, false)}
    </div>
  );
}

function Pulse({ rows, dates, metric }: { rows: Row[]; dates: string[]; metric: Metric }) {
  const totals = dates.map((d) => {
    let imp = 0, clk = 0;
    rows.forEach((r) => {
      const p = r.points.find((x) => x.date === d);
      if (p) { imp += p.impressions; clk += p.clicks; }
    });
    return { d, v: metric === 'impressions' ? imp : metric === 'clicks' ? clk : imp > 0 ? (clk / imp) * 100 : 0 };
  });
  const max = Math.max(...totals.map((t) => t.v), 1);
  const avg = totals.reduce((a, t) => a + t.v, 0) / Math.max(totals.length, 1);
  const peak = totals.reduce((a, t) => (t.v > a.v ? t : a), totals[0] ?? { d: '', v: 0 });
  const DOTS = 12;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <div className="flex flex-col justify-between gap-4">
        <div>
          <p className="text-[12px] text-[var(--h-ink-3)]">Average / interval</p>
          <p className="font-[var(--h-font-display)] text-[clamp(2.4rem,4vw,3.6rem)] font-medium leading-none tracking-[-0.04em] text-[var(--h-ink)] num">{fmt(metric, avg)}</p>
        </div>
        <div className="rounded-[18px] bg-[var(--e-ink-pill)] p-4 text-[var(--h-canvas)]">
          <p className="text-[11px] opacity-60">Peak</p>
          <p className="text-[18px] font-bold num">{fmt(metric, peak.v)}</p>
          <p className="text-[12px] opacity-70">{peak.d ? shortDate(peak.d) : '-'}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-[520px] items-end gap-[6px]">
          {totals.map((t, i) => {
            const lit = Math.round((t.v / max) * DOTS);
            const isPeak = t.d === peak.d;
            return (
              <div key={t.d} className="group flex flex-1 flex-col items-center gap-[4px]" title={`${shortDate(t.d)}: ${fmt(metric, t.v)}`}>
                {Array.from({ length: DOTS }).map((_, n) => {
                  const on = DOTS - n <= lit;
                  return (
                    <motion.span
                      key={n}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.02 + (DOTS - n) * 0.015 }}
                      className={cn(
                        'aspect-square w-full max-w-[14px] rounded-full transition-colors',
                        on ? (isPeak ? 'bg-[var(--h-iris-500)]' : 'bg-[var(--h-iris-300)] group-hover:bg-[var(--h-iris-500)]') : 'bg-[var(--h-surface-3)]'
                      )}
                    />
                  );
                })}
                <span className="mt-1 h-3 text-[9.5px] text-[var(--h-ink-3)]">
                  {i % Math.ceil(totals.length / 8) === 0 ? shortDate(t.d) : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DeepDive({ series, entity = 'campaign' }: { series: TrendChartSeries[]; entity?: string }) {
  const { rows, dates } = useRows(series);
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [metric, setMetric] = useState<Metric>('impressions');

  if (!rows.length) return null;
  const shareMetric = metric === 'ctr' ? 'impressions' : metric;
  const needsTime = dates.length < 3 && (tab === 'heat' || tab === 'momentum' || tab === 'pulse');

  return (
    <div className="halo-card overflow-hidden">
      <div className="flex flex-col gap-5 p-6 pb-2 lg:flex-row lg:items-end lg:justify-between lg:p-8 lg:pb-2">
        <div>
          <p className="text-[12px] text-[var(--h-ink-3)]">{rows.length} {entity}s · {dates.length} interval{dates.length === 1 ? '' : 's'}</p>
          <h2 className="mt-1 text-[clamp(2rem,3.4vw,3rem)] font-medium leading-none tracking-[-0.035em] text-[var(--h-ink)]">
            Deep <span className="text-[var(--h-iris-500)]">dive</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="halo-segment" role="tablist">
            {(['impressions', 'clicks', 'ctr'] as Metric[]).map((m) => (
              <button key={m} role="tab" aria-selected={metric === m} onClick={() => setMetric(m)} className={`halo-segment-item ${metric === m ? 'is-active' : ''}`}>
                {m === 'ctr' ? 'CTR' : m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-6 py-4 lg:px-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex flex-none items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold transition-all',
              tab === t.key
                ? 'bg-[var(--e-ink-pill)] text-[var(--h-canvas)] shadow-[0_10px_22px_-10px_rgba(0,0,0,.5)]'
                : 'bg-[var(--h-surface-2)] text-[var(--h-ink-2)] hover:bg-[var(--h-surface-3)] hover:text-[var(--h-ink)]'
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-8 pt-2 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + metric}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {tab === 'leaderboard' && <Leaderboard rows={rows} metric={metric} />}
            {tab === 'share' && <ShareOfVoice rows={rows} metric={shareMetric} />}
            {needsTime ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[22px] bg-[var(--h-surface-2)] py-14 text-center">
                <p className="font-[var(--h-font-display)] text-[22px] font-medium text-[var(--h-ink)]">Needs more intervals</p>
                <p className="halo-subtitle max-w-sm">Only {dates.length} interval in range. Set Grouping to <b>Daily</b> and fetch again to light this up.</p>
              </div>
            ) : (
              <>
                {tab === 'heat' && <HeatGrid rows={rows} dates={dates} metric={metric} />}
                {tab === 'momentum' && <Momentum rows={rows} metric={metric} />}
                {tab === 'pulse' && <Pulse rows={rows} dates={dates} metric={metric} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
        {tab === 'share' && metric === 'ctr' && (
          <p className="mt-4 text-[11.5px] text-[var(--h-ink-3)]">Share of voice uses impressions — CTR isn't additive.</p>
        )}
      </div>
    </div>
  );
}
