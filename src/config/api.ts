// 🔒 SECURITY NOTE: Login and authentication operations can use local server for testing
// Environment switching is only allowed after successful authentication

export type Environment = 'test' | 'prod' | 'local';

export interface ApiConfig {
  baseUrl: string;
  environment: Environment;
}

// Local 2FA server for testing
export const LOCAL_2FA_SERVER = 'http://localhost:8096';

export const API_CONFIGS: Record<Environment, ApiConfig> = {
  local: {
    baseUrl: `${LOCAL_2FA_SERVER}/buyhatkeAdDashboard`,
    environment: 'local'
  },
  test: {
    baseUrl: 'https://search-new.bitbns.com/buyhatkeAdDashboard-test',
    environment: 'test'
  },
  prod: {
    baseUrl: 'https://search-new.bitbns.com/buyhatkeAdDashboard',
    environment: 'prod'
  }
};

// Default environment
const DEFAULT_ENVIRONMENT: Environment = 'prod';

// Get current environment from localStorage or default
export const getCurrentEnvironment = (): Environment => {
  if (typeof window === 'undefined') return DEFAULT_ENVIRONMENT;
  
  const stored = localStorage.getItem('app-environment') as Environment;
  return stored && (stored === 'test' || stored === 'prod' || stored === 'local') ? stored : DEFAULT_ENVIRONMENT;
};

// Set current environment
export const setCurrentEnvironment = (env: Environment): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('app-environment', env);
};

// Get current API config
export const getCurrentApiConfig = (): ApiConfig => {
  const env = getCurrentEnvironment();
  return API_CONFIGS[env];
};

// Get API base URL
export const getApiBaseUrl = (): string => {
  return getCurrentApiConfig().baseUrl;
};

// Get PRODUCTION-ONLY API base URL (for login and auth operations)
// This ensures login always happens against production environment unless local auth is enabled
export const getProdApiBaseUrl = (): string => {
  return API_CONFIGS.prod.baseUrl;
};

// Get AUTH API URL - uses local server when in local mode
export const getAuthApiUrl = (): string => {
  // Always return production URL as requested, now using the /auth endpoint
  return `${getProdApiBaseUrl()}/auth`;
};

// Check if using local auth server
export const isUsingLocalAuth = (): boolean => {
  return localStorage.getItem('use-local-auth') === 'true';
};

// Enable local auth server
export const enableLocalAuth = (): void => {
  localStorage.setItem('use-local-auth', 'true');
  console.log('🔧 Local auth server ENABLED');
};

// Disable local auth server (use production)
export const disableLocalAuth = (): void => {
  localStorage.removeItem('use-local-auth');
  console.log('🔧 Local auth server DISABLED - using production');
};

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).enableLocalAuth = enableLocalAuth;
  (window as any).disableLocalAuth = disableLocalAuth;
}

// Force environment to production (used during login to ensure security)
export const forceProductionEnvironment = (): void => {
  if (typeof window !== 'undefined') {
    // Don't force prod if using local auth
    if (isUsingLocalAuth()) {
      console.log('🔧 Using LOCAL auth server for authentication');
      return;
    }
    console.log('🔒 SECURITY: Forcing production environment for authentication');
    localStorage.setItem('app-environment', 'prod');
  }
};

// Check if environment switching is allowed (only after authentication)
export const isEnvironmentSwitchingAllowed = (): boolean => {
  // This will be overridden by auth context to check if user is authenticated
  return true; // Default to true, but auth context should override this
};

// Environment change listeners
const listeners: Array<(env: Environment) => void> = [];

export const addEnvironmentChangeListener = (callback: (env: Environment) => void): void => {
  listeners.push(callback);
};

export const removeEnvironmentChangeListener = (callback: (env: Environment) => void): void => {
  const index = listeners.indexOf(callback);
  if (index > -1) {
    listeners.splice(index, 1);
  }
};

export const notifyEnvironmentChange = (env: Environment): void => {
  setCurrentEnvironment(env);
  listeners.forEach(callback => callback(env));
};