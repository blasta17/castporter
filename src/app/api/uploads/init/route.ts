import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { maxUploadBytes, uploadDir } from '@/lib/config';

const schema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().regex(/^video\//),
  size: z.number().int().positive(),
  title: z.string().min(2).max(120),
  description: z.string().max(5000).default(''),
  language: z.string().min(2).max(12).default('en'),
  tags: z.array(z.string().max(50)).max(30).default([]),
  platforms: z.array(z.enum(['YOUTUBE', 'DAILYMOTION', 'VIMEO', 'PEERTUBE', 'WEBSITE'])).min(1),
  privacy: z.enum(['public', 'unlisted', 'private']).default('public'),
  rightsOwner: z.string().max(120).default(''),
  license: z.string().max(80).default('all-rights-reserved'),
  territories: z.array(z.string().max(20)).max(100).default(['WORLDWIDE']),
  scheduledAt: z.string().datetime().nullable().optional(),
  demo: z.boolean().default(false),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid upload request', details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.size > maxUploadBytes) return NextResponse.json({ error: `File exceeds the ${Math.floor(maxUploadBytes / 1024 / 1024)} MB limit.` }, { status: 413 });

  await fs.mkdir(uploadDir, { recursive: true });
  const session = await db.uploadSession.create({
    data: {
      filename: path.basename(parsed.data.filename),
      mimeType: parsed.data.mimeType,
      totalBytes: BigInt(parsed.data.size),
      tempPath: path.join(uploadDir, `upload-${crypto.randomUUID()}.part`),
      metadataJson: JSON.stringify(parsed.data),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await fs.writeFile(session.tempPath, Buffer.alloc(0));
  return NextResponse.json({ uploadId: session.id, chunkSize: 4 * 1024 * 1024, offset: 0 });
}
