
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const session = req.cookies.get('session');
  const isAuth = Boolean(session);

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password');
  
  const isPublicRoute = pathname === '/';

  // Unauthenticated users trying to access protected routes are redirected to login.
  if (!isAuth && !isAuthPage && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Authenticated users trying to access auth pages or the public homepage are redirected to the root.
  // The root path will then be handled by the respective role-based layout, which will perform the final, correct redirect.
  if (isAuth && (isAuthPage || isPublicRoute)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
