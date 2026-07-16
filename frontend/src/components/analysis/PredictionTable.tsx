"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { interpolateColor } from '@/utils/colorUtils'

ModuleRegistry.registerModules([AllCommunityModule])

interface PredictionTableProps {
  currentData: any[]
  fractalData: any[]
}

// Upper bound (%) of each correlation-strength band, ordered highest-confidence first.
const BANDS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]

function bandLabel(upper: number) {
  return upper === 10 ? '<10%' : `${upper - 9}%~${upper}%`
}

// fractalData isn't perfectly daily-spaced once timeScale != 1, so pick the
// point whose logicalIndex is nearest the requested target.
function closestClose(fractalData: any[], targetIndex: number): number | null {
  let best: number | null = null
  let bestDist = Infinity
  for (const p of fractalData) {
    const dist = Math.abs(p.logicalIndex - targetIndex)
    if (dist < bestDist) {
      bestDist = dist
      best = p.close
    }
  }
  return best
}

// Monday of the ISO week containing this date, used as a weekly grouping key.
function weekKey(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diffToMonday = (day === 0 ? -6 : 1) - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  return monday.toISOString().split('T')[0]
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7)
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Past (verifiable) cells: no background fill — just bold text colored by
// how close that band's prediction was to the actual price (greenest at the
// closest-matching band, reddening with distance), reusing the same
// red/grey/green interpolateColor() the /map treemap uses.
function pastCellStyle(rowData: any, upper: number) {
  let bestUpper = BANDS[0]
  let bestDiff = Infinity
  for (const b of BANDS) {
    const diff = Math.abs(rowData[`band_${b}`] - rowData.actualPrice)
    if (diff < bestDiff) {
      bestDiff = diff
      bestUpper = b
    }
  }

  const bestIdx = BANDS.indexOf(bestUpper)
  const currentIdx = BANDS.indexOf(upper)
  const distanceSteps = Math.abs(currentIdx - bestIdx)
  const closeness = 1 - distanceSteps / (BANDS.length - 1)

  return { backgroundColor: 'transparent', color: interpolateColor((closeness - 0.5) * 100), fontWeight: 'bold' as const }
}

// Future (unverifiable) cells: background heatmap of that column's own
// day-over-day (or week/month-over-period, depending on the selected
// interval) % change versus the previous row — same rule applied
// identically to every band column. A ±5% move clips to full color.
function futureCellStyle(rowData: any, upper: number) {
  const prev = rowData[`prevBand_${upper}`]
  const curr = rowData[`band_${upper}`]
  if (prev == null || curr == null) return undefined

  const pctChange = (curr - prev) / prev
  return { backgroundColor: interpolateColor(pctChange * 1000), color: 'white' }
}

