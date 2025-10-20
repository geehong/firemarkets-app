import { NextResponse } from 'next/server'

export async function GET() {
  // 벡터맵 라이브러리의 /map 요청에 대한 폴백 응답
  return NextResponse.json({ 
    message: 'Map fallback endpoint',
    status: 'ok' 
  })
}
