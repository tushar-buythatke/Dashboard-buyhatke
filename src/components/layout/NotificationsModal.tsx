import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle, Clock, Eye, MousePointerClick, Target, TrendingUp, Star, Zap, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications, Notification } from '@/context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export function NotificationsModal() {
  const { 
    notifications, 
    isModalOpen, 
    closeNotificationsModal, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    clearAllNotifications,
    removeNotification,
    handleNotificationClick
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
      case 'impressions': return <Eye className="h-4 w-4" />;
      case 'clicks': return <MousePointerClick className="h-4 w-4" />;
      case 'ctr': return <Target className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Star className="h-5 w-5 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <Zap className="h-5 w-5 text-orange-500" />;
      case 'info': return <TrendingUp className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5" />;
    }
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[100000] flex items-center justify-center p-2 sm:p-4"
        onClick={closeNotificationsModal}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-600 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                    <span className="hidden sm:inline">All Notifications</span>
                    <span className="sm:hidden">Notifications</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span className="hidden sm:inline">{notifications.length} total • {unreadCount} unread • Auto-delete after 7 days</span>
                    <span className="sm:hidden">{notifications.length} total • {unreadCount} unread</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-full shadow-lg">
                    <span className="text-xs sm:text-sm font-bold text-white">{unreadCount}</span>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={closeNotificationsModal}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 p-1.5 sm:p-2 rounded-full"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
            
            {notifications.length > 0 && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                {unreadCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="flex-1 text-xs sm:text-sm text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 dark:text-indigo-400 dark:border-indigo-700 dark:hover:bg-indigo-900/30 py-1.5 sm:py-2"
                  >
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Mark all read</span>
                    <span className="sm:hidden">Read all</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAllNotifications}
                  className="flex-1 text-xs sm:text-sm text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30 py-1.5 sm:py-2"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Clear all</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-6 sm:px-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No notifications yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  <span className="hidden sm:inline">You'll receive notifications here when your ads exceed their targets or reach important milestones.</span>
                  <span className="sm:hidden">We'll notify you when your ads hit their targets!</span>
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-600">
                {Object.entries(groupedNotifications).map(([dateGroup, notifs]) => (
                  <div key={dateGroup} className="p-4 sm:p-6">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 sm:mb-4 sticky top-0 bg-white dark:bg-slate-800 py-2 border-b border-gray-100 dark:border-slate-700">
                      {dateGroup}
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {notifs.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ scale: 1.01, backgroundColor: "rgba(99, 102, 241, 0.05)" }}
                          className={`group p-3 sm:p-5 rounded-lg sm:rounded-xl border cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md ${
                            !notification.isRead 
                              ? 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                              : 'bg-gray-50/70 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600'
                          }`}
                          onClick={() => handleNotificationClickLocal(notification)}
                        >
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                {getTypeIcon(notification.type)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate pr-1 sm:pr-2">
                                  {notification.title}
                                </h4>
                                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTime(notification.timestamp)}
                                  </span>
                                  {!notification.isRead && (
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-all duration-200"
                                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                                  >
                                    <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-3 line-clamp-3">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {notification.metadata?.metric && (
                                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                      {getMetricIcon(notification.metadata.metric)}
                                      <span className="capitalize hidden sm:inline">{notification.metadata.metric}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-shrink-0">
                                  {notification.metadata?.improvement && (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    >
                                      +{notification.metadata.improvement}% improvement
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 