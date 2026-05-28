import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────────

interface Scripture { text: string; reference: string; }
interface TodayBriefing {
  scripture?:   Scripture;
  reflection?:  string;
  generatedAt?: string;
}
type BriefingStore = Record<string, TodayBriefing>;

// ── Helpers ──────────────────────────────────────────────────────

function localDateKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

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
      model: 'claude-haiku-4-5-20251001',
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

// ── Cron handler ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = process.env.DASHBOARD_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: 'DASHBOARD_USER_ID not set' }, { status: 500 });
  }

  const today = localDateKey();
  const raw   = await loadData(userId) as Record<string, unknown>;
  const store = ((raw.briefing ?? {}) as BriefingStore);
  const todayB = store[today] ?? {} as TodayBriefing;

  if (todayB.generatedAt === today) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Already generated today' });
  }

  const gen = await generateScripture();
  if (!gen) {
    return NextResponse.json({ ok: false, reason: 'Generation failed or ANTHROPIC_API_KEY missing' });
  }

  const updated: TodayBriefing = { ...todayB, ...gen, generatedAt: today };
  await saveData(userId, { ...raw, briefing: { ...store, [today]: updated } });

  return NextResponse.json({ ok: true, generated: true });
}
