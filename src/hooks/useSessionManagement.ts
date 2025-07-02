import { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

interface UseSessionManagementOptions {
  onSessionExpired?: () => void;
  refreshOnWindowFocus?: boolean;
  refreshInterval?: number; // in milliseconds (minimum 5 minutes recommended)
}

export function useSessionManagement(options: UseSessionManagementOptions = {}) {
  const { refreshSession, isAuthenticated, user } = useAuth();
  const {
    onSessionExpired,
    refreshOnWindowFocus = false, // Disabled by default for better performance
    refreshInterval
  } = options;

  // Refresh session on window focus (throttled)
  useEffect(() => {
    if (!refreshOnWindowFocus || !isAuthenticated) return;

    let lastFocusTime = 0;

    const handleFocus = () => {
      const now = Date.now();
      // Throttle to maximum once every 5 minutes
      if (now - lastFocusTime > 5 * 60 * 1000) {
        console.debug('Window focus triggered session refresh');
        lastFocusTime = now;
        refreshSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshSession, isAuthenticated, refreshOnWindowFocus]);

  // Optional custom refresh interval (with minimum enforcement)
  useEffect(() => {
    if (!refreshInterval || !isAuthenticated) return;

    // Enforce minimum 5-minute interval to prevent excessive API calls
    const safeInterval = Math.max(refreshInterval, 5 * 60 * 1000);
    
    if (safeInterval !== refreshInterval) {
      console.warn(`Session refresh interval increased from ${refreshInterval}ms to ${safeInterval}ms (minimum 5 minutes)`);
    }

    const interval = setInterval(() => {
      console.debug('Interval-based session refresh triggered');
      refreshSession();
    }, safeInterval);

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
    console.debug('Manual session refresh triggered');
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