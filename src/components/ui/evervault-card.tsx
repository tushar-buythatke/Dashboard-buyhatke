import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function scramble(text: string) {
  return text
    .split('')
    .map((c) => (c === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]))
    .join('');
}

export function Icon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={cn('h-6 w-6', className)}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
}

interface EvervaultCardProps {
  text?: string;
  className?: string;
}

export function EvervaultCard({ text = 'hover', className }: EvervaultCardProps) {
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => setDisplay(scramble(text)), 40);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDisplay(text);
  };

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return (
    <div
      onMouseEnter={start}
      onMouseLeave={stop}
      className={cn(
        'relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl',
        'border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"
        style={{
          background:
            'radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(120,100,255,0.25), transparent 55%)',
        }}
      />
      <p className="relative z-10 font-mono text-2xl tracking-widest text-neutral-800 dark:text-neutral-200">
        {display}
      </p>
    </div>
  );
}
