import * as React from 'react';
import { motion } from 'framer-motion';
import { GradientText } from './gradient-text';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Mono uppercase eyebrow label (e.g. "DASHBOARD · OVERVIEW") */
  eyebrow?: string;
  /** First half of the page display heading (plain Inter) */
  title: string;
  /** The serif italic "moment" — the BuyHatke brand signature (e.g. "today.") */
  moment?: string;
  /** Optional subhead below the display heading */
  subhead?: string;
  /** Optional right-aligned actions */
  actions?: React.ReactNode;
  /** Optional breadcrumbs node above the eyebrow */
  crumbs?: React.ReactNode;
  className?: string;
}

/**
 * Hatke Intelligence page header — the recurring brand pattern.
 * Every primary page surface uses this component.
 *
 * Layout: eyebrow · display + serif-italic moment · subhead   |   actions
 *
 * The moment is the single recurring identity signature: an iridescent
 * gradient serif italic phrase that completes the display heading.
 */
export function PageHeader({
  eyebrow,
  title,
  moment,
  subhead,
  actions,
  crumbs,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          {crumbs && <div className="mb-3">{crumbs}</div>}
          {eyebrow && (
            <div className="halo-eyebrow mb-1.5">{eyebrow}</div>
          )}
          <h1 className="halo-title flex flex-wrap items-baseline gap-2">
            <span>{title}</span>
            {moment && (
              <GradientText className="text-[1.1em]">
                {moment}
              </GradientText>
            )}
          </h1>
          {subhead && <p className="halo-subtitle mt-1.5 max-w-2xl">{subhead}</p>}
        </div>
        {actions && (
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
