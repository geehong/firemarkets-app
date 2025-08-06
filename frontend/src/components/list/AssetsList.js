// frontend/src/views/assetslist/AssetsList.js
import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
} from '@tanstack/react-table'

import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CButtonGroup,
  CFormSelect,
} from '@coreui/react'

const AssetsList = () => {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const typeNameFromQuery = searchParams.get('type_name')

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  })
  const [totalCount, setTotalCount] = useState(0)

  console.log('AssetsList Component Rendered. typeNameFromQuery:', typeNameFromQuery)

  useEffect(() => {
    const fetchAssets = async () => {
      console.log('fetchAssets called.')
      setLoading(true)
      setError(null)
      try {
        const params = {}
        if (typeNameFromQuery) {
          params.type_name = typeNameFromQuery
          console.log(`Filtering by type_name: ${typeNameFromQuery}`)
        } else {
          console.log('No type_name query parameter found. Fetching all assets.')
        }
        params.limit = pagination.pageSize
        params.offset = pagination.pageIndex * pagination.pageSize
        console.log('API Request Params:', params)

        const response = await axios.get('/api/v1/assets', { params })
        setAssets(response.data.data)
        setTotalCount(response.data.total_count)
      } catch (err) {
        setError('자산 목록을 불러오는데 실패했습니다. 백엔드 서버를 확인해주세요.')
        console.error('API 호출 에러:', err)
      } finally {
        setLoading(false)
        console.log('fetchAssets finished.')
      }
    }

    fetchAssets()
  }, [typeNameFromQuery, pagination.pageIndex, pagination.pageSize])

  const columns = useMemo(
    () => [
      // {
      //   header: 'ID',
      //   accessorKey: 'asset_id',
      // },
      {
        header: '티커',
        accessorKey: 'ticker',
      },
      {
        header: '이름',
        accessorKey: 'name',
        cell: (info) => {
          const asset = info.row.original
          const handleClick = () => {
            console.log(
              'Asset name clicked:',
              asset.name,
              'Asset ID:',
              asset.ticker,
              'Asset Type:',
              asset.type_name,
            )

            // 모든 자산 타입을 /overviews/ 경로로 이동
            navigate(`/overviews/${asset.ticker}`)
          }

          return (
            <span
              onClick={handleClick}
              style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
            >
              {info.getValue()}
            </span>
          )
        },
      },
      {
        header: '유형',
        accessorKey: 'type_name',
      },
      {
        header: '거래소',
        accessorKey: 'exchange',
        cell: (info) => info.getValue() || '-',
      },
      {
        header: '통화',
        accessorKey: 'currency',
        cell: (info) => info.getValue() || '-',
      },
    ],
    [navigate],
  )

  const table = useReactTable({
    data: assets,
    columns,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (loading) return <p>자산 목록을 불러오는 중...</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>
  if (assets.length === 0 && !loading)
    return <p>등록된 자산이 없거나 해당 유형의 자산이 없습니다.</p>

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>{typeNameFromQuery ? `${typeNameFromQuery}` : 'All Assets'}</strong>
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive striped className="mb-3">
              <CTableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <CTableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <CTableHeaderCell key={header.id} scope="col">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </CTableHeaderCell>
                    ))}
                  </CTableRow>
                ))}
              </CTableHead>
              <CTableBody>
                {table.getRowModel().rows.map((row) => (
                  <CTableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <CTableDataCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </CTableDataCell>
                    ))}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            <div className="d-flex justify-content-between align-items-right mt-3">
              <div className="d-flex align-items-right gap-2">
                <CFormSelect
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => {
                    table.setPageSize(Number(e.target.value))
                  }}
                  className="w-auto"
                >
                  {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </CFormSelect>
                <span className="text-sm text-gray-700"> Total {totalCount}</span>
              </div>
              <CButtonGroup>
                <CButton
                  color="primary"
                  variant="outline"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Prev
                </CButton>
                <CButton
                  color="primary"
                  variant="outline"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </CButton>
              </CButtonGroup>
              <span className="text-sm text-gray-700">
                Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default AssetsList
