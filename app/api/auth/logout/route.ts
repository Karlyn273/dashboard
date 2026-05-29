import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('dashboard_auth', '', { maxAge: 0, path: '/' });
  response.cookies.set('dashboard_user_id', '', { maxAge: 0, path: '/' });
  return response;
}
