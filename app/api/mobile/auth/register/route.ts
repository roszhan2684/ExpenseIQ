/**
 * app/api/mobile/auth/register/route.ts
 *
 * Mobile-only registration endpoint.
 *
 * POST /api/mobile/auth/register
 * Body: { firstName: string, lastName?: string, email: string, password: string }
 * Returns: { token: string, user: { id, email, name } }
 *
 * Creates a new User document, hashes the password with bcrypt,
 * then immediately mints a 30-day JWT so the user is logged in after
 * registration — no separate login step needed on the mobile app.
 */

export const dynamic = 'force-dynamic';

import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';

const getSecret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET ?? 'missing-secret');

export async function POST(request: Request) {
  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { firstName, lastName = '', email, password } = body;

  /* Validate required fields */
  if (!firstName?.trim()) {
    return Response.json({ error: 'First name is required' }, { status: 400 });
  }
  if (!email?.trim()) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  await connectDB();

  /* Check for existing account */
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return Response.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  /* Hash password and create user */
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    provider: 'credentials',
    isVerified: false, // mobile users skip OTP for now
  });

  /* Mint JWT — same format as the login endpoint */
  const userId = (user._id as { toString(): string }).toString();
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  const token = await new SignJWT({ id: userId, email: user.email, name: fullName })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());

  return Response.json(
    { token, user: { id: userId, email: user.email, name: fullName } },
    { status: 201 },
  );
}
