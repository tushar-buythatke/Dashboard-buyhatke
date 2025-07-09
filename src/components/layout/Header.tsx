import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Settings, 
  User as UserIcon, 
  LogOut, 
  ChevronDown,
  Moon,
  Sun,
  HelpCircle,
  Activity,
  Menu,
  Target,
  TrendingUp,
  MousePointerClick,
  Eye,
  Sparkles,
  Zap,
  Star,
  CheckCircle,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/card';
import { NotificationsModal } from './NotificationsModal';

function getInitials(userName: string | null | undefined) {
  if (!userName) return 'U';
  const name = userName.trim();
  if (name.length === 0) return 'U';
  if (name.length === 1) return name.toUpperCase();
  
  // Check if it contains spaces or underscores
  const parts = name.split(/[\s_]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  
  // If no spaces, take first two characters
  return name.slice(0, 2).toUpperCase();
}

function getGravatarUrl() {
  return `https://gravatar.com/avatar/?d=mp&s=40`;
}

// Animated particle component
function FloatingParticle({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 bg-white/20 rounded-full"
      initial={{ 
        x: Math.random() * window.innerWidth, 
        y: window.innerHeight + 10,
        opacity: 0 
      }}
      animate={{ 
        y: -10, 
        opacity: [0, 1, 0],
        scale: [0, 1, 0]
      }}
      transition={{ 
        duration: 8 + Math.random() * 4, 
        delay: delay,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
}

// Notification dropdown component
function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, openNotificationsModal } = useNotifications();
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
      case 'achievement': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <Zap className="h-4 w-4 text-orange-500" />;
      case 'info': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4" />;
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
    <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 max-h-[550px] overflow-hidden z-[100000]">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={markAllAsRead}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark all as read
                </DropdownMenuItem>
                <DropdownMenuItem onClick={clearNotifications} className="text-red-600">
                  <Eye className="mr-2 h-4 w-4" />
                  Clear all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">No notifications yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  We'll notify you when your ads hit their targets!
                </p>
              </div>
            </div>
          </div>
        ) : (
          notifications.slice(0, 4).map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all duration-200 ${
                !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
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
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    {getTypeIcon(notification.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(notification.timestamp)}</span>
                    </div>
                    {notification.metadata?.metric && (
                      <div className="flex items-center space-x-1">
                        {getMetricIcon(notification.metadata.metric)}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {notification.metadata.metric}
                        </span>
                      </div>
                    )}
                  </div>
                  {notification.metadata?.improvement && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        +{notification.metadata.improvement}% improvement
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {notifications.length > 4 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full h-10 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 font-medium"
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
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [particles, setParticles] = useState<number[]>([]);

  // Create floating particles
  useEffect(() => {
    const particleCount = 15;
    setParticles(Array.from({ length: particleCount }, (_, i) => i));
  }, []);

  // Inject flowing river CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flowingRiver {
        0% { background-position: 0% 50%; }
        25% { background-position: 100% 75%; }
        50% { background-position: 200% 50%; }
        75% { background-position: 100% 25%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes rainbowWave {
        0% { background-position: 0% 0%; }
        33% { background-position: 100% 100%; }
        66% { background-position: 200% 50%; }
        100% { background-position: 0% 0%; }
      }
      
      .flowing-river {
        animation: flowingRiver 10s ease-in-out infinite;
      }
      
      .rainbow-wave {
        animation: rainbowWave 15s linear infinite;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
    <header className="fixed top-0 left-0 right-0 border-b border-white/20 dark:border-gray-700/50 px-4 sm:px-6 py-3 sm:py-4 w-full shadow-2xl backdrop-blur-sm z-[99999] overflow-hidden relative" style={{ position: 'fixed', zIndex: 99999 }}>
      {/* EPIC FLOWING COLOR RIVER BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary Flowing Gradient River */}
        <motion.div 
          className="absolute inset-0 opacity-90"
          style={{
            background: `linear-gradient(45deg, 
              #FF6B6B, #FF8E53, #FF6B9D, #C44569, 
              #F8B500, #F39801, #E55039, #FF3838,
              #00D2FF, #3742FA, #5F27CD, #FF9FF3,
              #54A0FF, #5F27CD, #FF6B6B, #FF8E53
            )`,
            backgroundSize: '400% 400%',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Secondary Rainbow Flow */}
        <motion.div 
          className="absolute inset-0 opacity-60"
          style={{
            background: `linear-gradient(-45deg, 
              #FFE066, #FF9F43, #EE5A52, #EA2027,
              #0652DD, #9C88FF, #FDA7DF, #FF9FF3,
              #1DD1A1, #10AC84, #00D2FF, #3742FA
            )`,
            backgroundSize: '600% 600%',
          }}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Flowing Particles and Waves */}
        {particles.map((_, index) => (
          <FloatingParticle key={index} delay={index * 0.5} />
        ))}
        
        {/* Rainbow Gradient Orbs */}
        <motion.div
          className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-30"
          style={{
            background: 'radial-gradient(circle, #FF6B6B, #FF8E53, #FFE066)',
          }}
          animate={{
            x: [0, 120, 0],
            y: [0, 60, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full blur-3xl opacity-25"
          style={{
            background: 'radial-gradient(circle, #3742FA, #9C88FF, #FDA7DF)',
          }}
          animate={{
            x: [0, -100, 0],
            y: [0, -40, 0],
            scale: [1, 0.7, 1],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full blur-2xl opacity-20"
          style={{
            background: 'radial-gradient(circle, #1DD1A1, #00D2FF, #54A0FF)',
          }}
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Flowing Wave Effects */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 20px,
              rgba(255, 255, 255, 0.1) 20px,
              rgba(255, 255, 255, 0.1) 40px
            )`,
          }}
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Epic Shimmer Overlay */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(
              110deg,
              transparent 20%,
              rgba(255, 255, 255, 0.2) 30%,
              rgba(255, 255, 255, 0.4) 50%,
              rgba(255, 255, 255, 0.2) 70%,
              transparent 80%
            )`,
          }}
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 2
          }}
        />

        {/* Color Burst Effects */}
        <motion.div
          className="absolute top-0 left-0 w-full h-full opacity-25"
          style={{
            background: `radial-gradient(
              ellipse at 20% 50%,
              rgba(255, 107, 107, 0.3) 0%,
              transparent 50%
            ), radial-gradient(
              ellipse at 80% 50%,
              rgba(55, 66, 250, 0.3) 0%,
              transparent 50%
            ), radial-gradient(
              ellipse at 50% 20%,
              rgba(29, 209, 161, 0.3) 0%,
              transparent 50%
            )`,
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="flex items-center justify-between max-w-7xl mx-auto relative z-10">
        {/* Left Section - Mobile Menu + Logo & Title */}
        <motion.div 
          className="flex items-center space-x-2 sm:space-x-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Mobile menu button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
              className="lg:hidden h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/40 transition-all duration-300"
          >
            <Menu className="h-5 w-5" />
          </Button>
          </motion.div>

          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div 
              onClick={() => navigate('/')}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/30 dark:border-gray-600/30 group hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-300 cursor-pointer"
              whileHover={{ 
                boxShadow: "0 20px 40px rgba(255, 255, 255, 0.2)",
                background: "rgba(255, 255, 255, 0.3)"
              }}
            >
              <motion.img
                src="/logo_512x512.png"
                alt="Logo"
                className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              />
            </motion.div>
            <motion.div 
              className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            onClick={() => navigate('/')}
            className="hidden sm:block cursor-pointer"
            whileHover={{ x: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <motion.h1 
              className="text-xl sm:text-2xl font-bold text-white tracking-tight hover:text-blue-100 transition-colors duration-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-flex items-center">
              Hatke! Dashboard
                <motion.div
                  className="ml-2"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                </motion.div>
              </span>
            </motion.h1>
            <motion.p 
              className="text-blue-100 dark:text-gray-300 text-xs sm:text-sm font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Marketing Intelligence Platform
            </motion.p>
          </motion.div>
          {/* Mobile title */}
          <motion.div 
            onClick={() => navigate('/')}
            className="sm:hidden cursor-pointer"
            whileHover={{ x: 5 }}
          >
            <h1 className="text-lg font-bold text-white tracking-tight hover:text-blue-100 transition-colors duration-200">
              Hatke!
            </h1>
          </motion.div>
        </motion.div>

        {/* Right Section - Actions & Profile */}
        <motion.div 
          className="flex items-center space-x-2 sm:space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          {/* Theme Toggle */}
          <motion.div
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
          >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
              className="h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300"
          >
              <AnimatePresence mode="wait">
            {theme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.3 }}
                  >
              <Sun className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.3 }}
                  >
              <Moon className="h-5 w-5" />
                  </motion.div>
            )}
              </AnimatePresence>
          </Button>
          </motion.div>

          {/* Enhanced Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
          <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
            <Button
              variant="ghost"
              size="sm"
                    className="h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300"
                  >
                    <motion.div
                      animate={unreadCount > 0 ? { rotate: [0, -10, 10, 0] } : {}}
                      transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 3 }}
            >
              <Bell className="h-5 w-5" />
                    </motion.div>
                  </Button>
                </motion.div>
                {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                >
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                </motion.div>
              )}
          </div>
            </DropdownMenuTrigger>
            <NotificationDropdown />
          </DropdownMenu>

          {/* Enhanced User Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                <Button
                  variant="ghost"
                    className="h-10 sm:h-12 px-2 sm:px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 focus:ring-2 focus:ring-white/30 focus:outline-none"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        {/* Profile SVG Icon */}
                        <div className="h-6 w-6 sm:h-8 sm:w-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/30 shadow-lg">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="20" 
                            height="20" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="text-white"
                          >
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                        </div>
                      </motion.div>
                    
                    <div className="hidden sm:flex items-center space-x-1">
                      <span className="text-sm font-medium text-white truncate max-w-24">
                        {user.userName}
                      </span>
                        <motion.div
                          animate={{ rotate: [0, 180] }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="group-data-[state=open]:rotate-180"
                        >
                      <ChevronDown className="h-4 w-4 text-white/80" />
                        </motion.div>
                    </div>
                    
                    {/* Mobile view - only show chevron */}
                    <ChevronDown className="h-4 w-4 text-white/80 sm:hidden" />
                  </div>
                </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-0 mt-2 border shadow-lg bg-white dark:bg-slate-800 rounded-lg z-[100000]">
                {/* Clean Header Section */}
                <div className="py-4 px-5 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <div className="text-center space-y-3">
                    <div className="relative mx-auto w-fit">
                      {/* Clean Profile SVG Icon */}
                      <div className="h-14 w-14 mx-auto bg-white dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-500 shadow-sm">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="28" 
                          height="28" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="text-slate-600 dark:text-slate-300"
                        >
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      {/* Fixed Online Indicator Position */}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-700 shadow-sm">
                        <div className="w-full h-full bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                        Welcome back!
                      </h3>
                      <p className="font-medium text-slate-600 dark:text-slate-400 text-sm">
                        {user.userName}
                      </p>
                      <div className="flex items-center justify-center space-x-2">
                        <Badge className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 border-0 text-xs font-medium px-2 py-1">
                          {user.type === 0 ? 'Admin' : 'User'}
                        </Badge>
                        <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-700 dark:text-green-300 font-medium">Online</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Static Logout Section */}
                <div className="py-3 px-5">
                  <button
                    className="w-full flex items-center space-x-3 p-2 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 transition-colors duration-200 border border-red-100 dark:border-red-900/30"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <div className="w-6 h-6 bg-red-100 dark:bg-red-900/50 rounded-md flex items-center justify-center flex-shrink-0">
                      <LogOut className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="font-medium text-red-700 dark:text-red-300 text-sm">
                      {isLoggingOut ? 'Signing out...' : 'Sign out'}
                    </span>
                  </button>
                </div>
             </DropdownMenuContent>
           </DropdownMenu>
          )}
        </motion.div>
      </div>
      
      {/* Notifications Modal */}
      <NotificationsModal />
    </header>
  );
}