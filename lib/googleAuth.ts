const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES           = 'https://www.googleapis.com/auth/calendar.readonly';

export interface GoogleTokens {
  access_token:  string;
  refresh_token: string;
  expires_at:    number; // ms since epoch
}

function callbackUrl(base: string): string {
  return `${base}/api/auth/google/callback`;
}

export function buildAuthUrl(base: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  callbackUrl(base),
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent', // always request refresh_token
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string, base: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  callbackUrl(base),
      grant_type:    'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const j = await res.json();
  return {
    access_token:  j.access_token,
    refresh_token: j.refresh_token,
    expires_at:    Date.now() + j.expires_in * 1000,
  };
}

export async function refreshAccessToken(tokens: GoogleTokens): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      refresh_token: tokens.refresh_token,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const j = await res.json();
  return {
    access_token:  j.access_token,
    // Google only returns a new refresh_token occasionally; keep the old one
    refresh_token: j.refresh_token ?? tokens.refresh_token,
    expires_at:    Date.now() + j.expires_in * 1000,
  };
}

export function isExpiringSoon(tokens: GoogleTokens): boolean {
  return tokens.expires_at - Date.now() < 5 * 60 * 1000; // refresh if < 5 min left
}
