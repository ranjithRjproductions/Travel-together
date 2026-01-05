
import { NextResponse, type NextRequest } from 'next/server';
import { getUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await getUser();

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password');
  const isPublicRoute = pathname === '/';

  // If user is logged in
  if (user) {
    // If they are on an auth route or the homepage, redirect them to their appropriate dashboard
    if (isAuthRoute || isPublicRoute) {
      let redirectUrl = '/traveler/dashboard'; // Default
      if (user.role === 'Guide') {
        redirectUrl = '/guide/dashboard';
      } else if (user.role === 'Admin') {
        redirectUrl = '/admin';
      }
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  } 
  // If user is NOT logged in
  else {
    // If they try to access a protected route, redirect to login
    const isProtectedRoute = !isAuthRoute && !isPublicRoute;
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
