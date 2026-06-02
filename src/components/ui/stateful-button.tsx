import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Check } from 'lucide-react';

type ButtonState = 'idle' | 'loading' | 'success';

interface StatefulButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void | Promise<void>;
}

export function Button({ className, children, onClick, disabled, ...props }: StatefulButtonProps) {
  const [state, setState] = React.useState<ButtonState>('idle');

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (state !== 'idle' || disabled) return;
    setState('loading');
    try {
      await onClick?.();
      setState('success');
      setTimeout(() => setState('idle'), 1500);
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || state === 'loading'}
      onClick={handleClick}
      className={cn(
        'inline-flex min-w-[140px] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium',
        'bg-neutral-900 text-white shadow-lg transition-all duration-200',
        'hover:bg-neutral-800 active:scale-[0.98]',
        'disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200',
        className
      )}
      {...props}
    >
      {state === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
      {state === 'success' && <Check className="h-4 w-4" />}
      <span>
        {state === 'loading' ? 'Please wait…' : state === 'success' ? 'Done' : children}
      </span>
    </button>
  );
}
