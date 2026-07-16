"use client"

import React, { useMemo, useState } from 'react'

interface TrendBetWinRateProps {
  currentData: any[]
  fractalData: any[]
}

interface Point {
  time: string
  close: number
  logicalIndex: number
}

interface Leg {
  start: Point
  end: Point
  direction: 'long' | 'short'
  magnitudePct: number
}

interface Trade {
  leg: Leg
  win: boolean
}

// Rolling fixed-length window scan: a "swing" is any windowDays-long stretch
// where price moved at least thresholdPct in one direction — i.e. exactly
// "moved X% within N days", not an open-ended pivot-to-pivot move of
// whatever length. Scans greedily left to right and jumps past each
// confirmed swing so legs never overlap.
function computeRollingSwings(points: Point[], windowDays: number, thresholdPct: number): Leg[] {
  const legs: Leg[] = []
  if (windowDays <= 0 || points.length < 2) return legs

  let i = 0
  while (i < points.length - 1) {
    const targetLogical = points[i].logicalIndex + windowDays
    let j = i
    while (j < points.length - 1 && points[j].logicalIndex < targetLogical) j++
    if (points[j].logicalIndex < targetLogical) break // ran out of data before a full window

    const start = points[i]
    const end = points[j]
    const change = (end.close - start.close) / start.close

    if (Math.abs(change) >= thresholdPct) {
      legs.push({ start, end, direction: change > 0 ? 'long' : 'short', magnitudePct: change })
      i = j // non-overlapping: resume scanning after this swing
    } else {
      i++
    }
  }
  return legs
}

// 5%~100% in 5-point steps
const THRESHOLD_OPTIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.05)
const DEFAULT_THRESHOLD = 0.15
const DEFAULT_WINDOW_DAYS = 7 // "7일동안 30%이상 변동"

// Auto-search space: period 1~30 days, threshold 10%~30% (5-point steps).
const AUTO_SEARCH_DAYS = Array.from({ length: 30 }, (_, i) => i + 1)
const AUTO_SEARCH_THRESHOLDS = [0.10, 0.15, 0.20, 0.25, 0.30]
const AUTO_SEARCH_MIN_TRADES = 3
// 50%~100% in 5-point steps
const TARGET_WIN_RATE_OPTIONS = Array.from({ length: 11 }, (_, i) => 50 + i * 5)
const DEFAULT_TARGET_WIN_RATE = 70

// Runs the same swing-detection + backtest as the main view for every
// (days, threshold) combo in the search space, tracking long and short win
// rates separately. A combo qualifies if EITHER side individually clears the
// target win rate (each with its own minimum sample size) — long=80%/
// short=20% is a valid match as long as long alone hits the target; the two
// sides don't both have to hit it. Among qualifying combos we pick the one
// backed by the most total trades (the most statistically meaningful one),
// not just whichever happens to score highest.
function findBestWinRate(points: Point[], currentData: any[], targetWinRate: number) {
  let best: {
    days: number
    threshold: number
    total: number
    longWinRate: number | null
    shortWinRate: number | null
    bestSideWinRate: number
  } | null = null

  for (const days of AUTO_SEARCH_DAYS) {
    for (const threshold of AUTO_SEARCH_THRESHOLDS) {
      const testLegs = computeRollingSwings(points, days, threshold)
      let longWins = 0, longTotal = 0
      let shortWins = 0, shortTotal = 0

      for (const leg of testLegs) {
        if (leg.start.logicalIndex < 0 || leg.end.logicalIndex >= currentData.length) continue
        const entryPrice = currentData[leg.start.logicalIndex].close
        const exitPrice = currentData[leg.end.logicalIndex].close
        const actualReturn = (exitPrice - entryPrice) / entryPrice
        const win = leg.direction === 'long' ? actualReturn > 0 : actualReturn < 0
        if (leg.direction === 'long') {
          longTotal++
          if (win) longWins++
        } else {
          shortTotal++
          if (win) shortWins++
        }
      }

      const total = longTotal + shortTotal
      if (total < AUTO_SEARCH_MIN_TRADES) continue

      const longWinRate = longTotal > 0 ? (longWins / longTotal) * 100 : null
      const shortWinRate = shortTotal > 0 ? (shortWins / shortTotal) * 100 : null
      const longQualifies = longTotal >= AUTO_SEARCH_MIN_TRADES && longWinRate !== null && longWinRate >= targetWinRate
      const shortQualifies = shortTotal >= AUTO_SEARCH_MIN_TRADES && shortWinRate !== null && shortWinRate >= targetWinRate
      if (!longQualifies && !shortQualifies) continue

      const bestSideWinRate = Math.max(
        longQualifies ? (longWinRate as number) : -Infinity,
        shortQualifies ? (shortWinRate as number) : -Infinity
      )

      if (!best || total > best.total || (total === best.total && bestSideWinRate > best.bestSideWinRate)) {
        best = { days, threshold, total, longWinRate, shortWinRate, bestSideWinRate }
      }
    }
  }
  return best
}

