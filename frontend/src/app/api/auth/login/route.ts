import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.firemarkets.net/api/v1'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      )
    }

    // 백엔드 인증 API 호출
    const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, message: errorData.detail || 'Login failed' },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (data.access_token && data.user) {
      // JWT 토큰 생성 (사용자 정보 포함)
      const token = jwt.sign(
        {
          userId: data.user.id,
          username: data.user.username,
          role: data.user.role,
          permissions: data.user.permissions,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      )

      // httpOnly 쿠키 설정
      const cookieStore = cookies()
      cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24시간
        path: '/',
      })

      return NextResponse.json({
        success: true,
        user: data.user,
        message: 'Login successful'
      })
    }

    return NextResponse.json(
      { success: false, message: 'Invalid response from server' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
