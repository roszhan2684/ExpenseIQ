import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // NextAuth v5 renamed the cookie from "next-auth.session-token" to "authjs.session-token"
  const isSecure = request.nextUrl.protocol === 'https:';
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: isSecure
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token',
  });

  const isLoggedIn = !!token;

  // Redirect authenticated users away from login/register to dashboard
  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protect all /dashboard, /analytics, /ai-insights, /settings, /profile routes
  const protectedPrefixes = ['/dashboard', '/analytics', '/ai-insights', '/settings', '/profile'];
  if (!isLoggedIn && protectedPrefixes.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
