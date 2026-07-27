// src/proxy.ts
import { NextResponse } from 'next/server';
import { decrypt } from './lib/session';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/admin'];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );

  if (!isProtectedRoute) return NextResponse.next();

  const cookie = (await cookies()).get('session')?.value;

  const session = await decrypt(cookie);

  if (!session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // Customers have real sessions but never staff access.
  if (session.role === 'CUSTOMER') {
    return NextResponse.redirect(new URL('/account', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
