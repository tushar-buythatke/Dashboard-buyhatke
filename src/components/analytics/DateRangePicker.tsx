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
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(date.from, 'MMM dd, yyyy')} - {format(date.to, 'MMM dd, yyyy')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
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
        />
      </PopoverContent>
    </Popover>
  );
} 