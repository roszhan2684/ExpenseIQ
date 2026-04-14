export const dynamic = 'force-dynamic';

import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, password, dateOfBirth, mobileNumber, otp } = await request.json();

    if (!firstName || !lastName || !email || !password || !otp) {
      return Response.json({ error: 'All required fields must be filled' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await connectDB();

    const pendingUser = await User.findOne({ email: email.toLowerCase() });

    if (!pendingUser) {
      return Response.json({ error: 'Please request an OTP first' }, { status: 400 });
    }

    if (pendingUser.isVerified) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Verify OTP
    if (pendingUser.otp !== otp) {
      return Response.json({ error: 'Invalid OTP code' }, { status: 400 });
    }
    if (!pendingUser.otpExpiry || pendingUser.otpExpiry < new Date()) {
      return Response.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);

    await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password: hashed,
          dateOfBirth: dateOfBirth || undefined,
          mobileNumber: mobileNumber?.trim() || undefined,
          provider: 'credentials',
          isVerified: true,
          otp: undefined,
          otpExpiry: undefined,
        },
      }
    );

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
