import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  if (!clientId || !redirectUri) return NextResponse.redirect(new URL('/studio/connections?error=youtube_oauth_not_configured', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080'));
  const state = crypto.randomBytes(24).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code', access_type: 'offline', prompt: 'consent', state,
    scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'].join(' '),
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set('cvp_youtube_state', state, { httpOnly: true, sameSite: 'lax', secure: (process.env.NEXT_PUBLIC_APP_URL || '').startsWith('https://'), maxAge: 600, path: '/' });
  return response;
}
