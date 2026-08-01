import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionsContext';
import { whitelistService, WhitelistUser } from '@/services/whitelistService';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Shield, UserPlus, UserMinus, Search, RefreshCw, Users, ShieldCheck, Eye } from 'lucide-react';

export function AdminPanel() {
    const { user } = useAuth();
    const { isAdmin } = usePermissions();
    const navigate = useNavigate();
    const [users, setUsers] = useState<WhitelistUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Redirect non-admin users
    useEffect(() => {
        if (!isAdmin) {
            toast.error('Access denied. Admin privileges required.');
            navigate('/');
        }
    }, [isAdmin, navigate]);

    const fetchUsers = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const allUsers = await whitelistService.getAllUsers(user.id);
            setUsers(allUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin && user) {
            fetchUsers();
        }
    }, [isAdmin, user]);

    const handleToggleWhitelist = async (targetUser: WhitelistUser) => {
        if (!user) return;
        setActionLoading(targetUser.id);
        try {
            if (targetUser.isWhitelisted) {
                const result = await whitelistService.removeFromWhitelist(user.id, targetUser.id);
                if (result.success) {
                    toast.success(`${targetUser.username} removed from whitelist`);
                } else {
                    toast.error(result.message);
                }
            } else {
                const result = await whitelistService.addToWhitelist(user.id, targetUser.id);
                if (result.success) {
                    toast.success(`${targetUser.username} added to whitelist`);
                } else {
                    toast.error(result.message);
                }
            }
            await fetchUsers();
        } catch (err) {
            console.error('Error toggling whitelist:', err);
            toast.error('Failed to update whitelist');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const whitelistedCount = users.filter(u => u.isWhitelisted).length;
    const viewOnlyCount = users.filter(u => !u.isWhitelisted).length;

    if (!isAdmin) return null;

    return (
        <div className="halo-page">
            <div className="space-y-5">
                <PageHeader
                    eyebrow="Administration"
                    title="Admin panel"
                    subhead="Manage who can access and edit BuyHatke ads dashboard."
                    actions={
                        <button
                            className="btn-halo-outline"
                            onClick={fetchUsers}
                            disabled={loading}
                        >
                            <RefreshCw strokeWidth={1.75} className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Loading' : 'Refresh'}
                        </button>
                    }
                />

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="halo-card halo-rail p-5 flex items-center justify-between">
                        <div>
                            <div className="halo-eyebrow mb-2">Total users</div>
                            <div className="halo-metric num">{users.length}</div>
                        </div>
                        <div className="halo-chip">
                            <Users strokeWidth={1.75} size={18} />
                        </div>
                    </div>
                    <div className="halo-card halo-rail p-5 flex items-center justify-between">
                        <div>
                            <div className="halo-eyebrow mb-2">Whitelisted</div>
                            <div className="halo-metric num">{whitelistedCount}</div>
                        </div>
                        <div className="halo-chip" style={{ background: 'var(--h-pos-soft)', color: 'var(--h-mint)' }}>
                            <ShieldCheck strokeWidth={1.75} size={18} />
                        </div>
                    </div>
                    <div className="halo-card halo-rail p-5 flex items-center justify-between">
                        <div>
                            <div className="halo-eyebrow mb-2">View only</div>
                            <div className="halo-metric num">{viewOnlyCount}</div>
                        </div>
                        <div className="halo-chip" style={{ background: 'var(--h-surface-3)', color: 'var(--h-ink-2)' }}>
                            <Eye strokeWidth={1.75} size={18} />
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="halo-card p-5">
                    <div className="halo-panel-head-title mb-4">
                        <div className="halo-chip">
                            <Search strokeWidth={1.75} size={16} />
                        </div>
                        <div className="halo-heading">Search users</div>
                    </div>
                    <div className="relative">
                        <Search strokeWidth={1.75} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--h-ink-3)' }} />
                        <input
                            placeholder="Search by username..."
                            className="halo-field halo-search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Users table */}
                <div className="halo-card overflow-hidden">
                    <div className="halo-panel-head halo-panel-head-mesh">
                        <div className="halo-mesh-grain" aria-hidden="true" />
                        <div className="halo-panel-head-title">
                            <div className="halo-chip">
                                <Shield strokeWidth={1.75} size={16} />
                            </div>
                            <div className="halo-heading">User management</div>
                        </div>
                        <span className="halo-badge num">{filteredUsers.length} users</span>
                    </div>

                    <div className="halo-scroll-x">
                        {loading ? (
                            <div className="p-5 space-y-3">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className="halo-skeleton h-12 w-full" />
                                ))}
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="halo-chip-lg mx-auto mb-4">
                                    <Users strokeWidth={1.75} size={20} />
                                </div>
                                <div className="halo-heading mb-1">No users found</div>
                                <p className="halo-subtitle">Try a different search term.</p>
                            </div>
                        ) : (
                            <table className="halo-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((u, index) => (
                                        <motion.tr
                                            key={u.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.02 }}
                                        >
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-none"
                                                        style={{ background: 'var(--h-g-iris)', color: '#fff' }}
                                                    >
                                                        {u.username.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium" style={{ color: 'var(--h-ink)' }}>{u.username}</div>
                                                        <div className="text-xs num" style={{ color: 'var(--h-ink-3)' }}>#{u.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {u.isWhitelisted ? (
                                                    <span className="halo-badge halo-badge-pos">
                                                        <ShieldCheck strokeWidth={1.75} size={12} />
                                                        Editor
                                                    </span>
                                                ) : (
                                                    <span className="halo-badge">
                                                        <Eye strokeWidth={1.75} size={12} />
                                                        View only
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    disabled={actionLoading === u.id}
                                                    onClick={() => handleToggleWhitelist(u)}
                                                    className={u.isWhitelisted ? 'btn-halo-danger btn-halo-sm' : 'btn-halo-soft btn-halo-sm'}
                                                >
                                                    {actionLoading === u.id ? (
                                                        <span className="halo-spinner" />
                                                    ) : u.isWhitelisted ? (
                                                        <>
                                                            <UserMinus strokeWidth={1.75} size={14} />
                                                            Remove
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus strokeWidth={1.75} size={14} />
                                                            Whitelist
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
