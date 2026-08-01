import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { X, TrendingUp, Users, Monitor, MapPin, Calendar, Plane } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { coerceName, formatCount, isUnspecified } from '@/lib/format';
import { getPlatformName } from '@/utils/platform';
import { useTheme } from '@/context/ThemeContext';
import { useHaloChartPalette, seriesColor, HaloTooltip } from './chartTheme';

interface BreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Array<{ name: unknown; value: number; percentage?: number }>;
}

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

export const BreakdownModal = memo<BreakdownModalProps>(({ open, onOpenChange, title, data }) => {
  const { theme } = useTheme();
  const palette = useHaloChartPalette(theme);
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
      .map((item, index) => ({ ...item, color: seriesColor(palette, index) }));
  }, [data, title, palette]);

  const totalValue = useMemo(
    () => enriched.reduce((sum, item) => sum + (item.value || 0), 0),
    [enriched]
  );
  const topItem = enriched[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="halo-card halo-card-raised max-w-4xl w-[min(96vw,900px)] max-h-[88vh] overflow-hidden p-0 border-0"
        style={{ borderRadius: 'var(--h-r-xl)' }}
      >
        <DialogTitle className="sr-only">{title} breakdown</DialogTitle>

        {/* Header */}
        <div className="halo-panel-head halo-rail-full border-b border-[var(--h-line)]">
          <div className="halo-panel-head-title">
            <div className="halo-chip-lg">
              <IconComponent className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="halo-eyebrow">Expanded view</p>
              <h2 className="halo-heading truncate" style={{ fontSize: 15 }}>{title}</h2>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="btn-halo-ghost btn-halo-icon btn-halo-sm flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] max-h-[calc(88vh-64px)]">
          {/* Left: enlarged donut + summary */}
          <div className="relative p-5 border-b lg:border-b-0 lg:border-r border-[var(--h-line)]">
            <div className="flex items-center justify-between mb-2">
              <p className="halo-eyebrow">Distribution</p>
              {topItem && (
                <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--h-ink-2)]">
                  <span className="num">{enriched.length} categories</span>
                  <span className="text-[var(--h-ink-3)]">·</span>
                  <span className="num font-semibold text-[var(--h-ink)]">
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
                      <Pie
                        data={enriched}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="78%"
                        innerRadius="52%"
                        paddingAngle={2}
                        cornerRadius={4}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={600}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {enriched.map((item, index) => (
                          <Cell key={`m-cell-${index}`} fill={item.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={(props) => (
                          <HaloTooltip
                            active={props.active}
                            payload={(props.payload || []).map((p: any) => ({
                              ...p,
                              name: coerceName(p.payload?.name, 'Unknown'),
                              color: p.payload?.color,
                            }))}
                            valueFormatter={(value, entry) =>
                              `${formatCount(value as number)} · ${formatPercentage((entry.payload?.percentage as number) || 0)}%`
                            }
                          />
                        )}
                        wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {topItem && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="halo-eyebrow leading-none">Top</p>
                      <p className="halo-metric leading-none mt-1.5">
                        {formatPercentage(topItem.percentage || 0)}%
                      </p>
                      <p className="text-[10.5px] max-w-[60%] truncate leading-none mt-1.5 text-[var(--h-ink-2)]">
                        {topItem.name}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-[12px] text-[var(--h-ink-3)]">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Right: full ranked table */}
          <div className="overflow-y-auto scrollbar-thin">
            <div className="px-5 py-4 border-b border-[var(--h-line)]">
              <p className="halo-eyebrow">All categories · ranked</p>
            </div>
            <div className="p-3 space-y-1">
              {enriched.length === 0 ? (
                <div className="py-12 text-center text-[12px] text-[var(--h-ink-3)]">
                  No data
                </div>
              ) : (
                enriched.map((item, idx) => {
                  const pct = formatPercentage(item.percentage || 0);
                  const barWidth = totalValue > 0 && topItem ? (item.value / topItem.value) * 100 : 0;
                  return (
                    <motion.div
                      key={`${item.name}-${idx}`}
                      initial={{ opacity: 0, x: 4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.025, 0.4), duration: 0.3, ease: easeOut }}
                      className="halo-inset relative overflow-hidden p-3"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0"
                        style={{ width: `${barWidth}%`, background: item.color, opacity: 0.08 }}
                      />
                      <div className="relative flex items-center gap-3">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[10.5px] font-bold num text-[var(--h-ink-2)] bg-[var(--h-surface)]">
                          {idx + 1}
                        </div>
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12.5px] font-semibold truncate ${item.isMissing ? 'text-[var(--h-ink-3)] italic' : 'text-[var(--h-ink)]'}`}>
                            {item.name}
                          </p>
                          <p className="num text-[10.5px] text-[var(--h-ink-3)] mt-0.5">
                            {formatCount(item.value)} volume
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="num text-[13.5px] font-bold text-[var(--h-ink)]">
                            {pct}%
                          </p>
                          <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full" style={{ background: 'var(--h-surface-3)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Number(pct)}%`, background: item.color }}
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
