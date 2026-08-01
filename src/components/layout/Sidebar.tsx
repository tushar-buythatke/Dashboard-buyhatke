import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Megaphone, TrendingUp, Settings, X, Shield, ImagePlus, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/context/PermissionsContext';
import { useAuth } from '@/context/AuthContext';

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

function getInitials(userName: string | null | undefined) {
  if (!userName) return 'U';
  const name = userName.trim();
  if (name.length === 0) return 'U';
  if (name.length === 1) return name.toUpperCase();
  const parts = name.split(/[\s_]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { userRole } = usePermissions();
  const { user } = useAuth();
  const navigation = useNavItems();
  const [collapsed, setCollapsed] = useState(false);

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const desktopWidth = collapsed ? 'var(--h-sidebar-w-collapsed)' : 'var(--h-sidebar-w)';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="fixed left-0 top-[var(--h-header-h)] z-30 hidden h-[calc(100vh-var(--h-header-h))] flex-shrink-0 lg:flex"
        style={{ width: desktopWidth, borderRight: '1px solid var(--h-line)' }}
      >
        <div className="flex w-full flex-col overflow-hidden">
          {!collapsed && (
            <div className="px-4 pt-5 pb-2">
              <span className="halo-eyebrow">Navigation</span>
            </div>
          )}
          {collapsed && <div className="pt-5" />}

          <nav className="flex-1 space-y-1 px-3 pb-4 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `halo-nav-item relative ${collapsed ? 'justify-center !px-0' : ''} ${
                    isActive ? 'bg-[var(--h-tint-2)] text-[var(--h-iris-600)]' : ''
                  }`
                }
              >
                {() => (
                  <>
                    <item.icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom: compact user/role block + collapse control */}
          <div className="px-3 pb-4 pt-2 space-y-2" style={{ borderTop: '1px solid var(--h-line)' }}>
            {user && (
              <div className={`flex items-center gap-2.5 rounded-[var(--h-r-pill)] px-2 py-1.5 ${collapsed ? 'justify-center' : ''}`}>
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--h-tint-2)] text-[11px] font-semibold text-[var(--h-iris-600)]">
                  {getInitials(user.username)}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[12.5px] font-medium text-[var(--h-ink)]">{user.username}</p>
                    <p className="truncate text-[10.5px] capitalize text-[var(--h-ink-3)]">{userRole}</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setCollapsed((c) => !c)}
              className="halo-nav-item w-full text-[var(--h-ink-3)] hover:text-[var(--h-ink)]"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? (
                <ChevronsRight size={18} strokeWidth={1.75} className="mx-auto flex-shrink-0" />
              ) : (
                <>
                  <ChevronsLeft size={18} strokeWidth={1.75} className="flex-shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar — overlay drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.19 }}
              className="fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
              style={{ background: 'rgba(10, 11, 17, .42)' }}
              onClick={onClose}
              aria-hidden
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.19, ease: [0.22, 1, 0.36, 1] }}
              className="halo-card fixed left-0 top-0 bottom-0 z-50 flex w-[272px] flex-col rounded-none lg:hidden"
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

              <div className="px-4 py-4" style={{ borderTop: '1px solid var(--h-line)' }}>
                <p className="text-center text-[10px] text-[var(--h-ink-3)]">© 2026 Hatke Dashboard</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop spacer — keeps main content clear of the fixed sidebar */}
      <div
        className="hidden lg:block flex-shrink-0"
        style={{ width: desktopWidth }}
      />
    </>
  );
}
