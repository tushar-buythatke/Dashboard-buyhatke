import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'halo-heading text-sm',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-[var(--h-ink-3)] rounded-[var(--h-r-sm)] w-8 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-[var(--h-tint)] [&:has([aria-selected].day-outside)]:bg-[var(--h-tint)]/50 [&:has([aria-selected].day-range-end)]:rounded-r-[var(--h-r-sm)]',
          props.mode === 'range'
            ? '[&:has(>.day-range-end)]:rounded-r-[var(--h-r-sm)] [&:has(>.day-range-start)]:rounded-l-[var(--h-r-sm)] first:[&:has([aria-selected])]:rounded-l-[var(--h-r-sm)] last:[&:has([aria-selected])]:rounded-r-[var(--h-r-sm)]'
            : '[&:has([aria-selected])]:rounded-[var(--h-r-sm)]'
        ),
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 p-0 font-normal aria-selected:opacity-100'
        ),
        day_range_start: 'day-range-start',
        day_range_end: 'day-range-end',
        day_selected:
          'bg-[var(--h-iris-500)] text-white hover:bg-[var(--h-iris-500)] hover:text-white focus:bg-[var(--h-iris-500)] focus:text-white',
        day_today: 'bg-[var(--h-tint)] text-[var(--h-ink)]',
        day_outside:
          'day-outside text-[var(--h-ink-3)] opacity-50 aria-selected:bg-[var(--h-tint)]/50 aria-selected:text-[var(--h-ink-3)] aria-selected:opacity-30',
        day_disabled: 'text-[var(--h-ink-3)] opacity-50',
        day_range_middle:
          'aria-selected:bg-[var(--h-tint)] aria-selected:text-[var(--h-ink)]',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeftIcon className="h-4 w-4" />,
        IconRight: () => <ChevronRightIcon className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
