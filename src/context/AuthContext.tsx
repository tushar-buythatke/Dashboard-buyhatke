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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    try {
      // 🚀 3-DAY PERSISTENCE: Always check localStorage first
      const localSession = localStorage.getItem(LOCAL_SESSION_KEY);
      if (localSession) {
        const { user: savedUser, expiry } = JSON.parse(localSession);
        if (Date.now() < expiry) {
          console.debug('✅ Valid local session found, using cached user');
          setUser(savedUser);
          // Extend session on check
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({
            user: savedUser,
            expiry: Date.now() + SESSION_EXPIRY
          }));
          return true;
        } else {
          console.debug('⌛ Local session expired');
          localStorage.removeItem(LOCAL_SESSION_KEY);
        }
      }

      // Fallback to backend only if no local session exists
      console.debug('🔍 No local session, checking backend as fallback');
      const { isLoggedIn, user: authUser } = await authService.isLoggedIn();
      if (isLoggedIn && authUser) {
        setUser(authUser);
        // Save to local storage for persistence
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({
          user: authUser,
          expiry: Date.now() + SESSION_EXPIRY
        }));
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      return false;
    }
  }, []);

  // Update local session whenever user changes in local mode
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('use-local-auth') === 'true') {
      if (user) {
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({
          user,
          expiry: Date.now() + SESSION_EXPIRY
        }));
      } else {
        localStorage.removeItem(LOCAL_SESSION_KEY);
      }
    }
  }, [user]);

  // Refresh session - can be called manually or automatically
  const refreshSession = useCallback(async () => {
    await checkAuthStatus();
  }, [checkAuthStatus]);

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      await checkAuthStatus();
      setLoading(false);
    };

    initializeAuth();
  }, [checkAuthStatus]);

  // Simplified periodic session validation (every 30 minutes)
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    if (user) {
      console.debug('Setting up periodic session validation (every 30 minutes)');
      sessionCheckInterval = setInterval(async () => {
        try {
          console.debug('Periodic session validation triggered');

          const localSession = localStorage.getItem(LOCAL_SESSION_KEY);
          if (localSession) {
            const { expiry } = JSON.parse(localSession);
            if (Date.now() > expiry) {
              console.log('Session expired (local check)');
              setUser(null);
              localStorage.removeItem(LOCAL_SESSION_KEY);
              authService.clearSession();
            }
          } else {
            // If user state exists but no local storage, verify with backend once
            const { isLoggedIn } = await authService.isLoggedIn();
            if (!isLoggedIn) {
              console.log('Session invalid on backend, clearing state');
              setUser(null);
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

  // visibility/focus triggered checks are disabled to prevent aggressive logouts
  /*
  useEffect(() => {
    ...
  }, [user, refreshSession]);
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