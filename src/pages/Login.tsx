import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { forceProductionEnvironment } from '@/config/api';
import { Eye, EyeOff, LogIn, User, Lock } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // 🔒 CRITICAL SECURITY: Always ensure login page uses production environment
  useEffect(() => {
    console.log('🔐 Login page mounted - Enforcing PRODUCTION environment');
    forceProductionEnvironment();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await login({ userName: username, password });

      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--h-canvas)' }}>
        <div className="halo-backdrop" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="halo-card halo-card-raised p-8 w-full max-w-md relative z-10"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--h-pos-soft)' }}>
              <User strokeWidth={1.75} className="w-8 h-8" style={{ color: 'var(--h-mint)' }} />
            </div>
            <h2 className="halo-title">Welcome back</h2>
            <p style={{ color: 'var(--h-ink-2)' }}>
              You are logged in as <span className="font-semibold" style={{ color: 'var(--h-ink)' }}>{user.username}</span>
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-halo btn-halo-lg w-full"
            >
              Go to dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--h-canvas)' }}>
      <div className="halo-backdrop" />

      {/* Form column */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 rounded-[var(--h-r-lg)] flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--h-g-iris)', boxShadow: 'var(--h-sh-iris)' }}
            >
              <img
                src="/logo_512x512.png"
                alt="Logo"
                className="w-10 h-10 object-contain"
              />
            </motion.div>
            <h1 className="halo-title mb-1.5">Welcome back</h1>
            <p className="halo-subtitle">Sign in to your BuyHatke ads dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="halo-label">
                Username
              </label>
              <div className="relative">
                <User strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--h-ink-3)' }} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="halo-field pl-10"
                  placeholder="Enter your username"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="halo-label">
                Password
              </label>
              <div className="relative">
                <Lock strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--h-ink-3)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="halo-field pl-10 pr-10"
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--h-ink-3)' }}
                  disabled={loading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff strokeWidth={1.75} className="h-4 w-4" /> : <Eye strokeWidth={1.75} className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm"
                style={{ color: 'var(--h-coral)' }}
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-halo btn-halo-lg w-full"
            >
              {loading ? (
                <>
                  <span className="halo-spinner" style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn strokeWidth={1.75} className="h-4 w-4" />
                  Sign in
                </>
              )}
            </button>
          </form>

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
        <div
          className="absolute h-[36rem] w-[36rem] rounded-full blur-3xl opacity-60 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(91,75,255,0.22), transparent 70%)', top: '-8rem', right: '-8rem' }}
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
