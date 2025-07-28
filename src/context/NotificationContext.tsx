import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'achievement';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  metadata?: {
    campaignId?: number;
    adId?: number;
    metric?: 'impressions' | 'clicks' | 'ctr';
    target?: number;
    actual?: number;
    improvement?: number;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isModalOpen: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  clearAllNotifications: () => void;
  removeNotification: (id: string) => void;
  handleNotificationClick: (notification: Notification) => void;
  checkPerformanceAlerts: (campaignData: any[], adData: any[]) => void;
  openNotificationsModal: () => void;
  closeNotificationsModal: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'hatke-notifications';
const CHECKED_TARGETS_KEY = 'hatke-checked-targets';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [checkedTargets, setCheckedTargets] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    loadNotificationsFromStorage();
    loadCheckedTargetsFromStorage();
    // Set up cleanup interval to run every hour
    const cleanupInterval = setInterval(cleanupOldNotifications, 60 * 60 * 1000);
    return () => clearInterval(cleanupInterval);
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    saveNotificationsToStorage();
  }, [notifications]);

  // Save checkedTargets to localStorage whenever they change
  useEffect(() => {
    saveCheckedTargetsToStorage();
  }, [checkedTargets]);

  const loadNotificationsFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const notificationsWithDates = parsed.map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp)
        }));
        
        // Filter out notifications older than 7 days
        const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
        const validNotifications = notificationsWithDates.filter(
          (notif: Notification) => notif.timestamp > sevenDaysAgo
        );
        
        setNotifications(validNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  };

  const saveNotificationsToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  };

  const loadCheckedTargetsFromStorage = () => {
    try {
      const stored = localStorage.getItem(CHECKED_TARGETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCheckedTargets(new Set(parsed));
      }
    } catch (error) {
      console.error('Error loading checked targets from storage:', error);
    }
  };

  const saveCheckedTargetsToStorage = () => {
    try {
      localStorage.setItem(CHECKED_TARGETS_KEY, JSON.stringify(Array.from(checkedTargets)));
    } catch (error) {
      console.error('Error saving checked targets to storage:', error);
    }
  };

  const cleanupOldNotifications = () => {
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
    setNotifications(prev => 
      prev.filter(notif => notif.timestamp > sevenDaysAgo)
    );

    // Clear checked targets daily to allow fresh notifications for the same targets
    // This ensures that performance achievements can be notified again each day
    setCheckedTargets(new Set());
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    // Check for duplicates based on title, message, adId, campaignId, and metric
    const isDuplicate = notifications.some(existing => 
      existing.title === notification.title && 
      existing.message === notification.message &&
      existing.metadata?.adId === notification.metadata?.adId &&
      existing.metadata?.campaignId === notification.metadata?.campaignId &&
      existing.metadata?.metric === notification.metadata?.metric
    );

    if (isDuplicate) {
      console.log('Duplicate notification prevented:', notification.title);
      return;
    }

    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isRead: false,
    };

    setNotifications(prev => {
      // Double-check for duplicates in current state as well
      const currentDuplicate = prev.some(existing => 
        existing.title === notification.title && 
        existing.message === notification.message &&
        existing.metadata?.adId === notification.metadata?.adId &&
        existing.metadata?.campaignId === notification.metadata?.campaignId &&
        existing.metadata?.metric === notification.metadata?.metric
      );
      
      if (currentDuplicate) {
        console.log('Duplicate notification prevented in state:', notification.title);
        return prev;
      }
      
      // Add new notification at the beginning
      const updated = [newNotification, ...prev];
      return updated;
    });

    // Show toast notification
    switch (notification.type) {
      case 'success':
        toast.success(notification.title, { description: notification.message });
        break;
      case 'achievement':
        toast.success(`🎉 ${notification.title}`, { description: notification.message });
        break;
      case 'warning':
        toast.warning(notification.title, { description: notification.message });
        break;
      case 'info':
        toast.info(notification.title, { description: notification.message });
        break;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
    setCheckedTargets(new Set());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CHECKED_TARGETS_KEY);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const openNotificationsModal = () => {
    setIsModalOpen(true);
  };

  const closeNotificationsModal = () => {
    setIsModalOpen(false);
  };

  const checkPerformanceAlerts = (campaignData: any[], adData: any[]) => {
    // Check ad performance
    adData.forEach(ad => {
      const adKey = `ad_${ad.adId}`;
      
      // Check impressions target
      if (ad.liveImpressions && ad.impressionTarget) {
        const impressionProgress = (ad.liveImpressions / ad.impressionTarget) * 100;
        const impressionKey = `${adKey}_impressions`;
        
        if (impressionProgress >= 100 && !checkedTargets.has(impressionKey)) {
          setCheckedTargets(prev => new Set(prev).add(impressionKey));
          const overPerformance = ((ad.liveImpressions - ad.impressionTarget) / ad.impressionTarget * 100).toFixed(1);
          
          addNotification({
            type: 'achievement',
            title: 'Impression Target Exceeded!',
            message: `Ad "${ad.name}" exceeded its impression target by ${overPerformance}%`,
            metadata: {
              adId: ad.adId,
              campaignId: ad.campaignId,
              metric: 'impressions',
              target: ad.impressionTarget,
              actual: ad.liveImpressions,
              improvement: parseFloat(overPerformance)
            }
          });
        } else if (impressionProgress >= 80 && impressionProgress < 100 && !checkedTargets.has(`${impressionKey}_80`)) {
          setCheckedTargets(prev => new Set(prev).add(`${impressionKey}_80`));
          
          addNotification({
            type: 'info',
            title: 'Impression Target 80% Reached',
            message: `Ad "${ad.name}" is at ${impressionProgress.toFixed(1)}% of impression target`,
            metadata: {
              adId: ad.adId,
              campaignId: ad.campaignId,
              metric: 'impressions',
              target: ad.impressionTarget,
              actual: ad.liveImpressions
            }
          });
        }
      }

      // Check clicks target
      if (ad.liveClicks && ad.clickTarget) {
        const clickProgress = (ad.liveClicks / ad.clickTarget) * 100;
        const clickKey = `${adKey}_clicks`;
        
        if (clickProgress >= 100 && !checkedTargets.has(clickKey)) {
          setCheckedTargets(prev => new Set(prev).add(clickKey));
          const overPerformance = ((ad.liveClicks - ad.clickTarget) / ad.clickTarget * 100).toFixed(1);
          
          addNotification({
            type: 'achievement',
            title: 'Click Target Exceeded!',
            message: `Ad "${ad.name}" exceeded its click target by ${overPerformance}%`,
            metadata: {
              adId: ad.adId,
              campaignId: ad.campaignId,
              metric: 'clicks',
              target: ad.clickTarget,
              actual: ad.liveClicks,
              improvement: parseFloat(overPerformance)
            }
          });
        }
      }

      // Check CTR performance
      if (ad.liveImpressions && ad.liveClicks) {
        const liveCTR = (ad.liveClicks / ad.liveImpressions) * 100;
        const targetCTR = ad.clickTarget && ad.impressionTarget 
          ? (ad.clickTarget / ad.impressionTarget) * 100 
          : 0;
        
        if (targetCTR > 0) {
          const ctrProgress = (liveCTR / targetCTR) * 100;
          const ctrKey = `${adKey}_ctr`;
          
          if (ctrProgress >= 120 && !checkedTargets.has(ctrKey)) {
            setCheckedTargets(prev => new Set(prev).add(ctrKey));
            const improvement = ((liveCTR - targetCTR) / targetCTR * 100).toFixed(1);
            
            addNotification({
              type: 'achievement',
              title: 'Outstanding CTR Performance!',
              message: `Ad "${ad.name}" has ${improvement}% better CTR than target (${liveCTR.toFixed(2)}% vs ${targetCTR.toFixed(2)}%)`,
              metadata: {
                adId: ad.adId,
                campaignId: ad.campaignId,
                metric: 'ctr',
                target: targetCTR,
                actual: liveCTR,
                improvement: parseFloat(improvement)
              }
            });
          }
        }
      }
    });

    // Check overall campaign performance
    campaignData.forEach(campaign => {
      const campaignKey = `campaign_${campaign.id}`;
      
      // Calculate total performance across all ads in campaign
      const campaignAds = adData.filter(ad => ad.campaignId === campaign.id);
      if (campaignAds.length > 0) {
        const totalImpressions = campaignAds.reduce((sum, ad) => sum + (ad.liveImpressions || 0), 0);
        const totalClicks = campaignAds.reduce((sum, ad) => sum + (ad.liveClicks || 0), 0);
        const totalTargetImpressions = campaignAds.reduce((sum, ad) => sum + (ad.impressionTarget || 0), 0);
        const totalTargetClicks = campaignAds.reduce((sum, ad) => sum + (ad.clickTarget || 0), 0);
        
        if (totalTargetImpressions > 0) {
          const campaignProgress = (totalImpressions / totalTargetImpressions) * 100;
          const campaignProgressKey = `${campaignKey}_progress`;
          
          if (campaignProgress >= 100 && !checkedTargets.has(campaignProgressKey)) {
            setCheckedTargets(prev => new Set(prev).add(campaignProgressKey));
            
            addNotification({
              type: 'success',
              title: 'Campaign Target Achieved!',
              message: `Campaign "${campaign.brandName}" has reached its impression target`,
              metadata: {
                campaignId: campaign.id,
                metric: 'impressions',
                target: totalTargetImpressions,
                actual: totalImpressions
              }
            });
          }
        }
      }
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setCheckedTargets(new Set());
    localStorage.removeItem(STORAGE_KEY);
    toast.success('All notifications cleared');
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    markAsRead(notification.id);
    
    // Navigate based on notification metadata
    if (notification.metadata?.campaignId && notification.metadata?.adId) {
      // Navigate to specific ad details within campaign
      window.location.href = `/campaigns/${notification.metadata.campaignId}/ads/${notification.metadata.adId}`;
    } else if (notification.metadata?.adId) {
      // Navigate to ad details - need to find the campaign first
      // For now, we'll navigate to the ad list and let user find the ad
      window.location.href = `/campaigns/undefined/ads/${notification.metadata.adId}`;
    } else if (notification.metadata?.campaignId) {
      // Navigate to campaign details
      window.location.href = `/campaigns/${notification.metadata.campaignId}`;
    }
    
    // Close notifications modal
    closeNotificationsModal();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isModalOpen,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        clearAllNotifications,
        removeNotification,
        handleNotificationClick,
        checkPerformanceAlerts,
        openNotificationsModal,
        closeNotificationsModal,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
} 