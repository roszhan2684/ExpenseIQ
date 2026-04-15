export const dynamic = 'force-dynamic';

import { getUser } from '@/lib/getUser';
import { connectDB } from '@/lib/db';
import { UserSettings } from '@/lib/models/UserSettings';

export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const settings = await UserSettings.findOne({ userId: user.id }).lean();

  return Response.json(
    settings ?? { currency: 'USD', customCategories: [], budgets: [], theme: 'system' }
  );
}

export async function PUT(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  await connectDB();

  const updated = await UserSettings.findOneAndUpdate(
    { userId: user.id },
    { $set: body },
    { upsert: true, new: true }
  );

  return Response.json(updated);
}
