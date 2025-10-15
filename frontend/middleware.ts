import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 보호된 경로들
const protectedPaths = ['/admin']

// 공개 경로들 (인증이 필요하지 않은 경로)
const publicPaths = ['/signin', '/admin-signin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 정적 파일이나 API 라우트는 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 보호된 경로인지 확인
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtectedPath) {
    // 세션 쿠키 확인
    const sessionCookie = request.cookies.get('session')
    
    if (!sessionCookie) {
      // 세션이 없으면 로그인 페이지로 리다이렉트
      const signinUrl = new URL('/signin', request.url)
      signinUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(signinUrl)
    }
    
    // 세션이 있으면 JWT 토큰 검증 (선택적)
    try {
      // 여기서 JWT 토큰을 검증할 수 있지만, 
      // 현재는 쿠키 존재 여부만 확인
      return NextResponse.next()
    } catch (error) {
      // 토큰이 유효하지 않으면 로그인 페이지로 리다이렉트
      const signinUrl = new URL('/signin', request.url)
      signinUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(signinUrl)
    }
  }

  // 공개 경로이거나 보호되지 않은 경로는 그대로 진행
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
