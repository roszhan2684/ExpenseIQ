export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { Transaction } from '@/lib/models/Transaction';
import { UserSettings } from '@/lib/models/UserSettings';
import bcrypt from 'bcryptjs';

// Update name or password
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, newPassword } = body;

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  if (name) {
    user.name = name.trim();
  }

  if (newPassword) {
    if (!body.otp) return Response.json({ error: 'Verification code required' }, { status: 400 });
    if (user.provider !== 'credentials') return Response.json({ error: 'Password change not available for OAuth accounts' }, { status: 400 });
    if (!user.password) return Response.json({ error: 'No password set on this account' }, { status: 400 });

    // Verify OTP
    if (!user.otp || !user.otpExpiry) return Response.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
    if (new Date() > user.otpExpiry) return Response.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    if (user.otp !== body.otp) return Response.json({ error: 'Invalid verification code.' }, { status: 400 });

    if (newPassword.length < 8) return Response.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    user.password = await bcrypt.hash(newPassword, 12);
    user.otp = undefined;
    user.otpExpiry = undefined;
  }

  await user.save();
  return Response.json({ success: true, name: user.name });
}

// Delete account
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  await Promise.all([
    User.findByIdAndDelete(session.user.id),
    Transaction.deleteMany({ userId: session.user.id }),
    UserSettings.findOneAndDelete({ userId: session.user.id }),
  ]);

  return Response.json({ success: true });
}
