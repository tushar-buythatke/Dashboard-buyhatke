import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
    Eye, EyeOff, LogIn, User, Lock, Shield,
    CheckCircle2, UserPlus, Clock,
    RefreshCw, Smartphone, ArrowRight, Copy, QrCode,
    ShieldCheck
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

    // === STYLES (halo) ===

    const haloInput = 'halo-field pl-11';
    const haloLabel = 'halo-label mb-1.5 block';

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

    // === ERROR — single line, never a block ===

    const renderError = () => (
        <AnimatePresence>
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-sm mb-4"
                    style={{ color: 'var(--h-coral)' }}
                >
                    {error}
                </motion.p>
            )}
        </AnimatePresence>
    );

    // === FORM RENDERERS ===

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className={haloLabel}>Username</label>
                <div className="relative">
                    <User
                        strokeWidth={1.75}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors pointer-events-none"
                        style={{ color: focusedField === 'username' ? 'var(--h-iris-500)' : 'var(--h-ink-3)' }}
                    />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onFocus={() => setFocusedField('username')}
                        onBlur={() => setFocusedField(null)}
                        className={haloInput}
                        placeholder="yourname@buyhatke.com"
                        disabled={loading}
                    />
                </div>
                <p className="mt-1.5 text-[11px] italic" style={{ color: 'var(--h-ink-3)' }}>
                    Use your official @buyhatke.com email
                </p>
            </div>

            <div>
                <label className={haloLabel}>Password</label>
                <div className="relative">
                    <Lock
                        strokeWidth={1.75}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors pointer-events-none"
                        style={{ color: focusedField === 'password' ? 'var(--h-iris-500)' : 'var(--h-ink-3)' }}
                    />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className={haloInput + ' pr-11'}
                        placeholder="Enter your password"
                        disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: 'var(--h-ink-3)' }}
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff strokeWidth={1.75} className="h-4 w-4" /> : <Eye strokeWidth={1.75} className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="btn-halo btn-halo-lg w-full mt-2"
            >
                {loading ? (
                    <><span className="halo-spinner" style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />Signing in&hellip;</>
                ) : (
                    <><LogIn strokeWidth={1.75} className="h-4 w-4" />Sign in</>
                )}
            </button>

            <div className="text-center pt-1">
                <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs font-medium transition-colors"
                    style={{ color: 'var(--h-iris-500)' }}
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
                        <div className="halo-chip mx-auto mb-3">
                            <User strokeWidth={1.75} className="h-5 w-5" />
                        </div>
                        <h3 className="halo-heading">Reset password</h3>
                        <p className="halo-subtitle mt-1">Enter your username to verify your account</p>
                    </div>
                    <div>
                        <label className={haloLabel}>Username or email</label>
                        <div className="relative">
                            <User strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--h-ink-3)' }} />
                            <input
                                type="text"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className={haloInput}
                                placeholder="Enter username or email"
                                disabled={resetLoading}
                                autoFocus
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={resetLoading} className="btn-halo btn-halo-lg w-full">
                        {resetLoading ? (
                            <><span className="halo-spinner" style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />Checking&hellip;</>
                        ) : (
                            <><ArrowRight strokeWidth={1.75} className="h-4 w-4" />Continue</>
                        )}
                    </button>
                    <div className="text-center">
                        <button type="button" onClick={resetToLogin} className="text-xs transition-colors" style={{ color: 'var(--h-ink-3)' }}>
                            &larr; Back to sign in
                        </button>
                    </div>
                </form>
            );
        }

        if (forgotStep === 'otp') {
            return (
                <form onSubmit={handleForgotOtpSubmit} className="space-y-4">
                    <div className="text-center mb-2">
                        <div className="halo-chip mx-auto mb-3">
                            <Smartphone strokeWidth={1.75} className="h-5 w-5" />
                        </div>
                        <h3 className="halo-heading">Enter OTP</h3>
                        <p className="halo-subtitle mt-1">
                            6-digit code from your authenticator
                        </p>
                        {resetUserData && (
                            <span className="halo-badge mt-2">
                                Account: <span className="font-semibold">{resetUserData.userName}</span>
                            </span>
                        )}
                    </div>
                    <div>
                        <label className={haloLabel}>Authenticator OTP</label>
                        <input
                            type="text"
                            value={resetOtp}
                            onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            className="halo-field text-center text-xl tracking-[0.4em] num"
                            style={{ fontFamily: 'var(--h-font-mono)' }}
                            placeholder="000000"
                            maxLength={6}
                            disabled={resetLoading}
                            autoFocus
                        />
                    </div>
                    <button type="submit" disabled={resetLoading || resetOtp.length !== 6} className="btn-halo btn-halo-lg w-full">
                        {resetLoading ? (
                            <><span className="halo-spinner" style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />Verifying&hellip;</>
                        ) : (
                            <><Shield strokeWidth={1.75} className="h-4 w-4" />Verify OTP</>
                        )}
                    </button>
                    <div className="text-center">
                        <button type="button" onClick={() => { setForgotStep('email'); setResetOtp(''); setError(null); }} className="text-xs transition-colors" style={{ color: 'var(--h-ink-3)' }}>
                            &larr; Back
                        </button>
                    </div>
                </form>
            );
        }

        return (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="text-center mb-2">
                    <div className="halo-chip mx-auto mb-3" style={{ background: 'var(--h-pos-soft)', color: 'var(--h-mint)' }}>
                        <Shield strokeWidth={1.75} className="h-5 w-5" />
                    </div>
                    <h3 className="halo-heading">Set new password</h3>
                    <p className="halo-subtitle mt-1">Create a new password for your account</p>
                </div>
                <div>
                    <label className={haloLabel}>New password</label>
                    <div className="relative">
                        <Lock strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--h-ink-3)' }} />
                        <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className={haloInput} placeholder="Minimum 6 characters" disabled={resetLoading} autoFocus />
                    </div>
                </div>
                <div>
                    <label className={haloLabel}>Confirm password</label>
                    <div className="relative">
                        <Lock strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--h-ink-3)' }} />
                        <input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} className={haloInput} placeholder="Re-enter password" disabled={resetLoading} />
                    </div>
                </div>
                <button type="submit" disabled={resetLoading || !resetPassword || !resetConfirmPassword} className="btn-halo btn-halo-lg w-full">
                    {resetLoading ? (
                        <><span className="halo-spinner" style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />Updating&hellip;</>
                    ) : (
                        <><Shield strokeWidth={1.75} className="h-4 w-4" />Reset password</>
                    )}
                </button>
                <div className="text-center">
                    <button type="button" onClick={() => { setForgotStep('otp'); setResetPassword(''); setResetConfirmPassword(''); setError(null); }} className="text-xs transition-colors" style={{ color: 'var(--h-ink-3)' }}>
                        &larr; Back
                    </button>
                </div>
            </form>
        );
    };

    const renderSignupForm = () => (
        <form onSubmit={handleSignup} className="space-y-4">
            <div>
                <label className={haloLabel}>Username</label>
                <div className="relative">
                    <User strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--h-ink-3)' }} />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onFocus={() => setFocusedField('username')}
                        onBlur={() => setFocusedField(null)}
                        className={haloInput}
                        placeholder="yourname@buyhatke.com"
                        disabled={loading}
                    />
                </div>
                <p className="mt-1.5 text-[11px] italic" style={{ color: 'var(--h-ink-3)' }}>
                    Registration requires a @buyhatke.com email
                </p>
            </div>
            <div>
                <label className={haloLabel}>Create password</label>
                <div className="relative">
                    <Lock strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--h-ink-3)' }} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className={haloInput + ' pr-11'}
                        placeholder="Minimum 6 characters"
                        disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--h-ink-3)' }} tabIndex={-1}>
                        {showPassword ? <EyeOff strokeWidth={1.75} className="h-4 w-4" /> : <Eye strokeWidth={1.75} className="h-4 w-4" />}
                    </button>
                </div>
            </div>
            <button type="submit" disabled={loading} className="btn-halo btn-halo-lg w-full mt-2">
                {loading ? (
                    <><span className="halo-spinner" style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />Creating account&hellip;</>
                ) : (
                    <><UserPlus strokeWidth={1.75} className="h-4 w-4" />Create account</>
                )}
            </button>
        </form>
    );

    const render2FASetup = () => (
        <div className="space-y-5">
            <div className="text-center">
                <div className="halo-chip-lg mx-auto mb-3">
                    <QrCode strokeWidth={1.75} className="h-6 w-6" />
                </div>
                <h3 className="halo-heading" style={{ fontSize: '1.125rem' }}>Link authenticator</h3>
                <span className="halo-badge mt-2">
                    Account: <span className="font-semibold">{userData?.username}</span>
                </span>
                <p className="halo-subtitle mt-2">
                    Scan with Google Authenticator or Authy
                </p>
            </div>

            {secretData && (
                <>
                    <div className="flex justify-center">
                        <div className="halo-inset p-3">
                            <img src={secretData.qrCode} alt="2FA QR Code" className="w-44 h-44 block rounded-lg" />
                        </div>
                    </div>

                    <div className="halo-inset flex items-center justify-between px-3 py-2.5">
                        <div className="text-xs num truncate" style={{ color: 'var(--h-ink-3)', fontFamily: 'var(--h-font-mono)' }}>
                            Key: <span className="font-semibold" style={{ color: 'var(--h-ink)' }}>{secretData.tempSecret}</span>
                        </div>
                        <button onClick={copySecret} className="btn-halo-ghost btn-halo-icon btn-halo-sm">
                            <Copy strokeWidth={1.75} className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="rounded-[var(--h-r)] px-3.5 py-3" style={{ background: 'var(--h-tint)', border: '1px solid var(--h-line-accent)' }}>
                        <p className="text-xs" style={{ color: 'var(--h-ink-2)' }}>
                            <span className="font-semibold" style={{ color: 'var(--h-iris-500)' }}>Important:</span> After scanning, click below. You'll enter the OTP after admin approval.
                        </p>
                    </div>

                    <button onClick={linkAuthenticator} disabled={loading} className="btn-halo btn-halo-lg w-full">
                        {loading ? (
                            <><span className="halo-spinner" style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />Linking&hellip;</>
                        ) : (
                            <><CheckCircle2 strokeWidth={1.75} className="h-4 w-4" />I've scanned the QR code</>
                        )}
                    </button>
                </>
            )}
        </div>
    );

    const renderWaitingApproval = () => (
        <div className="text-center space-y-5">
            <motion.div
                className="halo-chip-lg mx-auto"
                style={{ width: '4rem', height: '4rem', background: 'var(--h-warn-soft)', color: 'var(--h-amber)' }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Clock strokeWidth={1.75} className="h-7 w-7" />
            </motion.div>

            <div>
                <h3 className="halo-heading" style={{ fontSize: '1.125rem' }}>Waiting for approval</h3>
                <p className="halo-subtitle mt-1.5">
                    Your account is pending admin approval.<br />
                    Once approved, you can sign in with your OTP.
                </p>
            </div>

            <div className="halo-inset px-4 py-3 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="halo-eyebrow">Username</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--h-ink)' }}>{userData?.username}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="halo-eyebrow">Authenticator</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--h-mint)' }}>
                        <CheckCircle2 strokeWidth={1.75} className="h-3 w-3" /> Linked
                    </span>
                </div>
            </div>

            <button onClick={checkApprovalStatus} disabled={loading} className="btn-halo btn-halo-lg w-full">
                {loading ? (
                    <><span className="halo-spinner" style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />Checking&hellip;</>
                ) : (
                    <><RefreshCw strokeWidth={1.75} className="h-4 w-4" />Check approval status</>
                )}
            </button>

            <button onClick={resetToLogin} className="text-xs transition-colors" style={{ color: 'var(--h-ink-3)' }}>
                &larr; Back to sign in
            </button>
        </div>
    );

    const renderOTPVerification = () => (
        <div className="space-y-5 text-center">
            <div className="halo-chip-lg mx-auto" style={{ background: 'var(--h-pos-soft)', color: 'var(--h-mint)' }}>
                <ShieldCheck strokeWidth={1.75} className="h-6 w-6" />
            </div>
            <div>
                <h3 className="halo-heading" style={{ fontSize: '1.125rem' }}>Enter verification code</h3>
                <p className="halo-subtitle mt-1">
                    6-digit code from your authenticator
                </p>
                <span className="halo-badge mt-2">
                    Verifying: <span className="font-semibold">{userData?.username}</span>
                </span>
            </div>

            <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="halo-field w-full h-14 text-center text-2xl tracking-[0.4em] font-semibold num"
                style={{ fontFamily: 'var(--h-font-mono)' }}
                placeholder="000000"
                maxLength={6}
                autoFocus
                disabled={loading}
            />

            <button onClick={verifyOTPAndEnable} disabled={loading || otpCode.length !== 6} className="btn-halo btn-halo-lg w-full">
                {loading ? (
                    <><span className="halo-spinner" style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />Verifying&hellip;</>
                ) : (
                    <><ArrowRight strokeWidth={1.75} className="h-4 w-4" />Verify &amp; sign in</>
                )}
            </button>

            <button onClick={resetToLogin} className="text-xs transition-colors" style={{ color: 'var(--h-ink-3)' }}>
                &larr; Back to sign in
            </button>
        </div>
    );

    const renderTabs = () => (
        <div className="halo-segment w-full mb-6">
            <button
                onClick={() => { setFlowState('login'); setUsername(''); setPassword(''); setError(null); }}
                data-state={flowState === 'login' ? 'active' : undefined}
                className="halo-segment-item flex-1 justify-center"
            >
                <LogIn strokeWidth={1.75} className="h-3.5 w-3.5" />
                Sign in
            </button>
            <button
                onClick={() => { setFlowState('signup'); setUsername(''); setPassword(''); setError(null); }}
                data-state={flowState === 'signup' ? 'active' : undefined}
                className="halo-segment-item flex-1 justify-center"
            >
                <UserPlus strokeWidth={1.75} className="h-3.5 w-3.5" />
                Sign up
            </button>
        </div>
    );

    // === MAIN RENDER ===
    // Split layout at lg: form column (left) + branded aurora panel (right).
    // Below lg, the branded panel collapses and the form centers on the aurora canvas.

    return (
        <div className="min-h-screen flex" style={{ background: 'var(--h-canvas)' }}>
            <div className="halo-backdrop" />

            {/* Form column */}
            <div className="relative z-10 flex flex-1 items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[400px]"
                >
                    {/* Brand mark */}
                    {(flowState === 'login' || flowState === 'signup' || flowState === 'forgot') && (
                        <div className="text-center mb-6">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, duration: 0.4 }}
                                className="w-14 h-14 rounded-[var(--h-r-lg)] flex items-center justify-center mx-auto"
                                style={{ background: 'var(--h-g-iris)', boxShadow: 'var(--h-sh-iris)' }}
                            >
                                <img src="/logo_512x512.png" alt="Logo" className="w-8 h-8 object-contain" />
                            </motion.div>
                            <h1 className="halo-title mt-4">BuyHatke ads dashboard</h1>
                            <p className="halo-subtitle mt-1">Marketing intelligence platform</p>
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

                    <p className="text-center text-xs mt-8" style={{ color: 'var(--h-ink-3)' }}>
                        &copy; 2026 BuyHatke. All rights reserved.
                    </p>
                </motion.div>
            </div>

            {/* Branded panel */}
            <div className="hidden lg:flex relative flex-1 items-center justify-center overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'var(--h-g-aurora), var(--h-canvas-2)' }} />
                <div
                    className="absolute inset-0 opacity-[0.028]"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    }}
                />
                <motion.div
                    className="absolute h-[36rem] w-[36rem] rounded-full blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(91,75,255,0.22), transparent 70%)', top: '-8rem', right: '-8rem' }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute h-[26rem] w-[26rem] rounded-full blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(0,191,224,0.14), transparent 70%)', bottom: '-6rem', left: '-6rem' }}
                    animate={{ scale: [1.05, 0.95, 1.05] }}
                    transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="relative z-10 flex flex-col items-center text-center px-12"
                >
                    <div
                        className="w-20 h-20 rounded-[var(--h-r-lg)] flex items-center justify-center mb-6"
                        style={{ background: 'var(--h-g-iris)', boxShadow: 'var(--h-sh-iris-lg)' }}
                    >
                        <img src="/logo_512x512.png" alt="Hatke" className="w-12 h-12 object-contain" />
                    </div>
                    <h2 className="halo-title mb-2">BuyHatke ads dashboard</h2>
                    <p className="halo-subtitle max-w-xs">
                        Campaigns, slots and offers — all in one lit, weightless canvas.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
