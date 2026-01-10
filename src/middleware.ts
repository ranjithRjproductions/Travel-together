
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminServices } from '@/lib/firebase-admin';
import { getUser } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  // NOTE: Per docs/REDIRECT_CONTRACT.md, this middleware is for simple routing.
  // It handles redirects for logged-in users away from public/auth pages and
  // unauthenticated users away from most protected routes.
  // Complex role-based gating is handled in the respective server component layouts.
  const { pathname } = req.nextUrl;

  // Explicitly bypass all API routes and static assets to prevent interference.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png')
  ) {
    return NextResponse.next();
  }

  const user = await getUser();
  const isAuth = !!user;

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password');
  
  const isPublicRoute = pathname === '/';

  // If user is not authenticated and trying to access a protected route, redirect to login.
  if (!isAuth && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If the user IS authenticated and tries to visit an auth page OR the public homepage,
  // redirect them to their correct dashboard.
  if (isAuth && (isAuthRoute || isPublicRoute)) {
    let dashboardUrl = '/traveler/dashboard'; // Default
    if (user.isAdmin) {
        dashboardUrl = '/admin';
    } else if (user.role === 'Guide') {
        dashboardUrl = '/guide/dashboard';
    }
    return NextResponse.redirect(new URL(dashboardUrl, req.url));
  }

  // Otherwise, allow the request to proceed.
  return NextResponse.next();
}

export const config = {
  // This matcher ensures the middleware runs on all routes except for static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.json).*)'],
};
