import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { Transaction } from '@/lib/models/Transaction';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const tx = await Transaction.findOneAndDelete({ _id: id, userId: session.user.id });
  if (!tx) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ success: true });
}
