import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { UserSettings } from '@/lib/models/UserSettings';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const settings = await UserSettings.findOne({ userId: session.user.id }).lean();

  return Response.json(
    settings ?? { currency: 'USD', customCategories: [], budgets: [], theme: 'system' }
  );
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  await connectDB();

  const updated = await UserSettings.findOneAndUpdate(
    { userId: session.user.id },
    { $set: body },
    { upsert: true, new: true }
  );

  return Response.json(updated);
}
