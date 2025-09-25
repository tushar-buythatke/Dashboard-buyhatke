// API Configuration for Test/Prod environments
// 🔒 SECURITY NOTE: Login and authentication operations ALWAYS use production environment
// Environment switching is only allowed after successful authentication

export type Environment = 'test' | 'prod';

export interface ApiConfig {
  baseUrl: string;
  environment: Environment;
}

export const API_CONFIGS: Record<Environment, ApiConfig> = {
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
  return stored && (stored === 'test' || stored === 'prod') ? stored : DEFAULT_ENVIRONMENT;
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
// This ensures login always happens against production environment
export const getProdApiBaseUrl = (): string => {
  return API_CONFIGS.prod.baseUrl;
};

// Force environment to production (used during login to ensure security)
export const forceProductionEnvironment = (): void => {
  if (typeof window !== 'undefined') {
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