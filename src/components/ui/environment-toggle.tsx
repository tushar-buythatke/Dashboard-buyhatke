import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useEnvironment } from '@/context/EnvironmentContext';
import { useAuth } from '@/context/AuthContext';
import { Zap, Shield, FlaskConical, AlertTriangle, Lock } from 'lucide-react';
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
    // 🔒 SECURITY: Only allow environment switching after authentication
    if (!isAuthenticated) {
      console.warn('🚨 SECURITY: Environment switching blocked - user not authenticated');
      return;
    }
    
    const newEnv = isTest ? 'prod' : 'test';
    setEnvironment(newEnv);
    setIsDialogOpen(false);
  };

  const getWarningMessage = () => {
    if (isTest) {
      return {
        title: "⚠️ Switch to PRODUCTION Mode?",
        description: "You are about to switch to PRODUCTION environment. This will connect to live servers and real data. All actions will affect the production system. Are you absolutely sure you want to continue?",
        actionText: "Yes, Switch to PRODUCTION",
        actionStyle: "bg-red-600 hover:bg-red-700 text-white"
      };
    } else {
      return {
        title: "🧪 Switch to TEST Mode?",
        description: "You are about to switch to TEST environment. This will connect to test servers with sample data. This is the recommended mode for development and testing.",
        actionText: "Yes, Switch to TEST",
        actionStyle: "bg-orange-600 hover:bg-orange-700 text-white"
      };
    }
  };

  const warning = getWarningMessage();

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="relative">
        <AlertDialogTrigger asChild>
          <motion.button
            className={`
              relative flex items-center space-x-3 px-6 py-3 rounded-xl font-bold text-sm
              border-2 transition-all duration-300 select-none
              ${!isAuthenticated 
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 border-gray-300 text-white cursor-not-allowed opacity-75' 
                : isTest 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-orange-400 text-white shadow-orange-500/50 cursor-pointer' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-green-400 text-white shadow-green-500/50 cursor-pointer'
              }
              ${isAuthenticated ? 'shadow-lg hover:shadow-xl active:scale-95' : 'shadow-sm'}
            `}
            whileHover={isAuthenticated ? { scale: 1.05 } : {}}
            whileTap={isAuthenticated ? { scale: 0.95 } : {}}
            animate={isAuthenticated ? {
              boxShadow: isTest 
                ? ['0 0 20px rgba(249, 115, 22, 0.6)', '0 0 30px rgba(249, 115, 22, 0.8)', '0 0 20px rgba(249, 115, 22, 0.6)']
                : ['0 0 20px rgba(34, 197, 94, 0.6)', '0 0 30px rgba(34, 197, 94, 0.8)', '0 0 20px rgba(34, 197, 94, 0.6)']
            } : {}}
            transition={{
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            disabled={!isAuthenticated}
            title={!isAuthenticated ? "🔒 Environment switching requires authentication" : undefined}
          >
        {/* Pulsing background effect */}
        {isAuthenticated && (
          <motion.div
            className={`
              absolute inset-0 rounded-xl opacity-30
              ${isTest ? 'bg-orange-400' : 'bg-green-400'}
            `}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
        
        {/* Icon */}
        <motion.div
          animate={isAuthenticated ? { rotate: [0, 360] } : {}}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {!isAuthenticated ? (
            <Lock className="w-5 h-5" />
          ) : isTest ? (
            <FlaskConical className="w-5 h-5" />
          ) : (
            <Shield className="w-5 h-5" />
          )}
        </motion.div>

        {/* Text */}
        <div className="relative z-10 flex items-center space-x-2">
          <span className="font-bold tracking-wide">
            {!isAuthenticated ? 'LOCKED' : isTest ? 'TEST' : 'PROD'}
          </span>
          {isAuthenticated && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Zap className="w-4 h-4" />
            </motion.div>
          )}
        </div>

            {/* Sparkle effect */}
            <motion.div
              className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
            <motion.div
              className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-white rounded-full"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
          </motion.button>
        </AlertDialogTrigger>

        {/* Tooltip */}
        <motion.div
          className={`
            absolute top-full mt-2 left-1/2 transform -translate-x-1/2
            px-3 py-2 rounded-lg text-xs font-medium text-white
            pointer-events-none opacity-0 group-hover:opacity-100
            ${isTest ? 'bg-orange-600' : 'bg-green-600'}
          `}
          initial={{ opacity: 0, y: -5 }}
          whileHover={{ opacity: 1, y: 0 }}
        >
          Click to switch to {isTest ? 'PRODUCTION' : 'TEST'} mode
          <div className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 ${isTest ? 'bg-orange-600' : 'bg-green-600'}`} />
        </motion.div>
      </div>

      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2 text-lg">
            <AlertTriangle className={`w-5 h-5 ${isTest ? 'text-red-500' : 'text-orange-500'}`} />
            <span>{warning.title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {warning.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex space-x-2">
          <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-800">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleEnvironmentChange}
            className={warning.actionStyle}
          >
            {warning.actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};