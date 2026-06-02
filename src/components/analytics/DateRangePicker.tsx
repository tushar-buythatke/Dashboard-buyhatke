import { useState, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { useFilters } from '@/context/FilterContext'
import type { DateRange } from 'react-day-picker'
import {
  format,
  parse,
  isValid,
  startOfMonth,
  endOfMonth,
  subDays,
  addMonths,
  isAfter,
  isBefore,
  isSameDay
} from 'date-fns'

// ——— helpers ——
function atNoon(d: Date) {
  const copy = new Date(d)
  copy.setHours(12, 0, 0, 0)
  return copy
}

function safeParse(input?: string): Date | undefined {
  if (!input) return undefined
  const byPattern = parse(input, 'yyyy-MM-dd', new Date())
  if (isValid(byPattern)) return atNoon(byPattern)
  const byNative = new Date(input)
  return isValid(byNative as any) ? atNoon(byNative) : undefined
}

function toIsoDate(d?: Date) {
  return d ? format(d, 'yyyy-MM-dd') : undefined
}

export function DateRangePicker() {
  const { filters, updateFilters } = useFilters()
  const [isOpen, setIsOpen] = useState(false)

  // ——— committed (what filters currently hold) ——
  const committedRange: DateRange | undefined = useMemo(() => {
    const from = safeParse(filters?.dateRange?.from)
    const to = safeParse(filters?.dateRange?.to)
    if (from && to) return { from, to }
    if (from) return { from, to: from }
    return undefined
  }, [filters?.dateRange?.from, filters?.dateRange?.to])

  // ——— draft (what user is currently picking in the popover) ——
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(committedRange)
  const [hovered, setHovered] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (isOpen) setDraftRange(committedRange)
  }, [isOpen, committedRange])

  // ——— UI label ——
  const label = useMemo(() => {
    if (committedRange?.from && committedRange?.to) {
      const { from, to } = committedRange
      const sameYear = format(from, 'yyyy') === format(to, 'yyyy')
      const sameMonth = format(from, 'MMM') === format(to, 'MMM')
      if (sameYear && sameMonth) return `${format(from, 'MMM dd')} – ${format(to, 'dd, yyyy')}`
      if (sameYear) return `${format(from, 'MMM dd')} – ${format(to, 'MMM dd, yyyy')}`
      return `${format(from, 'MMM dd, yyyy')} – ${format(to, 'MMM dd, yyyy')}`
    }
    return 'Pick a date range'
  }, [committedRange])

  const defaultMonth = draftRange?.from ?? committedRange?.from ?? new Date()

  // ——— quick presets ——
  const presets: { label: string; getRange: () => DateRange }[] = [
    {
      label: 'Last 7 days',
      getRange: () => {
        const to = atNoon(new Date())
        const from = atNoon(subDays(to, 6))
        return { from, to }
      }
    },
    {
      label: 'Last 30 days',
      getRange: () => {
        const to = atNoon(new Date())
        const from = atNoon(subDays(to, 29))
        return { from, to }
      }
    },
    {
      label: 'Last 90 days',
      getRange: () => {
        const to = atNoon(new Date())
        const from = atNoon(subDays(to, 89))
        return { from, to }
      }
    },
    {
      label: 'This month',
      getRange: () => {
        const from = atNoon(startOfMonth(new Date()))
        const to = atNoon(new Date())
        return { from, to }
      }
    },
    {
      label: 'Last month',
      getRange: () => {
        const first = startOfMonth(addMonths(new Date(), -1))
        const last = endOfMonth(addMonths(new Date(), -1))
        return { from: atNoon(first), to: atNoon(last) }
      }
    }
  ]

  // ——— actions ——
  function clearDraft() {
    setDraftRange(undefined)
    setHovered(undefined)
  }

  function applyAndClose() {
    if (draftRange?.from && draftRange?.to) {
      updateFilters({
        dateRange: {
          from: toIsoDate(draftRange.from)!,
          to: toIsoDate(draftRange.to)!
        }
      })
    }
    setIsOpen(false)
  }

  // ——— modifiers for hover preview ——
  const modifiers = useMemo(() => ({
    range_preview: (day: Date) => {
      if (!draftRange?.from || draftRange?.to || !hovered) return false
      if (isSameDay(hovered, draftRange.from)) return false
      const min = isAfter(hovered, draftRange.from) ? draftRange.from : hovered
      const max = isAfter(hovered, draftRange.from) ? hovered : draftRange.from
      return isAfter(day, min) && isBefore(day, max)
    }
  }), [draftRange, hovered])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="velvet-focus flex h-9 w-full items-center justify-start rounded-md border border-[var(--line)] bg-transparent px-3 py-2 text-sm font-normal text-[var(--text-1)] hover:bg-[var(--bg-panel-2)] hover:border-[var(--line-strong)]"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <CalendarIcon className="h-3.5 w-3.5 text-[var(--indigo-500)] flex-shrink-0" />
            <span className="truncate text-xs sm:text-sm">{label}</span>
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="velvet-panel w-auto rounded-2xl z-[70] overflow-hidden p-3 sm:p-4"
        align="center"
        side="bottom"
        sideOffset={6}
        alignOffset={0}
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Presets */}
          <div className="flex sm:hidden flex-row gap-1 pb-3 border-b border-[var(--line)] overflow-x-auto">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setDraftRange(p.getRange())}
                className="px-2.5 py-1 text-xs rounded-full bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)] hover:border-[var(--line-violet)] border border-transparent transition-all duration-200 whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex flex-col gap-1 pr-3 border-r border-[var(--line)] min-w-[120px]">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setDraftRange(p.getRange())}
                className="px-2.5 py-1.5 text-xs sm:text-sm rounded-full bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)] border border-transparent hover:border-[var(--line-violet)] transition-all duration-200 text-left"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="flex-1 min-w-0">
            <Calendar
              mode="range"
              defaultMonth={defaultMonth}
              selected={draftRange}
              onSelect={(range) => setDraftRange(range)}
              numberOfMonths={1}
              showOutsideDays
              initialFocus
              onDayMouseEnter={(d) => setHovered(d)}
              onDayMouseLeave={() => setHovered(undefined)}
              components={{
                IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                IconRight: () => <ChevronRight className="h-4 w-4" />,
              }}
              modifiers={modifiers}
              modifiersClassNames={{
                range_preview:
                  'aria-selected:bg-transparent bg-[var(--bg-tint)] text-[var(--indigo-500)]'
              }}
              className="rounded-md border-0 bg-transparent scale-95 sm:scale-100"
              classNames={{
                months: 'flex flex-col space-y-3',
                month: 'space-y-3 bg-transparent',
                caption: 'flex justify-center pt-1 relative items-center mb-2 bg-transparent',
                caption_label: 'text-sm font-semibold text-[var(--text-1)] tracking-tight',
                nav: 'space-x-1 flex items-center z-10',
                nav_button:
                  'h-7 w-7 bg-transparent hover:bg-[var(--bg-tint)] rounded-full transition-all duration-200 flex items-center justify-center text-[var(--text-2)] hover:text-[var(--indigo-500)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet-500)]/30 disabled:opacity-30 disabled:hover:bg-transparent',
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
                table: 'w-full border-collapse space-y-1 bg-transparent',
                head_row: 'flex mb-1 bg-transparent',
                head_cell:
                  'text-[var(--text-3)] rounded-full w-9 h-9 font-medium text-[10.5px] uppercase tracking-wider flex items-center justify-center',
                row: 'flex w-full mt-1 bg-transparent',
                cell:
                  'relative p-0 text-center text-xs focus-within:relative focus-within:z-20',
                day:
                  'h-9 w-9 p-0 font-medium rounded-full transition-all duration-200 flex items-center justify-center hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)] focus:bg-[var(--bg-tint)] focus:text-[var(--indigo-500)] focus:outline-none text-[var(--text-1)] text-xs',
                day_range_start:
                  'bg-[var(--violet-500)] text-white hover:bg-[var(--violet-600)] focus:bg-[var(--violet-600)] focus:outline-none font-semibold',
                day_range_end:
                  'bg-[var(--violet-500)] text-white hover:bg-[var(--violet-600)] focus:bg-[var(--violet-600)] focus:outline-none font-semibold',
                day_selected:
                  'bg-[var(--violet-500)] text-white hover:bg-[var(--violet-600)] focus:bg-[var(--violet-600)] focus:outline-none',
                day_today:
                  'ring-1 ring-[var(--violet-500)]/40 rounded-full font-semibold text-[var(--indigo-500)]',
                day_outside: 'text-[var(--text-3)] opacity-40',
                day_disabled: 'text-[var(--text-3)] opacity-30',
                day_range_middle:
                  'aria-selected:bg-[var(--bg-tint)] aria-selected:text-[var(--indigo-500)] rounded-none',
                day_hidden: 'invisible'
              }}
            />

            {/* Action Bar */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--line)]">
              <button
                onClick={clearDraft}
                className="text-xs text-[var(--text-3)] hover:text-[var(--indigo-500)] font-medium transition-colors duration-200 px-2 py-1 rounded-md hover:bg-[var(--bg-tint)]"
              >
                Clear
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-tint)] rounded-md transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={applyAndClose}
                  disabled={!(draftRange?.from && draftRange?.to)}
                  className="btn-velvet h-8 px-4 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
