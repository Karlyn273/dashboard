import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('dashboard_user_id')?.value;
  if (!userId) return NextResponse.json({ userId: null }, { status: 401 });
  return NextResponse.json({ userId });
}
