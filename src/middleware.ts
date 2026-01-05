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

  // If user is logged in, redirect them away from public/auth pages to their dashboard.
  // The `getUser` function on the server will handle the role-specific redirect from there.
  if (isLoggedIn && (isAuthRoute || isPublicRoute)) {
    // Redirect to a neutral path that protected layouts will resolve.
    // Let's use /traveler/dashboard as the default and let the layouts handle final role-based redirects.
    // This avoids needing a generic /dashboard page.
    return NextResponse.redirect(new URL('/traveler/dashboard', request.url));
  }

  // Not logged-in users cannot access protected routes.
  if (!isLoggedIn && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
