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
  Activity
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

function getGravatarUrl(userName: string | null) {
  if (!userName) return null;
  // Create a simple hash based on username for consistency
  const hash = btoa(userName.toLowerCase().trim()).replace(/=/g, '');
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=100`;
}

export function Header() {
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
    <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-gray-800 dark:via-gray-900 dark:to-black border-b border-white/20 dark:border-gray-700/50 px-6 py-4 w-full shadow-xl backdrop-blur-sm z-30 relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left Section - Logo & Title */}
        <motion.div 
          className="flex items-center space-x-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/30 dark:border-gray-600/30 group hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-200">
              <img
                src="/logo_512x512.png"
                alt="Logo"
                className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-200"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 shadow-sm">
              <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Hatke! Dashboard
            </h1>
            <p className="text-blue-100 dark:text-gray-300 text-sm font-medium">Marketing Intelligence Platform</p>
          </div>
        </motion.div>

        {/* Right Section - Actions & Profile */}
        <motion.div 
          className="flex items-center space-x-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 border border-white/20 dark:border-gray-600/30 text-white transition-all duration-200 hover:shadow-lg"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 border border-white/20 dark:border-gray-600/30 text-white relative transition-all duration-200 hover:shadow-lg"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Badge variant="secondary">{notificationCount} new</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-start space-x-3 p-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Campaign Performance Alert</p>
                  <p className="text-xs text-muted-foreground">Your "Summer Sale" campaign CTR increased by 15%</p>
                  <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-start space-x-3 p-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Budget Optimization</p>
                  <p className="text-xs text-muted-foreground">AI suggested budget reallocation available</p>
                  <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-start space-x-3 p-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">System Update</p>
                  <p className="text-xs text-muted-foreground">New analytics features are now available</p>
                  <p className="text-xs text-muted-foreground mt-1">3 hours ago</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-auto rounded-full bg-white/10 hover:bg-white/20 border border-white/20 dark:border-gray-600/30 pl-2 pr-3 transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8 border-2 border-white/30 dark:border-gray-600/30">
                        <AvatarImage 
                          src={getGravatarUrl(user.userName)} 
                          alt={user.userName ? user.userName : 'User'} 
                        />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm">
                          {getInitials(user.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-white dark:border-gray-800 shadow-sm">
                        <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-white leading-none">
                        {user.userName}
                      </p>
                      <p className="text-xs text-blue-100 dark:text-gray-300 mt-0.5">
                        {user.type === 0 ? 'Admin' : 'User'} • Online
                      </p>
                    </div>
                    <ChevronDown className="h-5 w-5 text-white/60" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1">
                <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12 border-2 border-gray-100 dark:border-gray-700">
                      <AvatarImage 
                        src={getGravatarUrl(user.userName)} 
                        alt={user.userName ? user.userName : 'User'} 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                        {getInitials(user.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 leading-none">
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
                  <span>Account Settings</span>
                </DropdownMenuItem>
                
                {user.type === 0 && (
                  <DropdownMenuItem className="flex items-center space-x-2 p-3 cursor-pointer">
                    <Shield className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    <span>Admin Panel</span>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem className="flex items-center space-x-2 p-3 cursor-pointer">
                  <HelpCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <span>Help & Support</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center space-x-2 p-3 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700"
                >
                  <LogOut className="h-5 w-5" />
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>
      </div>
    </header>
  );
}