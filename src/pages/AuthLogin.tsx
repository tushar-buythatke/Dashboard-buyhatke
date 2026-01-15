import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
    // enableLocalAuth,
    // isUsingLocalAuth,
    // LOCAL_2FA_SERVER
} from '@/config/api';
import {
    Eye, EyeOff, LogIn, User, Lock, Shield,
    CheckCircle2, UserPlus, Clock,
    RefreshCw, Smartphone, ArrowRight, Copy, Loader2, QrCode
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Auth Flow States:
 * 1. login    - Show login form (existing users)
 * 2. signup   - Show signup form (new users)
 * 3. setup2fa - Scan QR code to link authenticator (after signup, before approval)
 * 4. waiting  - Waiting for admin approval (after QR scan)
 * 5. verifyotp - Enter OTP to complete login (after approval)
 */
type AuthFlowState = 'login' | 'signup' | 'setup2fa' | 'waiting' | 'verifyotp';

interface UserData {
    id: number;
    username: string;
    role: number;
}

export default function AuthLogin() {
    // Form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Auth flow state
    const [flowState, setFlowState] = useState<AuthFlowState>('login');
    const [userData, setUserData] = useState<UserData | null>(null);

    // 2FA state
    const [secretData, setSecretData] = useState<{ tempSecret: string; qrCode: string } | null>(null);
    const [otpCode, setOtpCode] = useState('');

    const navigate = useNavigate();
    const { isAuthenticated, setUser } = useAuth();

    // Enable local auth on mount for testing as requested
    // Enable local auth removed - forcing production as requested
    /*
    useEffect(() => {
        enableLocalAuth();
        console.log('🔧 Auth mode:', isUsingLocalAuth() ? 'LOCAL' : 'PRODUCTION');
    }, []);
    */

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    // API base URL for auth
    // API base URL for auth - ALWAYS use PRODUCTION
    const getAuthUrl = () => `https://search-new.bitbns.com/buyhatkeAdDashboard/auth`;

    // === HANDLERS ===

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${getAuthUrl()}/validateLogin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userName: username.trim(),
                    password: password.trim(),
                    dashboard_id: 0
                })
            });

            const result = await response.json();
            console.log('Login response:', result);

            if (result.status === 1) {
                // Normalize user data
                const normalizedUser = {
                    ...result.user,
                    id: result.user.userId || result.user.id,
                    username: result.user.userName || result.user.username,
                    role: result.user.type || result.user.role || 0
                };
                setUserData(normalizedUser);

                if (result.waitingApproval) {
                    // User registered but not approved - show waiting screen
                    setFlowState('waiting');
                    toast.info('Your account is pending admin approval');
                } else if (result.needsSetup) {
                    // Approved but no 2FA yet - go to setup
                    setFlowState('setup2fa');
                    await generate2FASecret(result.user);
                } else if (result.requires2FA) {
                    // Has 2FA, need to verify OTP
                    setFlowState('verifyotp');
                }
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Connection failed. Is the local server running?');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Please enter both email and password');
            return;
        }

        // Validate @buyhatke.com email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@buyhatke\.com$/i;
        if (!emailRegex.test(username.trim())) {
            setError('Only @buyhatke.com email addresses are allowed');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${getAuthUrl()}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    password: password.trim(),
                    dashboard_id: 0
                })
            });

            const result = await response.json();
            console.log('Signup response:', result);

            if (result.status === 1) {
                const user = {
                    id: result.data.userId || result.data.id,
                    username: result.data.username || result.data.userName,
                    role: 0
                };
                setUserData(user);
                toast.success('Account created! Now link your authenticator app.');

                // Go to 2FA setup (before approval)
                setFlowState('setup2fa');
                await generate2FASecret(user);
            } else {
                setError(result.message || 'Signup failed');
            }
        } catch (err) {
            console.error('Signup error:', err);
            setError('Connection failed. Is the local server running?');
        } finally {
            setLoading(false);
        }
    };

    const generate2FASecret = async (user: UserData) => {
        setLoading(true);
        try {
            const response = await fetch(`${getAuthUrl()}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, userName: user.username })
            });

            const result = await response.json();
            console.log('2FA generate:', result);

            if (result.status === 1) {
                setSecretData(result.data);
            } else {
                setError(result.message || 'Failed to generate 2FA');
            }
        } catch (err) {
            console.error('2FA generate error:', err);
            setError('Failed to generate 2FA code');
        } finally {
            setLoading(false);
        }
    };

    // Link 2FA secret (save without enabling) and go to waiting screen
    const linkAuthenticator = async () => {
        if (!secretData || !userData) {
            setError('Missing data');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${getAuthUrl()}/link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    secret: secretData.tempSecret
                })
            });

            const result = await response.json();
            console.log('Link response:', result);

            if (result.status === 1) {
                toast.success('Authenticator linked! Waiting for admin approval.');
                setFlowState('waiting');
            } else {
                setError(result.message || 'Failed to link authenticator');
            }
        } catch (err) {
            console.error('Link error:', err);
            setError('Failed to link authenticator');
        } finally {
            setLoading(false);
        }
    };

    const checkApprovalStatus = async () => {
        if (!userData?.id) return;

        setLoading(true);
        try {
            const response = await fetch(`${getAuthUrl()}/checkApproval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userData.id })
            });

            const result = await response.json();
            console.log('Approval check:', result);

            if (result.status === 1 && result.data?.approved) {
                toast.success('Account approved! Enter your OTP to login.');
                setFlowState('verifyotp');
            } else {
                toast.info('Still waiting for approval');
            }
        } catch (err) {
            console.error('Approval check error:', err);
            toast.error('Failed to check status');
        } finally {
            setLoading(false);
        }
    };

    const verifyOTPAndEnable = async () => {
        if (!otpCode || otpCode.length !== 6 || !userData) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Call verify - it will auto-enable 2FA on first successful verification
            const response = await fetch(`${getAuthUrl()}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    token: otpCode
                })
            });

            const result = await response.json();
            console.log('OTP result:', result);

            if (result.status === 1) {
                toast.success('Login successful!');
                setUser(result.user || userData);
                navigate('/');
            } else {
                setError(result.message || 'Invalid code');
                setOtpCode('');
            }
        } catch (err) {
            console.error('OTP error:', err);
            setError('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const copySecret = () => {
        if (secretData?.tempSecret) {
            navigator.clipboard.writeText(secretData.tempSecret);
            toast.success('Secret key copied!');
        }
    };

    const resetToLogin = () => {
        setFlowState('login');
        setUserData(null);
        setSecretData(null);
        setOtpCode('');
        setError(null);
    };

    // === RENDER COMPONENTS ===

    const renderBackground = () => (
        <>
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"></div>
            <motion.div
                className="absolute top-20 left-20 w-96 h-96 bg-purple-300/40 rounded-full blur-3xl"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
                className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-pink-300/30 rounded-full blur-3xl"
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 10, repeat: Infinity }}
            />
        </>
    );

    const renderError = () => (
        <AnimatePresence>
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6"
                >
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl">
                        <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Username</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className={`h-5 w-5 transition-colors ${focusedField === 'username' ? 'text-purple-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onFocus={() => setFocusedField('username')}
                        onBlur={() => setFocusedField(null)}
                        className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
                        placeholder="yourname@buyhatke.com"
                        disabled={loading}
                    />
                </div>
                <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 ml-1 italic">
                    Use your official @buyhatke.com email
                </p>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Password</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className={`h-5 w-5 transition-colors ${focusedField === 'password' ? 'text-purple-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className="block w-full pl-12 pr-14 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
                        placeholder="Enter your password"
                        disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-purple-500 transition-colors">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl text-white font-semibold text-lg bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500 hover:from-purple-600 hover:via-violet-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Signing In...</span>
                ) : (
                    <span className="flex items-center justify-center gap-2"><LogIn className="h-5 w-5" />Sign In</span>
                )}
            </motion.button>
        </form>
    );

    const renderSignupForm = () => (
        <form onSubmit={handleSignup} className="space-y-6">
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Choose Username</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all" placeholder="yourname@buyhatke.com" disabled={loading} />
                </div>
                <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 ml-1 italic">
                    Registration requires a @buyhatke.com email
                </p>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Create Password</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-12 pr-14 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all" placeholder="Minimum 6 characters" disabled={loading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-purple-500 transition-colors">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <motion.button type="submit" disabled={loading} className="w-full py-4 px-6 rounded-2xl text-white font-semibold text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50" whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}>
                {loading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Creating Account...</span>
                ) : (
                    <span className="flex items-center justify-center gap-2"><UserPlus className="h-5 w-5" />Create Account</span>
                )}
            </motion.button>
        </form>
    );

    const render2FASetup = () => (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                    <QrCode className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Link Authenticator App</h3>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl inline-block mx-auto mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Account: <span className="font-semibold text-gray-900 dark:text-white">{userData?.username}</span>
                    </p>
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Scan this QR code with Google Authenticator or Authy
                </p>
            </div>

            {secretData && (
                <>
                    <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200 mx-auto w-fit">
                        <img src={secretData.qrCode} alt="2FA QR Code" className="w-48 h-48 block mx-auto" />
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg flex items-center justify-between border border-gray-100 dark:border-gray-700">
                        <div className="text-xs text-gray-500 font-mono">
                            Key: <span className="font-bold text-gray-700 dark:text-gray-300">{secretData.tempSecret}</span>
                        </div>
                        <button onClick={copySecret} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800/50">
                        <p className="text-blue-700 dark:text-blue-300 text-sm">
                            <strong>Important:</strong> After scanning, click the button below. You'll enter the OTP code after admin approves your account.
                        </p>
                    </div>

                    <motion.button
                        onClick={linkAuthenticator}
                        disabled={loading}
                        className="w-full py-4 px-6 rounded-2xl text-white font-semibold bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 transition-all shadow-lg disabled:opacity-50"
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Linking...</span>
                        ) : (
                            <span className="flex items-center justify-center gap-2"><CheckCircle2 className="h-5 w-5" />I've Scanned the QR Code</span>
                        )}
                    </motion.button>
                </>
            )}
        </div>
    );

    const renderWaitingApproval = () => (
        <div className="text-center space-y-6">
            <motion.div className="w-24 h-24 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Clock className="w-12 h-12 text-amber-600 dark:text-amber-400" />
            </motion.div>

            <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Waiting for Approval</h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Your account is pending admin approval.<br />
                    Once approved, you can log in with your OTP.
                </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Username: <span className="font-semibold">{userData?.username}</span>
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Authenticator linked
                </p>
            </div>

            <motion.button
                onClick={checkApprovalStatus}
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl text-white font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg disabled:opacity-50"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Checking...</span>
                ) : (
                    <span className="flex items-center justify-center gap-2"><RefreshCw className="h-5 w-5" />Check Approval Status</span>
                )}
            </motion.button>

            <button onClick={resetToLogin} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                ← Back to Login
            </button>
        </div>
    );

    const renderOTPVerification = () => (
        <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl inline-block mx-auto mb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Verifying: <span className="font-semibold text-gray-900 dark:text-white">{userData?.username}</span>
                </p>
            </div>

            <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Enter Verification Code</h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Enter the 6-digit code from your authenticator app
                </p>
            </div>

            <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="block w-full py-4 px-6 text-center text-3xl tracking-[0.5em] font-mono font-bold border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                placeholder="000000"
                maxLength={6}
                autoFocus
                disabled={loading}
            />

            <motion.button
                onClick={verifyOTPAndEnable}
                disabled={loading || otpCode.length !== 6}
                className="w-full py-4 px-6 rounded-2xl text-white font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg disabled:opacity-50"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Verifying...</span>
                ) : (
                    <span className="flex items-center justify-center gap-2"><ArrowRight className="h-5 w-5" />Verify & Login</span>
                )}
            </motion.button>

            <button onClick={resetToLogin} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                ← Back to Login
            </button>
        </div>
    );

    const renderTabs = () => (
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-8">
            <button onClick={() => { setFlowState('login'); setUsername(''); setPassword(''); setError(null); }} className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${flowState === 'login' ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                <span className="flex items-center justify-center gap-2"><LogIn className="w-4 h-4" />Sign In</span>
            </button>
            <button onClick={() => { setFlowState('signup'); setUsername(''); setPassword(''); setError(null); }} className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${flowState === 'signup' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                <span className="flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" />Sign Up</span>
            </button>
        </div>
    );

    // === MAIN RENDER ===

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            {renderBackground()}

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-10 rounded-3xl w-full max-w-md"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
                {/* Header - only show for login/signup */}
                {(flowState === 'login' || flowState === 'signup') && (
                    <div className="text-center mb-6">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative w-20 h-20 mx-auto mb-4">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-violet-500 to-pink-500 rounded-3xl blur-2xl opacity-50"></div>
                            <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 via-violet-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl">
                                <img src="/logo_512x512.png" alt="Logo" className="w-12 h-12 object-contain" />
                            </div>
                        </motion.div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 dark:from-white dark:via-purple-200 dark:to-pink-200 bg-clip-text text-transparent">
                            BuyHatke Ads Dashboard
                        </h1>
                    </div>
                )}

                {renderError()}

                <AnimatePresence mode="wait">
                    <motion.div key={flowState} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                        {(flowState === 'login' || flowState === 'signup') && renderTabs()}
                        {flowState === 'login' && renderLoginForm()}
                        {flowState === 'signup' && renderSignupForm()}
                        {flowState === 'setup2fa' && render2FASetup()}
                        {flowState === 'waiting' && renderWaitingApproval()}
                        {flowState === 'verifyotp' && renderOTPVerification()}
                    </motion.div>
                </AnimatePresence>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">© 2025 BuyHatke. All rights reserved.</p>
                </div>
            </motion.div>
        </div>
    );
}
