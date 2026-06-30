import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncDistribution } from '@/lib/service';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const distributions = await db.distribution.findMany({ where: { videoId: id, status: 'PUBLISHED' } });
  for (const item of distributions) await syncDistribution(item.id);
  return NextResponse.json({ ok: true, synced: distributions.length });
}
