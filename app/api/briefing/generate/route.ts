import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

interface BibleVerse {
  bookname: string;
  chapter: string;
  verse: string;
  text: string;
}

export async function POST() {
  try {
    const verseRes = await fetch(
      'https://labs.bible.org/api/?passage=votd&type=json',
      { headers: { 'User-Agent': 'personal-dashboard/1.0' } },
    );
    if (!verseRes.ok) throw new Error('Bible API unavailable');
    const verses = (await verseRes.json()) as BibleVerse[];

    const startVerse = verses[0].verse;
    const endVerse   = verses.length > 1 ? `–${verses[verses.length - 1].verse}` : '';
    const reference  = `${verses[0].bookname} ${verses[0].chapter}:${startVerse}${endVerse}`;
    const text       = verses.map(v => v.text).join(' ');

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content:
            `Scripture: "${text}" — ${reference}\n\n` +
            `Write a 2–3 sentence devotional reflection for high-achieving women navigating daily pressure, perfectionism, self-doubt, or the tension between striving and resting. ` +
            `Be warm, grounding, and speak directly to lived experience. No greeting, no sign-off, no title, no markdown formatting — plain prose only.`,
        },
      ],
    });

    const reflection = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return NextResponse.json({ scripture: { text, reference }, reflection });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
