export const dynamic = 'force-dynamic';

import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  let body: { email?: string; otp?: string; newPassword?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const { otp, newPassword } = body;

  if (!email || !otp || !newPassword) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    await connectDB();
    const user = await User.findOne({ email });

    if (!user || user.provider !== 'credentials') {
      return Response.json({ error: 'No account found with this email' }, { status: 404 });
    }

    // Validate OTP
    if (!user.otp || user.otp !== otp) {
      return Response.json({ error: 'Invalid code. Please check and try again.' }, { status: 400 });
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return Response.json({ error: 'Code has expired. Request a new one.' }, { status: 400 });
    }

    // Hash new password and clear OTP
    user.password = await bcrypt.hash(newPassword, 12);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    return Response.json({ success: true });
  } catch (err) {
    console.error('[reset-password]', err);
    return Response.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
