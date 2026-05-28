import { NextRequest, NextResponse } from 'next/server';
import { ensureTable, loadData, saveData } from '@/lib/db';

function getOrCreateUserId(request: NextRequest): [string, boolean] {
  const existing = request.cookies.get('dashboard_user_id')?.value;
  if (existing) return [existing, false];
  return [crypto.randomUUID(), true];
}

export async function GET(request: NextRequest) {
  await ensureTable();
  const [userId] = getOrCreateUserId(request);
  const raw  = await loadData(userId);
  // Strip server-side-only fields before sending to the client
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _googleTokens: _, ...data } = raw as Record<string, unknown>;
  const response = NextResponse.json({ data });
  // Always refresh the cookie so sameSite=lax takes effect on existing sessions.
  // lax (not strict) is required so the cookie is sent when Google redirects back
  // during OAuth — strict blocks it on cross-site top-level navigations.
  response.cookies.set('dashboard_user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 * 10,
    path: '/',
  });
  return response;
}

export async function POST(request: NextRequest) {
  const [userId] = getOrCreateUserId(request);
  const body = await request.json();
  // Re-read existing data to preserve _googleTokens — the client never sees
  // or sends tokens, so a plain overwrite would wipe them on every auto-save.
  const existing = await loadData(userId);
  const tokens   = (existing as Record<string, unknown>)._googleTokens;
  const newData  = {
    ...(body.data ?? {}),
    ...(tokens !== undefined ? { _googleTokens: tokens } : {}),
  };
  await saveData(userId, newData);
  return NextResponse.json({ ok: true });
}
