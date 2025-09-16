// frontend/src/views/assetslist/AssetsList.js
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'; // useSearchParams 추가 (useParams, useLocation 대신)
import { useReactTable, getCoreRowModel, flexRender, getPaginationRowModel } from '@tanstack/react-table';

import { CCard, CCardBody, CCardHeader, CCol, CRow, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react';

const AssetsList = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { type_name } = useParams();  // URL 파라미터에서 직접 type_name 가져오기

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (type_name) { // 쿼리 파라미터 type_name이 있을 경우
          params.type_name = type_name;
        }

        const response = await axios.get('/api/assets', { params });
        setAssets(response.data);
      } catch (err) {
        setError('자산 목록을 불러오는데 실패했습니다. 백엔드 서버를 확인해주세요.');
        console.error('API 호출 에러:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [type_name]); // type_name가 변경될 때 재호출

  const columns = useMemo(
    () => [
      {
        header: 'ID',
        accessorKey: 'asset_id',
      },
      {
        header: '티커',
        accessorKey: 'ticker',
      },
      {
        header: '이름',
        accessorKey: 'name',
        cell: info => (
          <span
            onClick={() => navigate(`/assetsdetail/${info.row.original.asset_id}`)}
            style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
          >
            {info.getValue()}
          </span>
        ),
      },
      {
        header: '유형',
        accessorKey: 'type_name',
      },
      {
        header: '거래소',
        accessorKey: 'exchange',
        cell: info => info.getValue() || '-',
      },
      {
        header: '통화',
        accessorKey: 'currency',
        cell: info => info.getValue() || '-',
      },
    ],
    [navigate]
  );

  const table = useReactTable({
    data: assets,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) return <p>자산 목록을 불러오는 중...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (assets.length === 0) return <p>등록된 자산이 없거나 해당 유형의 자산이 없습니다.</p>;

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>{type_name ? `${type_name} 자산 목록` : '모든 자산 목록'}</strong>
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive striped>
              <CTableHead>
                {table.getHeaderGroups().map(headerGroup => (
                  <CTableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
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
                {table.getRowModel().rows.map(row => (
                  <CTableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <CTableDataCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </CTableDataCell>
                    ))}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default AssetsList;
