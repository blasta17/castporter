import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queueVideoForPublishing } from '@/lib/service';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
  if (video.status === 'ANALYZING') return NextResponse.json({ error: 'Video analysis is still running. Try again in a few seconds.' }, { status: 409 });
  const scheduled = video.scheduledAt && video.scheduledAt.getTime() > Date.now();
  await queueVideoForPublishing(id, scheduled ? 'SCHEDULED' : 'PUBLISHING');
  await db.auditLog.create({ data: { videoId: id, action: scheduled ? 'distribution.scheduled' : 'distribution.queued', actor: 'studio-user', detailsJson: JSON.stringify({ scheduledAt: video.scheduledAt }) } });
  return NextResponse.json({ ok: true, status: scheduled ? 'SCHEDULED' : 'PUBLISHING' });
}
