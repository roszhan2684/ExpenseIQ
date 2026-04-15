/**
 * lib/getUser.ts
 *
 * Unified auth helper that works for BOTH:
 *   - Web requests  → reads the NextAuth session cookie (via `auth()`)
 *   - Mobile requests → reads an `Authorization: Bearer <jwt>` header
 *
 * Every API route that the mobile app calls should use `getUser(request)`
 * instead of calling `auth()` directly, so that the mobile app and the
 * web app share a single backend without duplicating route handlers.
 *
 * Token format (mobile):
 *   HS256 JWT signed with process.env.AUTH_SECRET containing:
 *   { id: string, email: string, name: string, iat, exp }
 *
 * The mobile login endpoint (`/api/mobile/auth/login`) mints these tokens.
 */

import { auth } from '@/auth';
import { jwtVerify } from 'jose';

/** Canonical user shape returned to all API handlers */
export interface AppUser {
  id: string;
  email: string;
  name: string;
}

/** TextEncoder'd version of the auth secret used to verify mobile JWTs */
const getJwtSecret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET ?? 'missing-secret');

/**
 * Returns the authenticated user from either:
 *   1. `Authorization: Bearer <token>` header   (mobile app)
 *   2. NextAuth session cookie                   (web app)
 *
 * Returns `null` when neither source yields a valid identity.
 *
 * @param request  The incoming Request object (pass `request` from the route handler).
 *                 Optional — web-only callers can omit it.
 */
export async function getUser(request?: Request): Promise<AppUser | null> {
  /* ── 1. Mobile: Bearer JWT ───────────────────────────────────── */
  const authHeader = request?.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7); // strip "Bearer " prefix
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      if (typeof payload.id === 'string') {
        return {
          id: payload.id,
          email: (payload.email as string) ?? '',
          name: (payload.name as string) ?? '',
        };
      }
    } catch {
      // Token invalid or expired — fall through to session check
    }
  }

  /* ── 2. Web: NextAuth session cookie ─────────────────────────── */
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
  };
}
