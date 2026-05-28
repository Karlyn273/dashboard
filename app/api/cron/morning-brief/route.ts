import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/db';
import { refreshAccessToken, isExpiringSoon, GoogleTokens } from '@/lib/googleAuth';

// ── Types ────────────────────────────────────────────────────────

interface Scripture  { text: string; reference: string; }
interface Priority   { id: string; text: string; completed: boolean; }
interface TodayBriefing {
  scripture?:           Scripture;
  reflection?:          string;
  generatedAt?:         string;
  priorities?:          Priority[];
  dismissedCarryovers?: string[];
}
type BriefingStore = Record<string, TodayBriefing>;

interface GCalEvent {
  id:       string;
  summary?: string;
  start:    { dateTime?: string; date?: string };
}

// ── Helpers ──────────────────────────────────────────────────────

function localDateKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

function prevDayKey(key: string): string {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function fmtTime(dt: string | undefined): string {
  if (!dt) return 'All day';
  return new Date(dt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ── Scripture generation ─────────────────────────────────────────

interface BibleVerse { bookname: string; chapter: string; verse: string; text: string; }

async function generateScripture(): Promise<{ scripture: Scripture; reflection: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const verseRes = await fetch(
      'https://labs.bible.org/api/?passage=votd&type=json',
      { headers: { 'User-Agent': 'personal-dashboard/1.0' } },
    );
    if (!verseRes.ok) return null;
    const verses = (await verseRes.json()) as BibleVerse[];

    const startVerse = verses[0].verse;
    const endVerse   = verses.length > 1 ? `–${verses[verses.length - 1].verse}` : '';
    const reference  = `${verses[0].bookname} ${verses[0].chapter}:${startVerse}${endVerse}`;
    const text       = verses.map(v => v.text).join(' ');

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content:
          `Scripture: "${text}" — ${reference}\n\n` +
          `Write a 2–3 sentence devotional reflection for high-achieving women navigating daily pressure, perfectionism, self-doubt, or the tension between striving and resting. ` +
          `Be warm, grounding, and speak directly to lived experience. No greeting or sign-off — just the reflection.`,
      }],
    });
    const reflection = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return { scripture: { text, reference }, reflection };
  } catch {
    return null;
  }
}

// ── Calendar events ──────────────────────────────────────────────

async function fetchTodayEvents(
  data: Record<string, unknown>,
  userId: string,
): Promise<GCalEvent[]> {
  const stored = data._googleTokens as GoogleTokens | undefined;
  if (!stored?.access_token) return [];

  let tokens = stored;
  if (isExpiringSoon(tokens)) {
    try {
      tokens = await refreshAccessToken(tokens);
      await saveData(userId, { ...data, _googleTokens: tokens });
    } catch {
      return [];
    }
  }

  const today = localDateKey();
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy:      'startTime',
    timeMin:      new Date(today + 'T00:00:00').toISOString(),
    timeMax:      new Date(today + 'T23:59:59').toISOString(),
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json.items ?? []) as GCalEvent[];
}

// ── Twilio ───────────────────────────────────────────────────────

async function sendSms(body: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from  = process.env.TWILIO_FROM_NUMBER!;
  const to    = process.env.MY_PHONE_NUMBER!;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio error ${res.status}: ${err}`);
  }
}

// ── Cron handler ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = process.env.DASHBOARD_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: 'DASHBOARD_USER_ID not set' }, { status: 500 });
  }

  const today     = localDateKey();
  const yesterday = prevDayKey(today);

  const raw  = await loadData(userId) as Record<string, unknown>;
  const store = ((raw.briefing ?? {}) as BriefingStore);
  let todayB  = store[today]     ?? {} as TodayBriefing;
  const yestB = store[yesterday] ?? {} as TodayBriefing;

  // Generate scripture if not yet done today
  if (todayB.generatedAt !== today) {
    const gen = await generateScripture();
    if (gen) {
      todayB = { ...todayB, ...gen, generatedAt: today };
      const updatedStore: BriefingStore = { ...store, [today]: todayB };
      await saveData(userId, { ...raw, briefing: updatedStore });
    }
  }

  // Fetch calendar events
  const events = await fetchTodayEvents(raw, userId);

  // Carryovers: yesterday's incomplete, non-dismissed tasks
  const dismissed  = todayB.dismissedCarryovers ?? [];
  const carryovers = (yestB.priorities ?? [])
    .filter(p => p.text.trim() && !p.completed && !dismissed.includes(p.id));

  // Today's set priorities (skip blanks)
  const priorities = (todayB.priorities ?? []).filter(p => p.text.trim());

  // ── Build message ───────────────────────────────────────────────

  const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const fullDate  = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date());

  const lines: string[] = [];
  lines.push(`Good morning! Here's your briefing for ${dayOfWeek}, ${fullDate}.`);

  if (todayB.scripture) {
    lines.push('');
    lines.push('Scripture');
    lines.push(`"${todayB.scripture.text}" — ${todayB.scripture.reference}`);
    if (todayB.reflection) {
      lines.push('');
      lines.push(todayB.reflection);
    }
  }

  if (events.length > 0) {
    lines.push('');
    lines.push("Today's Schedule");
    for (const ev of events) {
      const time = ev.start.dateTime ? fmtTime(ev.start.dateTime) : 'All day';
      lines.push(`• ${time} — ${ev.summary ?? '(No title)'}`);
    }
  }

  if (carryovers.length > 0) {
    lines.push('');
    lines.push('Carried Over from Yesterday');
    for (const t of carryovers) {
      lines.push(`• ${t.text}`);
    }
  }

  if (priorities.length > 0) {
    lines.push('');
    lines.push("Today's Priorities");
    priorities.forEach((p, i) => lines.push(`${i + 1}. ${p.text}`));
  }

  const message = lines.join('\n');

  try {
    await sendSms(message);
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'SMS failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
