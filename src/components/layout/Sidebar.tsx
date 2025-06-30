import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { BarChart3, Lamp as Campaign, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Campaigns', href: '/campaigns', icon: Campaign },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 h-screen bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 flex-shrink-0 transition-colors duration-200 fixed left-0 top-20 z-30">
        <div className="flex flex-col w-full pt-4">
          <nav className="flex-1 px-4 pb-4 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-r-2 border-purple-700 dark:border-purple-400 shadow-sm'
                      : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-gray-100'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="lg:hidden fixed left-0 top-20 z-50 w-64 h-full bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 shadow-xl"
          >
            <div className="flex flex-col h-full">
              {/* Mobile header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <img
                      src="/logo_512x512.png"
                      alt="Logo"
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">Hatke!</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigation.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <NavLink
                      to={item.href}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group w-full',
                          isActive
                            ? 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-purple-300 border-l-4 border-purple-600 shadow-sm'
                            : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-gray-100 active:bg-slate-100 dark:active:bg-gray-600'
                        )
                      }
                    >
                      <item.icon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-medium">{item.name}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </nav>

              {/* Mobile footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  © 2024 Hatke! Dashboard
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop spacer */}
      <div className="hidden lg:block w-64 flex-shrink-0"></div>
    </>
  );
}