import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  // Always allow join routes
  if (path.startsWith('/join')) {
    return res;
  }

  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Handle root path
  if (path === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return res;
  }

  // Protect dashboard routes
  if (path.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    // Check if email is verified - get it from user metadata
    const isEmailVerified = session.user.user_metadata?.email_verified === true;
    
    // Debug: log verification status and path
    console.log(`User ${session.user.email} verification status: ${isEmailVerified}`);
    console.log(`Current path: ${path}`);
    
    // If not verified and not already on the verify-email page, redirect to verification
    if (!isEmailVerified && !path.startsWith('/dashboard/verify-email')) {
      console.log('Redirecting to verification page');
      return NextResponse.redirect(new URL('/dashboard/verify-email', req.url))
    }
  }

  // Special handling for verify-email page
  if (path === '/dashboard/verify-email') {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    // If email is already verified, redirect to dashboard
    const isEmailVerified = session.user.user_metadata?.email_verified === true;
    if (isEmailVerified) {
      console.log('User already verified, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Handle auth routes
  if (path === '/login' || path === '/register') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 