import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/googleAuth';

export async function GET() {
  return NextResponse.redirect(buildAuthUrl());
}
