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
  const { name, currentPassword, newPassword } = body;

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  if (name) {
    user.name = name.trim();
  }

  if (newPassword) {
    if (!currentPassword) return Response.json({ error: 'Current password required' }, { status: 400 });
    if (user.provider !== 'credentials') return Response.json({ error: 'Password change not available for OAuth accounts' }, { status: 400 });
    if (!user.password) return Response.json({ error: 'No password set on this account' }, { status: 400 });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
    if (newPassword.length < 8) return Response.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    user.password = await bcrypt.hash(newPassword, 12);
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
