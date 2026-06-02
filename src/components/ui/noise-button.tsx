import * as React from 'react';
import { cn } from '@/lib/utils';
import { NoiseBackground } from './noise-background';

interface NoiseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  gradientColors?: string[];
  containerClassName?: string;
}

export const NoiseButton = React.forwardRef<HTMLButtonElement, NoiseButtonProps>(
  ({ className, children, gradientColors, containerClassName, disabled, ...props }, ref) => {
    return (
      <NoiseBackground
        containerClassName={cn('w-fit rounded-full', containerClassName)}
        gradientColors={gradientColors}
        className="rounded-full"
      >
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          className={cn(
            'h-full w-full cursor-pointer rounded-full bg-gradient-to-r from-neutral-100 via-neutral-100 to-white px-4 py-2 text-sm font-medium text-black',
            'shadow-[0px_2px_0px_0px_rgb(250_250_250)_inset,0px_0.5px_1px_0px_rgb(163_163_163)]',
            'transition-transform duration-100 active:scale-[0.98]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:from-black dark:via-black dark:to-neutral-900 dark:text-white',
            'dark:shadow-[0px_1px_0px_0px_rgb(10_10_10)_inset,0px_1px_0px_0px_rgb(38_38_38)]',
            className
          )}
          {...props}
        >
          {children}
        </button>
      </NoiseBackground>
    );
  }
);
NoiseButton.displayName = 'NoiseButton';
