import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  const userId = request.cookies.get('dashboard_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  const data = await loadData(userId);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _googleTokens: _, ...rest } = data as Record<string, unknown>;
  await saveData(userId, rest);
  return NextResponse.json({ ok: true });
}
