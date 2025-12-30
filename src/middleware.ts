import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('session');

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isPublicRoute = pathname === '/';
  const isProtectedRoute =
    pathname.startsWith('/traveler') || pathname.startsWith('/guide');

  // NOT LOGGED IN
  if (!session) {
    // Allow access to login/signup/home
    if (isAuthRoute || isPublicRoute) {
      return NextResponse.next();
    }

    // Block protected pages
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // LOGGED IN
  if (session) {
    // Prevent accessing auth pages again
    if (isAuthRoute || isPublicRoute) {
      return NextResponse.redirect(new URL('/traveler/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};