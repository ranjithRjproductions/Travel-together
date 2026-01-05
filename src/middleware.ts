
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Attempt to get the session cookie.
  const session = req.cookies.get('session');
  const isAuth = Boolean(session);

  // Define public routes that do not require authentication.
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password');

  // If the user is authenticated and tries to access a public route,
  // redirect them to their respective dashboard. The layouts will handle role-based logic.
  if (isAuth && isPublicRoute) {
    // A generic redirect to a starting point for authenticated users.
    // The role-specific layout will handle the final destination.
    // Let's default to traveler dashboard as a safe entry, layouts will correct it.
    return NextResponse.redirect(new URL('/traveler/dashboard', req.url));
  }

  // If the user is not authenticated and tries to access a protected route,
  // redirect them to the login page.
  if (!isAuth && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Otherwise, allow the request to proceed.
  return NextResponse.next();
}

export const config = {
  // This matcher ensures the middleware runs on all routes except for static assets and API routes.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|manifest.json).*)'],
};
