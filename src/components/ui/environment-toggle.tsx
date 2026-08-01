import React, { useState } from 'react';
import { useEnvironment } from '@/context/EnvironmentContext';
import { useAuth } from '@/context/AuthContext';
import { FlaskConical, Shield, AlertTriangle, Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const EnvironmentToggle: React.FC = () => {
  const { environment, setEnvironment, isTest, isProd } = useEnvironment();
  const { isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEnvironmentChange = () => {
    // SECURITY: Only allow environment switching after authentication
    if (!isAuthenticated) {
      console.warn('SECURITY: Environment switching blocked - user not authenticated');
      return;
    }

    const newEnv = isTest ? 'prod' : 'test';
    setEnvironment(newEnv);
    setIsDialogOpen(false);
  };

  const getWarningMessage = () => {
    if (isTest) {
      return {
        title: 'Switch to production mode?',
        description:
          'You are about to switch to the PRODUCTION environment. This connects to live servers and real data — every action will affect the production system.',
        actionText: 'Switch to production',
      };
    }
    return {
      title: 'Switch to test mode?',
      description:
        'You are about to switch to the TEST environment. This connects to test servers with sample data — the recommended mode for development.',
      actionText: 'Switch to test',
    };
  };

  const warning = getWarningMessage();

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <button
          disabled={!isAuthenticated}
          title={!isAuthenticated ? 'Environment switching requires authentication' : `Currently on ${environment.toUpperCase()}`}
          aria-label="Toggle environment"
          className="halo-segment disabled:opacity-45 disabled:pointer-events-none"
        >
          <span
            className={`halo-segment-item ${!isAuthenticated ? '' : isTest ? 'is-active' : ''}`}
          >
            {!isAuthenticated ? <Lock size={13} strokeWidth={1.75} /> : <FlaskConical size={13} strokeWidth={1.75} />}
            Test
          </span>
          <span className={`halo-segment-item ${isAuthenticated && isProd ? 'is-active' : ''}`}>
            <Shield size={13} strokeWidth={1.75} />
            Prod
          </span>
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent className="halo-card max-w-md" style={{ borderRadius: 'var(--h-r-xl)' }}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-[15px] text-[var(--h-ink)]">
            <AlertTriangle size={18} strokeWidth={1.75} className={isTest ? 'text-[var(--h-coral)]' : 'text-[var(--h-amber)]'} />
            <span>{warning.title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] text-[var(--h-ink-2)] leading-relaxed">
            {warning.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel className="btn-halo-outline">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleEnvironmentChange} className="btn-halo">
            {warning.actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
