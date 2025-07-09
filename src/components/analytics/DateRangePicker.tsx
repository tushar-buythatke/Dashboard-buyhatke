import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useFilters } from '@/context/FilterContext';
import { format } from 'date-fns';

export function DateRangePicker() {
  const { filters, updateFilters } = useFilters();

  const [date, setDate] = useState<{ from: Date; to: Date }>({
    from: new Date(filters.dateRange.from),
    to: new Date(filters.dateRange.to)
  });

  useEffect(() => {
    updateFilters({
      dateRange: {
        from: format(date.from, 'yyyy-MM-dd'),
        to: format(date.to, 'yyyy-MM-dd')
      }
    });
  }, [date]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal text-sm bg-transparent border-0 hover:bg-transparent hover:text-gray-900 dark:hover:text-gray-100 p-0 h-auto shadow-none focus:ring-0"
        >
          <CalendarIcon className="mr-3 h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
            {format(date.from, 'MMM dd')} - {format(date.to, 'MMM dd, yyyy')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl z-[70]" 
        align="start"
        side="bottom"
        sideOffset={8}
      >
        <div className="p-4">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date.from}
            selected={date}
            onSelect={(range) => {
              if (range && range.from && range.to) {
                setDate({ from: range.from, to: range.to });
              }
            }}
            className="rounded-lg"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
} 