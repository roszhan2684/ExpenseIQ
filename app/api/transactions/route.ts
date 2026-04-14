export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { Transaction } from '@/lib/models/Transaction';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month'); // 0-indexed

  await connectDB();

  let query: Record<string, unknown> = { userId: session.user.id };

  if (year && month !== null) {
    const m = parseInt(month);
    const y = parseInt(year);
    // Date range for the month
    const start = new Date(y, m, 1).toISOString().slice(0, 10);
    const end = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    query = { ...query, date: { $gte: start, $lte: end } };
  }

  const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 }).lean();

  return Response.json(
    transactions.map((t) => ({
      id: t._id.toString(),
      amount: t.amount,
      description: t.description,
      category: t.category,
      date: t.date,
      type: t.type ?? 'expense',
      source: t.source ?? 'manual',
      pending: t.pending ?? false,
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { amount, description, category, date, type } = body;

  if (!amount || !description || !category || !date) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await connectDB();

  const tx = await Transaction.create({
    userId: session.user.id,
    amount: parseFloat(amount),
    description,
    category,
    date,
    type: type === 'income' ? 'income' : 'expense',
  });

  return Response.json(
    { id: tx._id.toString(), amount: tx.amount, description, category, date, type: tx.type },
    { status: 201 }
  );
}
