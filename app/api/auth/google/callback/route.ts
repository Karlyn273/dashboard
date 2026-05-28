import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/googleAuth';
import { loadData, saveData } from '@/lib/db';

export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const { searchParams } = reqUrl;
  const code  = searchParams.get('code');
  const error = searchParams.get('error');
  const base  = `${reqUrl.protocol}//${reqUrl.host}`;

  if (error || !code) {
    return NextResponse.redirect(`${base}/`);
  }

  const userId = request.cookies.get('dashboard_user_id')?.value;
  if (!userId) {
    return NextResponse.redirect(`${base}/`);
  }

  try {
    const tokens = await exchangeCode(code, base);
    const data   = await loadData(userId);
    await saveData(userId, { ...(data as Record<string, unknown>), _googleTokens: tokens });
    return NextResponse.redirect(`${base}/`);
  } catch {
    return NextResponse.redirect(`${base}/`);
  }
}