export default function TrendBetWinRate({ currentData, fractalData }: TrendBetWinRateProps) {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [windowDays, setWindowDays] = useState(DEFAULT_WINDOW_DAYS)
  const [targetWinRate, setTargetWinRate] = useState(DEFAULT_TARGET_WIN_RATE)
  const [autoSearchMessage, setAutoSearchMessage] = useState<string | null>(null)

  const handleReset = () => {
    setThreshold(DEFAULT_THRESHOLD)
    setWindowDays(DEFAULT_WINDOW_DAYS)
    setTargetWinRate(DEFAULT_TARGET_WIN_RATE)
    setAutoSearchMessage(null)
  }

  const handleAutoSearch = () => {
    if (!fractalData.length || !currentData.length) return
    const points: Point[] = [...fractalData]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map((p) => ({ time: p.time, close: p.close, logicalIndex: p.logicalIndex }))

    const best = findBestWinRate(points, currentData, targetWinRate)
    if (best) {
      setWindowDays(best.days)
      setThreshold(best.threshold)
      setAutoSearchMessage(null)
    } else {
      setAutoSearchMessage(`목표 승률 ${targetWinRate}%를 만족하는 조합을 찾지 못했습니다. 목표를 낮춰보세요.`)
    }
  }

  const legs = useMemo<Leg[]>(() => {
    if (!fractalData.length) return []
    const points: Point[] = [...fractalData]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map((p) => ({ time: p.time, close: p.close, logicalIndex: p.logicalIndex }))

    return computeRollingSwings(points, windowDays, threshold)
  }, [fractalData, threshold, windowDays])

  // Simulate entering long/short exactly at the swing's start and riding it
  // to the swing's end (windowDays later); only legs where both start and
  // end fall on real trading days (i.e. are in the past, not the
  // still-unrealized future projection) count.
  const trades = useMemo<Trade[]>(() => {
    if (!currentData.length) return []
    const result: Trade[] = []

    for (const leg of legs) {
      if (leg.start.logicalIndex < 0 || leg.end.logicalIndex >= currentData.length) continue

      const entryPrice = currentData[leg.start.logicalIndex].close
      const exitPrice = currentData[leg.end.logicalIndex].close
      const actualReturn = (exitPrice - entryPrice) / entryPrice
      const win = leg.direction === 'long' ? actualReturn > 0 : actualReturn < 0

      result.push({ leg, win })
    }
    return result
  }, [legs, currentData])

  const stats = useMemo(() => {
    const byDir = (dir: 'long' | 'short') => trades.filter((t) => t.leg.direction === dir)
    const winRateOf = (arr: Trade[]) => (arr.length ? (arr.filter((t) => t.win).length / arr.length) * 100 : null)
    return {
      total: trades.length,
      overall: winRateOf(trades),
      long: winRateOf(byDir('long')),
      short: winRateOf(byDir('short')),
    }
  }, [trades])

  const handleExportCsv = () => {
    const header = ['방향', '시작일', '종료일', '변동폭(%)', '결과']
    const rows = legs.map((leg) => {
      const isFuture = leg.start.logicalIndex < 0 || leg.end.logicalIndex >= currentData.length
      const trade = trades.find((t) => t.leg === leg)
      const result = isFuture ? '' : trade ? (trade.win ? '승' : '패') : ''
      return [
        leg.direction === 'long' ? '롱' : '숏',
        leg.start.time,
        leg.end.time,
        (leg.magnitudePct * 100).toFixed(1),
        result,
      ]
    })
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trend-bet-winrate-${windowDays}d-${Math.round(threshold * 100)}pct.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!currentData.length || !fractalData.length) return null

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          추세 전환 롱/숏 배팅 승률
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">기간</span>
            <button
              type="button"
              onClick={() => setWindowDays((d) => Math.max(1, d - 1))}
              className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              aria-label="기간 줄이기"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={windowDays}
              onChange={(e) => setWindowDays(Math.max(1, Number(e.target.value) || 1))}
              className="w-14 text-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => setWindowDays((d) => d + 1)}
              className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              aria-label="기간 늘리기"
            >
              +
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">일</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">변동률</span>
            <select
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white py-1 px-2 text-sm"
            >
              {THRESHOLD_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {Math.round(t * 100)}%+
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">목표 승률</span>
            <select
              value={targetWinRate}
              onChange={(e) => setTargetWinRate(Number(e.target.value))}
              className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white py-1 px-2 text-sm"
            >
              {TARGET_WIN_RATE_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}%+
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAutoSearch}
            className="rounded border px-3 py-1 text-sm bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
            title="기간 1~30일, 변동률 10~30% 범위에서 롱 또는 숏 중 한쪽이라도 목표 승률 이상을 만족하는 조합 중 표본(거래건수)이 가장 많은 조합을 찾습니다"
          >
            자동
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded border px-3 py-1 text-sm bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            리셋
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={legs.length === 0}
            className="rounded border px-3 py-1 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CSV 내보내기
          </button>
        </div>
      </div>
      <p className={`text-xs text-gray-400 ${autoSearchMessage ? 'mb-1' : 'mb-4'}`}>
        프랙탈 예측 그래프에서 {windowDays}일 동안 {(threshold * 100).toFixed(0)}% 이상 움직인 (겹치지 않는) 구간을 찾아, 그 구간 시작일에 방향대로(하락 예측=숏, 상승 예측=롱) 배팅해서 {windowDays}일 뒤(구간 끝)까지 들고 있었을 때의 실제 승률입니다. 과거(실제 가격 존재) 구간만 집계됩니다.
      </p>
      {autoSearchMessage && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">{autoSearchMessage}</p>
      )}

      {stats.total === 0 ? (
        <p className="text-sm text-gray-400">이 임계값으로는 과거 구간에서 검증 가능한 추세 전환이 없습니다. 임계값을 낮춰보세요.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">전체 승률 ({stats.total}건)</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overall?.toFixed(1)}%</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">롱 승률</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.long != null ? `${stats.long.toFixed(1)}%` : '-'}</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">숏 승률</div>
            <div className="text-2xl font-bold text-red-500">{stats.short != null ? `${stats.short.toFixed(1)}%` : '-'}</div>
          </div>
        </div>
      )}

      {legs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-2 pr-4 font-medium">방향</th>
                <th className="py-2 pr-4 font-medium">시작일</th>
                <th className="py-2 pr-4 font-medium">종료일</th>
                <th className="py-2 pr-4 font-medium text-right">변동폭</th>
                <th className="py-2 pr-4 font-medium text-right">결과</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, idx) => {
                  const isFuture = leg.start.logicalIndex < 0 || leg.end.logicalIndex >= currentData.length
                  const trade = trades.find((t) => t.leg === leg)
                  return (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                      <td className={`py-2 pr-4 font-medium ${leg.direction === 'long' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {leg.direction === 'long' ? '롱' : '숏'}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{leg.start.time}</td>
                      <td className="py-2 pr-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{leg.end.time}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {(leg.magnitudePct * 100).toFixed(1)}%
                      </td>
                      <td className={`py-2 pr-4 text-right font-medium ${isFuture ? 'text-gray-400' : trade?.win ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isFuture ? '' : trade ? (trade.win ? '승' : '패') : '-'}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
