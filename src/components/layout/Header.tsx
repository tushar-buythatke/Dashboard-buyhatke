import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionsContext';
import { useNotifications } from '@/context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Eye,
  MousePointerClick,
  Target,
  TrendingUp,
  Sparkles,
  Zap,
  Star,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { NotificationsModal } from './NotificationsModal';

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
      case 'impressions': return <Eye className="h-3.5 w-3.5" />;
      case 'clicks': return <MousePointerClick className="h-3.5 w-3.5" />;
      case 'ctr': return <Target className="h-3.5 w-3.5" />;
      default: return <TrendingUp className="h-3.5 w-3.5" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Star className="h-3.5 w-3.5 text-amber-500" />;
      case 'success': return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case 'warning': return <Zap className="h-3.5 w-3.5 text-orange-500" />;
      case 'info': return <TrendingUp className="h-3.5 w-3.5 text-sky-500" />;
      default: return <Bell className="h-3.5 w-3.5" />;
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
      className="w-[22rem] sm:w-96 p-0 max-h-[80vh] overflow-hidden z-[100000] border-[var(--line)] bg-[var(--bg-panel)] shadow-[var(--shadow-3)] rounded-2xl"
    >
      <div className="px-5 py-4 border-b border-[var(--line)] bg-gradient-to-br from-[var(--bg-panel-2)] to-[var(--bg-panel)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--bg-tint)] text-[var(--indigo-500)] border border-[var(--line-violet)]">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-1)]">Notifications</h3>
              <p className="text-[11px] text-[var(--text-3)]">
                {notifications.length} total · {unreadCount} unread
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-[var(--neg-soft)] text-[var(--neg)] text-[10px] font-semibold">
              {unreadCount}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="flex-1 h-8 text-[11px] text-[var(--indigo-500)] border-[var(--line-violet)] hover:bg-[var(--bg-tint)] hover:border-[var(--violet-400)]"
              >
                <CheckCircle className="h-3 w-3 mr-1.5" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllNotifications}
              className="flex-1 h-8 text-[11px] text-[var(--neg)] border-[var(--line)] hover:bg-[var(--neg-soft)]"
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-panel-2)] border border-[var(--line)] flex items-center justify-center">
                <Bell className="h-5 w-5 text-[var(--text-3)]" />
              </div>
              <div>
                <p className="font-medium text-sm text-[var(--text-1)]">No notifications yet</p>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
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
              className={`group p-3.5 border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-panel-2)] cursor-pointer transition-colors ${
                !notification.isRead ? 'bg-[var(--bg-tint)]' : ''
              }`}
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
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--bg-panel-2)] border border-[var(--line)] flex items-center justify-center">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] font-semibold text-[var(--text-1)] truncate pr-1">
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!notification.isRead && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--violet-500)]" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--neg)] hover:bg-[var(--neg-soft)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[12px] text-[var(--text-2)] mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1 text-[10.5px] text-[var(--text-3)]">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(notification.timestamp)}</span>
                    </div>
                    {notification.metadata?.metric && (
                      <div className="flex items-center gap-1 text-[var(--text-3)]">
                        {getMetricIcon(notification.metadata.metric)}
                        <span className="text-[10.5px]">{notification.metadata.metric}</span>
                      </div>
                    )}
                  </div>
                  {notification.metadata?.improvement && (
                    <Badge className="mt-1.5 text-[10px] font-medium px-1.5 py-0 bg-[var(--pos-soft)] text-[var(--pos)] border-0">
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
        <div className="p-3 border-t border-[var(--line)] bg-[var(--bg-panel-2)]">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-[11px] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-panel)] border border-[var(--line)]"
            onClick={openNotificationsModal}
          >
            View all {notifications.length} notifications
          </Button>
        </div>
      )}
    </DropdownMenuContent>
  );
}

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { userRole } = usePermissions();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
      className="velvet-header"
      style={{ position: 'fixed', zIndex: 99999 }}
    >
      <div className="velvet-haze" aria-hidden />
      <div className="relative z-[1] flex items-center justify-between h-full max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* Left: menu + brand */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden h-9 w-9 text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-panel-2)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </Button>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 sm:gap-3 group"
          >
            <div className="relative">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] flex items-center justify-center border border-[var(--line)] bg-[var(--bg-panel)] transition-all duration-300 group-hover:border-[var(--line-violet)]"
                style={{ boxShadow: 'var(--shadow-1), inset 0 1px 0 rgba(255,255,255,0.04)' }}
              >
                <img
                  src="/logo_512x512.png"
                  alt="Logo"
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--pos)] border-2 border-[var(--bg-panel)]" />
            </div>

            <div className="hidden sm:flex items-center leading-tight">
              <h1 className="text-[19px] font-bold tracking-[-0.02em] text-[var(--text-1)] flex items-center gap-1.5">
                <span>Hatke</span>
                <span className="font-serif italic font-normal text-[var(--indigo-500)]">Dashboard</span>
                <Sparkles className="h-3.5 w-3.5 text-[var(--gold-500)] opacity-70" />
              </h1>
            </div>
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-panel-2)] transition-all"
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Sun className="h-4 w-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Moon className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative h-9 w-9 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-panel-2)] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-[var(--neg)] text-white text-[9px] font-semibold flex items-center justify-center border-2 border-[var(--bg-panel)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <NotificationDropdown />
          </DropdownMenu>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 sm:h-10 px-2 sm:px-3 rounded-lg flex items-center gap-2 hover:bg-[var(--bg-panel-2)] transition-colors border border-transparent hover:border-[var(--line)]">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-[var(--bg-tint)] border border-[var(--line-violet)] flex items-center justify-center text-[var(--indigo-500)]">
                    <span className="text-[11px] sm:text-[12px] font-semibold">
                      {getInitials(user.username)}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="text-[12.5px] font-medium text-[var(--text-1)] max-w-[7rem] truncate">
                      {user.username}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--text-3)]" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 p-0 mt-2 border border-[var(--line)] bg-[var(--bg-panel)] shadow-[var(--shadow-3)] rounded-2xl z-[100000] overflow-hidden"
              >
                <div className="px-5 py-4 bg-gradient-to-br from-[var(--bg-panel-2)] to-[var(--bg-panel)] border-b border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-11 w-11 rounded-xl bg-[var(--bg-tint)] border border-[var(--line-violet)] flex items-center justify-center text-[var(--indigo-500)]">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--pos)] border-2 border-[var(--bg-panel)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[13px] text-[var(--text-1)] truncate">
                        {user.username}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          className={`text-[10px] font-medium px-1.5 py-0 border-0 ${
                            userRole === 'admin'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : userRole === 'editor'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-[var(--bg-panel-2)] text-[var(--text-2)]'
                          }`}
                        >
                          {userRole === 'admin' ? 'Admin' : userRole === 'editor' ? 'Editor' : 'Viewer'}
                        </Badge>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--pos)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--pos)]" />
                          <span>Online</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-[var(--neg)] hover:bg-[var(--neg-soft)] focus:bg-[var(--neg-soft)] focus:text-[var(--neg)] cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
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
