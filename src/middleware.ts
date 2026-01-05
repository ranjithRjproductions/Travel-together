
import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session')?.value;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password');
  const isPublicRoute = pathname === '/';
  const isProtectedRoute = !isAuthRoute && !isPublicRoute;

  // If there's no session cookie
  if (!sessionCookie) {
    // and the user is trying to access a protected route, redirect to login.
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Otherwise, allow access to public and auth routes.
    return NextResponse.next();
  }

  // If there IS a session cookie
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = decodedClaims.role;
    const isAdmin = decodedClaims.isAdmin;

    let dashboardUrl = '/traveler/dashboard'; // Default dashboard
    if (isAdmin) {
      dashboardUrl = '/admin';
    } else if (role === 'Guide') {
      dashboardUrl = '/guide/dashboard';
    }

    // If a logged-in user tries to access an auth route OR the public home page,
    // redirect them to their correct dashboard.
    if (isAuthRoute || isPublicRoute) {
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }

    // Allow access to protected routes.
    return NextResponse.next();

  } catch (error) {
    // If the cookie is invalid (expired, etc.), clear it and redirect to login.
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('session', '', { maxAge: 0, path: '/' });
    return response;
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
