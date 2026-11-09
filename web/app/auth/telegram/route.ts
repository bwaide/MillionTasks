/**
 * Telegram Auth Callback Route
 * Handles magic link authentication from Telegram
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink, authenticateWithTelegram } from '@/lib/auth/telegram'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/auth/error?message=Missing token', request.url))
  }

  // Verify the magic link token
  const { telegram_id, error: verifyError } = await verifyMagicLink(token)

  console.log('Magic link verification:', { telegram_id, verifyError })

  if (verifyError || !telegram_id) {
    return NextResponse.redirect(
      new URL(`/auth/error?message=${verifyError || 'Invalid token'}`, request.url)
    )
  }

  // Authenticate with Telegram ID
  console.log('Authenticating with telegram_id:', telegram_id)
  const { user, error: authError } = await authenticateWithTelegram({
    telegram_id,
  })

  console.log('Authentication result:', { user: user?.id, error: authError })

  if (authError || !user) {
    return NextResponse.redirect(
      new URL(`/auth/error?message=${authError || 'Authentication failed'}`, request.url)
    )
  }

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set('mt_user_id', user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  // Redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
