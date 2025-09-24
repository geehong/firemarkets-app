import React, { useState, useEffect } from 'react';
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';

const PostgreSQLFeatures = () => {
  const [performanceData, setPerformanceData] = useState([]);
  const [queryStats, setQueryStats] = useState({});

  // PostgreSQL vs MySQL 성능 비교 데이터 시뮬레이션
  useEffect(() => {
    const generatePerformanceData = () => {
      const now = Date.now();
      const data = [];
      
      for (let i = 0; i < 20; i++) {
        const timestamp = now - (19 - i) * 60000; // 1분 간격
        
        // PostgreSQL이 일반적으로 더 나은 성능을 보이도록 시뮬레이션
        const mysqlQueryTime = Math.random() * 50 + 20; // 20-70ms
        const postgresQueryTime = Math.random() * 30 + 10; // 10-40ms (더 빠름)
        
        data.push({
          timestamp,
          mysql: mysqlQueryTime,
          postgres: postgresQueryTime
        });
      }
      
      setPerformanceData(data);
    };

    generatePerformanceData();
    const interval = setInterval(generatePerformanceData, 5000); // 5초마다 업데이트
    
    return () => clearInterval(interval);
  }, []);

  // 쿼리 통계 시뮬레이션
  useEffect(() => {
    const updateQueryStats = () => {
      setQueryStats({
        concurrentConnections: Math.floor(Math.random() * 100) + 50,
        queriesPerSecond: Math.floor(Math.random() * 1000) + 500,
        avgResponseTime: (Math.random() * 20 + 5).toFixed(2),
        activeTransactions: Math.floor(Math.random() * 50) + 10,
        cacheHitRatio: (Math.random() * 10 + 90).toFixed(1), // 90-100%
        indexUsage: (Math.random() * 15 + 85).toFixed(1) // 85-100%
      });
    };

    updateQueryStats();
    const interval = setInterval(updateQueryStats, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // 성능 비교 차트 옵션
  const performanceChartOptions = {
    title: {
      text: 'Query Performance Comparison (PostgreSQL vs MySQL)',
      style: { color: '#ffffff' }
    },
    chart: {
      backgroundColor: '#1a1a1a',
      style: { fontFamily: 'Inter, sans-serif' }
    },
    xAxis: {
      type: 'datetime',
      labels: { style: { color: '#a0a0a0' } },
      gridLineColor: '#333333'
    },
    yAxis: {
      title: { text: 'Query Time (ms)', style: { color: '#a0a0a0' } },
      labels: { style: { color: '#a0a0a0' } },
      gridLineColor: '#333333'
    },
    series: [
      {
        name: 'MySQL',
        data: performanceData.map(d => [d.timestamp, d.mysql]),
        color: '#ff6b6b',
        lineWidth: 2
      },
      {
        name: 'PostgreSQL',
        data: performanceData.map(d => [d.timestamp, d.postgres]),
        color: '#4ecdc4',
        lineWidth: 2
      }
    ],
    legend: {
      itemStyle: { color: '#ffffff' }
    },
    tooltip: {
      backgroundColor: '#2d2d2d',
      style: { color: '#ffffff' }
    }
  };

  // PostgreSQL 특성 카드들
  const features = [
    {
      title: 'ACID Compliance',
      description: '완전한 ACID 트랜잭션 지원',
      icon: '🔒',
      color: '#4ecdc4'
    },
    {
      title: 'JSON Support',
      description: '네이티브 JSON/JSONB 데이터 타입',
      icon: '📄',
      color: '#45b7d1'
    },
    {
      title: 'Advanced Indexing',
      description: 'B-tree, Hash, GIN, GiST 등 다양한 인덱스',
      icon: '🔍',
      color: '#96ceb4'
    },
    {
      title: 'Full-Text Search',
      description: '강력한 전문 검색 기능',
      icon: '🔎',
      color: '#feca57'
    },
    {
      title: 'Extensibility',
      description: 'PL/pgSQL, Python, JavaScript 등 확장 가능',
      icon: '⚡',
      color: '#ff9ff3'
    },
    {
      title: 'Replication',
      description: 'Streaming, Logical 복제 지원',
      icon: '🔄',
      color: '#54a0ff'
    }
  ];

  return (
    <div>
      {/* PostgreSQL 성능 비교 차트 */}
      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">PostgreSQL Performance Advantages</CCardTitle>
        </CCardHeader>
        <CCardBody>
          <div style={{ height: '400px' }}>
            <HighchartsReact
              highcharts={Highcharts}
              options={performanceChartOptions}
            />
          </div>
        </CCardBody>
      </CCard>

      {/* 실시간 PostgreSQL 통계 */}
      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">PostgreSQL Real-time Statistics</CCardTitle>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={2} className="text-center">
              <div style={{ fontSize: '2rem', color: '#4ecdc4' }}>
                {queryStats.concurrentConnections}
              </div>
              <div style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                Concurrent Connections
              </div>
            </CCol>
            <CCol md={2} className="text-center">
              <div style={{ fontSize: '2rem', color: '#45b7d1' }}>
                {queryStats.queriesPerSecond}
              </div>
              <div style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                Queries/Second
              </div>
            </CCol>
            <CCol md={2} className="text-center">
              <div style={{ fontSize: '2rem', color: '#96ceb4' }}>
                {queryStats.avgResponseTime}ms
              </div>
              <div style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                Avg Response Time
              </div>
            </CCol>
            <CCol md={2} className="text-center">
              <div style={{ fontSize: '2rem', color: '#feca57' }}>
                {queryStats.activeTransactions}
              </div>
              <div style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                Active Transactions
              </div>
            </CCol>
            <CCol md={2} className="text-center">
              <div style={{ fontSize: '2rem', color: '#ff9ff3' }}>
                {queryStats.cacheHitRatio}%
              </div>
              <div style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                Cache Hit Ratio
              </div>
            </CCol>
            <CCol md={2} className="text-center">
              <div style={{ fontSize: '2rem', color: '#54a0ff' }}>
                {queryStats.indexUsage}%
              </div>
              <div style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                Index Usage
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* PostgreSQL 특성 카드들 */}
      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">PostgreSQL Key Features</CCardTitle>
        </CCardHeader>
        <CCardBody>
          <CRow>
            {features.map((feature, index) => (
              <CCol key={index} md={4} className="mb-3">
                <div 
                  style={{ 
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: '#2d2d2d',
                    border: `2px solid ${feature.color}`,
                    height: '100%'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
                    {feature.icon}
                  </div>
                  <h5 style={{ color: feature.color, marginBottom: '10px' }}>
                    {feature.title}
                  </h5>
                  <p style={{ color: '#a0a0a0', margin: 0 }}>
                    {feature.description}
                  </p>
                </div>
              </CCol>
            ))}
          </CRow>
        </CCardBody>
      </CCard>

      {/* PostgreSQL vs MySQL 비교 테이블 */}
      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">PostgreSQL vs MySQL Comparison</CCardTitle>
        </CCardHeader>
        <CCardBody>
          <div className="table-responsive">
            <table className="table table-dark">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>PostgreSQL</th>
                  <th>MySQL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ACID Compliance</td>
                  <td><span style={{ color: '#4ecdc4' }}>✅ Full ACID</span></td>
                  <td><span style={{ color: '#ff6b6b' }}>⚠️ Storage Engine Dependent</span></td>
                </tr>
                <tr>
                  <td>JSON Support</td>
                  <td><span style={{ color: '#4ecdc4' }}>✅ Native JSON/JSONB</span></td>
                  <td><span style={{ color: '#ff6b6b' }}>⚠️ JSON Functions Only</span></td>
                </tr>
                <tr>
                  <td>Data Types</td>
                  <td><span style={{ color: '#4ecdc4' }}>✅ 50+ Built-in Types</span></td>
                  <td><span style={{ color: '#feca57' }}>⚡ Standard Types</span></td>
                </tr>
                <tr>
                  <td>Indexing</td>
                  <td><span style={{ color: '#4ecdc4' }}>✅ Advanced (GIN, GiST, etc.)</span></td>
                  <td><span style={{ color: '#feca57' }}>⚡ B-tree, Hash</span></td>
                </tr>
                <tr>
                  <td>Full-Text Search</td>
                  <td><span style={{ color: '#4ecdc4' }}>✅ Built-in FTS</span></td>
                  <td><span style={{ color: '#ff6b6b' }}>❌ Limited</span></td>
                </tr>
                <tr>
                  <td>Extensibility</td>
                  <td><span style={{ color: '#4ecdc4' }}>✅ Highly Extensible</span></td>
                  <td><span style={{ color: '#feca57' }}>⚡ Plugin System</span></td>
                </tr>
                <tr>
                  <td>Performance</td>
                  <td><span style={{ color: '#4ecdc4' }}>✅ Complex Queries</span></td>
                  <td><span style={{ color: '#feca57' }}>⚡ Simple Queries</span></td>
                </tr>
                <tr>
                  <td>Standards Compliance</td>
                  <td><span style={{ color: '#4ecdc4' }}>✅ SQL:2016 Compliant</span></td>
                  <td><span style={{ color: '#feca57' }}>⚡ SQL:2003 Compliant</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CCardBody>
      </CCard>
    </div>
  );
};

export default PostgreSQLFeatures;













