
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Explicitly bypass all API routes and static assets to prevent interference.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.txt') ||
    pathname.endsWith('.xml')
  ) {
    return NextResponse.next();
  }

  const session =
    req.cookies.get('session')?.value ||
    req.cookies.get('__session')?.value;

  const isAuth = !!session;

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password');
  
  const isPublicRoute = pathname === '/';

  // If the user is authenticated, prevent them from accessing auth routes.
  // Redirect them to a default dashboard. The layout for that dashboard
  // will handle the final role-based redirect.
  if (isAuth && isAuthRoute) {
    return NextResponse.redirect(new URL('/traveler/dashboard', req.url));
  }
  
  // If the user is not authenticated, protect all routes except the
  // main landing page and the authentication routes.
  if (!isAuth && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // If none of the above conditions are met, allow the request to proceed.
  return NextResponse.next();
}

export const config = {
  // This matcher ensures the middleware runs on all routes except for static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.json).*)'],
};
