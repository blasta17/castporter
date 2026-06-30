import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeBigInts } from '@/lib/json';
import { refreshManifest } from '@/lib/service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await db.video.findUnique({ where: { id }, include: { distributions: true, auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 } } });
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
  return NextResponse.json(serializeBigInts(video));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const updated = await db.video.update({
    where: { id },
    data: {
      title: typeof body.title === 'string' ? body.title.slice(0, 120) : undefined,
      description: typeof body.description === 'string' ? body.description.slice(0, 5000) : undefined,
      privacy: ['public', 'unlisted', 'private'].includes(body.privacy) ? body.privacy : undefined,
      tagsJson: Array.isArray(body.tags) ? JSON.stringify(body.tags.slice(0, 30)) : undefined,
    },
  });
  await db.auditLog.create({ data: { videoId: id, action: 'metadata.updated', actor: 'studio-user', detailsJson: JSON.stringify(body) } });
  await refreshManifest(id);
  return NextResponse.json(serializeBigInts(updated));
}
