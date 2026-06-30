import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
  const url = new URL(request.url);
  const isThumbnail = url.searchParams.get('thumbnail') === '1';
  const target = isThumbnail ? video.thumbnailPath : video.sourcePath;
  if (!target) return NextResponse.json({ error: 'Asset not ready.' }, { status: 404 });
  const stat = await fs.stat(target).catch(() => null);
  if (!stat) return NextResponse.json({ error: 'Asset file not found.' }, { status: 404 });

  if (isThumbnail) {
    const bytes = await fs.readFile(target);
    return new NextResponse(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300' } });
  }

  const range = request.headers.get('range');
  if (range) {
    const [startRaw, endRaw] = range.replace('bytes=', '').split('-');
    const start = Number(startRaw || 0);
    const end = Math.min(Number(endRaw || stat.size - 1), stat.size - 1);
    if (!Number.isFinite(start) || start < 0 || start >= stat.size || end < start) return new NextResponse(null, { status: 416 });
    const stream = createReadStream(target, { start, end });
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        'Content-Type': video.mimeType,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
      },
    });
  }
  const stream = createReadStream(target);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: { 'Content-Type': video.mimeType, 'Content-Length': String(stat.size), 'Accept-Ranges': 'bytes' },
  });
}
