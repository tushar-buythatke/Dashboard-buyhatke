import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle, Clock, Eye, MousePointerClick, Target, TrendingUp, Star, Zap, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    clearNotifications 
  } = useNotifications();
  const navigate = useNavigate();

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

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    closeNotificationsModal();
    
    if (notification.metadata?.adId) {
      navigate(`/campaigns/${notification.metadata.campaignId}/ads/${notification.metadata.adId}`);
    } else if (notification.metadata?.campaignId) {
      navigate(`/campaigns/${notification.metadata.campaignId}/ads`);
    }
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
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[100000] flex items-center justify-center p-4"
        onClick={closeNotificationsModal}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-600">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  All Notifications
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {notifications.length} total • {unreadCount} unread • Auto-delete after 7 days
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearNotifications}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={closeNotificationsModal}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <Bell className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No notifications yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  You'll receive notifications here when your ads exceed their targets or reach important milestones.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-600">
                {Object.entries(groupedNotifications).map(([dateGroup, notifs]) => (
                  <div key={dateGroup} className="p-4">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 sticky top-0 bg-white dark:bg-slate-800 py-2">
                      {dateGroup}
                    </h3>
                    <div className="space-y-3">
                      {notifs.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ scale: 1.02, backgroundColor: "rgba(99, 102, 241, 0.05)" }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                            !notification.isRead 
                              ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                              : 'bg-gray-50/50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600'
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                {getTypeIcon(notification.type)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {notification.title}
                                </h4>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTime(notification.timestamp)}
                                  </span>
                                  {!notification.isRead && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {notification.metadata?.metric && (
                                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                      {getMetricIcon(notification.metadata.metric)}
                                      <span className="capitalize">{notification.metadata.metric}</span>
                                    </div>
                                  )}
                                </div>
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