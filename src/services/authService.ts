import { encryptAES } from '../utils/encryption';

const API_BASE_URL = 'https://ext1.buyhatke.com/buhatkeAdDashboard-test/users';

export interface User {
  userName: string;
  type: number;
}

export interface LoginCredentials {
  userName: string;
  password: string;
}

export interface AddUserData {
  userName: string;
  password: string;
  type: number;
}

interface SessionData {
  user: User;
  sessionId: string;
  loginTime: number;
  lastValidated: number;
}

class AuthService {
  private currentUser: User | null = null;
  private sessionData: SessionData | null = null;
  private readonly USER_STORAGE_KEY = 'bhk_user_data';
  private readonly SESSION_STORAGE_KEY = 'bhk_session_data';

  constructor() {
    // Load user and session from localStorage on initialization
    this.loadSessionFromStorage();
  }

  private saveSessionToStorage(sessionData: SessionData | null): void {
    try {
      if (sessionData) {
        localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(sessionData.user));
      } else {
        localStorage.removeItem(this.SESSION_STORAGE_KEY);
        localStorage.removeItem(this.USER_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save session data to localStorage:', error);
    }
  }

  private loadSessionFromStorage(): void {
    try {
      const storedSession = localStorage.getItem(this.SESSION_STORAGE_KEY);
      const storedUser = localStorage.getItem(this.USER_STORAGE_KEY);
      
      if (storedSession && storedUser) {
        this.sessionData = JSON.parse(storedSession);
        this.currentUser = JSON.parse(storedUser);
        
        // Check if session is not too old (24 hours max)
        const sessionAge = Date.now() - (this.sessionData?.loginTime || 0);
        if (sessionAge > 24 * 60 * 60 * 1000) { // 24 hours
          console.log('Session too old, clearing');
          this.clearSession();
        }
      }
    } catch (error) {
      console.warn('Failed to load session data from localStorage:', error);
      this.clearSession();
    }
  }

  private generateSessionId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Check if user is logged in
  async isLoggedIn(): Promise<{ isLoggedIn: boolean; user?: User }> {
    try {
      // If we have a recent session, validate it with the server
      if (this.sessionData && this.currentUser) {
        const timeSinceLastValidation = Date.now() - this.sessionData.lastValidated;
        
        // If validated within the last 2 minutes, trust the local session
        if (timeSinceLastValidation < 2 * 60 * 1000) {
          return { isLoggedIn: true, user: this.currentUser };
        }
      }

      const response = await fetch(`${API_BASE_URL}/isLoggedIn`, {
        method: 'POST',
        credentials: 'omit', // Don't send cookies to avoid CORS issues
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 1 && result.isLoggedIn && result.user) {
        // Update session data with successful validation
        if (this.sessionData) {
          this.sessionData.lastValidated = Date.now();
          this.sessionData.user = result.user;
        } else {
          // Create new session if we got a valid response but no local session
          this.sessionData = {
            user: result.user,
            sessionId: this.generateSessionId(),
            loginTime: Date.now(),
            lastValidated: Date.now()
          };
        }
        
        this.currentUser = result.user;
        this.saveSessionToStorage(this.sessionData);
        return { isLoggedIn: true, user: result.user };
      }
      
      // Server says not logged in, clear local session
      this.clearSession();
      return { isLoggedIn: false };
    } catch (error) {
      console.error('Error checking login status:', error);
      
      // On network error, trust local session if it exists and is recent
      if (this.sessionData && this.currentUser) {
        const sessionAge = Date.now() - this.sessionData.loginTime;
        if (sessionAge < 30 * 60 * 1000) { // 30 minutes grace period
          console.log('Network error, but trusting recent local session');
          return { isLoggedIn: true, user: this.currentUser };
        }
      }
      
      this.clearSession();
      return { isLoggedIn: false };
    }
  }

  // Validate login credentials
  async validateLogin(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const encryptedPassword = encryptAES(credentials.password);
      
      const response = await fetch(`${API_BASE_URL}/validateLogin`, {
        method: 'POST',
        credentials: 'omit', // Don't send cookies to avoid CORS issues
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: credentials.userName,
          password: encryptedPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 1) {
        const user = result.user || { userName: credentials.userName, type: 0 };
        
        // Create new session data
        this.sessionData = {
          user,
          sessionId: this.generateSessionId(),
          loginTime: Date.now(),
          lastValidated: Date.now()
        };
        
        this.currentUser = user;
        this.saveSessionToStorage(this.sessionData);
        
        return { 
          success: true, 
          user,
          message: result.message 
        };
      }
      
      return { 
        success: false, 
        message: result.message || 'Invalid credentials' 
      };
    } catch (error) {
      console.error('Error validating login:', error);
      return { 
        success: false, 
        message: error instanceof Error && error.message.includes('HTTP') 
          ? 'Server connection failed. Please try again.' 
          : 'Login failed. Please try again.'
      };
    }
  }

  // Logout user
  async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'omit', // Don't send cookies to avoid CORS issues
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      this.clearSession();
      
      return { 
        success: true, 
        message: result.message || 'Logged out successfully' 
      };
    } catch (error) {
      console.error('Error logging out:', error);
      this.clearSession(); // Clear session anyway
      return { 
        success: true, // Return success even if API fails
        message: 'Logged out locally' 
      };
    }
  }

  // Add new user (admin function)
  async addUser(userData: AddUserData): Promise<{ success: boolean; message?: string }> {
    try {
      const encryptedPassword = encryptAES(userData.password);
      
      const response = await fetch(`${API_BASE_URL}/addUsers`, {
        method: 'POST',
        credentials: 'omit', // Don't send cookies to avoid CORS issues
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: userData.userName,
          password: encryptedPassword,
          type: userData.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 1) {
        return { 
          success: true, 
          message: result.message || 'User added successfully' 
        };
      }
      
      return { 
        success: false, 
        message: result.message || 'Failed to add user' 
      };
    } catch (error) {
      console.error('Error adding user:', error);
      return { 
        success: false, 
        message: error instanceof Error && error.message.includes('HTTP') 
          ? 'Server connection failed. Please try again.' 
          : 'Failed to add user. Please try again.'
      };
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Set current user (for context updates)
  setCurrentUser(user: User | null): void {
    this.currentUser = user;
    if (user && this.sessionData) {
      this.sessionData.user = user;
      this.saveSessionToStorage(this.sessionData);
    } else if (!user) {
      this.clearSession();
    }
  }

  // Clear all session data
  clearSession(): void {
    this.currentUser = null;
    this.sessionData = null;
    this.saveSessionToStorage(null);
  }

  // Check if session is valid (for periodic checks)
  async validateSession(): Promise<boolean> {
    const { isLoggedIn } = await this.isLoggedIn();
    return isLoggedIn;
  }

  // Get session info for debugging
  getSessionInfo(): { hasSession: boolean; sessionAge?: number; lastValidated?: number } {
    if (!this.sessionData) {
      return { hasSession: false };
    }
    
    return {
      hasSession: true,
      sessionAge: Date.now() - this.sessionData.loginTime,
      lastValidated: this.sessionData.lastValidated
    };
  }
}

export const authService = new AuthService(); 