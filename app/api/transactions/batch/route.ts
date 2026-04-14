export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { Transaction } from '@/lib/models/Transaction';

interface TxInput {
  date: string;
  description: string;
  amount: number;
  category: string;
  type?: 'income' | 'expense';
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { transactions } = body as { transactions: TxInput[] };

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return Response.json({ error: 'No transactions provided' }, { status: 400 });
  }

  await connectDB();

  const docs = transactions.map((tx) => ({
    userId: session.user.id,
    amount: Number(tx.amount),
    description: String(tx.description).trim(),
    category: String(tx.category),
    date: String(tx.date).slice(0, 10),
    type: tx.type === 'income' ? 'income' : 'expense',
  }));

  const created = await Transaction.insertMany(docs, { ordered: false });

  return Response.json(
    {
      count: created.length,
      transactions: created.map((t) => ({
        id: t._id.toString(),
        amount: t.amount,
        description: t.description,
        category: t.category,
        date: t.date,
        type: t.type ?? 'expense',
      })),
    },
    { status: 201 }
  );
}
