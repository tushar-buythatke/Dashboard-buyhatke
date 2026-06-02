import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, Megaphone, TrendingUp, Settings, X, Shield, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/context/PermissionsContext';

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Slot Management', href: '/slot-management', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { isAdmin, canEdit } = usePermissions();

  const navigation = [
    ...baseNavigation,
    ...(canEdit ? [{ name: 'Offers Config', href: '/offers-config', icon: ImagePlus }] : []),
    ...(isAdmin ? [{ name: 'Admin Panel', href: '/admin', icon: Shield }] : []),
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-[var(--header-h)] z-30 hidden h-[calc(100vh-var(--header-h))] w-[var(--sidebar-w)] flex-shrink-0 lg:flex">
        <div className="flex w-full flex-col border-r border-[var(--line)] bg-[var(--bg-panel)]/80 backdrop-blur-xl">
          <div className="px-5 pt-5 pb-3">
            <div className="velvet-section-title">Navigation</div>
          </div>
          <nav className="flex-1 space-y-0.5 px-3 pb-6 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) => `velvet-nav-item ${isActive ? 'is-active' : ''}`}
              >
                <item.icon className="h-[15px] w-[15px] flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 border-r border-[var(--line)] bg-[var(--bg-panel)] shadow-[var(--shadow-3)] lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <button
                  onClick={() => {
                    navigate('/');
                    onClose();
                  }}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-tint)] border border-[var(--line-violet)] flex items-center justify-center">
                    <img src="/logo_512x512.png" alt="Logo" className="w-5 h-5 object-contain" />
                  </div>
                  <h2 className="font-bold text-[15px] tracking-[-0.02em] text-[var(--text-1)]">
                    Hatke <span className="font-serif italic font-normal text-[var(--indigo-500)]">Dashboard</span>
                  </h2>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-[var(--text-3)] hover:text-[var(--text-1)]"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="px-5 pt-4 pb-2">
                <div className="velvet-section-title">Navigation</div>
              </div>
              <nav className="flex-1 px-3 pb-4 overflow-y-auto scrollbar-thin">
                {navigation.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * index, duration: 0.3 }}
                  >
                    <NavLink
                      to={item.href}
                      end={item.href === '/'}
                      onClick={onClose}
                      className={({ isActive }) => `velvet-nav-item ${isActive ? 'is-active' : ''}`}
                    >
                      <item.icon className="h-[15px] w-[15px] flex-shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </nav>

              <div className="border-t border-[var(--line)] px-5 py-4">
                <p className="text-[10px] text-[var(--text-3)] text-center">
                  © 2025 Hatke Dashboard
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop spacer */}
      <div className="hidden lg:block w-[var(--sidebar-w)] flex-shrink-0" />
    </>
  );
}
