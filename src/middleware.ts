
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // NOTE: Per docs/REDIRECT_CONTRACT.md, this middleware is for simple routing.
  // It handles redirects for logged-in users away from public/auth pages and
  // unauthenticated users away from most protected routes.
  // Complex role-based gating is handled in the respective server component layouts.
  const { pathname } = req.nextUrl;

  // Explicitly bypass all API routes to prevent interference.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for the session cookie.
  const session = req.cookies.get('session')?.value;
  const isAuth = !!session;

  // Define public auth routes.
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password');

  // Define other public routes, like the homepage.
  const isPublicRoute = pathname === '/';

  // If the user is not authenticated and is trying to access a protected route,
  // redirect them to the login page.
  if (!isAuth && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If the user is authenticated and tries to access an auth page (like login)
  // or the public homepage, redirect them to the root. The layouts will handle
  // routing them to their correct dashboard from there.
  if (isAuth && (isAuthRoute || isPublicRoute)) {
    return NextResponse.redirect(new URL('/traveler/dashboard', req.url));
  }

  // Otherwise, allow the request to proceed.
  return NextResponse.next();
}

export const config = {
  // This matcher ensures the middleware runs on all routes except for static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.json).*)'],
};
