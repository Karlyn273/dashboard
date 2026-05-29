import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow the login page and its API route
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  // Allow other API/auth routes (calendar OAuth, etc.)
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const auth = request.cookies.get('dashboard_auth')?.value;
  if (!auth) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|floral-bg.svg).*)'],
};
