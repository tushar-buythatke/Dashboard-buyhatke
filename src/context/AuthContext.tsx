import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authService, User, LoginCredentials } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<{ success: boolean; message?: string }>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    try {
      const { isLoggedIn, user: authUser } = await authService.isLoggedIn();
      if (isLoggedIn && authUser) {
        setUser(authUser);
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

  // Simplified periodic session validation (every 15 minutes)
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    if (user) {
      console.debug('Setting up periodic session validation (every 30 minutes)');
      sessionCheckInterval = setInterval(async () => {
        try {
          console.debug('Periodic session validation triggered');
          const { isLoggedIn } = await authService.isLoggedIn();
          if (!isLoggedIn) {
            console.log('Periodic validation: Session expired, logging out user');
            setUser(null);
            authService.clearSession();
          }
        } catch (error) {
          console.error('Session validation error:', error);
        }
      }, 30 * 60 * 1000); // Check every 30 minutes (optimized frequency)
    }

    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [user]);

  // Handle visibility change - check session when tab becomes visible (throttled)
  useEffect(() => {
    let lastVisibilityCheck = 0;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        const now = Date.now();
        // Throttle visibility checks to at most once every 5 minutes
        if (now - lastVisibilityCheck > 5 * 60 * 1000) {
          console.debug('Tab visibility change triggered session validation');
          lastVisibilityCheck = now;
          refreshSession();
        } else {
          console.debug('Tab visibility change ignored (throttled)');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshSession]);

  // Handle page focus - refresh session when user returns to window (throttled)
  useEffect(() => {
    let lastFocusCheck = 0;
    
    const handleFocus = () => {
      if (user) {
        const now = Date.now();
        // Throttle focus checks to at most once every 5 minutes
        if (now - lastFocusCheck > 5 * 60 * 1000) {
          console.debug('Window focus triggered session validation');
          lastFocusCheck = now;
          refreshSession();
        } else {
          console.debug('Window focus ignored (throttled)');
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, refreshSession]);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    try {
      const result = await authService.validateLogin(credentials);
      if (result.success && result.user) {
        setUser(result.user);
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