import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Inbox, BarChart3, TrendingUp, Users, MapPin, Monitor, Calendar, Plane, LucideIcon } from 'lucide-react';

export type VelvetEmptyIcon =
  | 'inbox'
  | 'chart'
  | 'trend'
  | 'users'
  | 'map'
  | 'monitor'
  | 'calendar'
  | 'plane'
  | 'custom';

interface VelvetEmptyStateProps {
  /** Title text — short, single line */
  title: string;
  /** Optional subtitle — longer, muted */
  subtitle?: string;
  /** Preset icon (uses one of our violet-tinted lucide icons) */
  icon?: VelvetEmptyIcon;
  /** Custom icon node (overrides preset) */
  customIcon?: ReactNode;
  /** Optional size — sm is for compact pie charts, md for sections, lg for hero */
  size?: 'sm' | 'md' | 'lg';
  /** Optional extra actions below the subtitle */
  actions?: ReactNode;
  className?: string;
}

const ICONS: Record<Exclude<VelvetEmptyIcon, 'custom'>, LucideIcon> = {
  inbox: Inbox,
  chart: BarChart3,
  trend: TrendingUp,
  users: Users,
  map: MapPin,
  monitor: Monitor,
  calendar: Calendar,
  plane: Plane,
};

const SIZE = {
  sm: {
    wrapper: 'py-3 px-2 gap-1.5',
    iconWrap: 'h-7 w-7 rounded-lg',
    icon: 'h-3.5 w-3.5',
    title: 'text-[11.5px] font-semibold',
    subtitle: 'text-[10.5px] mt-0.5 max-w-[180px]',
  },
  md: {
    wrapper: 'py-6 px-3 gap-2.5',
    iconWrap: 'h-10 w-10 rounded-xl',
    icon: 'h-4 w-4',
    title: 'text-[13px] font-semibold',
    subtitle: 'text-[11.5px] mt-1 max-w-[260px]',
  },
  lg: {
    wrapper: 'py-10 px-4 gap-3',
    iconWrap: 'h-14 w-14 rounded-2xl',
    icon: 'h-5 w-5',
    title: 'text-[15px] font-semibold',
    subtitle: 'text-[12.5px] mt-1.5 max-w-[340px]',
  },
};

export function VelvetEmptyState({
  title,
  subtitle,
  icon = 'inbox',
  customIcon,
  size = 'md',
  actions,
  className,
}: VelvetEmptyStateProps) {
  const sizing = SIZE[size];
  const IconComponent = icon !== 'custom' ? ICONS[icon] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizing.wrapper,
        className
      )}
    >
      <div className="relative">
        {/* Soft glow halo behind the icon */}
        <div
          className="absolute inset-0 rounded-inherit blur-md"
          style={{ background: 'radial-gradient(circle, var(--violet-500) 0%, transparent 70%)', opacity: 0.18 }}
          aria-hidden
        />
        <div
          className={cn(
            'relative flex items-center justify-center border',
            sizing.iconWrap
          )}
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--violet-500) 10%, var(--bg-panel)) 0%, var(--bg-panel-2) 100%)',
            borderColor: 'var(--line-violet)',
            boxShadow: '0 4px 12px -2px rgba(99, 76, 230, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
          }}
        >
          {customIcon ?? (IconComponent && <IconComponent className={cn(sizing.icon, 'text-[var(--indigo-500)]')} strokeWidth={1.5} />)}
        </div>
      </div>

      <p className={cn('text-[var(--text-1)] leading-tight', sizing.title)}>{title}</p>

      {subtitle && (
        <p className={cn('text-[var(--text-3)] leading-relaxed mx-auto', sizing.subtitle)}>
          {subtitle}
        </p>
      )}

      {actions && <div className="mt-2">{actions}</div>}
    </motion.div>
  );
}

VelvetEmptyState.displayName = 'VelvetEmptyState';
