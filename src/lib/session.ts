// src/lib/session.ts
import 'server-only';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ENV } from '../config/env';
import { UnauthorizedError } from '@/middlewares/error-handler';
import type { UserRole } from '@/lib/prisma';

const secretKey = ENV.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_DURATION = '7d';

export interface SessionPayload extends JWTPayload {
  userId: string;
  role: UserRole;
  expiresAt: Date;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(encodedKey);
}

export async function decrypt(
  session: string | undefined,
): Promise<SessionPayload | null> {
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to verify session:', message);
    return null;
  }
}

export async function createSession(
  userId: string,
  role: UserRole,
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt({ userId, role, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function updateSession(): Promise<void> {
  const session = (await cookies()).get('session')?.value;
  const payload = await decrypt(session);

  if (!session || !payload) return;

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const cookieStore = await cookies();

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

// Throws UnauthorizedError - use in API route handlers
export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value;
  const session = await decrypt(cookie);

  if (!session || !session.userId) {
    throw new UnauthorizedError();
  }

  return {
    isAuth: true,
    userId: session.userId,
    role: session.role,
    isAdmin: session.role === 'ADMIN',
  };
});

// Redirects - use in Server Components and Server Actions
export const requireSession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value;
  const session = await decrypt(cookie);

  if (!session || !session.userId) {
    redirect('/login');
  }

  return {
    isAuth: true,
    userId: session.userId,
    role: session.role,
    isAdmin: session.role === 'ADMIN',
  };
});
