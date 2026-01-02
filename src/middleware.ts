
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password');
  const isPublicRoute = pathname === '/';

  // If user has a session cookie
  if (sessionCookie) {
    // If they are on an auth route or the homepage, we can't know their role here,
    // so we'll let the page-level layouts handle the redirect to the correct dashboard.
    // However, for simplicity and to prevent flashes of content, we can redirect to a default dashboard
    // and let the layout correct it if needed.
    if (isAuthRoute || isPublicRoute) {
      return NextResponse.redirect(new URL('/traveler/dashboard', request.url));
    }
  } 
  // If user does NOT have a session cookie
  else {
    // If they try to access any protected route, redirect to login
    if (!isAuthRoute && !isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
