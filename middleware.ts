import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Redirect authenticated users away from login/register
  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Redirect root to dashboard if logged in, else to landing
  if (pathname === '/') {
    if (isLoggedIn) return NextResponse.redirect(new URL('/dashboard', req.url));
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