export default function PredictionTable({ currentData, fractalData }: PredictionTableProps) {
  const [interval, setInterval] = useState<'1d' | '1w' | '1M'>('1d')
  const gridRef = useRef<AgGridReact>(null)

  const gridTheme = useMemo(() => {
    return themeQuartz.withParams({
      rowHoverColor: 'rgba(0,0,0,0.04)',
    })
  }, [])

  const currentPrice = currentData.length ? currentData[currentData.length - 1].close : 0

  // One row per calendar day present in the (possibly extended/scaled)
  // fractal projection, covering both the historical overlap (where we also
  // have the real traded price, for the match-highlighting below) and the
  // future projection beyond today.
  const dailyRows = useMemo(() => {
    if (!currentData.length || !fractalData.length) return []

    const todayIndex = currentData.length - 1
    const todayFractalClose = closestClose(fractalData, todayIndex)
    if (todayFractalClose === null) return []

    const points = [...fractalData].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    return points.map((p) => {
      const pctChange = (p.close - todayFractalClose) / todayFractalClose
      const actualPrice = p.logicalIndex >= 0 && p.logicalIndex < currentData.length
        ? currentData[p.logicalIndex].close
        : null
      const row: any = { Date: p.time, actualPrice }
      BANDS.forEach((upper) => {
        row[`band_${upper}`] = currentPrice * (1 + pctChange * (upper / 100))
      })
      return row
    })
  }, [currentData, fractalData, currentPrice])

  // Aggregate daily rows into weekly/monthly bars (last day of each period),
  // matching the 일봉/주봉/월봉 convention used in AgGridHistoryTable.
  const rowData = useMemo(() => {
    if (interval === '1d') return dailyRows

    const keyFn = interval === '1w' ? weekKey : monthKey
    const map = new Map<string, any>()
    for (const row of dailyRows) {
      map.set(keyFn(row.Date), row)
    }
    return Array.from(map.values())
  }, [dailyRows, interval])

  // Attach each band's previous-row value onto the row, so the future-cell
  // heatmap can compute a period-over-period % change without needing to
  // look outside its own row (and so it stays correct however AG Grid's own
  // sort/filter reorders what's displayed).
  const rowDataWithPrev = useMemo(() => {
    return rowData.map((row, idx) => {
      const prev = idx > 0 ? rowData[idx - 1] : null
      const withPrev: any = { ...row }
      BANDS.forEach((upper) => {
        withPrev[`prevBand_${upper}`] = prev ? prev[`band_${upper}`] : null
      })
      return withPrev
    })
  }, [rowData])

  // rowData is sorted ascending by date, so instead of defaulting to page 1
  // (2023, the very start of the historical overlap), jump the grid to
  // whichever page contains "today" (the last row that still has a real
  // actualPrice) so the current month is what's visible on load.
  const goToTodayPage = useCallback(() => {
    const api = gridRef.current?.api
    if (!api || !rowDataWithPrev.length) return

    let todayIdx = 0
    for (let i = 0; i < rowDataWithPrev.length; i++) {
      if (rowDataWithPrev[i].actualPrice != null) todayIdx = i
    }
    const pageSize = api.paginationGetPageSize()
    api.paginationGoToPage(Math.floor(todayIdx / pageSize))
  }, [rowDataWithPrev])

  useEffect(() => {
    goToTodayPage()
  }, [goToTodayPage])

  const handleExportCsv = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `prediction-table-${interval}-${currentData[currentData.length - 1]?.time ?? ''}.csv`,
    })
  }, [interval, currentData])

  const columnDefs = useMemo(() => ([
    {
      field: 'Date',
      headerName: 'Date',
      minWidth: 130,
      pinned: 'left' as const,
      sort: 'asc' as const,
      tooltipValueGetter: (p: any) => (p.data.actualPrice != null ? `실제가격: ${currencyFormatter.format(p.data.actualPrice)}` : ''),
    },
    ...BANDS.map((upper) => ({
      field: `band_${upper}`,
      headerName: bandLabel(upper),
      minWidth: 110,
      type: 'rightAligned' as const,
      valueFormatter: (p: any) => (p.value == null ? '' : currencyFormatter.format(p.value)),
      cellStyle: (p: any) => (p.data.actualPrice != null ? pastCellStyle(p.data, upper) : futureCellStyle(p.data, upper)),
    })),
  ]), [])

  if (!currentData.length || !fractalData.length) return null

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          상관계수 기반 가격 예측 (과거/미래)
        </h2>
        <div className="flex gap-2">
          {(['1d', '1w', '1M'] as const).map((iv) => (
            <button
              key={iv}
              type="button"
              onClick={() => setInterval(iv)}
              className={`rounded border px-3 py-1 text-sm ${interval === iv ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
            >
              {iv === '1d' ? '일봉' : iv === '1w' ? '주봉' : '월봉'}
            </button>
          ))}
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded border px-3 py-1 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            CSV 내보내기
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-1">
        과거 프랙탈 패턴의 예상 변동률에 가정 상관계수(반영 비중)를 곱한 시나리오입니다. 현재가: {currencyFormatter.format(currentPrice)} (기준일: {currentData[currentData.length - 1]?.time})
      </p>
      <p className="text-xs text-gray-400 mb-1 flex items-center gap-2 flex-wrap">
        <b>실제 가격이 있는 날짜</b>: 배경 없이 굵은 글씨로, 가장 가까운 확률 구간에 가까울수록
        <span className="px-1.5 py-0.5 rounded font-bold" style={{ color: 'rgb(46, 204, 89)' }}>초록</span>
        , 멀어질수록
        <span className="px-1.5 py-0.5 rounded font-bold" style={{ color: 'rgb(247, 53, 57)' }}>빨강</span>
        텍스트로 표시됩니다.
      </p>
      <p className="text-xs text-gray-400 mb-4 flex items-center gap-2 flex-wrap">
        <b>미래 날짜</b>: 각 구간이 전 기간 대비 오르면
        <span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: 'rgb(46, 204, 89)' }}>초록</span>
        , 내리면
        <span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: 'rgb(247, 53, 57)' }}>빨강</span>
        배경으로, 변동폭이 클수록 진하게 표시됩니다.
      </p>
      <div style={{ width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowDataWithPrev}
          columnDefs={columnDefs as any}
          theme={gridTheme}
          onGridReady={goToTodayPage}
          tooltipShowDelay={200}
          domLayout="autoHeight"
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={[25, 50, 100, 200]}
          defaultColDef={{ resizable: true, sortable: true, filter: true, flex: 1 }}
        />
      </div>
    </div>
  )
}
