import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/googleAuth';

export async function GET(request: NextRequest) {
  const { protocol, host } = new URL(request.url);
  const base = `${protocol}//${host}`;
  return NextResponse.redirect(buildAuthUrl(base));
}
