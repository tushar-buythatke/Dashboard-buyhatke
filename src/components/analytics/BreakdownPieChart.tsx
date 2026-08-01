import { useState, useCallback, useMemo, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Users, Monitor, MapPin, Calendar, ChevronDown, Plane } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { coerceName, isUnspecified, formatCount } from '@/lib/format';
import { useTheme } from '@/context/ThemeContext';
import { useHaloChartPalette, seriesColor, HaloTooltip, HaloChartEmpty } from './chartTheme';

interface BreakdownPieChartProps {
  data: Array<{ name: unknown; value: number; percentage?: number }>;
  title: string;
  showInnerRadius?: boolean;
  showAnimation?: boolean;
  maxDisplayItems?: number;
}

const getPlatformName = (platformId: number | string | unknown): string => {
  const id = Number(platformId);
  switch (id) {
    case 0: return 'Web Extension';
    case 1: return 'Mobile Extension';
    case 2: return 'Desktop Site';
    case 3: return 'Mobile Site';
    case 4: return 'App Overlay';
    case 5: return 'Mobile App';
    default:
      if (typeof platformId === 'string') return platformId;
      return coerceName(platformId, 'Unknown');
  }
};

const getChartIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('gender')) return Users;
  if (t.includes('platform')) return Monitor;
  if (t.includes('location')) return MapPin;
  if (t.includes('age')) return Calendar;
  if (t.includes('landing')) return Plane;
  return TrendingUp;
};

const formatPercentage = (value: number) => Number(value || 0).toFixed(1);

const BreakdownEmpty = memo(({ title }: { title: string }) => {
  const cleanTitle = title.split('·')[0].trim();
  const Icon = getChartIcon(title);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="halo-chip" style={{ width: 20, height: 20, borderRadius: 6 }}>
          <Icon className="h-3 w-3" strokeWidth={1.75} />
        </div>
        <h3 className="halo-heading truncate" style={{ fontSize: 11.5 }}>{title}</h3>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <HaloChartEmpty
          height={160}
          icon={Icon}
          title={`No ${cleanTitle.toLowerCase()} data`}
          subtitle="Demographic collection begins once campaigns scale"
        />
      </div>
    </div>
  );
});
BreakdownEmpty.displayName = 'BreakdownEmpty';

