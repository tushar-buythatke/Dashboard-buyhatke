import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionsContext';
import { whitelistService, WhitelistUser } from '@/services/whitelistService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 transition-all duration-300 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-amber-400/10 to-orange-400/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/50 px-4 sm:px-6 py-6 sm:py-8 relative"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/5 via-orange-600/5 to-red-600/5" />
                <div className="max-w-7xl mx-auto relative">
                    <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between">
                        <div className="flex items-center space-x-4 sm:space-x-6">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                                    Admin Panel
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base font-medium">
                                    Manage user access and whitelist permissions
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchUsers}
                            disabled={loading}
                            className="group relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:scale-105 transition-all duration-300 h-11 px-4"
                        >
                            <RefreshCw className={`h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                            <span className="ml-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                                {loading ? 'Loading...' : 'Refresh'}
                            </span>
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
                <div className="space-y-6 sm:space-y-8">
                    {/* Stats Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
                    >
                        <div className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-indigo-400/10 to-purple-400/20" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        <p className="text-blue-700 dark:text-blue-400 text-sm font-bold">Total Users</p>
                                    </div>
                                    <p className="text-3xl font-black text-blue-800 dark:text-blue-300">{users.length}</p>
                                </div>
                                <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/30">
                                    <Users className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-emerald-400/10 to-teal-400/20" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <ShieldCheck className="h-5 w-5 text-green-600" />
                                        <p className="text-green-700 dark:text-green-400 text-sm font-bold">Whitelisted</p>
                                    </div>
                                    <p className="text-3xl font-black text-green-800 dark:text-green-300">{whitelistedCount}</p>
                                </div>
                                <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/30">
                                    <ShieldCheck className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 via-slate-400/10 to-zinc-400/20" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Eye className="h-5 w-5 text-gray-600" />
                                        <p className="text-gray-700 dark:text-gray-400 text-sm font-bold">View Only</p>
                                    </div>
                                    <p className="text-3xl font-black text-gray-800 dark:text-gray-300">{viewOnlyCount}</p>
                                </div>
                                <div className="p-4 bg-gradient-to-r from-gray-500 to-slate-500 rounded-2xl shadow-lg shadow-gray-500/30">
                                    <Eye className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Search */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 via-amber-50/30 to-orange-50/50 dark:from-gray-800/50 dark:via-amber-900/20 dark:to-orange-900/20" />
                        <div className="relative z-10">
                            <div className="flex items-center space-x-3 mb-4">
                                <Search className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Search Users</h2>
                                <div className="flex-1 h-px bg-gradient-to-r from-amber-500/20 to-transparent" />
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                    <Search className="text-amber-500 h-4 w-4" />
                                </div>
                                <Input
                                    placeholder="Search by username..."
                                    className="pl-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-600/50 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 h-12 rounded-xl font-semibold transition-all duration-300"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Users Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-orange-50/20 to-red-50/30 dark:from-amber-900/20 dark:via-orange-900/10 dark:to-red-900/20" />

                        {/* Table Header */}
                        <div className="relative z-10 bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-600/50 p-4">
                            <div className="flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-amber-500" />
                                <h3 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                                    User Management
                                </h3>
                                <div className="flex-1 h-px bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20" />
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-3 py-1">
                                    {filteredUsers.length} users
                                </Badge>
                            </div>
                        </div>

                        <div className="relative z-10 overflow-x-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="flex space-x-2">
                                        <motion.div className="w-4 h-4 bg-amber-500 rounded-full" animate={{ y: [-10, 0, -10] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                                        <motion.div className="w-4 h-4 bg-orange-500 rounded-full" animate={{ y: [-10, 0, -10] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                                        <motion.div className="w-4 h-4 bg-red-500 rounded-full" animate={{ y: [-10, 0, -10] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                                    </div>
                                    <span className="ml-4 text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                        Loading users...
                                    </span>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 inline-block border border-gray-200/50">
                                        <span className="font-bold text-lg">No users found</span>
                                    </div>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gradient-to-r from-gray-50/60 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-700/60 border-b border-gray-200/30 dark:border-gray-600/30">
                                            <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4">User ID</TableHead>
                                            <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4">Username</TableHead>
                                            <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-center">Status</TableHead>
                                            <TableHead className="text-gray-800 dark:text-gray-200 font-bold text-sm p-4 text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((u, index) => (
                                            <motion.tr
                                                key={u.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2, delay: index * 0.02 }}
                                                className="group border-b border-gray-200/30 dark:border-gray-700/30 hover:bg-gradient-to-r hover:from-amber-50/40 hover:to-orange-50/40 dark:hover:from-amber-900/10 dark:hover:to-orange-900/10 transition-colors duration-200"
                                            >
                                                <TableCell className="p-4 font-mono text-sm text-gray-600 dark:text-gray-400">
                                                    #{u.id}
                                                </TableCell>
                                                <TableCell className="p-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-xs">
                                                            {u.username.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-semibold text-gray-900 dark:text-gray-100">{u.username}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-4 text-center">
                                                    {u.isWhitelisted ? (
                                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-700 font-bold px-3 py-1">
                                                            <ShieldCheck className="h-3 w-3 mr-1" />
                                                            Editor
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600 font-bold px-3 py-1">
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            View Only
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="p-4 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant={u.isWhitelisted ? 'destructive' : 'default'}
                                                        disabled={actionLoading === u.id}
                                                        onClick={() => handleToggleWhitelist(u)}
                                                        className={`font-semibold transition-all duration-300 ${u.isWhitelisted
                                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                                                            }`}
                                                    >
                                                        {actionLoading === u.id ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : u.isWhitelisted ? (
                                                            <>
                                                                <UserMinus className="h-4 w-4 mr-1" />
                                                                Remove
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserPlus className="h-4 w-4 mr-1" />
                                                                Whitelist
                                                            </>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
