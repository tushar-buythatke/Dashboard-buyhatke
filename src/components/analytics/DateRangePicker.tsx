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

// === Design tokens (tweak here) ===
const ACCENT = {
  base: 'pink-500', // pink for selected dates
  hover: 'pink-400',
  ring: 'pink-300',
  light: 'pink-100', // light background for selected dates
  pink: 'pink-500', // pinkish accent for selected dates
}

// ——— helpers ——
function atNoon(d: Date) {
  const copy = new Date(d)
  // Anchor at local noon to avoid TZ/DST off‑by‑one when formatting/round‑tripping
  copy.setHours(12, 0, 0, 0)
  return copy
}

function safeParse(input?: string): Date | undefined {
  if (!input) return undefined
  // Prefer strict local parse of `yyyy-MM-dd`
  const byPattern = parse(input, 'yyyy-MM-dd', new Date())
  if (isValid(byPattern)) return atNoon(byPattern)
  // Fallback to native Date for other shapes (e.g., ISO strings with time)
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

  // Sync draft whenever popover opens or committed changes externally
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

  // Favor an anchored default month for a nicer first open
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
          className="w-full justify-start text-left font-normal text-xs sm:text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md transition-all duration-200 shadow-sm"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-700 dark:text-gray-200 truncate text-xs sm:text-sm">{label}</span>
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-3 sm:p-4 md:p-6 shadow-xl rounded-md z-[70] overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        align="center"
        side="bottom"
        sideOffset={4}
        alignOffset={0}
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6">
          {/* Presets */}
          <div className="flex sm:hidden flex-row gap-1 pb-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setDraftRange(p.getRange())}
                className="px-2 py-1 text-xs rounded-md hover:bg-pink-50 dark:hover:bg-pink-900/20 text-gray-700 dark:text-gray-300 hover:text-pink-700 dark:hover:text-pink-300 transition-colors duration-200 whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex flex-col gap-1 pr-4 md:pr-6 border-r border-gray-200 dark:border-gray-700 min-w-[100px] md:min-w-[130px]">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setDraftRange(p.getRange())}
                className="px-2 py-1.5 text-xs sm:text-sm rounded-md hover:bg-pink-50 dark:hover:bg-pink-900/20 text-gray-700 dark:text-gray-300 text-left hover:text-pink-700 dark:hover:text-pink-300 transition-colors duration-200"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="flex-1">
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
                IconLeft: () => (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-800 dark:text-gray-200"
                  >
                    <polyline points="15,18 9,12 15,6" />
                  </svg>
                ),
                IconRight: () => (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-800 dark:text-gray-200"
                  >
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                )
              }}
              modifiers={modifiers}
              modifiersClassNames={{
                range_preview:
                  'aria-selected:bg-transparent bg-pink-50 dark:bg-pink-500/15 text-pink-900 dark:text-pink-100'
              }}
              className="rounded-md border-0 bg-transparent scale-90 sm:scale-95 md:scale-100"
              classNames={{
                months: 'flex flex-col space-y-2 sm:space-y-3 md:space-y-4',
                month: 'space-y-2 sm:space-y-3 md:space-y-4 bg-transparent',
                caption: 'flex justify-center pt-1 relative items-center mb-2 sm:mb-3 bg-transparent',
                caption_label: 'text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100',
                nav: 'space-x-1 flex items-center z-10',
                nav_button:
                  'h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-400 dark:border-gray-500 hover:border-gray-500 dark:hover:border-gray-400 rounded-md transition-all duration-200 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 disabled:opacity-30 shadow-sm hover:shadow-md',
                nav_button_previous: 'absolute left-0 sm:left-1',
                nav_button_next: 'absolute right-0 sm:right-1',
                table: 'w-full border-collapse space-y-1 bg-transparent',
                head_row: 'flex mb-1 sm:mb-2 bg-transparent',
                head_cell:
                  'text-gray-500 dark:text-gray-400 rounded-md w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 font-medium text-xs flex items-center justify-center',
                row: 'flex w-full mt-1 sm:mt-2 bg-transparent',
                cell:
                  'relative p-0.5 text-center text-xs sm:text-sm focus-within:relative focus-within:z-20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md',
                day:
                  'h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 font-medium rounded-md transition-all duration-200 flex items-center justify-center hover:bg-pink-100 dark:hover:bg-pink-800 hover:text-pink-900 dark:hover:text-pink-100 focus:bg-pink-100 dark:focus:bg-pink-800 focus:text-pink-900 dark:focus:text-pink-100 focus:outline-none m-0.5 text-xs sm:text-sm',
                day_range_start:
                  'bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100 hover:bg-pink-200 dark:hover:bg-pink-800/40 focus:bg-pink-200 dark:focus:bg-pink-800/40 focus:outline-none shadow-sm font-semibold border-2 border-pink-400 dark:border-pink-500',
                day_range_end:
                  'bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100 hover:bg-pink-200 dark:hover:bg-pink-800/40 focus:bg-pink-200 dark:focus:bg-pink-800/40 focus:outline-none shadow-sm font-semibold border-2 border-pink-400 dark:border-pink-500',
                day_selected:
                  'bg-pink-50 dark:bg-pink-900/20 text-pink-900 dark:text-pink-100 hover:bg-pink-100 dark:hover:bg-pink-800/30 focus:bg-pink-100 dark:focus:bg-pink-800/30 focus:outline-none',
                day_today:
                  'ring-2 ring-orange-400 dark:ring-orange-500 rounded-md font-bold text-orange-600 dark:text-orange-400',
                day_outside: 'text-gray-400 dark:text-gray-600 opacity-50',
                day_disabled: 'text-gray-400 dark:text-gray-600 opacity-30',
                day_range_middle:
                  'aria-selected:bg-pink-50 dark:aria-selected:bg-pink-900/15 aria-selected:text-pink-900 dark:aria-selected:text-pink-100',
                day_hidden: 'invisible'
              }}
            />

            {/* Action Bar */}
            <div className="flex justify-between items-center mt-3 sm:mt-4 md:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={clearDraft}
                className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 font-medium transition-colors duration-200"
              >
                Clear
              </button>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={applyAndClose}
                  disabled={!(draftRange?.from && draftRange?.to)}
                  className="px-3 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
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