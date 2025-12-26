import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('session');

  // Allow POST requests to login/signup to pass through without checks.
  // This prevents the middleware from interfering with the server actions that create the session.
  if (request.method === 'POST' && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.next();
  }

  const isPublicRoute =
    pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isProtectedRoute = pathname.startsWith('/traveler') || pathname.startsWith('/guide');

  // --- Case 1: No session cookie ---
  if (!session?.value) {
    if (isProtectedRoute) {
      // Redirect unauthenticated users from protected routes to the login page.
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Allow access to public routes.
    return NextResponse.next();
  }

  // --- Case 2: Session cookie exists ---
  // If user has a session and is trying to access a public route,
  // redirect them to a neutral dashboard. The layout will then handle role-specific redirect.
  if (isPublicRoute) {
    return NextResponse.redirect(new URL('/traveler/dashboard', request.url));
  }
  
  // For all other cases (e.g., accessing a protected route with a session cookie),
  // let the request proceed. The final role validation will happen in the page/layout.
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
