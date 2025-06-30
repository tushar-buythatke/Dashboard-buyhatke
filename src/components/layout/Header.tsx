import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
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
  Shield, 
  ChevronDown,
  Moon,
  Sun,
  HelpCircle,
  Activity,
  Menu,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

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

function getGravatarUrl(email: string | null | undefined) {
  return `https://gravatar.com/avatar/?d=mp&s=40`;
}

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationCount] = useState(3);
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

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExport = () => {
    console.log('Export functionality triggered');
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-gray-800 dark:via-gray-900 dark:to-black border-b border-white/20 dark:border-gray-700/50 px-4 sm:px-6 py-3 sm:py-4 w-full shadow-xl backdrop-blur-sm z-50 relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left Section - Mobile Menu + Logo & Title */}
        <motion.div 
          className="flex items-center space-x-2 sm:space-x-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/30 dark:border-gray-600/30 group hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-200">
              <img
                src="/logo_512x512.png"
                alt="Logo"
                className="w-6 h-6 sm:w-8 sm:h-8 object-contain group-hover:scale-110 transition-transform duration-200"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 shadow-sm">
              <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Hatke! Dashboard
            </h1>
            <p className="text-blue-100 dark:text-gray-300 text-xs sm:text-sm font-medium">Marketing Intelligence Platform</p>
          </div>
          {/* Mobile title */}
          <div className="sm:hidden">
            <h1 className="text-lg font-bold text-white tracking-tight">
              Hatke!
            </h1>
          </div>
        </motion.div>

        {/* Right Section - Actions & Profile */}
        <motion.div 
          className="flex items-center space-x-2 sm:space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Theme Toggle - Visible on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/30 transition-all duration-200"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications - Visible on mobile */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/30 transition-all duration-200"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                >
                  {notificationCount}
                </motion.div>
              )}
            </Button>
          </div>

          {/* User Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 sm:h-12 px-2 sm:px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/30 transition-all duration-200 focus:ring-2 focus:ring-white/30 focus:outline-none"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8 border-2 border-white/30">
                      <AvatarImage 
                        src={getGravatarUrl(user.userName)} 
                        alt={user.userName ? user.userName : 'User'} 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs sm:text-sm">
                        {getInitials(user.userName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="hidden sm:flex items-center space-x-1">
                      <span className="text-sm font-medium text-white truncate max-w-24">
                        {user.userName}
                      </span>
                      <ChevronDown className="h-4 w-4 text-white/80" />
                    </div>
                    
                    {/* Mobile view - only show chevron */}
                    <ChevronDown className="h-4 w-4 text-white/80 sm:hidden" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 sm:w-64 p-1 mt-2">
                <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-gray-100 dark:border-gray-700">
                      <AvatarImage 
                        src={getGravatarUrl(user.userName)} 
                        alt={user.userName ? user.userName : 'User'} 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                        {getInitials(user.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 leading-none truncate">
                        {user.userName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {user.type === 0 ? 'Administrator' : 'User'}
                      </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Activity className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <DropdownMenuItem className="flex items-center space-x-2 p-3 cursor-pointer">
                <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span>View Profile</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-center space-x-2 p-3 cursor-pointer">
                <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span>Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-center space-x-2 p-3 cursor-pointer">
                <HelpCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span>Help & Support</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                className="flex items-center space-x-2 p-3 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="h-5 w-5" />
                                 <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
          )}
        </motion.div>
      </div>
    </header>
  );
}