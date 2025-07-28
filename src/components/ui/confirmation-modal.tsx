import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Archive, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  itemType?: 'campaign' | 'ad';
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemType = 'ad',
  variant = 'danger'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      case 'warning':
        return {
          iconColor: 'text-orange-500',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
          borderColor: 'border-orange-200 dark:border-orange-800'
        };
      default:
        return {
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${styles.bgColor} ${styles.borderColor} border-2`}>
              <Archive className={`h-6 w-6 ${styles.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {message}
              </p>
              {itemName && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-gray-300 dark:border-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {itemType}:
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {itemName}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Warning */}
          <div className={`mt-4 p-4 rounded-lg ${styles.bgColor} ${styles.borderColor} border`}>
            <div className="flex items-start space-x-2">
              <AlertTriangle className={`h-4 w-4 ${styles.iconColor} mt-0.5 flex-shrink-0`} />
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white">
                  This action cannot be undone
                </p>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {itemType === 'campaign' ? 
                    'This will also archive all associated ads in this campaign.' :
                    'The archived item will no longer be visible in the main list.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-white ${styles.buttonColor} border-0 shadow-lg hover:shadow-xl transition-all duration-200`}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive {itemType}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
