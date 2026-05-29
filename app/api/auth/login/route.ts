import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  if (password !== expected) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  // Derive a stable user ID from the password so any device logging in
  // with the same password always loads the same data.
  const userId = createHash('sha256')
    .update('dashboard-user:' + expected)
    .digest('hex')
    .slice(0, 32);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('dashboard_user_id', userId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 365 * 10, // 10 years
    path:     '/',
  });
  response.cookies.set('dashboard_auth', '1', {
    httpOnly: false, // readable by middleware
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 365 * 10,
    path:     '/',
  });
  return response;
}
