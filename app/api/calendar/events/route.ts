import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/db';
import { refreshAccessToken, isExpiringSoon, GoogleTokens } from '@/lib/googleAuth';

const GCAL_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('dashboard_user_id')?.value;
  if (!userId) return NextResponse.json({ connected: false }, { status: 401 });

  const data   = await loadData(userId);
  const stored = (data as Record<string, unknown>)._googleTokens as GoogleTokens | undefined;
  if (!stored?.access_token) return NextResponse.json({ connected: false }, { status: 401 });

  // Auto-refresh the access token if it's about to expire
  let tokens = stored;
  if (isExpiringSoon(tokens)) {
    try {
      tokens = await refreshAccessToken(tokens);
      await saveData(userId, { ...(data as Record<string, unknown>), _googleTokens: tokens });
    } catch {
      return NextResponse.json({ connected: false }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const gcalParams = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime' });
  if (searchParams.get('timeMin')) gcalParams.set('timeMin', searchParams.get('timeMin')!);
  if (searchParams.get('timeMax')) gcalParams.set('timeMax', searchParams.get('timeMax')!);

  const gcalRes = await fetch(`${GCAL_URL}?${gcalParams}`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!gcalRes.ok) {
    if (gcalRes.status === 401) return NextResponse.json({ connected: false }, { status: 401 });
    return NextResponse.json({ error: 'gcal_error' }, { status: gcalRes.status });
  }

  const json = await gcalRes.json();
  return NextResponse.json({ connected: true, events: json.items ?? [] });
}
