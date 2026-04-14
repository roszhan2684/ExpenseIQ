export const dynamic = 'force-dynamic';

import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { generateOTP, sendOTPEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email, firstName } = await request.json();
    if (!email || !firstName) {
      return Response.json({ error: 'Email and first name are required' }, { status: 400 });
    }

    await connectDB();

    // Check if email is already registered and verified
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing?.isVerified) {
      return Response.json({ error: 'Email is already registered' }, { status: 409 });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP (upsert pending user)
    await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { otp, otpExpiry } },
      { upsert: false }
    );

    // If no user doc yet, we just store the OTP in a temp way via a pending field
    // We'll create the full user on verify
    if (!existing) {
      // Store OTP temporarily — will be wiped after verification
      await User.create({
        firstName: firstName.trim(),
        lastName: '',
        email: email.toLowerCase(),
        provider: 'credentials',
        isVerified: false,
        otp,
        otpExpiry,
      });
    } else {
      await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { $set: { otp, otpExpiry } }
      );
    }

    await sendOTPEmail(email, otp, firstName);
    return Response.json({ success: true });
  } catch (err) {
    console.error('send-otp error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to send OTP';
    return Response.json({ error: msg }, { status: 500 });
  }
}
