'use client'

export default function AdminPage() {
  return (
    <div style={{
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        🔒 관리자 페이지
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
        관리자 페이지가 정상적으로 로드되었습니다!
      </p>
      <div style={{
        backgroundColor: '#dcfce7',
        padding: '1rem',
        borderRadius: '0.5rem'
      }}>
        <p style={{ color: '#166534', fontSize: '0.875rem' }}>
          ✅ 관리자 페이지 로드 성공!
        </p>
      </div>
    </div>
  )
}
