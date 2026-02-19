"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
// import { Button } from "@/components/ui/button" // Assuming you don't use shadcn ui button directly or want to keep it simple
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: DateRange
  onChange?: (date: DateRange | undefined) => void
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(value)

  // When the popover opens, initialize tempRange with the current value
  React.useEffect(() => {
    if (isOpen) {
        setTempRange(value)
    }
  }, [isOpen, value])

  const handleApply = () => {
    onChange?.(tempRange)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            id="date"
            className={cn(
              "w-[260px] justify-start text-left font-normal flex items-center px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-sm",
              !value && "text-gray-500 dark:text-gray-400"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempRange?.from}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
          />
          <div className="border-t border-gray-200 p-3 flex justify-between items-center bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
             <div className="text-xs text-gray-500">
                Range: {tempRange?.from ? format(tempRange.from, "dd MMM, yyyy") : ''} {tempRange?.to ? `- ${format(tempRange.to, "dd MMM, yyyy")}` : ''}
             </div>
             <div className="flex gap-2">
                <button 
                    onClick={handleCancel}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleApply}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                    Apply
                </button>
             </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export type { DateRange }
