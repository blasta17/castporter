import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Platform } from '@/lib/types';
import { db } from '@/lib/db';
import { encryptSecret } from '@/lib/crypto';

const valid = ['YOUTUBE', 'DAILYMOTION', 'VIMEO', 'PEERTUBE', 'WEBSITE'] as const;
const schema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  label: z.string().max(80).optional(),
  metadata: z.record(z.unknown()).default({}),
  disconnect: z.boolean().default(false),
});

export async function PUT(request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: raw } = await params;
  if (!valid.includes(raw as any)) return NextResponse.json({ error: 'Unknown platform.' }, { status: 404 });
  const platform = raw as Platform;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid connection settings.' }, { status: 400 });
  const item = await db.platformConnection.upsert({
    where: { platform },
    create: {
      platform, label: parsed.data.label || platform, status: parsed.data.disconnect ? 'DISCONNECTED' : 'CONNECTED',
      accessTokenEncrypted: parsed.data.accessToken ? encryptSecret(parsed.data.accessToken) : null,
      refreshTokenEncrypted: parsed.data.refreshToken ? encryptSecret(parsed.data.refreshToken) : null,
      metadataJson: JSON.stringify(parsed.data.metadata),
    },
    update: parsed.data.disconnect ? {
      status: 'DISCONNECTED', accessTokenEncrypted: null, refreshTokenEncrypted: null, tokenExpiresAt: null, lastError: null,
    } : {
      status: 'CONNECTED', label: parsed.data.label, metadataJson: JSON.stringify(parsed.data.metadata), lastError: null,
      accessTokenEncrypted: parsed.data.accessToken ? encryptSecret(parsed.data.accessToken) : undefined,
      refreshTokenEncrypted: parsed.data.refreshToken ? encryptSecret(parsed.data.refreshToken) : undefined,
    },
  });
  return NextResponse.json({ ok: true, platform: item.platform, status: item.status });
}
