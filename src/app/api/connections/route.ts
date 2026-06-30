import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseJson } from '@/lib/json';

export async function GET() {
  const connections = await db.platformConnection.findMany({ orderBy: { platform: 'asc' } });
  return NextResponse.json(connections.map((item) => ({
    id: item.id, platform: item.platform, label: item.label, status: item.status,
    tokenExpiresAt: item.tokenExpiresAt, metadata: parseJson(item.metadataJson, {}),
    hasToken: Boolean(item.accessTokenEncrypted), lastError: item.lastError, updatedAt: item.updatedAt,
  })));
}
