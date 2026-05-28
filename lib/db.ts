import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function ensureTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_data (
      user_id  TEXT        PRIMARY KEY,
      data     JSONB       NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function loadData(userId: string): Promise<unknown> {
  const rows = await sql`
    SELECT data FROM dashboard_data WHERE user_id = ${userId}
  `;
  return rows[0]?.data ?? {};
}

export async function saveData(userId: string, data: unknown): Promise<void> {
  await sql`
    INSERT INTO dashboard_data (user_id, data, updated_at)
    VALUES (${userId}, ${JSON.stringify(data)}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET data       = EXCLUDED.data,
          updated_at = NOW()
  `;
}
