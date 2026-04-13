export const dynamic = 'force-dynamic';

import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      provider: 'credentials',
    });

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
