import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Environment, getCurrentEnvironment, notifyEnvironmentChange, ApiVersion, getApiVersion, setApiVersion, addApiVersionListener, removeApiVersionListener } from '@/config/api';

interface EnvironmentContextType {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  isTest: boolean;
  isProd: boolean;
  apiVersion: ApiVersion;
  setApiVersion: (version: ApiVersion) => void;
  isV2: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

interface EnvironmentProviderProps {
  children: ReactNode;
}

export const EnvironmentProvider: React.FC<EnvironmentProviderProps> = ({ children }) => {
  const [environment, setEnvironmentState] = useState<Environment>(getCurrentEnvironment);
  const [apiVersion, setApiVersionState] = useState<ApiVersion>(getApiVersion);

  const handleSetEnvironment = (env: Environment) => {
    setEnvironmentState(env);
    notifyEnvironmentChange(env);
  };

  const handleSetApiVersion = (version: ApiVersion) => {
    setApiVersionState(version);
    setApiVersion(version);
  };

  const isTest = environment === 'test';
  const isProd = environment === 'prod';
  const isV2 = apiVersion === 'v2';

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-environment' && e.newValue) {
        const newEnv = e.newValue as Environment;
        if (newEnv === 'test' || newEnv === 'prod') {
          setEnvironmentState(newEnv);
        }
      }
      if (e.key === 'api-version' && e.newValue) {
        const newVersion = e.newValue as ApiVersion;
        if (newVersion === 'v1' || newVersion === 'v2') {
          setApiVersionState(newVersion);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    addApiVersionListener(setApiVersionState);
    return () => removeApiVersionListener(setApiVersionState);
  }, []);

  return (
    <EnvironmentContext.Provider 
      value={{ 
        environment, 
        setEnvironment: handleSetEnvironment, 
        isTest, 
        isProd,
        apiVersion,
        setApiVersion: handleSetApiVersion,
        isV2,
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