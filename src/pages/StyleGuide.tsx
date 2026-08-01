import { useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  Download,
  MousePointer2,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useCountUp } from '@/hooks/useCountUp';

/**
 * Halo style guide — the visual contract, rendered.
 *
 * Route: /style. Every token and class in src/styles/halo.css appears here at
 * least once, so a regression is visible on one screen. Not linked from the
 * app nav; it is a development surface.
 */

const KPIS = [
  { label: 'Impressions', value: 1284930, delta: 12.4, icon: BarChart3 },
  { label: 'Clicks', value: 48211, delta: 4.8, icon: MousePointer2 },
  { label: 'Conversions', value: 3092, delta: -2.1, icon: Sparkles },
  { label: 'CTR', value: 3.75, delta: 0.6, icon: Activity, suffix: '%' },
];

function Kpi({ label, value, delta, icon: Icon, suffix, index }: any) {
  const spotlight = useSpotlight();
  const shown = useCountUp(value);
  const up = delta >= 0;

  return (
    <div
      className="halo-card halo-rail halo-spotlight halo-rise p-5"
      style={{ '--i': index } as React.CSSProperties}
      {...spotlight}
    >
      <div className="flex items-center justify-between">
        <span className="halo-chip">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <span className={`halo-delta ${up ? 'halo-delta-up' : 'halo-delta-down'}`}>
          <ArrowUpRight
            size={13}
            strokeWidth={2.25}
            style={{ transform: up ? undefined : 'rotate(90deg)' }}
          />
          {Math.abs(delta)}%
        </span>
      </div>
      <p className="halo-eyebrow mt-4">{label}</p>
      <p className="halo-metric mt-1.5">
        {suffix
          ? shown.toFixed(2)
          : Math.round(shown).toLocaleString('en-IN')}
        {suffix}
      </p>
      <p className="halo-subtitle mt-1">vs. previous 7 days</p>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="halo-card p-5">
      <p className="halo-eyebrow mb-4">{title}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export default function StyleGuide() {
  const [tab, setTab] = useState('overview');
  const spotlight = useSpotlight();

  const swatches = [
    ['Iris', '--h-iris-500'],
    ['Iris deep', '--h-iris-700'],
    ['Cyan', '--h-cyan'],
    ['Mint', '--h-mint'],
    ['Amber', '--h-amber'],
    ['Coral', '--h-coral'],
    ['Violet', '--h-violet'],
    ['Ink', '--h-ink'],
  ];

  return (
    <div className="relative min-h-screen">
      <div className="halo-backdrop" aria-hidden="true" />

      <div className="halo-page space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="halo-eyebrow">Design system</p>
            <h1 className="halo-title mt-1">
              Halo <span className="halo-gradient-text">reference</span>
            </h1>
            <p className="halo-subtitle mt-1.5">
              Every token and component in one place. Check here first when something looks off.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-halo-ghost">
              <Download size={15} strokeWidth={1.75} />
              Export
            </button>
            <button className="btn-halo">
              <Plus size={15} strokeWidth={1.75} />
              Create campaign
            </button>
          </div>
        </header>

        {/* KPI row — the most repeated unit in the product */}
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
          {KPIS.map((k, i) => (
            <Kpi key={k.label} {...k} index={i} />
          ))}
        </div>

        {/* Color */}
        <section className="halo-card p-5">
          <p className="halo-eyebrow mb-4">Color</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {swatches.map(([name, token]) => (
              <div key={token}>
                <div
                  className="h-16 w-full rounded-[var(--h-r)]"
                  style={{ background: `var(${token})`, boxShadow: 'var(--h-sh-2)' }}
                />
                <p className="halo-label mt-2">{name}</p>
                <p className="num text-[11px] text-[var(--h-ink-3)]">{token}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Type */}
        <section className="halo-card p-5">
          <p className="halo-eyebrow mb-4">Type</p>
          <div className="space-y-3">
            <h2 className="halo-title">Performance overview</h2>
            <h3 className="halo-heading">Section heading</h3>
            <p className="halo-subtitle max-w-xl">
              Body copy sits at 13px with tight tracking. Long descriptions stay under
              70 characters a line so they stay easy to scan.
            </p>
            <p className="halo-metric num">₹12,72,620</p>
            <p className="halo-label">Field label</p>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Row title="Buttons">
            <button className="btn-halo">Primary</button>
            <button className="btn-halo-soft">Soft</button>
            <button className="btn-halo-outline">Outline</button>
            <button className="btn-halo-ghost">Ghost</button>
            <button className="btn-halo-danger">
              <Trash2 size={14} strokeWidth={1.75} />
              Delete
            </button>
            <button className="btn-halo btn-halo-sm">Small</button>
            <button className="btn-halo-outline btn-halo-icon">
              <Search size={15} strokeWidth={1.75} />
            </button>
            <button className="btn-halo" disabled>
              Disabled
            </button>
          </Row>

          <Row title="Badges & status">
            <span className="halo-badge halo-badge-pos">
              <span className="halo-dot halo-dot-live" />
              Active
            </span>
            <span className="halo-badge halo-badge-warn">Paused</span>
            <span className="halo-badge halo-badge-neg">Failed</span>
            <span className="halo-badge halo-badge-info">Draft</span>
            <span className="halo-badge halo-badge-iris">Web extension</span>
            <span className="halo-badge">Archived</span>
            <span className="halo-chip">
              <Check size={15} strokeWidth={1.75} />
            </span>
            <span className="halo-chip-lg halo-chip">
              <Sparkles size={18} strokeWidth={1.75} />
            </span>
          </Row>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="halo-card p-5">
            <p className="halo-eyebrow mb-4">Controls</p>
            <div className="space-y-4">
              <div className="halo-segment halo-segment-accent">
                {['overview', 'breakdown', 'raw'].map((t) => (
                  <button
                    key={t}
                    className="halo-segment-item"
                    data-state={tab === t ? 'active' : undefined}
                    onClick={() => setTab(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search
                  size={15}
                  strokeWidth={1.75}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--h-ink-3)]"
                />
                <input className="halo-field halo-search" placeholder="Search campaigns" />
              </div>

              <div>
                <label className="halo-label mb-1.5 block">Campaign name</label>
                <input className="halo-field" defaultValue="Diwali sale — extension" />
              </div>

              <div>
                <label className="halo-label mb-1.5 block">Invalid field</label>
                <input className="halo-field is-invalid" defaultValue="—" />
                <p className="mt-1.5 text-[12px] text-[var(--h-coral)]">
                  Enter a budget above ₹0.
                </p>
              </div>
            </div>
          </section>

          <section className="halo-card overflow-hidden">
            <div className="halo-panel-head halo-rail-full">
              <div className="halo-panel-head-title">
                <span className="halo-chip">
                  <BarChart3 size={15} strokeWidth={1.75} />
                </span>
                <span className="halo-heading">Top campaigns</span>
              </div>
              <span className="halo-badge halo-badge-iris">7 days</span>
            </div>
            <table className="halo-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th className="col-num">Clicks</th>
                  <th className="col-num">CTR</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Diwali sale', 'pos', 'Active', 18420, '4.12'],
                  ['Flipkart cashback', 'warn', 'Paused', 9310, '2.88'],
                  ['Myntra EORS', 'pos', 'Active', 7204, '3.41'],
                ].map(([name, tone, status, clicks, ctr]: any) => (
                  <tr key={name}>
                    <td className="font-medium text-[var(--h-ink)]">{name}</td>
                    <td>
                      <span className={`halo-badge halo-badge-${tone}`}>{status}</span>
                    </td>
                    <td className="col-num num">{clicks.toLocaleString('en-IN')}</td>
                    <td className="col-num num">{ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="halo-card halo-card-interactive halo-spotlight p-5" {...spotlight}>
            <p className="halo-eyebrow">Interactive card</p>
            <p className="halo-heading mt-2">Move your cursor across me</p>
            <p className="halo-subtitle mt-1">
              Spotlight follows the pointer and the card lifts 2px.
            </p>
          </div>

          <div className="halo-card p-5">
            <p className="halo-eyebrow mb-3">Loading</p>
            <div className="space-y-2.5">
              <div className="halo-skeleton h-3 w-1/3" />
              <div className="halo-skeleton h-8 w-2/3" />
              <div className="halo-skeleton h-3 w-full" />
              <div className="mt-4 flex items-center gap-2">
                <span className="halo-spinner" />
                <span className="halo-subtitle">Fetching analytics</span>
              </div>
            </div>
          </div>

          <div className="halo-card flex flex-col items-center justify-center p-5 py-10 text-center">
            <span className="halo-chip halo-chip-lg">
              <Plus size={18} strokeWidth={1.75} />
            </span>
            <p className="halo-heading mt-3">No campaigns yet</p>
            <p className="halo-subtitle mt-1 max-w-[26ch]">
              Create your first campaign to start collecting performance data.
            </p>
            <button className="btn-halo mt-4">Create campaign</button>
          </div>
        </div>

        <section className="halo-card p-5">
          <p className="halo-eyebrow mb-4">Elevation</p>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {['--h-sh-1', '--h-sh-2', '--h-sh-3', '--h-sh-4'].map((s) => (
              <div
                key={s}
                className="flex h-24 items-center justify-center rounded-[var(--h-r-card)] bg-[var(--h-surface)]"
                style={{ boxShadow: `var(${s})` }}
              >
                <span className="num text-[11px] text-[var(--h-ink-3)]">{s}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
