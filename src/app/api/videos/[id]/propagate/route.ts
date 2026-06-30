import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { propagateMetadata } from '@/lib/service';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
  const result = await propagateMetadata(id);
  return NextResponse.json({ ok: result.failed === 0, ...result });
}
