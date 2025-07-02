import { encryptAES } from '@/utils/encryption';

const API_BASE_URL = 'https://ext1.buyhatke.com/buhatkeAdDashboard-test/users';

export interface User {
  userName: string;
  type: number;
  userId?: number;
}

export interface LoginCredentials {
  userName: string;
  password: string;
}

interface SessionInfo {
  user: User | null;
  lastChecked: number;
  isValid: boolean;
}

class AuthService {
  private currentUser: User | null = null;
  private sessionInfo: SessionInfo | null = null;
  private sessionCheckInProgress = false;
  private readonly SESSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  private useCookies = true; // ✅ CORS is now fixed - enable cookies!
  
  constructor() {
    // Initialize session info
    this.sessionInfo = {
      user: null,
      lastChecked: 0,
      isValid: false
    };
  }

  /**
   * Configure request options with smart fallback
   * Some endpoints may have CORS fixed, others may not
   */
  private getRequestOptions(body?: any, endpoint?: string): RequestInit {
    // Check if this endpoint supports credentials
    const supportsCredentials = this.useCookies && this.endpointSupportsCredentials(endpoint);
    
    const options: RequestInit = {
      method: 'POST',
      mode: 'cors',
      credentials: supportsCredentials ? 'include' : 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return options;
  }

  /**
   * Check which endpoints support credentials based on testing
   */
  private endpointSupportsCredentials(endpoint?: string): boolean {
    // Based on testing, isLoggedIn works with credentials
    // validateLogin also works - adding it to whitelist
    const supportedEndpoints = [
      'isLoggedIn',
      'logout',
      'validateLogin'  // ✅ Now enabled - cookies work!
    ];
    
    return endpoint ? supportedEndpoints.some(ep => endpoint.includes(ep)) : false;
  }

  /**
   * Check if user is logged in with smart caching
   */
  async isLoggedIn(): Promise<{ isLoggedIn: boolean; user?: User }> {
    const now = Date.now();
    
    // Use cached result if recent and valid
    if (this.sessionInfo && 
        this.sessionInfo.isValid && 
        (now - this.sessionInfo.lastChecked) < this.SESSION_CACHE_DURATION) {
      
      console.debug(`Session cached: valid for ${Math.round((this.SESSION_CACHE_DURATION - (now - this.sessionInfo.lastChecked)) / 1000)}s more`);
      return { 
        isLoggedIn: !!this.sessionInfo.user, 
        user: this.sessionInfo.user || undefined 
      };
    }

    // Prevent multiple simultaneous checks
    if (this.sessionCheckInProgress) {
      console.debug('Session check already in progress, waiting...');
      await this.waitForSessionCheck();
      return this.isLoggedIn(); // Retry after the ongoing check completes
    }

    return this.performSessionCheck();
  }

  /**
   * Wait for ongoing session check to complete
   */
  private async waitForSessionCheck(): Promise<void> {
    let attempts = 0;
    while (this.sessionCheckInProgress && attempts < 30) { // 3 second timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  /**
   * Perform actual session check with backend
   */
  private async performSessionCheck(): Promise<{ isLoggedIn: boolean; user?: User }> {
    this.sessionCheckInProgress = true;
    
    try {
      console.debug('Checking session with backend...');
      
      const response = await fetch(`${API_BASE_URL}/isLoggedIn`, this.getRequestOptions(null, 'isLoggedIn'));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const now = Date.now();
      
      console.debug('Backend session check result:', result);
      
      // Handle actual backend response format: {"status":1,"message":"Success!","data":{"userId":4}}
      if (result.status === 1 && result.data && result.data.userId) {
        // Create user object from backend response
        const user = {
          userName: result.data.userName || `User${result.data.userId}`,
          type: result.data.type || 0,
          userId: result.data.userId
        };
        
        // Update session cache
        this.sessionInfo = {
          user: user,
          lastChecked: now,
          isValid: true
        };
        this.currentUser = user;
        
        console.debug('✅ Session valid - User ID:', result.data.userId);
        return { isLoggedIn: true, user: user };
      } else {
        // Clear session cache - only when status !== 1
        this.sessionInfo = {
          user: null,
          lastChecked: now,
          isValid: false
        };
        this.currentUser = null;
        
        console.debug('❌ Session invalid or expired - Status:', result.status);
        return { isLoggedIn: false };
      }
    } catch (error) {
      console.error('Session check failed:', error);
      
      // On network error, mark session as invalid
      this.sessionInfo = {
        user: null,
        lastChecked: Date.now(),
        isValid: false
      };
      this.currentUser = null;
      
      return { isLoggedIn: false };
    } finally {
      this.sessionCheckInProgress = false;
    }
  }

  /**
   * Validate login credentials
   */
  async validateLogin(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      console.debug('Attempting login for:', credentials.userName);
      
      const supportsCredentials = this.endpointSupportsCredentials('validateLogin');
      if (!supportsCredentials) {
        console.debug('⚠️ validateLogin endpoint not in credentials whitelist - using fallback mode');
        console.debug('📝 Ask backend team to fix CORS for /validateLogin endpoint');
      }
      
      const encryptedPassword = await encryptAES(credentials.password);
      
      const response = await fetch(`${API_BASE_URL}/validateLogin`, this.getRequestOptions({
        userName: credentials.userName,
        password: encryptedPassword,
      }, 'validateLogin'));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.debug('Login response:', result);
      
      if (result.status === 1) {
        const user = result.user || { userName: credentials.userName, type: 0 };
        
        // Update session cache immediately
        this.sessionInfo = {
          user,
          lastChecked: Date.now(),
          isValid: true
        };
        this.currentUser = user;
        
        console.debug('✅ Login successful');
        return { 
          success: true, 
          user,
          message: result.message 
        };
      }
      
      console.debug('❌ Login failed:', result.message);
      return { 
        success: false, 
        message: result.message || 'Invalid credentials' 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error instanceof Error && error.message.includes('HTTP') 
          ? 'Server connection failed. Please try again.' 
          : 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Logout user and clear session
   */
  async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      console.debug('Logging out...');
      
      // Call backend logout to clear server-side session/cookies
      const response = await fetch(`${API_BASE_URL}/logout`, this.getRequestOptions(null, 'logout'));
      
      if (response.ok) {
        const result = await response.json();
        console.debug('Backend logout result:', result);
      }
      
      // Always clear local session regardless of backend response
      this.clearSession();
      
      console.debug('✅ Logout completed');
      return { 
        success: true, 
        message: 'Logged out successfully' 
      };
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local session anyway
      this.clearSession();
      return { 
        success: true, 
        message: 'Logged out successfully' 
      };
    }
  }

  /**
   * Add new user (admin function)
   */
  async addUser(userData: { userName: string; password: string; type: number }): Promise<{ success: boolean; message?: string }> {
    try {
      const encryptedPassword = await encryptAES(userData.password);
      
      const response = await fetch(`${API_BASE_URL}/addUsers`, this.getRequestOptions({
        userName: userData.userName,
        password: encryptedPassword,
        type: userData.type
      }, 'addUsers'));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return { 
        success: result.status === 1, 
        message: result.message 
      };
    } catch (error) {
      console.error('Add user error:', error);
      return { 
        success: false, 
        message: 'Failed to add user. Please try again.' 
      };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Clear all session data
   */
  clearSession(): void {
    this.currentUser = null;
    this.sessionInfo = {
      user: null,
      lastChecked: 0,
      isValid: false
    };
    console.debug('Session cleared');
  }

  /**
   * Force refresh session (bypass cache)
   */
  async refreshSession(): Promise<boolean> {
    console.debug('Force refreshing session...');
    
    // Clear cache to force fresh check
    if (this.sessionInfo) {
      this.sessionInfo.lastChecked = 0;
    }
    
    const { isLoggedIn } = await this.isLoggedIn();
    return isLoggedIn;
  }

  /**
   * Enable cookie-based authentication (after CORS is fixed)
   */
  enableCookieAuth(): void {
    this.useCookies = true;
    console.log('✅ Cookie authentication enabled');
    console.log('🔄 Clear session cache and login again to use cookies');
  }

  /**
   * Disable cookie-based authentication (fallback mode)
   */
  disableCookieAuth(): void {
    this.useCookies = false;
    console.log('❌ Cookie authentication disabled (fallback mode)');
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    const now = Date.now();
    
    return {
      currentUser: this.currentUser,
      sessionInfo: this.sessionInfo,
      cacheStatus: this.sessionInfo ? {
        isValid: this.sessionInfo.isValid,
        ageMs: now - this.sessionInfo.lastChecked,
        ageMinutes: Math.round((now - this.sessionInfo.lastChecked) / 1000 / 60),
        expiresInMs: Math.max(0, this.SESSION_CACHE_DURATION - (now - this.sessionInfo.lastChecked)),
        expiresInMinutes: Math.max(0, Math.round((this.SESSION_CACHE_DURATION - (now - this.sessionInfo.lastChecked)) / 1000 / 60))
      } : null,
      settings: {
        useCookies: this.useCookies,
        cookieStatus: this.useCookies ? '✅ ENABLED' : '❌ DISABLED',
        cacheDurationMs: this.SESSION_CACHE_DURATION,
        cacheDurationMinutes: this.SESSION_CACHE_DURATION / 1000 / 60,
        checkInProgress: this.sessionCheckInProgress
      },
      browser: {
        hasCookies: document.cookie ? 'Yes' : 'None found',
        cookieCount: document.cookie.split(';').filter(c => c.trim()).length,
        userAgent: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'
      }
    };
  }
}

// Create singleton instance
export const authService = new AuthService();

// Global debug functions
if (typeof window !== 'undefined') {
  (window as any).debugAuth = () => {
    const debugInfo = authService.getDebugInfo();
    console.group('🔍 Auth Debug Information');
    console.log('🍪 Cookie Status:', debugInfo.settings.cookieStatus);
    console.log('👤 Current User:', debugInfo.currentUser);
    console.log('✅ Session Valid:', debugInfo.sessionInfo?.isValid);
    console.log('⏰ Cache Age:', debugInfo.cacheStatus?.ageMinutes, 'minutes');
    console.log('⏳ Cache Expires In:', debugInfo.cacheStatus?.expiresInMinutes, 'minutes');
    console.log('🔄 Session Check In Progress:', debugInfo.settings.checkInProgress);
    console.log('🌐 Browser Cookies:', debugInfo.browser.hasCookies, `(${debugInfo.browser.cookieCount} cookies)`);
    console.log('📊 Full Debug Data:', debugInfo);
    console.groupEnd();
    return debugInfo;
  };

  (window as any).testBackendSession = async () => {
    console.group('🔍 Testing Backend Session');
    try {
      const response = await fetch(`${API_BASE_URL}/isLoggedIn`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });

      const result = await response.json();
      console.log('Backend Response Status:', response.status);
      console.log('Backend Response:', result);
      console.log('Cookies Sent:', document.cookie);
      
      if (result.status === 1 && result.data && result.data.userId) {
        console.log('✅ Backend session is VALID - User ID:', result.data.userId);
      } else {
        console.log('❌ Backend session is INVALID - Status:', result.status);
      }
      
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('❌ Backend test failed:', error);
      console.groupEnd();
      throw error;
    }
  };

  (window as any).clearAuthCache = () => {
    authService.clearSession();
    console.log('🗑️ Auth cache cleared');
  };

  (window as any).testCORS = async () => {
    console.group('🔍 Testing CORS Configuration');
    
    try {
      // Test with credentials: 'include'
      console.log('Testing with credentials: "include"...');
      const response = await fetch(`${API_BASE_URL}/isLoggedIn`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      console.log('✅ CORS with credentials works!');
      console.log('Response:', result);
      console.log('🎉 Cookie authentication is already enabled and working!');
      
      return { success: true, result };
    } catch (error) {
      console.log('❌ CORS with credentials failed');
      console.log('Error:', error);
      console.log('📋 Backend team needs to fix CORS configuration');
      console.log('📄 Share CORS_FIX_URGENT.md with backend team');
      
      return { success: false, error };
    } finally {
      console.groupEnd();
    }
  };

  (window as any).enableCookies = () => {
    authService.enableCookieAuth();
  };

  (window as any).disableCookies = () => {
    authService.disableCookieAuth();
  };

  (window as any).testExactRequest = async () => {
    console.group('🧪 Testing Exact Request (Your Working Version)');
    try {
      const response = await fetch("https://ext1.buyhatke.com/buhatkeAdDashboard-test/users/isLoggedIn", {
        "headers": {
          "accept": "*/*",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
          "cache-control": "no-cache, no-store, must-revalidate",
          "content-type": "application/json",
          "pragma": "no-cache",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site"
        },
        "referrer": "http://localhost:5174/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
      });

      const result = await response.json();
      console.log('✅ Exact request successful!');
      console.log('Status:', response.status);
      console.log('Response:', result);
      console.log('Cookies included:', document.cookie ? 'Yes' : 'None found');
      
      console.groupEnd();
      return { success: true, result, status: response.status };
    } catch (error) {
      console.error('❌ Exact request failed:', error);
      console.groupEnd();
      throw error;
    }
  };

  (window as any).testAllEndpoints = async () => {
    console.group('🔬 Testing All Auth Endpoints');
    
    const endpoints = [
      { name: 'isLoggedIn', url: `${API_BASE_URL}/isLoggedIn`, body: null },
      { name: 'validateLogin', url: `${API_BASE_URL}/validateLogin`, body: { userName: 'test', password: 'test' } },
      { name: 'logout', url: `${API_BASE_URL}/logout`, body: null },
      { name: 'addUsers', url: `${API_BASE_URL}/addUsers`, body: { userName: 'test', password: 'test', type: 0 } }
    ];

    const results: Record<string, any> = {};

    for (const endpoint of endpoints) {
      console.log(`\n🧪 Testing ${endpoint.name}...`);
      
      try {
        // Test with credentials: 'include'
        const responseWithCredentials = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.body ? JSON.stringify(endpoint.body) : null,
          credentials: 'include',
          mode: 'cors'
        });

        results[endpoint.name] = {
          withCredentials: {
            status: responseWithCredentials.status,
            ok: responseWithCredentials.ok,
            error: null
          }
        };

        console.log(`  ✅ ${endpoint.name} with credentials: ${responseWithCredentials.status}`);
      } catch (error) {
        results[endpoint.name] = {
          withCredentials: {
            status: null,
            ok: false,
            error: (error as Error).message
          }
        };
        console.log(`  ❌ ${endpoint.name} with credentials: CORS ERROR`);
        
        // Try without credentials as fallback
        try {
          const responseWithoutCredentials = await fetch(endpoint.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: endpoint.body ? JSON.stringify(endpoint.body) : null,
            credentials: 'omit',
            mode: 'cors'
          });

          results[endpoint.name].withoutCredentials = {
            status: responseWithoutCredentials.status,
            ok: responseWithoutCredentials.ok,
            error: null
          };

          console.log(`  ✅ ${endpoint.name} without credentials: ${responseWithoutCredentials.status}`);
        } catch (fallbackError) {
          results[endpoint.name].withoutCredentials = {
            status: null,
            ok: false,
            error: (fallbackError as Error).message
          };
          console.log(`  ❌ ${endpoint.name} without credentials: FAILED`);
        }
      }
    }

    console.log('\n📊 Test Results Summary:');
    console.table(results);
    console.groupEnd();
    
    return results;
  };

  console.log('🛠️ Enhanced Auth debugging enabled (🔧 Smart Fallback Mode):');
  console.log('• debugAuth() - Check session status');
  console.log('• testBackendSession() - Test backend directly');  
  console.log('• clearAuthCache() - Clear session cache');
  console.log('• testCORS() - Test CORS configuration');
  console.log('• testExactRequest() - Test your exact working request');
  console.log('• testAllEndpoints() - Test which endpoints support credentials');
  console.log('• enableCookies() - Enable cookie authentication');
  console.log('• disableCookies() - Disable cookie authentication (fallback)');
} 