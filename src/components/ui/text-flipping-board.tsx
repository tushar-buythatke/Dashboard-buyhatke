import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TextFlippingBoardProps {
  text: string;
  className?: string;
}

/** Split-flap style display — Aceternity-inspired, CSS-only for Vite */
export function TextFlippingBoard({ text, className }: TextFlippingBoardProps) {
  const lines = useMemo(() => text.split('\n').filter(Boolean), [text]);

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-1 rounded-xl border border-[var(--line-violet)] bg-[var(--bg-panel)]/80 px-4 py-3 backdrop-blur-xl shadow-[var(--shadow-2)]',
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-0.5"
        >
          {lines.map((line, li) => (
            <div key={`${li}-${line}`} className="flex flex-wrap gap-[3px]">
              {line.split('').map((char, ci) => (
                <motion.span
                  key={`${ci}-${char}`}
                  initial={{ rotateX: -90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{
                    delay: (li * 20 + ci) * 0.02,
                    duration: 0.35,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={cn(
                    'inline-flex h-8 min-w-[1.1rem] items-center justify-center rounded-md border border-[var(--line)] bg-[var(--bg-panel-2)] px-1 font-mono text-xs font-medium uppercase tracking-wider text-[var(--text-1)]',
                    char === ' ' && 'min-w-[0.5rem] border-transparent bg-transparent'
                  )}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {char === ' ' ? '\u00a0' : char}
                </motion.span>
              ))}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
