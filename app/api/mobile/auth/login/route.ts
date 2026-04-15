/**
 * app/api/mobile/auth/login/route.ts
 *
 * Mobile-only login endpoint.
 *
 * POST /api/mobile/auth/login
 * Body: { email: string, password: string }
 * Returns: { token: string, user: { id, email, name } }
 *
 * Validates credentials against the User collection using bcryptjs,
 * then mints a 30-day HS256 JWT signed with AUTH_SECRET. The mobile
 * app stores this token in SecureStore and passes it as
 * `Authorization: Bearer <token>` on every subsequent request.
 *
 * The JWT payload mirrors what `getUser()` in lib/getUser.ts expects:
 *   { id, email, name }
 */

export const dynamic = 'force-dynamic';

import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';

/** Encode AUTH_SECRET into a Uint8Array for jose */
const getSecret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET ?? 'missing-secret');

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 });
  }

  await connectDB();

  /* Find user by email (case-insensitive — emails are stored lowercase) */
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.password) {
    // Return a generic message to avoid user-enumeration attacks
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  /* Verify the plaintext password against the stored bcrypt hash */
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  /* Mint a 30-day JWT for the mobile app */
  const userId = (user._id as { toString(): string }).toString();
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  const token = await new SignJWT({ id: userId, email: user.email, name: fullName })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());

  return Response.json({
    token,
    user: { id: userId, email: user.email, name: fullName },
  });
}
