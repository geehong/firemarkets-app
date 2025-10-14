"use client"

import React, { useMemo, useState } from 'react'

export type TableRow = Record<string, unknown>

export type TableColumn<T extends TableRow> = {
  key: keyof T | string
  header: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (row: T) => React.ReactNode
  className?: string
  sortable?: boolean
}

export type Pagination = {
  page: number
  pageSize: number
}

export type SortState = {
  key: string | null
  direction: 'asc' | 'desc'
}

interface TableBaseProps<T extends TableRow> {
  columns: TableColumn<T>[]
  rows: T[]
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  skeletonRows?: number
  initialPageSize?: number
  className?: string
  zebra?: boolean
  stickyHeader?: boolean
  dense?: boolean
}

export default function TableBase<T extends TableRow>({
  columns,
  rows,
  loading = false,
  error = null,
  emptyMessage = 'No data',
  skeletonRows = 8,
  initialPageSize = 10,
  className,
  zebra = true,
  stickyHeader = true,
  dense = false,
}: TableBaseProps<T>) {
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: initialPageSize })
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' })

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows
    const key = sort.key as keyof T
    const arr = [...rows]
    arr.sort((a, b) => {
      const av = (a?.[key] as any)
      const bv = (b?.[key] as any)
      if (av == null && bv == null) return 0
      if (av == null) return sort.direction === 'asc' ? -1 : 1
      if (bv == null) return sort.direction === 'asc' ? 1 : -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.direction === 'asc' ? av - bv : bv - av
      }
      const as = String(av)
      const bs = String(bv)
      return sort.direction === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
    return arr
  }, [rows, sort])

  const pagedRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize
    return sortedRows.slice(start, start + pagination.pageSize)
  }, [sortedRows, pagination])

  const totalPages = Math.max(1, Math.ceil(rows.length / pagination.pageSize))

  const handleSort = (col: TableColumn<T>) => {
    if (!col.sortable) return
    const key = String(col.key)
    setSort(prev => {
      if (prev.key !== key) return { key, direction: 'asc' }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
    })
    setPagination(p => ({ ...p, page: 1 }))
  }

  if (loading) {
    return (
      <div className={`w-full rounded-md border border-gray-200 bg-white p-4 ${className ?? ''}`}>
        <div className="animate-pulse space-y-2">
          {[...Array(skeletonRows)].map((_, i) => (
            <div key={i} className="h-5 w-full rounded bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`w-full rounded-md border border-red-200 bg-red-50 p-4 text-red-700 ${className ?? ''}`}>
        {error}
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div className={`w-full rounded-md border border-gray-200 bg-white p-6 text-center text-gray-500 ${className ?? ''}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`w-full rounded-md border border-gray-200 bg-white ${className ?? ''}`}>
      <div className="overflow-x-auto">
        <table className={`min-w-full ${dense ? 'text-sm' : 'text-[15px]'}`}>
          <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} bg-gray-50`}>
            <tr>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-left font-semibold text-gray-700 ${col.className ?? ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1 cursor-pointer select-none">
                    {col.header}
                    {sort.key === String(col.key) && (
                      <span className="text-gray-400">{sort.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagedRows.map((row, idx) => (
              <tr key={idx} className={`${zebra && idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                {columns.map(col => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {col.render ? col.render(row) : String((row as any)[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="text-sm text-gray-600">
          Page {pagination.page} / {totalPages} • {rows.length} rows
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => setPagination(p => ({ ...p, page: 1 }))}
            disabled={pagination.page === 1}
          >First</button>
          <button
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
            disabled={pagination.page === 1}
          >Prev</button>
          <button
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
            disabled={pagination.page === totalPages}
          >Next</button>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={pagination.pageSize}
            onChange={e => setPagination({ page: 1, pageSize: Number(e.target.value) })}
          >
            {[10, 25, 50, 100, 200, 500, 1000].map(s => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}


