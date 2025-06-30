import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
        authService.setCurrentUser(authUser);
        return true;
      } else {
        setUser(null);
        authService.setCurrentUser(null);
        return false;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      authService.setCurrentUser(null);
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

  // Periodic session validation (every 10 minutes for localStorage-based sessions)
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    if (user) {
      sessionCheckInterval = setInterval(async () => {
        try {
          const isValid = await authService.validateSession();
          if (!isValid) {
            console.log('Session expired, logging out user');
            setUser(null);
            authService.clearSession();
          }
        } catch (error) {
          console.error('Session validation error:', error);
        }
      }, 10 * 60 * 1000); // Check every 10 minutes (reduced frequency for localStorage sessions)
    }

    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [user]);

  // Handle visibility change - check session when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Tab became visible and user is logged in, validate session
        refreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshSession]);

  // Handle page focus - refresh session when user returns to window
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        refreshSession();
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
        authService.setCurrentUser(result.user);
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
      authService.setCurrentUser(null);
      return result;
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state anyway
      setUser(null);
      authService.setCurrentUser(null);
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