import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
    Eye, EyeOff, LogIn, User, Lock, Shield,
    CheckCircle2, UserPlus, Clock,
    RefreshCw, Smartphone, ArrowRight, Copy, Loader2, QrCode,
    Sparkles, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Auth Flow States:
 * 1. login    - Show login form (existing users)
 * 2. signup   - Show signup form (new users)
 * 3. setup2fa - Scan QR code to link authenticator (after signup, before approval)
 * 4. waiting  - Waiting for admin approval (after QR scan)
 * 5. verifyotp - Enter OTP to complete login (after approval)
 * 6. forgot    - Reset password via authenticator OTP
 */
type AuthFlowState = 'login' | 'signup' | 'setup2fa' | 'waiting' | 'verifyotp' | 'forgot';
type ForgotPasswordStep = 'email' | 'otp' | 'password';

interface UserData {
    id: number;
    username: string;
    role: number;
}

export default function AuthLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [flowState, setFlowState] = useState<AuthFlowState>('login');
    const [userData, setUserData] = useState<UserData | null>(null);

    const [secretData, setSecretData] = useState<{ tempSecret: string; qrCode: string } | null>(null);
    const [otpCode, setOtpCode] = useState('');

    const [forgotStep, setForgotStep] = useState<ForgotPasswordStep>('email');
    const [resetEmail, setResetEmail] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetUserData, setResetUserData] = useState<{ userId: number; userName: string } | null>(null);

    const navigate = useNavigate();
    const { isAuthenticated, setUser } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const getAuthUrl = () => `https://search-new.bitbns.com/buyhatkeAdDashboard/auth`;

    // === HANDLERS (unchanged) ===

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
            if (result.status === 1) {
                const normalizedUser = {
                    ...result.user,
                    id: result.user.userId || result.user.id,
                    username: result.user.userName || result.user.username,
                    role: result.user.type || result.user.role || 0
                };
                setUserData(normalizedUser);
                if (result.waitingApproval) {
                    setFlowState('waiting');
                    toast.info('Your account is pending admin approval');
                } else if (result.needsSetup) {
                    setFlowState('setup2fa');
                    await generate2FASecret(result.user);
                } else if (result.requires2FA) {
                    setFlowState('verifyotp');
                }
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
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
            if (result.status === 1) {
                const user = {
                    id: result.data.userId || result.data.id,
                    username: result.data.username || result.data.userName,
                    role: 0
                };
                setUserData(user);
                toast.success('Account created! Now link your authenticator app.');
                setFlowState('setup2fa');
                await generate2FASecret(user);
            } else {
                setError(result.message || 'Signup failed');
            }
        } catch (err) {
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
            if (result.status === 1) {
                setSecretData(result.data);
            } else {
                setError(result.message || 'Failed to generate 2FA');
            }
        } catch (err) {
            setError('Failed to generate 2FA code');
        } finally {
            setLoading(false);
        }
    };

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
            if (result.status === 1) {
                toast.success('Authenticator linked! Waiting for admin approval.');
                setFlowState('waiting');
            } else {
                setError(result.message || 'Failed to link authenticator');
            }
        } catch (err) {
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
            if (result.status === 1 && result.data?.approved) {
                toast.success('Account approved! Enter your OTP to login.');
                setFlowState('verifyotp');
            } else {
                toast.info('Still waiting for approval');
            }
        } catch (err) {
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
            const response = await fetch(`${getAuthUrl()}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    token: otpCode
                })
            });
            const result = await response.json();
            if (result.status === 1) {
                toast.success('Login successful!');
                const verifiedUser = result.user ? {
                    id: result.user.userId ?? result.user.id ?? userData?.id ?? 0,
                    username: result.user.userName ?? result.user.username ?? userData?.username ?? '',
                    role: result.user.type ?? result.user.role ?? userData?.role ?? 0,
                } : userData;
                setUser(verifiedUser);
                navigate('/');
            } else {
                setError(result.message || 'Invalid code');
                setOtpCode('');
            }
        } catch (err) {
            setError('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail.trim()) {
            setError('Please enter your username or email');
            return;
        }
        setResetLoading(true);
        setError(null);
        try {
            const response = await fetch(`${getAuthUrl()}/forgot/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: resetEmail.trim() })
            });
            const result = await response.json();
            if (result.status === 1) {
                setResetUserData({ userId: result.data.userId, userName: result.data.userName });
                setForgotStep('otp');
                toast.success('Account found! Please enter your authenticator OTP.');
            } else {
                setError(result.message || 'Account not found or not eligible for password reset');
            }
        } catch (err) {
            setError('Failed to verify account. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleForgotOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetOtp.trim() || resetOtp.length !== 6) {
            setError('Please enter a valid 6-digit OTP code');
            return;
        }
        setResetLoading(true);
        setError(null);
        try {
            const response = await fetch(`${getAuthUrl()}/forgot/verifyOtp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: resetEmail.trim(), otp: resetOtp.trim() })
            });
            const result = await response.json();
            if (result.status === 1) {
                setForgotStep('password');
                toast.success('OTP verified! Now set your new password.');
            } else {
                setError(result.message || 'Invalid OTP code');
                setResetOtp('');
            }
        } catch (err) {
            setError('OTP verification failed. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetPassword.trim() || !resetConfirmPassword.trim()) {
            setError('Please fill all password fields');
            return;
        }
        if (resetPassword !== resetConfirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (resetPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setResetLoading(true);
        setError(null);
        try {
            const response = await fetch(`${getAuthUrl()}/forgotPassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: resetEmail.trim(), newPassword: resetPassword.trim() })
            });
            const result = await response.json();
            if (result.status === 1) {
                toast.success('Password updated successfully! Please sign in with your new password.');
                setUsername(resetEmail.trim());
                setPassword('');
                setResetOtp('');
                setResetPassword('');
                setResetConfirmPassword('');
                setResetUserData(null);
                setForgotStep('email');
                setFlowState('login');
            } else {
                setError(result.message || 'Password reset failed');
            }
        } catch (err) {
            setError('Password reset failed. Please try again.');
        } finally {
            setResetLoading(false);
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
        setResetEmail('');
        setResetOtp('');
        setResetPassword('');
        setResetConfirmPassword('');
        setResetLoading(false);
        setForgotStep('email');
        setResetUserData(null);
    };

    // === STYLES (velvet) ===

    const velvetInput =
        'w-full h-11 px-3.5 pl-11 rounded-xl bg-[var(--bg-panel-2)] border border-[var(--line)] text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--violet-500)] focus:bg-[var(--bg-panel)] transition-all duration-200';

    const velvetLabel = 'block text-[11px] font-semibold text-[var(--text-2)] mb-1.5 tracking-wide uppercase';

    // === AMBIENT BACKGROUND ===
    const renderBackground = () => (
        <>
            <div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(ellipse 90% 60% at 50% 0%, rgba(124, 111, 235, 0.22), transparent 60%),
                                radial-gradient(ellipse 60% 50% at 100% 100%, rgba(168, 90, 138, 0.12), transparent 60%),
                                radial-gradient(ellipse 50% 40% at 0% 100%, rgba(90, 169, 244, 0.08), transparent 60%),
                                var(--bg-canvas)`,
                }}
            />
            {/* Soft drifting orbs */}
            <motion.div
                className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(124, 111, 235, 0.45), transparent 70%)' }}
                animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, 20, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(168, 90, 138, 0.32), transparent 70%)' }}
                animate={{ scale: [1.1, 0.95, 1.1], x: [0, -20, 0], y: [0, -15, 0] }}
                transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(90, 169, 244, 0.18), transparent 70%)' }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Fine grain */}
            <div className="velvet-grain absolute inset-0 opacity-[0.03] pointer-events-none" />
        </>
    );

    const renderError = () => (
        <AnimatePresence>
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-5"
                >
                    <div className="px-4 py-3 bg-[var(--neg-soft)] border border-[var(--neg)]/20 rounded-xl">
                        <p className="text-[12.5px] font-medium text-[var(--neg)]">{error}</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    const openForgotPassword = () => {
        setResetEmail(username.trim());
        setResetOtp('');
        setResetPassword('');
        setResetConfirmPassword('');
        setError(null);
        setForgotStep('email');
        setResetUserData(null);
        setFlowState('forgot');
    };

    // === FORM RENDERERS ===

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className={velvetLabel}>Username</label>
                <div className="relative">
                    <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'username' ? 'text-[var(--violet-500)]' : 'text-[var(--text-3)]'}`} />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onFocus={() => setFocusedField('username')}
                        onBlur={() => setFocusedField(null)}
                        className={velvetInput}
                        placeholder="yourname@buyhatke.com"
                        disabled={loading}
                    />
                </div>
                <p className="mt-1.5 text-[10.5px] text-[var(--text-3)] italic">
                    Use your official @buyhatke.com email
                </p>
            </div>

            <div>
                <label className={velvetLabel}>Password</label>
                <div className="relative">
                    <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'password' ? 'text-[var(--violet-500)]' : 'text-[var(--text-3)]'}`} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className={velvetInput + ' pr-11'}
                        placeholder="Enter your password"
                        disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--violet-500)] transition-colors"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="btn-velvet w-full h-11 text-[13px] mt-2"
            >
                {loading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Signing in…</span>
                ) : (
                    <span className="inline-flex items-center gap-2"><LogIn className="h-4 w-4" />Sign in</span>
                )}
            </button>

            <div className="text-center pt-1">
                <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-[12px] text-[var(--violet-500)] hover:text-[var(--violet-400)] font-medium transition-colors"
                    disabled={loading}
                >
                    Forgot your password?
                </button>
            </div>
        </form>
    );

    const renderForgotPassword = () => {
        if (forgotStep === 'email') {
            return (
                <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
                    <div className="text-center mb-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tint)] border border-[var(--line-violet)] mb-3">
                            <User className="h-5 w-5 text-[var(--indigo-500)]" />
                        </div>
                        <h3 className="text-[18px] font-semibold text-[var(--text-1)]">Reset password</h3>
                        <p className="text-[12px] text-[var(--text-3)] mt-1">Enter your username to verify your account</p>
                    </div>
                    <div>
                        <label className={velvetLabel}>Username or Email</label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                            <input
                                type="text"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className={velvetInput}
                                placeholder="Enter username or email"
                                disabled={resetLoading}
                                autoFocus
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={resetLoading} className="btn-velvet w-full h-11 text-[13px]">
                        {resetLoading ? (
                            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Checking…</span>
                        ) : (
                            <span className="inline-flex items-center gap-2"><ArrowRight className="h-4 w-4" />Continue</span>
                        )}
                    </button>
                    <div className="text-center">
                        <button type="button" onClick={resetToLogin} className="text-[12px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                            ← Back to sign in
                        </button>
                    </div>
                </form>
            );
        }

        if (forgotStep === 'otp') {
            return (
                <form onSubmit={handleForgotOtpSubmit} className="space-y-4">
                    <div className="text-center mb-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tint)] border border-[var(--line-violet)] mb-3">
                            <Smartphone className="h-5 w-5 text-[var(--indigo-500)]" />
                        </div>
                        <h3 className="text-[18px] font-semibold text-[var(--text-1)]">Enter OTP</h3>
                        <p className="text-[12px] text-[var(--text-3)] mt-1">
                            6-digit code from your authenticator
                        </p>
                        {resetUserData && (
                            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-[var(--bg-panel-2)] border border-[var(--line)]">
                                <span className="text-[10.5px] text-[var(--text-3)]">Account:</span>
                                <span className="text-[11px] font-semibold text-[var(--text-1)]">{resetUserData.userName}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className={velvetLabel}>Authenticator OTP</label>
                        <div className="relative">
                            <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                            <input
                                type="text"
                                value={resetOtp}
                                onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                className={velvetInput + ' text-center text-[20px] tracking-[0.4em] font-mono pl-3.5 pr-3.5'}
                                placeholder="000000"
                                maxLength={6}
                                disabled={resetLoading}
                                autoFocus
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={resetLoading || resetOtp.length !== 6} className="btn-velvet w-full h-11 text-[13px]">
                        {resetLoading ? (
                            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verifying…</span>
                        ) : (
                            <span className="inline-flex items-center gap-2"><Shield className="h-4 w-4" />Verify OTP</span>
                        )}
                    </button>
                    <div className="text-center">
                        <button type="button" onClick={() => { setForgotStep('email'); setResetOtp(''); setError(null); }} className="text-[12px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                            ← Back
                        </button>
                    </div>
                </form>
            );
        }

        return (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="text-center mb-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--pos-soft)] border border-[var(--pos)]/20 mb-3">
                        <Shield className="h-5 w-5 text-[var(--pos)]" />
                    </div>
                    <h3 className="text-[18px] font-semibold text-[var(--text-1)]">Set new password</h3>
                    <p className="text-[12px] text-[var(--text-3)] mt-1">Create a new password for your account</p>
                </div>
                <div>
                    <label className={velvetLabel}>New Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                        <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className={velvetInput} placeholder="Minimum 6 characters" disabled={resetLoading} autoFocus />
                    </div>
                </div>
                <div>
                    <label className={velvetLabel}>Confirm Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                        <input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} className={velvetInput} placeholder="Re-enter password" disabled={resetLoading} />
                    </div>
                </div>
                <button type="submit" disabled={resetLoading || !resetPassword || !resetConfirmPassword} className="btn-velvet w-full h-11 text-[13px]">
                    {resetLoading ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Updating…</span>
                    ) : (
                        <span className="inline-flex items-center gap-2"><Shield className="h-4 w-4" />Reset password</span>
                    )}
                </button>
                <div className="text-center">
                    <button type="button" onClick={() => { setForgotStep('otp'); setResetPassword(''); setResetConfirmPassword(''); setError(null); }} className="text-[12px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                        ← Back
                    </button>
                </div>
            </form>
        );
    };

    const renderSignupForm = () => (
        <form onSubmit={handleSignup} className="space-y-4">
            <div>
                <label className={velvetLabel}>Username</label>
                <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onFocus={() => setFocusedField('username')}
                        onBlur={() => setFocusedField(null)}
                        className={velvetInput}
                        placeholder="yourname@buyhatke.com"
                        disabled={loading}
                    />
                </div>
                <p className="mt-1.5 text-[10.5px] text-[var(--text-3)] italic">
                    Registration requires a @buyhatke.com email
                </p>
            </div>
            <div>
                <label className={velvetLabel}>Create Password</label>
                <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className={velvetInput + ' pr-11'}
                        placeholder="Minimum 6 characters"
                        disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--violet-500)] transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>
            <button type="submit" disabled={loading} className="btn-velvet w-full h-11 text-[13px] mt-2">
                {loading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creating account…</span>
                ) : (
                    <span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4" />Create account</span>
                )}
            </button>
        </form>
    );

    const render2FASetup = () => (
        <div className="space-y-5">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--bg-tint)] border border-[var(--line-violet)] mb-3">
                    <QrCode className="h-6 w-6 text-[var(--indigo-500)]" />
                </div>
                <h3 className="text-[20px] font-semibold text-[var(--text-1)]">Link authenticator</h3>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-[var(--bg-panel-2)] border border-[var(--line)]">
                    <span className="text-[10.5px] text-[var(--text-3)]">Account:</span>
                    <span className="text-[11px] font-semibold text-[var(--text-1)]">{userData?.username}</span>
                </div>
                <p className="text-[12px] text-[var(--text-3)] mt-2">
                    Scan with Google Authenticator or Authy
                </p>
            </div>

            {secretData && (
                <>
                    <div className="flex justify-center">
                        <div className="p-3 rounded-2xl bg-[var(--bg-panel-2)] border border-[var(--line)]">
                            <img src={secretData.qrCode} alt="2FA QR Code" className="w-44 h-44 block rounded-lg" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--bg-panel-2)] border border-[var(--line)]">
                        <div className="text-[11px] text-[var(--text-3)] font-mono truncate">
                            Key: <span className="font-semibold text-[var(--text-1)]">{secretData.tempSecret}</span>
                        </div>
                        <button onClick={copySecret} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--violet-500)] hover:bg-[var(--bg-panel)] transition-colors">
                            <Copy className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="px-3.5 py-3 rounded-xl bg-[var(--bg-tint)] border border-[var(--line-violet)]">
                        <p className="text-[12px] text-[var(--text-2)]">
                            <span className="font-semibold text-[var(--indigo-500)]">Important:</span> After scanning, click below. You'll enter the OTP after admin approval.
                        </p>
                    </div>

                    <button onClick={linkAuthenticator} disabled={loading} className="btn-velvet w-full h-11 text-[13px]">
                        {loading ? (
                            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Linking…</span>
                        ) : (
                            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />I've scanned the QR code</span>
                        )}
                    </button>
                </>
            )}
        </div>
    );

    const renderWaitingApproval = () => (
        <div className="text-center space-y-5">
            <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg-tint)] border border-[var(--line-violet)]"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Clock className="h-7 w-7 text-[var(--gold-500)]" />
            </motion.div>

            <div>
                <h3 className="text-[20px] font-semibold text-[var(--text-1)]">Waiting for approval</h3>
                <p className="text-[12.5px] text-[var(--text-3)] mt-1.5 leading-relaxed">
                    Your account is pending admin approval.<br />
                    Once approved, you can sign in with your OTP.
                </p>
            </div>

            <div className="px-4 py-3 rounded-xl bg-[var(--bg-panel-2)] border border-[var(--line)] text-left space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-[var(--text-3)]">Username</span>
                    <span className="text-[12px] font-semibold text-[var(--text-1)]">{userData?.username}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-[var(--text-3)]">Authenticator</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--pos)]">
                        <CheckCircle2 className="h-3 w-3" /> Linked
                    </span>
                </div>
            </div>

            <button onClick={checkApprovalStatus} disabled={loading} className="btn-velvet w-full h-11 text-[13px]">
                {loading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Checking…</span>
                ) : (
                    <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />Check approval status</span>
                )}
            </button>

            <button onClick={resetToLogin} className="text-[12px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                ← Back to sign in
            </button>
        </div>
    );

    const renderOTPVerification = () => (
        <div className="space-y-5 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--pos-soft)] border border-[var(--pos)]/20">
                <ShieldCheck className="h-6 w-6 text-[var(--pos)]" />
            </div>
            <div>
                <h3 className="text-[20px] font-semibold text-[var(--text-1)]">Enter verification code</h3>
                <p className="text-[12.5px] text-[var(--text-3)] mt-1">
                    6-digit code from your authenticator
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-[var(--bg-panel-2)] border border-[var(--line)]">
                    <span className="text-[10.5px] text-[var(--text-3)]">Verifying:</span>
                    <span className="text-[11px] font-semibold text-[var(--text-1)]">{userData?.username}</span>
                </div>
            </div>

            <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="w-full h-14 px-4 text-center text-[24px] tracking-[0.4em] font-mono font-semibold rounded-2xl bg-[var(--bg-panel-2)] border border-[var(--line)] text-[var(--text-1)] focus:outline-none focus:border-[var(--pos)] focus:bg-[var(--bg-panel)] transition-all"
                placeholder="000000"
                maxLength={6}
                autoFocus
                disabled={loading}
            />

            <button onClick={verifyOTPAndEnable} disabled={loading || otpCode.length !== 6} className="btn-velvet w-full h-11 text-[13px]">
                {loading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verifying…</span>
                ) : (
                    <span className="inline-flex items-center gap-2"><ArrowRight className="h-4 w-4" />Verify & sign in</span>
                )}
            </button>

            <button onClick={resetToLogin} className="text-[12px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                ← Back to sign in
            </button>
        </div>
    );

    const renderTabs = () => (
        <div className="flex p-1 mb-6 rounded-xl bg-[var(--bg-panel-2)] border border-[var(--line)]">
            <button
                onClick={() => { setFlowState('login'); setUsername(''); setPassword(''); setError(null); }}
                className={`flex-1 h-9 rounded-lg text-[12.5px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                    flowState === 'login'
                        ? 'bg-[var(--bg-panel)] text-[var(--text-1)] shadow-[var(--shadow-1)]'
                        : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
            >
                <LogIn className="h-3.5 w-3.5" />
                Sign in
            </button>
            <button
                onClick={() => { setFlowState('signup'); setUsername(''); setPassword(''); setError(null); }}
                className={`flex-1 h-9 rounded-lg text-[12.5px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                    flowState === 'signup'
                        ? 'bg-[var(--bg-panel)] text-[var(--text-1)] shadow-[var(--shadow-1)]'
                        : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
            >
                <UserPlus className="h-3.5 w-3.5" />
                Sign up
            </button>
        </div>
    );

    // === MAIN RENDER ===

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            {renderBackground()}

            <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--bg-panel)]/85 backdrop-blur-2xl p-8"
                style={{ boxShadow: 'var(--shadow-velvet)' }}
            >
                {/* Brand mark */}
                {(flowState === 'login' || flowState === 'signup' || flowState === 'forgot') && (
                    <div className="text-center mb-6">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="relative inline-block"
                        >
                            <div
                                className="absolute inset-0 rounded-2xl blur-2xl"
                                style={{ background: 'var(--g-brand-soft)' }}
                            />
                            <div className="relative w-14 h-14 rounded-2xl bg-[var(--bg-panel)] border border-[var(--line)] flex items-center justify-center">
                                <img src="/logo_512x512.png" alt="Logo" className="w-8 h-8 object-contain" />
                            </div>
                        </motion.div>
                        <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-[var(--text-1)]">
                            <span>BuyHatke</span>{' '}
                            <span className="font-serif italic font-normal gradient-text">Ads Dashboard</span>
                        </h1>
                        <p className="mt-1 text-[11.5px] text-[var(--text-3)] flex items-center justify-center gap-1">
                            <Sparkles className="h-3 w-3 text-[var(--gold-500)]" />
                            Marketing intelligence platform
                        </p>
                    </div>
                )}

                {renderError()}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={flowState}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.25 }}
                    >
                        {(flowState === 'login' || flowState === 'signup') && renderTabs()}
                        {flowState === 'login' && renderLoginForm()}
                        {flowState === 'forgot' && renderForgotPassword()}
                        {flowState === 'signup' && renderSignupForm()}
                        {flowState === 'setup2fa' && render2FASetup()}
                        {flowState === 'waiting' && renderWaitingApproval()}
                        {flowState === 'verifyotp' && renderOTPVerification()}
                    </motion.div>
                </AnimatePresence>

                <div className="mt-7 text-center">
                    <p className="text-[10.5px] text-[var(--text-3)]">© 2025 BuyHatke. All rights reserved.</p>
                </div>
            </motion.div>
        </div>
    );
}
