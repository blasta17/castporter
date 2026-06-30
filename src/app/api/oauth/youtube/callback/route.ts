import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { encryptSecret } from '@/lib/crypto';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const expected = cookieStore.get('cvp_youtube_state')?.value;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080';
  if (!code || !state || state !== expected) return NextResponse.redirect(`${appUrl}/studio/connections?error=invalid_oauth_state`);
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return NextResponse.redirect(`${appUrl}/studio/connections?error=youtube_oauth_not_configured`);
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  if (!tokenResponse.ok) return NextResponse.redirect(`${appUrl}/studio/connections?error=youtube_token_exchange_failed`);
  const token = await tokenResponse.json() as { access_token: string; refresh_token?: string; expires_in?: number };
  await db.platformConnection.update({
    where: { platform: 'YOUTUBE' },
    data: {
      status: 'CONNECTED', accessTokenEncrypted: encryptSecret(token.access_token),
      refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : undefined,
      tokenExpiresAt: new Date(Date.now() + Number(token.expires_in || 3600) * 1000), lastError: null,
    },
  });
  const response = NextResponse.redirect(`${appUrl}/studio/connections?connected=youtube`);
  response.cookies.delete('cvp_youtube_state');
  return response;
}
