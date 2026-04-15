export const dynamic = 'force-dynamic';

import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { generateOTP, sendPasswordResetOTP } from '@/lib/email';

export async function POST(request: Request) {
  let body: { email?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

  try {
    await connectDB();
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration — but only send if user exists
    if (user && user.provider === 'credentials' && user.isVerified) {
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await user.save();
      await sendPasswordResetOTP(email, otp, user.firstName);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('[forgot-password]', err);
    return Response.json({ error: 'Failed to send reset code' }, { status: 500 });
  }
}
