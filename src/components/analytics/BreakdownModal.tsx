import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { X, TrendingUp, Users, Monitor, MapPin, Calendar, Plane } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { coerceName, formatCount, isUnspecified } from '@/lib/format';
import { getPlatformName } from '@/utils/platform';

interface BreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Array<{ name: unknown; value: number; percentage?: number }>;
}

const COLORS = [
  '#7c6feb', '#d94684', '#38bdf8', '#2dd4bf',
  '#fbbf24', '#a99df5', '#e879a0', '#5b4fe0'
];

const getChartIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('gender')) return Users;
  if (t.includes('platform')) return Monitor;
  if (t.includes('location')) return MapPin;
  if (t.includes('age')) return Calendar;
  if (t.includes('landing')) return Plane;
  return TrendingUp;
};

const formatPercentage = (value: number) => Number(value || 0).toFixed(2);

const easeOut = [0.22, 1, 0.36, 1] as const;

const CustomTooltip = memo(({ active, payload }: any) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const raw = payload[0].payload;
  const { value = 0, percentage = 0 } = raw;
  const name = coerceName(raw.name, 'Unknown');
  const fillColor = payload[0].fill || '#7c6feb';
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-panel)]/95 backdrop-blur-xl shadow-[var(--shadow-3)] px-2.5 py-1.5 min-w-[140px]">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fillColor }} />
        <p className="text-[11px] font-semibold text-[var(--text-1)] truncate max-w-[160px]">
          {name}
        </p>
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-[12.5px] font-semibold tabular-nums text-[var(--text-1)]">
          {formatCount(value)}
        </p>
        <p className="text-[10px] font-semibold tabular-nums" style={{ color: fillColor }}>
          {formatPercentage(percentage)}%
        </p>
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'BreakdownModalTooltip';

export const BreakdownModal = memo<BreakdownModalProps>(({ open, onOpenChange, title, data }) => {
  const IconComponent = useMemo(() => getChartIcon(title), [title]);

  const enriched = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const isPlatform = title.toLowerCase().includes('platform');
    return [...data]
      .map((item) => ({
        ...item,
        name: isPlatform
          ? (typeof item.name === 'number' || (typeof item.name === 'string' && !isNaN(Number(item.name)))
              ? getPlatformName(Number(item.name))
              : coerceName(item.name, 'Unknown'))
          : coerceName(item.name, 'Unknown'),
        isMissing: isUnspecified(item.name),
      }))
      .filter((item) => typeof item.value === 'number' && item.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({ ...item, color: COLORS[index % COLORS.length] }));
  }, [data, title]);

  const totalValue = useMemo(
    () => enriched.reduce((sum, item) => sum + (item.value || 0), 0),
    [enriched]
  );
  const topItem = enriched[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[min(96vw,900px)] max-h-[88vh] overflow-hidden p-0 border-[var(--line)] bg-[var(--bg-panel)] shadow-[var(--shadow-velvet-lg)]"
      >
        <DialogTitle className="sr-only">{title} breakdown</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3.5 bg-gradient-to-br from-[var(--bg-panel-2)] to-[var(--bg-panel)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-tint)] border border-[var(--line-violet)] flex-shrink-0">
              <IconComponent className="h-4 w-4 text-[var(--indigo-500)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-3)]">
                Expanded view
              </p>
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-1)] truncate">
                {title}
              </h2>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-panel-2)] transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] max-h-[calc(88vh-64px)]">
          {/* Left: enlarged donut + summary */}
          <div className="relative p-5 border-b lg:border-b-0 lg:border-r border-[var(--line)] bg-gradient-to-br from-[#fdfcff] to-[var(--bg-panel-2)] dark:from-[#1a1530] dark:to-[#13102a]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-3)]">
                Distribution
              </p>
              {topItem && (
                <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--text-2)]">
                  <span className="font-mono">{enriched.length} categories</span>
                  <span className="text-[var(--text-3)]">·</span>
                  <span className="font-semibold tabular-nums text-[var(--text-1)]">
                    {formatCount(totalValue)} total
                  </span>
                </div>
              )}
            </div>

            <div className="relative h-[280px] w-full">
              {enriched.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {enriched.map((item, i) => (
                          <linearGradient key={i} id={`modal-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={item.color} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={item.color} stopOpacity={0.65} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={enriched}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="78%"
                        innerRadius="52%"
                        paddingAngle={1.5}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={500}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {enriched.map((_, index) => (
                          <Cell
                            key={`m-cell-${index}`}
                            fill={`url(#modal-grad-${index})`}
                            stroke="var(--bg-panel)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none', pointerEvents: 'none' }} />
                    </PieChart>
                  </ResponsiveContainer>

                  {topItem && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[9.5px] uppercase tracking-[0.15em] font-semibold text-[var(--text-3)] leading-none">
                        Top
                      </p>
                      <p className="text-[24px] font-bold tabular-nums text-[var(--text-1)] leading-none mt-1">
                        {formatPercentage(topItem.percentage || 0)}%
                      </p>
                      <p className="text-[10.5px] max-w-[60%] truncate leading-none mt-1.5 text-[var(--text-2)]">
                        {topItem.name}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-3)]">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Right: full ranked table */}
          <div className="overflow-y-auto scrollbar-thin">
            <div className="px-5 py-4 border-b border-[var(--line)] bg-[var(--bg-panel-2)]/40">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-3)]">
                All categories · ranked
              </p>
            </div>
            <div className="p-3 space-y-1">
              {enriched.length === 0 ? (
                <div className="py-12 text-center text-[12px] text-[var(--text-3)]">
                  No data
                </div>
              ) : (
                enriched.map((item, idx) => {
                  const pct = formatPercentage(item.percentage || 0);
                  const pctNum = Number(pct);
                  const barWidth = totalValue > 0 ? (item.value / topItem.value) * 100 : 0;
                  return (
                    <motion.div
                      key={`${item.name}-${idx}`}
                      initial={{ opacity: 0, x: 4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.025, 0.4), duration: 0.3, ease: easeOut }}
                      className="group relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] p-3 hover:border-[var(--line-violet)] transition-colors"
                    >
                      <div
                        className="absolute inset-y-0 left-0 opacity-[0.08] group-hover:opacity-[0.14] transition-opacity"
                        style={{ width: `${barWidth}%`, background: item.color }}
                      />
                      <div className="relative flex items-center gap-3">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[10.5px] font-bold tabular-nums text-[var(--text-2)] bg-[var(--bg-panel-2)] border border-[var(--line)]">
                          {idx + 1}
                        </div>
                        <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12.5px] font-semibold truncate ${item.isMissing ? 'text-[var(--text-3)] italic' : 'text-[var(--text-1)]'}`}>
                            {item.name}
                          </p>
                          <p className="font-mono text-[10.5px] text-[var(--text-3)] mt-0.5">
                            {formatCount(item.value)} volume
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[13.5px] font-bold tabular-nums text-[var(--text-1)]">
                            {pct}%
                          </p>
                          <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-[var(--bg-panel-2)]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pctNum}%`, background: item.color }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

BreakdownModal.displayName = 'BreakdownModal';
