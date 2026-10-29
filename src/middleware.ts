import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/admin'];

// Roles allowed to access admin routes
const adminRoles = ['Super Admin', 'Panitia PPDB', 'Verifikator PPDB', 'Admin BKK', 'BKK', 'Guru'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected) {
    const authToken = request.cookies.get('auth_token')?.value;

    // No auth cookie → redirect to login
    if (!authToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Not an admin / staff role → redirect to homepage
    if (!adminRoles.includes(authToken)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Role-based route restrictions
    const isPPDBPanitia = authToken === 'Panitia PPDB' || authToken === 'Verifikator PPDB';
    const isBKK = authToken === 'Admin BKK' || authToken === 'BKK';
    const isGuru = authToken === 'Guru';

    if (isPPDBPanitia && !pathname.startsWith('/admin/ppdb')) {
      return NextResponse.redirect(new URL('/admin/ppdb', request.url));
    }

    if (isBKK && !pathname.startsWith('/admin/bkk')) {
      return NextResponse.redirect(new URL('/admin/bkk/jobs', request.url));
    }

    if (isGuru) {
      const isAllowedForGuru = pathname.startsWith('/admin/cbt') || pathname.startsWith('/admin/tugas');
      if (!isAllowedForGuru) {
        return NextResponse.redirect(new URL('/portal/guru', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
