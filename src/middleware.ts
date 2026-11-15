import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedAdminRoutes = ['/admin'];
const protectedStudentRoutes = ['/portal/siswa'];

// Roles allowed to access admin routes
const adminRoles = ['Super Admin', 'Panitia PPDB', 'Verifikator PPDB', 'Admin BKK', 'BKK', 'Guru'];
const studentAllowedRoles = ['Siswa', 'Super Admin', 'Guru'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authToken = request.cookies.get('auth_token')?.value;

  // 1. Check if the route is student portal
  const isStudentRoute = protectedStudentRoutes.some(route => pathname.startsWith(route));
  if (isStudentRoute) {
    if (!authToken || !studentAllowedRoles.includes(authToken)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Check if the route is admin
  const isAdminRoute = protectedAdminRoutes.some(route => pathname.startsWith(route));
  if (isAdminRoute) {
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
  matcher: ['/admin/:path*', '/portal/siswa/:path*'],
};
