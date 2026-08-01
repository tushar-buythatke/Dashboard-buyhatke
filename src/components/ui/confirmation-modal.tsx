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
          iconColor: 'text-[var(--h-coral)]',
          bgColor: 'bg-[var(--h-neg-soft)]',
          buttonColor: 'bg-[var(--h-coral)] hover:brightness-95',
        };
      case 'warning':
        return {
          iconColor: 'text-[var(--h-amber)]',
          bgColor: 'bg-[var(--h-warn-soft)]',
          buttonColor: 'bg-[var(--h-amber)] hover:brightness-95',
        };
      default:
        return {
          iconColor: 'text-[var(--h-cyan)]',
          bgColor: 'bg-[var(--h-info-soft)]',
          buttonColor: 'bg-[var(--h-cyan)] hover:brightness-95',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[rgba(10,11,17,.42)] backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="halo-card halo-card-raised max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${styles.bgColor}`}>
              <Archive className={`h-6 w-6 ${styles.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="halo-heading text-lg mb-2">
                {title}
              </h3>
              <p className="halo-subtitle">
                {message}
              </p>
              {itemName && (
                <div className="mt-3 p-3 halo-inset border-l-4 border-l-[var(--h-line-2)] rounded-[var(--h-r-sm)]">
                  <div className="flex items-center space-x-2">
                    <span className="halo-eyebrow">
                      {itemType}:
                    </span>
                    <span className="text-sm font-medium text-[var(--h-ink)]">
                      {itemName}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Warning */}
          <div className={`mt-4 p-4 rounded-[var(--h-r)] ${styles.bgColor}`}>
            <div className="flex items-start space-x-2">
              <AlertTriangle className={`h-4 w-4 ${styles.iconColor} mt-0.5 flex-shrink-0`} />
              <div className="text-sm">
                <p className="font-medium text-[var(--h-ink)]">
                  This action cannot be undone
                </p>
                <p className="text-[var(--h-ink-2)] mt-1">
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
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              variant="destructive"
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
