/**
 * Next.js Middleware
 * Handles authentication and route protection
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const userId = request.cookies.get('mt_user_id')?.value
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth']

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Redirect to home if not authenticated and trying to access protected route
  if (!userId && !isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect to dashboard if authenticated and on home page
  if (userId && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
