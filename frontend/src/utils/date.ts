// 일관된 날짜 포맷팅 함수 (SSR/CSR 일관성 보장)
export const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  // 서버와 클라이언트에서 동일한 결과를 보장하기 위해 고정 포맷 사용
  return date.toISOString().split('T')[0] // YYYY-MM-DD 형식
}

// IPO 날짜 포맷팅 함수 (더 읽기 쉬운 형식)
export const formatIPODate = (dateString: string) => {
  const date = new Date(dateString)
  // 서버와 클라이언트에서 동일한 결과를 보장하기 위해 고정 포맷 사용
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 시간 포맷팅 함수 (SSR/CSR 일관성 보장)
export const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  // 서버와 클라이언트에서 동일한 결과를 보장하기 위해 고정 포맷 사용
  return date.toISOString().split('T')[1].split('.')[0] // HH:MM:SS 형식
}
