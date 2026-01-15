import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authService, User, LoginCredentials } from '../services/authService';
import { forceProductionEnvironment } from '../config/api';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<{ success: boolean; message?: string }>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session constants for local mode
const LOCAL_SESSION_KEY = 'dashboard_local_auth_session';
const SESSION_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3 days persistence per user request

export function AuthProvider({ children }: { children: ReactNode }) {
  // 🚀 3-DAY PERSISTENCE: Initialize state synchronously from localStorage
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const localSession = localStorage.getItem(LOCAL_SESSION_KEY);
      if (localSession) {
        const { user: savedUser, expiry } = JSON.parse(localSession);
        if (Date.now() < expiry) {
          console.debug('✅ Sync initialization: Valid local session found');
          return savedUser;
        }
        localStorage.removeItem(LOCAL_SESSION_KEY);
      }
    } catch (e) {
      console.error('Error initializing auth from localStorage:', e);
    }
    return null;
  });

  const [loading, setLoading] = useState(false); // Can be false if we already have a user

  // Wrapper for setUser that handles persistence automatically
  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({
        user: newUser,
        expiry: Date.now() + SESSION_EXPIRY
      }));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      authService.clearSession();
    }
  }, []);

  // Check authentication status with backend as a background verification
  // DISABLED: Trust local session for 3 days to prevent aggressive logouts
  const checkAuthStatus = useCallback(async () => {
    return true; // Always return true to keep UI session alive if local storage is valid
  }, []);

  // Refresh session - can be called manually or automatically
  const refreshSession = useCallback(async () => {
    // No-op - relying on local 3-day session
  }, []);

  // Simplified periodic session validation (every 30 minutes)
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    if (user) {
      console.debug('Setting up periodic session validation (every 30 minutes)');
      sessionCheckInterval = setInterval(async () => {
        try {
          console.debug('Periodic local session validation triggered');

          const localSession = localStorage.getItem(LOCAL_SESSION_KEY);
          if (localSession) {
            const { expiry } = JSON.parse(localSession);
            if (Date.now() > expiry) {
              console.log('Session expired (local check)');
              setUser(null);
              localStorage.removeItem(LOCAL_SESSION_KEY);
              authService.clearSession();
            }
          }
        } catch (error) {
          console.error('Session validation error:', error);
        }
      }, 30 * 60 * 1000);
    }

    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [user]);

  // mount checks are disabled to prevent aggressive logouts
  /*
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);
  */

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    try {
      // 🔒 CRITICAL SECURITY: Force production environment before login attempt
      forceProductionEnvironment();

      const result = await authService.validateLogin(credentials);
      if (result.success && result.user) {
        setUser(result.user);
        // Save to local storage for 3-day persistence
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({
          user: result.user,
          expiry: Date.now() + SESSION_EXPIRY
        }));
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    try {
      const result = await authService.logout();
      setUser(null);
      localStorage.removeItem(LOCAL_SESSION_KEY);
      return result;
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state anyway
      setUser(null);
      return { success: true, message: 'Logged out locally' };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 