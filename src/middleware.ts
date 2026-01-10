
import { NextResponse, type NextRequest } from 'next/server';
import { getUser } from '@/lib/auth';

export async function middleware(req: NextRequest) {
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

  // If the user IS authenticated and tries to visit an auth page,
  // redirect them to their correct dashboard.
  if (isAuth && isAuthRoute) {
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
