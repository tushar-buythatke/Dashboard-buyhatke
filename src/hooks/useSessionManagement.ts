import { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

interface UseSessionManagementOptions {
  onSessionExpired?: () => void;
  refreshOnWindowFocus?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useSessionManagement(options: UseSessionManagementOptions = {}) {
  const { refreshSession, isAuthenticated, user } = useAuth();
  const {
    onSessionExpired,
    refreshOnWindowFocus = true,
    refreshInterval
  } = options;

  // Refresh session on window focus (when user returns to tab)
  useEffect(() => {
    if (!refreshOnWindowFocus || !isAuthenticated) return;

    const handleFocus = () => {
      refreshSession();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshSession, isAuthenticated, refreshOnWindowFocus]);

  // Optional custom refresh interval
  useEffect(() => {
    if (!refreshInterval || !isAuthenticated) return;

    const interval = setInterval(() => {
      refreshSession();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshSession, isAuthenticated, refreshInterval]);

  // Monitor authentication state changes
  useEffect(() => {
    if (!isAuthenticated && user === null && onSessionExpired) {
      onSessionExpired();
    }
  }, [isAuthenticated, user, onSessionExpired]);

  // Manual session refresh function
  const manualRefresh = useCallback(async () => {
    await refreshSession();
  }, [refreshSession]);

  return {
    refreshSession: manualRefresh,
    isAuthenticated,
    user
  };
}

// Hook for API error handling with session management
export function useApiErrorHandler() {
  const { logout } = useAuth();

  const handleApiError = useCallback(async (error: any, response?: Response) => {
    // Handle 401 Unauthorized - session expired
    if (response?.status === 401) {
      console.log('Session expired, logging out user');
      await logout();
      return;
    }

    // Handle network errors
    if (!response && error instanceof TypeError) {
      console.error('Network error:', error);
      // Could show a network error toast here
      return;
    }

    // Handle other HTTP errors
    if (response && !response.ok) {
      console.error(`HTTP Error ${response.status}:`, response.statusText);
      // Could show appropriate error messages here
      return;
    }

    // Handle generic errors
    console.error('API Error:', error);
  }, [logout]);

  return { handleApiError };
} 