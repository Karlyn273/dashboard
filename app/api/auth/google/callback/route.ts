import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/googleAuth';
import { loadData, saveData } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');
  const base  = process.env.BASE_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${base}/`);
  }

  const userId = request.cookies.get('dashboard_user_id')?.value;
  if (!userId) {
    return NextResponse.redirect(`${base}/`);
  }

  try {
    const tokens = await exchangeCode(code);
    const data   = await loadData(userId);
    await saveData(userId, { ...(data as Record<string, unknown>), _googleTokens: tokens });
    return NextResponse.redirect(`${base}/`);
  } catch {
    return NextResponse.redirect(`${base}/`);
  }
}
