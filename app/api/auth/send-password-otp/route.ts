export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { generateOTP, sendPasswordChangeOTP } from '@/lib/email';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { currentPassword } = await request.json();
    if (!currentPassword) return Response.json({ error: 'Current password is required' }, { status: 400 });

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
    if (user.provider !== 'credentials') return Response.json({ error: 'Not available for OAuth accounts' }, { status: 400 });
    if (!user.password) return Response.json({ error: 'No password set on this account' }, { status: 400 });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return Response.json({ error: 'Current password is incorrect' }, { status: 400 });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendPasswordChangeOTP(user.email, otp, user.firstName);
    return Response.json({ success: true });
  } catch (err) {
    console.error('send-password-otp error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to send code';
    return Response.json({ error: msg }, { status: 500 });
  }
}
