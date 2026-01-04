
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password');
  const isPublicRoute = pathname === '/';
  const isProtectedRoute = !isAuthRoute && !isPublicRoute;

  // Case 1: User has a session cookie
  if (sessionCookie) {
    // If they are on an auth route (e.g., /login), redirect them away to a default dashboard.
    // The page-level layouts will then handle role-specific redirects if necessary (e.g., to /admin or /guide).
    if (isAuthRoute) {
      return NextResponse.redirect(new URL('/traveler/dashboard', request.url));
    }
  } 
  // Case 2: User does NOT have a session cookie
  else {
    // If they try to access any protected route, redirect them to the login page.
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If none of the above conditions are met, allow the request to proceed.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
