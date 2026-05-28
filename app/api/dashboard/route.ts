import { NextRequest, NextResponse } from 'next/server';
import { ensureTable, loadData, saveData } from '@/lib/db';

function getOrCreateUserId(request: NextRequest): [string, boolean] {
  const existing = request.cookies.get('dashboard_user_id')?.value;
  if (existing) return [existing, false];
  return [crypto.randomUUID(), true];
}

export async function GET(request: NextRequest) {
  await ensureTable();
  const [userId, isNew] = getOrCreateUserId(request);
  const data = await loadData(userId);
  const response = NextResponse.json({ data });
  if (isNew) {
    response.cookies.set('dashboard_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
      path: '/',
    });
  }
  return response;
}

export async function POST(request: NextRequest) {
  const [userId] = getOrCreateUserId(request);
  const body = await request.json();
  await saveData(userId, body.data ?? {});
  return NextResponse.json({ ok: true });
}
