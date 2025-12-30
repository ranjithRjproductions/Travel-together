import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('session');

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isPublicRoute = pathname === '/';
  const isProtectedRoute = pathname.startsWith('/traveler') || pathname.startsWith('/guide');

  // If a session exists...
  if (session?.value) {
    // ...and the user is trying to access the login, signup, or home page...
    if (isAuthRoute || isPublicRoute) {
      // ...redirect them to their dashboard. This prevents logged-in users from seeing public/auth pages.
      return NextResponse.redirect(new URL('/traveler/dashboard', request.url));
    }
  }

  // If no session exists...
  if (!session?.value) {
    // ...and the user is trying to access a protected route...
    if (isProtectedRoute) {
      // ...redirect them to the login page.
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('message', 'You must be logged in to view this page.');
      return NextResponse.redirect(loginUrl);
    }
  }

  // For all other cases, allow the request to proceed.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
