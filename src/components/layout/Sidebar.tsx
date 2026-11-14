import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Megaphone, TrendingUp, Settings, X, Shield, ImagePlus, Sun, Moon, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/context/PermissionsContext';
import { useTheme } from '@/context/ThemeContext';
import { useEnvironment } from '@/context/EnvironmentContext';
import { useNotifications } from '@/context/NotificationContext';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/** Base, always-visible routes. Shared with Header.tsx so the top nav rail
 *  and the sidebar can never drift out of sync. */
export const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Slot Management', href: '/slot-management', icon: Settings },
];

/** Full nav list including permission-gated routes. Both Header and Sidebar
 *  call this so the active route highlighting always agrees. */
export function useNavItems(): NavItem[] {
  const { isAdmin, canEdit } = usePermissions();
  return [
    ...NAV_ITEMS,
    ...(canEdit ? [{ name: 'Offers Config', href: '/offers-config', icon: ImagePlus }] : []),
    ...(isAdmin ? [{ name: 'Admin Panel', href: '/admin', icon: Shield }] : []),
  ];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const navigation = useNavItems();
  const { theme, toggleTheme } = useTheme();
  const { setApiVersion, isV2 } = useEnvironment();
  const { unreadCount, openNotificationsModal } = useNotifications();

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile Sidebar — overlay drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.19 }}
              className="fixed inset-0 z-40 backdrop-blur-sm xl:hidden"
              style={{ background: 'rgba(10, 11, 17, .42)' }}
              onClick={onClose}
              aria-hidden
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.19, ease: [0.22, 1, 0.36, 1] }}
              className="halo-card fixed left-0 top-0 bottom-0 z-50 flex w-[272px] flex-col rounded-none xl:hidden"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--h-line)' }}>
                <button
                  onClick={() => {
                    navigate('/');
                    onClose();
                  }}
                  className="flex items-center gap-2.5"
                >
                  <img src="/logo_512x512.png" alt="Logo" className="h-7 w-7 object-contain" />
                  <span
                    className="text-[15px] font-semibold tracking-tight text-[var(--h-ink)]"
                    style={{ fontFamily: 'var(--h-font-display)' }}
                  >
                    Hatke
                  </span>
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close menu"
                  className="btn-halo-ghost btn-halo-icon btn-halo-sm"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>

              <div className="px-4 pt-4 pb-2">
                <span className="halo-eyebrow">Navigation</span>
              </div>
              <nav className="flex-1 space-y-1 px-3 pb-4 overflow-y-auto scrollbar-thin">
                {navigation.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * index, duration: 0.19 }}
                  >
                    <NavLink
                      to={item.href}
                      end={item.href === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `halo-nav-item relative ${isActive ? 'bg-[var(--h-tint-2)] text-[var(--h-iris-600)]' : ''}`
                      }
                    >
                      {() => (
                        <>
                          <item.icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
                          <span>{item.name}</span>
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                ))}
              </nav>

              <div className="space-y-3 px-4 py-4" style={{ borderTop: '1px solid var(--h-line)' }}>
                <div className="flex items-center gap-2">
                  <button onClick={toggleTheme} className="e-round flex-none" aria-label="Toggle theme">
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                  <button
                    onClick={() => { openNotificationsModal(); onClose(); }}
                    className="e-round relative flex-none"
                    aria-label="Notifications"
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--h-iris-500)]" />}
                  </button>
                  <div className="halo-segment ml-auto" role="group" aria-label="API version">
                    <button onClick={() => isV2 && setApiVersion('v1')} className={`halo-segment-item ${!isV2 ? 'is-active' : ''}`}>V1</button>
                    <button onClick={() => !isV2 && setApiVersion('v2')} className={`halo-segment-item ${isV2 ? 'is-active' : ''}`}>V2</button>
                  </div>
                </div>
                <p className="text-center text-[10px] text-[var(--h-ink-3)]">© 2026 Hatke Dashboard</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </>
  );
}
