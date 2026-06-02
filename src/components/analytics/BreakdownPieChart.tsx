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
import { VelvetEmptyState } from '@/components/ui/velvet-empty-state';
import { coerceName, isUnspecified, formatCompactNumber } from '@/lib/format';

interface BreakdownPieChartProps {
  data: Array<{ name: unknown; value: number; percentage?: number }>;
  title: string;
  showInnerRadius?: boolean;
  showAnimation?: boolean;
  maxDisplayItems?: number;
}

const COLORS = [
  '#7c6feb', '#d94684', '#38bdf8', '#2dd4bf',
  '#fbbf24', '#a99df5', '#e879a0', '#5b4fe0'
];

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

const getEmptyIconPreset = (title: string): 'users' | 'monitor' | 'map' | 'calendar' | 'plane' | 'chart' | 'inbox' => {
  const t = title.toLowerCase();
  if (t.includes('gender')) return 'users';
  if (t.includes('platform')) return 'monitor';
  if (t.includes('location')) return 'map';
  if (t.includes('age')) return 'calendar';
  if (t.includes('landing')) return 'plane';
  if (t.includes('trend') || t.includes('perform')) return 'chart';
  return 'inbox';
};

const formatPercentage = (value: number) => Number(value || 0).toFixed(1);

const CustomTooltip = memo(({ active, payload, title }: any) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const raw = payload[0].payload;
  const { value = 0, percentage = 0 } = raw;
  const name = coerceName(raw.name, 'Unknown');
  const isMissing = isUnspecified(raw.name);
  const fillColor = payload[0].fill || '#7c6feb';
  const IconComponent = getChartIcon(title || '');
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-panel)]/95 backdrop-blur-xl shadow-[var(--shadow-3)] px-2.5 py-1.5 min-w-[140px]">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fillColor }} />
        <IconComponent className="h-2.5 w-2.5 text-[var(--text-3)]" />
        <p className={`text-[11px] font-semibold truncate max-w-[140px] ${isMissing ? 'text-[var(--text-3)] italic' : 'text-[var(--text-1)]'}`}>
          {name}
        </p>
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-[12.5px] font-semibold tabular-nums text-[var(--text-1)]">
          {formatCompactNumber(value)}
        </p>
        <p className="text-[10px] font-semibold tabular-nums" style={{ color: fillColor }}>
          {formatPercentage(percentage)}%
        </p>
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

const BreakdownEmpty = memo(({ title, iconPreset }: { title: string; iconPreset: ReturnType<typeof getEmptyIconPreset> }) => {
  // Strip the " · 7 days" suffix for the empty subtitle
  const cleanTitle = title.split('·')[0].trim();
  return (
    <div className="flex h-full flex-col">
      <div className="velvet-section-title mb-1.5">
        <span>{title}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <VelvetEmptyState
          size="sm"
          icon={iconPreset}
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
      .map((item, index) => ({ ...item, color: COLORS[index % COLORS.length] }));
  }, [data, title]);

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
    return <BreakdownEmpty title={title} iconPreset={getEmptyIconPreset(title)} />;
  }

  const top = enriched.slice(0, maxDisplayItems);
  const remaining = enriched.length - maxDisplayItems;
  const totalValue = enriched.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col h-full min-h-[200px]">
      {/* Header — tight */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--bg-tint)] border border-[var(--line-violet)] flex-shrink-0">
            <IconComponent className="h-2.5 w-2.5 text-[var(--indigo-500)]" />
          </div>
          <h3 className="text-[11px] font-semibold tracking-tight text-[var(--text-1)] truncate">{title}</h3>
        </div>

        {remaining > 0 && (
          <DropdownMenu open={showAllOpen} onOpenChange={setShowAllOpen}>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9.5px] font-medium bg-[var(--bg-panel-2)] border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)] transition-colors">
                +{remaining}
                <motion.div animate={{ rotate: showAllOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                  <ChevronDown className="h-2.5 w-2.5" />
                </motion.div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="velvet-panel w-64 max-h-56 overflow-hidden p-0" sideOffset={4}>
              <div className="p-2 border-b border-[var(--line)]">
                <p className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider">All categories</p>
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin p-1">
                {enriched.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-[var(--bg-panel-2)]">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className={`text-[10.5px] font-medium truncate ${item.isMissing ? 'text-[var(--text-3)] italic' : 'text-[var(--text-1)]'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-[var(--text-3)] ml-2">
                      {formatPercentage(item.percentage || 0)}%
                    </span>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Chart — tight pie, close legend */}
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
                innerRadius={showInnerRadius ? "69%" : 0}
                paddingAngle={1.5}
                dataKey="value"
                animationBegin={0}
                animationDuration={showAnimation ? 500 : 0}
                animationEasing="ease-out"
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
                startAngle={90}
                endAngle={-270}
              >
                {enriched.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke={hoveredIndex === index ? 'var(--bg-panel)' : 'transparent'}
                    strokeWidth={hoveredIndex === index ? 2 : 0}
                    style={{
                      filter: hoveredIndex === index ? 'brightness(1.1)' : 'none',
                      transform: hoveredIndex === index ? 'scale(1.04)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'all 0.2s ease-out',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                content={(props) => {
                  if (hoveredIndex === null) return null;
                  return <CustomTooltip {...props} title={title} />;
                }}
                animationDuration={120}
                wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
                cursor={false}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>

        {/* Center label — tight */}
        {showInnerRadius && enriched.length > 0 && totalValue > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[8.5px] uppercase tracking-wider font-semibold text-[var(--text-3)] leading-none">
              Top
            </p>
            <p className="text-[12px] font-semibold tabular-nums text-[var(--text-1)] leading-none mt-0.5">
              {formatPercentage(top[0]?.percentage || 0)}%
            </p>
            <p className={`text-[9px] max-w-[70%] truncate leading-none mt-0.5 ${top[0]?.isMissing ? 'text-[var(--text-3)] italic' : 'text-[var(--text-3)]'}`}>
              {top[0]?.name}
            </p>
          </div>
        )}
      </div>

      {/* Legend — close to the pie */}
      <div className="mt-1.5 pt-1.5 border-t border-[var(--line)]">
        <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
          {top.map((item, index) => (
            <div key={`legend-${index}`} className="flex items-center gap-1 min-w-0">
              <div
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className={`text-[9.5px] truncate flex-1 ${item.isMissing ? 'text-[var(--text-3)] italic' : 'text-[var(--text-2)]'}`}>
                {item.name}
              </span>
              <span className="text-[9.5px] font-semibold tabular-nums text-[var(--text-1)] flex-shrink-0">
                {formatPercentage(item.percentage || 0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
