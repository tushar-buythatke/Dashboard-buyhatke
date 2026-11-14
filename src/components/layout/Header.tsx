import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionsContext';
import { useNotifications } from '@/context/NotificationContext';
import { useEnvironment } from '@/context/EnvironmentContext';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Menu,
  Eye,
  MousePointerClick,
  Percent,
  TrendingUp,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { useAccent } from '@/context/AccentContext';
import { NotificationsModal } from './NotificationsModal';
import { useNavItems } from './Sidebar';

function getInitials(userName: string | null | undefined) {
  if (!userName) return 'U';
  const name = userName.trim();
  if (name.length === 0) return 'U';
  if (name.length === 1) return name.toUpperCase();
  const parts = name.split(/[\s_]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications, removeNotification, openNotificationsModal } = useNotifications();
  const navigate = useNavigate();

  const getMetricIcon = (metric?: string) => {
    switch (metric) {
      case 'impressions': return <Eye size={14} strokeWidth={1.75} />;
      case 'clicks': return <MousePointerClick size={14} strokeWidth={1.75} />;
      case 'ctr': return <Percent size={14} strokeWidth={1.75} />;
      default: return <TrendingUp size={14} strokeWidth={1.75} />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Bell size={14} strokeWidth={1.75} className="text-[var(--h-amber)]" />;
      case 'success': return <CheckCircle size={14} strokeWidth={1.75} className="text-[var(--h-mint)]" />;
      case 'warning': return <Bell size={14} strokeWidth={1.75} className="text-[var(--h-amber)]" />;
      case 'info': return <TrendingUp size={14} strokeWidth={1.75} className="text-[var(--h-cyan)]" />;
      default: return <Bell size={14} strokeWidth={1.75} />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <DropdownMenuContent
      align="end"
      className="halo-card w-[22rem] sm:w-96 p-0 max-h-[80vh] overflow-hidden z-[100000]"
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--h-line)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="halo-chip">
              <Bell size={16} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--h-ink)]">Notifications</h3>
              <p className="text-[11px] text-[var(--h-ink-3)]">
                <span className="num">{notifications.length}</span> total · <span className="num">{unreadCount}</span> unread
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="halo-badge halo-badge-neg num">{unreadCount}</span>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn-halo-soft btn-halo-sm flex-1"
              >
                <CheckCircle size={14} strokeWidth={1.75} />
                Mark all read
              </button>
            )}
            <button
              onClick={clearAllNotifications}
              className="btn-halo-ghost btn-halo-sm flex-1 text-[var(--h-coral)] hover:bg-[var(--h-neg-soft)]"
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="halo-chip-lg">
                <Bell size={18} strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-medium text-sm text-[var(--h-ink)]">No notifications yet</p>
                <p className="text-[11px] text-[var(--h-ink-3)] mt-0.5">
                  We'll notify you when your ads hit their targets
                </p>
              </div>
            </div>
          </div>
        ) : (
          notifications.slice(0, 4).map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="group p-3.5 hover:bg-[var(--h-tint)] cursor-pointer transition-colors"
              style={{
                borderBottom: '1px solid var(--h-line)',
                background: !notification.isRead ? 'var(--h-tint)' : undefined
              }}
              onClick={() => {
                markAsRead(notification.id);
                if (notification.metadata?.adId) {
                  navigate(`/campaigns/${notification.metadata.campaignId}/ads/${notification.metadata.adId}`);
                } else if (notification.metadata?.campaignId) {
                  navigate(`/campaigns/${notification.metadata.campaignId}/ads`);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="halo-chip flex-shrink-0">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] font-semibold text-[var(--h-ink)] truncate pr-1">
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!notification.isRead && <span className="halo-dot halo-dot-live text-[var(--h-iris-500)]" />}
                      <button
                        className="h-5 w-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 text-[var(--h-ink-3)] hover:text-[var(--h-coral)] hover:bg-[var(--h-neg-soft)] transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                      >
                        <Trash2 size={12} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-[var(--h-ink-2)] mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1 text-[10.5px] text-[var(--h-ink-3)]">
                      <Clock size={12} strokeWidth={1.75} />
                      <span>{formatTimeAgo(notification.timestamp)}</span>
                    </div>
                    {notification.metadata?.metric && (
                      <div className="flex items-center gap-1 text-[var(--h-ink-3)]">
                        {getMetricIcon(notification.metadata.metric)}
                        <span className="text-[10.5px]">{notification.metadata.metric}</span>
                      </div>
                    )}
                  </div>
                  {notification.metadata?.improvement && (
                    <Badge className="mt-1.5 text-[10px] font-medium px-1.5 py-0 bg-[var(--h-pos-soft)] text-[var(--h-mint)] border-0 num">
                      +{notification.metadata.improvement}% improvement
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {notifications.length > 4 && (
        <div className="p-3" style={{ borderTop: '1px solid var(--h-line)' }}>
          <button
            className="btn-halo-ghost btn-halo-sm w-full"
            onClick={openNotificationsModal}
          >
            View all {notifications.length} notifications
          </button>
        </div>
      )}
    </DropdownMenuContent>
  );
}

const ACCENTS = [
  { key: 'iris', label: 'Ember', color: '#e5603f' },
  { key: 'blue', label: 'Blue', color: '#0d7fe6' },
  { key: 'mint', label: 'Green', color: '#0ea975' },
  { key: 'coral', label: 'Red', color: '#f2453f' },
  { key: 'pink', label: 'Pink', color: '#e8408f' },
] as const;

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { userRole } = usePermissions();
  const { unreadCount } = useNotifications();
  const { apiVersion, setApiVersion, isV2 } = useEnvironment();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const navItems = useNavItems();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      className="relative z-30 h-[var(--h-header-h)] flex-none"
    >
      <div className="relative h-full max-w-[var(--h-page-max)] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
        {/* Left: hamburger (mobile) + logo (desktop) */}
        <div className="flex items-center gap-3 z-[1]">
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="xl:hidden e-round"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>

          <button
            onClick={() => navigate('/')}
            className="hidden xl:flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--e-ink-pill)]">
              <img src="/logo_512x512.png" alt="" className="w-6 h-6 object-contain" />
            </span>
            <span className="text-left leading-[1.1]">
              <span className="block text-[17px] font-medium tracking-[-0.03em] text-[var(--h-ink)]">Hatke</span>
              <span className="block text-[17px] font-normal tracking-[-0.03em] text-[var(--h-ink-3)]">Ads Studio</span>
            </span>
          </button>
        </div>

        {/* Center: nav rail (desktop) / centered logo (mobile) */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex">
          <div className="e-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  `halo-nav-item ${isActive ? 'halo-nav-item-active' : ''}`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="absolute left-1/2 -translate-x-1/2 xl:hidden flex items-center gap-2"
        >
          <img src="/logo_512x512.png" alt="Logo" className="w-7 h-7 object-contain" />
          <span
            className="text-[15px] font-semibold tracking-tight text-[var(--h-ink)]"
            style={{ fontFamily: 'var(--h-font-display)' }}
          >
            Hatke
          </span>
        </button>

        {/* Right: actions */}
        <div className="flex items-center gap-2 z-[1]">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="hidden lg:inline-flex e-round"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                  transition={{ duration: 0.19, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Sun size={16} strokeWidth={1.75} />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
                  transition={{ duration: 0.19, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Moon size={16} strokeWidth={1.75} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <div className="hidden lg:flex halo-segment" role="group" aria-label="API version">
            <button
              onClick={() => isV2 && setApiVersion('v1')}
              className={`halo-segment-item ${!isV2 ? 'is-active' : ''}`}
            >
              V1
            </button>
            <button
              onClick={() => !isV2 && setApiVersion('v2')}
              className={`halo-segment-item ${isV2 ? 'is-active' : ''}`}
              title={`Currently using ${apiVersion.toUpperCase()} API`}
            >
              V2
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="hidden lg:inline-flex e-round relative"
                aria-label="Notifications"
              >
                <Bell size={16} strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span className="halo-dot halo-dot-live absolute top-2.5 right-2.5 text-[var(--h-iris-500)]" />
                )}
              </button>
            </DropdownMenuTrigger>
            <NotificationDropdown />
          </DropdownMenu>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-11 pl-1 pr-3 rounded-full flex items-center gap-2 border border-[var(--h-line-2)] bg-[var(--h-surface)] hover:bg-[var(--h-surface-3)] transition-colors">
                  <div className="h-9 w-9 rounded-full bg-[var(--h-iris-500)] flex items-center justify-center text-white">
                    <span className="text-[12px] font-medium">
                      {getInitials(user.username)}
                    </span>
                  </div>
                  <span className="hidden 2xl:block text-left leading-tight">
                    <span className="block max-w-[120px] truncate text-[12.5px] font-medium text-[var(--h-ink)]">{user.username}</span>
                    <span className="block text-[11px] capitalize text-[var(--h-ink-3)]">{userRole}</span>
                  </span>
                  <ChevronDown size={14} strokeWidth={1.75} className="text-[var(--h-ink-3)]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="halo-card w-64 p-0 mt-2 z-[100000] overflow-hidden"
              >
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--h-line)' }}>
                  <div className="flex items-center gap-3">
                    <div className="halo-chip-lg">
                      <UserIcon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[13px] text-[var(--h-ink)] truncate">
                        {user.username}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="halo-badge halo-badge-iris capitalize">{userRole}</span>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--h-mint)]">
                          <span className="halo-dot" />
                          <span>Online</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--h-line)' }}>
                  <p className="text-[11px] text-[var(--h-ink-3)] mb-2.5">Accent</p>
                  <div className="flex items-center gap-2.5">
                    {ACCENTS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setAccent(opt.key)}
                        aria-label={`${opt.label} accent`}
                        aria-pressed={accent === opt.key}
                        title={opt.label}
                        className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                        style={{
                          background: opt.color,
                          boxShadow: accent === opt.key ? `0 0 0 2px var(--h-surface), 0 0 0 4px ${opt.color}` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 px-3 py-2 rounded-[var(--h-r-sm)] text-[12.5px] text-[var(--h-coral)] hover:bg-[var(--h-neg-soft)] focus:bg-[var(--h-neg-soft)] focus:text-[var(--h-coral)] cursor-pointer"
                  >
                    <LogOut size={14} strokeWidth={1.75} />
                    <span>{isLoggingOut ? 'Signing out…' : 'Sign out'}</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <NotificationsModal />
    </header>
  );
}
