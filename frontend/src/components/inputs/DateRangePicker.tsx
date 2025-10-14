"use client"

import * as React from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

export type DateRangeValue = DateRange | undefined

type Props = {
  value?: DateRangeValue
  onChange?: (range: DateRangeValue) => void
  onStartDate?: (start?: string) => void
  onEndDate?: (end?: string) => void
  numberOfMonths?: number
  fromYear?: number
  toYear?: number
  className?: string
  placeholderLabel?: string
  variant?: 'start' | 'end'
}

function toYmd(date?: Date): string | undefined {
  if (!date) return undefined
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function DateRangePicker({
  value,
  onChange,
  onStartDate,
  onEndDate,
  numberOfMonths = 2,
  fromYear = 2009,
  toYear = new Date().getFullYear(),
  className,
  placeholderLabel,
  variant,
}: Props) {
  const [range, setRange] = React.useState<DateRangeValue>(value)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setRange(value)
  }, [value?.from?.getTime(), value?.to?.getTime()])

  const handleSelect = (next: DateRangeValue) => {
    // 한 번 클릭으로 확정: 첫 클릭 시 from=to 동일 날짜로 확정
    if (next?.from && !next?.to) {
      const single = { from: next.from, to: next.from }
      setRange(single)
      onChange?.(single)
      onStartDate?.(toYmd(single.from))
      onEndDate?.(toYmd(single.to))
      setOpen(false)
      return
    }
    setRange(next)
    onChange?.(next)
    onStartDate?.(toYmd(next?.from))
    onEndDate?.(toYmd(next?.to))
    if (next?.from && next?.to) setOpen(false)
  }

  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          background: '#fff',
          fontSize: 14,
        }}
      >
        {variant ? (
          <span style={{
            padding: '0 4px',
            borderRadius: 4,
            background: '#f3f4f6',
            color: '#374151'
          }}>
            {variant === 'start' ? (toYmd(range?.from) || 'StartDate') : (toYmd(range?.to) || 'EndDate')}
          </span>
        ) : placeholderLabel ? (
          <span style={{
            padding: '0 4px',
            borderRadius: 4,
            background: '#f3f4f6',
            color: '#374151'
          }}>
            {toYmd(range?.from) || toYmd(range?.to) || placeholderLabel}
          </span>
        ) : (
          <span>
            <span style={{
              padding: '0 4px',
              borderRadius: 4,
              background: '#f3f4f6',
              color: '#374151'
            }}>
              {toYmd(range?.from) || 'StartDate'}
            </span>
            <span style={{ margin: '0 6px', color: '#6b7280' }}>~</span>
            <span style={{
              padding: '0 4px',
              borderRadius: 4,
              background: '#f3f4f6',
              color: '#374151'
            }}>
              {toYmd(range?.to) || 'EndDate'}
            </span>
          </span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 6px)',
            left: 0,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
            padding: 6,
            minWidth: 300,
          }}
        >
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={numberOfMonths}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            showOutsideDays
            styles={{
              month: { margin: 0 },
              caption: { paddingBottom: 4, fontSize: 12, fontWeight: 400 },
              month_caption: { fontSize: 12, fontWeight: 400 },
              caption_label: { fontSize: 12, fontWeight: 400 },
              head_cell: { fontSize: 11, padding: 4, fontWeight: 400 },
              table: { margin: 0 },
              day: { padding: 0 },
              day_button: { width: 30, height: 26, fontSize: 12, lineHeight: '26px', textAlign: 'center' },
              nav_button: { width: 22, height: 22 },
            }}
          />
        </div>
      )}
    </div>
  )
}