export const BreakdownPieChart: React.FC<BreakdownPieChartProps> = ({
  data,
  title,
  showInnerRadius = true,
  showAnimation = true,
  maxDisplayItems = 4,
}) => {
  const { theme } = useTheme();
  const palette = useHaloChartPalette(theme);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showAllOpen, setShowAllOpen] = useState(false);

  const IconComponent = useMemo(() => getChartIcon(title), [title]);
  const enriched = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const isPlatform = title.toLowerCase().includes('platform');
    return [...data]
      .map((item) => ({
        ...item,
        name: isPlatform
          ? getPlatformName(item.name)
          : coerceName(item.name, 'Unknown'),
        isMissing: isUnspecified(item.name),
      }))
      .filter((item) => typeof item.value === 'number' && item.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({ ...item, color: seriesColor(palette, index) }));
  }, [data, title, palette]);

  const enrichedLength = enriched.length;

  const handleEnter = useCallback((_: any, index: number) => {
    if (typeof index === 'number' && index >= 0 && index < enrichedLength) {
      setHoveredIndex(index);
    }
  }, [enrichedLength]);

  const handleLeave = useCallback(() => {
    setTimeout(() => setHoveredIndex(null), 60);
  }, []);

  if (!data || !Array.isArray(data) || enriched.length === 0) {
    return <BreakdownEmpty title={title} />;
  }

  const top = enriched.slice(0, maxDisplayItems);
  const remaining = enriched.length - maxDisplayItems;
  const totalValue = enriched.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="halo-chip" style={{ width: 20, height: 20, borderRadius: 6 }}>
            <IconComponent className="h-3 w-3" strokeWidth={1.75} />
          </div>
          <h3 className="halo-heading truncate" style={{ fontSize: 11.5 }}>{title}</h3>
        </div>

        {remaining > 0 && (
          <DropdownMenu open={showAllOpen} onOpenChange={setShowAllOpen}>
            <DropdownMenuTrigger asChild>
              <button className="halo-badge inline-flex items-center gap-0.5 hover:bg-[var(--h-tint)] hover:text-[var(--h-iris-600)] transition-colors">
                +{remaining}
                <motion.div animate={{ rotate: showAllOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                  <ChevronDown className="h-2.5 w-2.5" strokeWidth={1.75} />
                </motion.div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="halo-card w-64 max-h-56 overflow-hidden p-0 border-0" sideOffset={4}>
              <div className="p-2 border-b border-[var(--h-line)]">
                <p className="halo-eyebrow">All categories</p>
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin p-1">
                {enriched.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-[var(--h-tint)]">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className={`text-[10.5px] font-medium truncate ${item.isMissing ? 'text-[var(--h-ink-3)] italic' : 'text-[var(--h-ink)]'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className="num text-[10px] font-semibold text-[var(--h-ink-3)] ml-2">
                      {formatPercentage(item.percentage || 0)}%
                    </span>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Chart — donut with 2px slice gap, rounded corners */}
      <div
        className="relative flex-1 min-h-0"
        onMouseLeave={() => setTimeout(() => setHoveredIndex(null), 100)}
      >
        <ChartErrorBoundary onError={(e, i) => console.error('PieChart error', e, i)}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={enriched}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="82%"
                innerRadius={showInnerRadius ? '69%' : 0}
                paddingAngle={2}
                cornerRadius={4}
                dataKey="value"
                animationBegin={0}
                animationDuration={showAnimation ? 600 : 0}
                isAnimationActive={showAnimation}
                animationEasing="ease-out"
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
                startAngle={90}
                endAngle={-270}
              >
                {enriched.map((item, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={item.color}
                    stroke="none"
                    style={{
                      filter: hoveredIndex === index ? 'brightness(1.08)' : 'none',
                      transform: hoveredIndex === index ? 'scale(1.03)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'all 0.2s ease-out',
                      cursor: 'pointer',
                      opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.55,
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                content={(props) => {
                  if (hoveredIndex === null) return null;
                  return (
                    <HaloTooltip
                      active={props.active}
                      payload={(props.payload || []).map((p: any) => ({
                        ...p,
                        name: coerceName(p.payload?.name, 'Unknown'),
                        color: p.payload?.color,
                      }))}
                      valueFormatter={(value, entry) => {
                        const pct = entry.payload?.percentage as number | undefined;
                        return `${formatCount(value as number)} · ${formatPercentage(pct || 0)}%`;
                      }}
                    />
                  );
                }}
                animationDuration={120}
                wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
                cursor={false}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>

        {/* Center label — total in .halo-metric, name beneath in .halo-eyebrow */}
        {showInnerRadius && enriched.length > 0 && totalValue > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="halo-eyebrow leading-none">Total</p>
            <p className="halo-metric leading-none mt-1" style={{ fontSize: 18 }}>
              {formatCount(totalValue)}
            </p>
            <p className={`text-[9px] max-w-[70%] truncate leading-none mt-1 ${top[0]?.isMissing ? 'text-[var(--h-ink-3)] italic' : 'text-[var(--h-ink-3)]'}`}>
              {top[0]?.name}
            </p>
          </div>
        )}
      </div>

      {/* Legend — pill chips with a colored dot each */}
      <div className="mt-2 pt-2 border-t border-[var(--h-line)] flex flex-wrap gap-1">
        {top.map((item, index) => (
          <span
            key={`legend-${index}`}
            className="halo-badge inline-flex items-center gap-1.5 min-w-0"
          >
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className={`truncate max-w-[140px] ${item.isMissing ? 'italic' : ''}`}>
              {item.name}
            </span>
            <span className="num font-semibold">
              {formatPercentage(item.percentage || 0)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};
