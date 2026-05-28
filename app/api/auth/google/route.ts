import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/googleAuth';

export async function GET(request: NextRequest) {
  const host  = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const base  = `${proto}://${host}`;
  return NextResponse.redirect(buildAuthUrl(base));
}
