
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie =
    request.cookies.get('__session') ||
    request.cookies.get('session');

  const isLoggedIn = Boolean(sessionCookie);

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password');

  const isPublicRoute = pathname === '/';

  // If user is logged in, redirect them away from public/auth pages.
  // The protected layouts will handle the final role-based view.
  if (isLoggedIn && (isAuthRoute || isPublicRoute)) {
    // Redirect to a neutral path that protected layouts will resolve.
    // The traveler layout will handle the redirect to the correct dashboard if the role is not traveler.
    return NextResponse.redirect(new URL('/traveler/dashboard', request.url));
  }

  // If user is not logged in, they can only access public and auth routes.
  // Any other route is protected and will redirect to login.
  if (!isLoggedIn && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // This matcher ensures the middleware runs on all routes except for static assets and API routes.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
