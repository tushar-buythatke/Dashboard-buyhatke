import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle, Clock, Eye, MousePointerClick, Percent, TrendingUp, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNotifications, Notification } from '@/context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export function NotificationsModal() {
  const {
    notifications,
    isModalOpen,
    closeNotificationsModal,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    removeNotification,
  } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClickLocal = (notification: Notification) => {
    // Mark as read when clicked
    markAsRead(notification.id);

    // Navigate based on notification metadata
    if (notification.metadata?.campaignId && notification.metadata?.adId) {
      // Navigate to specific ad details within campaign
      navigate(`/campaigns/${notification.metadata.campaignId}/ads/${notification.metadata.adId}`);
    } else if (notification.metadata?.adId) {
      // For notifications without campaignId, we need to find it or navigate to a generic location
      // For now, we'll just navigate to campaigns list
      navigate('/campaigns');
    } else if (notification.metadata?.campaignId) {
      // Navigate to campaign ads list
      navigate(`/campaigns/${notification.metadata.campaignId}/ads`);
    } else {
      // Fallback to campaigns list
      navigate('/campaigns');
    }

    // Close notifications modal
    closeNotificationsModal();
  };

  const handleDeleteNotification = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeNotification(notificationId);
  };

  const getMetricIcon = (metric?: string) => {
    switch (metric) {
      case 'impressions': return <Eye size={15} strokeWidth={1.75} />;
      case 'clicks': return <MousePointerClick size={15} strokeWidth={1.75} />;
      case 'ctr': return <Percent size={15} strokeWidth={1.75} />;
      default: return <TrendingUp size={15} strokeWidth={1.75} />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Bell size={16} strokeWidth={1.75} className="text-[var(--h-amber)]" />;
      case 'success': return <CheckCircle size={16} strokeWidth={1.75} className="text-[var(--h-mint)]" />;
      case 'warning': return <Bell size={16} strokeWidth={1.75} className="text-[var(--h-amber)]" />;
      case 'info': return <TrendingUp size={16} strokeWidth={1.75} className="text-[var(--h-cyan)]" />;
      default: return <Bell size={16} strokeWidth={1.75} />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return days === 1 ? 'Yesterday' : `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {};

    notifications.forEach(notif => {
      const dateKey = formatDate(notif.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notif);
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(notifications);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.19 }}
        className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
        style={{ background: 'rgba(10, 11, 17, .42)' }}
        onClick={closeNotificationsModal}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          className="halo-card w-full max-w-sm sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col overflow-hidden"
          style={{ borderRadius: 'var(--h-r-xl)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="halo-panel-head halo-rail-full">
            <div className="halo-panel-head-title">
              <div className="halo-chip-lg">
                <Bell size={18} strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="halo-heading">All notifications</h2>
                <p className="halo-subtitle">
                  <span className="num">{notifications.length}</span> total ·{' '}
                  <span className="num">{unreadCount}</span> unread
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && <span className="halo-badge halo-badge-neg num">{unreadCount}</span>}
              <button
                onClick={closeNotificationsModal}
                aria-label="Close"
                className="btn-halo-ghost btn-halo-icon btn-halo-sm"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-2 px-5 pb-4">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="btn-halo-soft btn-halo-sm flex-1">
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
                <div className="halo-chip-lg mb-4" style={{ width: 56, height: 56, borderRadius: 'var(--h-r-lg)' }}>
                  <Bell size={24} strokeWidth={1.75} />
                </div>
                <h3 className="halo-heading mb-1.5">No notifications yet</h3>
                <p className="halo-subtitle max-w-xs">
                  We'll notify you here when your ads exceed their targets or reach important milestones.
                </p>
              </div>
            ) : (
              Object.entries(groupedNotifications).map(([dateGroup, notifs]) => (
                <div key={dateGroup} className="px-5 pt-2 pb-4">
                  <h3 className="halo-eyebrow sticky top-0 py-2 mb-1" style={{ background: 'var(--h-surface)' }}>
                    {dateGroup}
                  </h3>
                  <div className="space-y-1">
                    {notifs.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group flex items-start gap-3 rounded-[var(--h-r)] p-3 cursor-pointer transition-colors hover:bg-[var(--h-tint)]"
                        style={{ background: !notification.isRead ? 'var(--h-tint)' : undefined }}
                        onClick={() => handleNotificationClickLocal(notification)}
                      >
                        <div className="halo-chip flex-shrink-0">{getTypeIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-[13px] font-semibold text-[var(--h-ink)] truncate">
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="flex items-center gap-1 text-[10.5px] text-[var(--h-ink-3)]">
                                <Clock size={11} strokeWidth={1.75} />
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                              {!notification.isRead && <span className="halo-dot halo-dot-live text-[var(--h-iris-500)]" />}
                              <button
                                className="h-6 w-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 text-[var(--h-ink-3)] hover:text-[var(--h-coral)] hover:bg-[var(--h-neg-soft)] transition-all"
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                aria-label="Delete notification"
                              >
                                <Trash2 size={13} strokeWidth={1.75} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[12.5px] text-[var(--h-ink-2)] mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            {notification.metadata?.metric && (
                              <div className="flex items-center gap-1 text-[var(--h-ink-3)]">
                                {getMetricIcon(notification.metadata.metric)}
                                <span className="text-[10.5px] capitalize">{notification.metadata.metric}</span>
                              </div>
                            )}
                            {notification.metadata?.improvement && (
                              <Badge className="text-[10px] font-medium px-1.5 py-0 bg-[var(--h-pos-soft)] text-[var(--h-mint)] border-0 num">
                                +{notification.metadata.improvement}% improvement
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
