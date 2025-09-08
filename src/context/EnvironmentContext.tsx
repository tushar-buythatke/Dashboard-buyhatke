import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Environment, getCurrentEnvironment, notifyEnvironmentChange } from '@/config/api';

interface EnvironmentContextType {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  isTest: boolean;
  isProd: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

interface EnvironmentProviderProps {
  children: ReactNode;
}

export const EnvironmentProvider: React.FC<EnvironmentProviderProps> = ({ children }) => {
  const [environment, setEnvironmentState] = useState<Environment>(getCurrentEnvironment);

  const setEnvironment = (env: Environment) => {
    setEnvironmentState(env);
    notifyEnvironmentChange(env);
  };

  const isTest = environment === 'test';
  const isProd = environment === 'prod';

  // Listen for environment changes from other parts of the app
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-environment' && e.newValue) {
        const newEnv = e.newValue as Environment;
        if (newEnv === 'test' || newEnv === 'prod') {
          setEnvironmentState(newEnv);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <EnvironmentContext.Provider 
      value={{ 
        environment, 
        setEnvironment, 
        isTest, 
        isProd 
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = (): EnvironmentContextType => {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
};