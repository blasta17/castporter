import fs from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  const videos = await db.video.findMany({ where: { demo: true } });
  for (const video of videos) {
    await fs.unlink(video.sourcePath).catch(() => undefined);
    if (video.thumbnailPath) await fs.unlink(video.thumbnailPath).catch(() => undefined);
  }
  await db.video.deleteMany({ where: { demo: true } });
  return NextResponse.json({ ok: true, removed: videos.length });
}
