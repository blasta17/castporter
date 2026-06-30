import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import type { Platform } from '@/lib/types';
import { db } from '@/lib/db';
import { createCanonicalId } from '@/lib/cvp';
import { parseJson } from '@/lib/json';
import { uploadDir } from '@/lib/config';

async function hashFile(filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filename);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await db.uploadSession.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: 'Upload session not found.' }, { status: 404 });
  if (session.bytesReceived !== session.totalBytes) return NextResponse.json({ error: 'Upload is incomplete.', offset: session.bytesReceived.toString() }, { status: 409 });
  if (session.status === 'COMPLETE') return NextResponse.json({ error: 'Upload was already completed.' }, { status: 409 });

  const metadata = parseJson<any>(session.metadataJson, {});
  const sha256 = await hashFile(session.tempPath);
  const finalPath = path.join(uploadDir, `${sha256.slice(0, 16)}-${path.basename(session.filename)}`);
  await fsp.rename(session.tempPath, finalPath).catch(async () => {
    await fsp.copyFile(session.tempPath, finalPath);
    await fsp.unlink(session.tempPath);
  });
  const scheduledAt = metadata.scheduledAt ? new Date(metadata.scheduledAt) : null;
  const platforms = Array.from(new Set(metadata.platforms as Platform[]));
  const video = await db.$transaction(async (tx) => {
    const created = await tx.video.create({
      data: {
        canonicalId: createCanonicalId(), title: metadata.title, description: metadata.description || '',
        filename: session.filename, sourcePath: finalPath, mimeType: session.mimeType, sizeBytes: session.totalBytes,
        sha256, language: metadata.language || 'en', tagsJson: JSON.stringify(metadata.tags || []),
        privacy: metadata.privacy || 'public', rightsOwner: metadata.rightsOwner || '', license: metadata.license || 'all-rights-reserved',
        territoriesJson: JSON.stringify(metadata.territories || ['WORLDWIDE']), scheduledAt,
        status: 'ANALYZING', demo: Boolean(metadata.demo),
      },
    });
    await tx.distribution.createMany({
      data: platforms.map((platform) => ({
        videoId: created.id, platform,
        status: scheduledAt && scheduledAt.getTime() > Date.now() ? 'SCHEDULED' : 'PENDING',
      })),
    });
    await tx.uploadSession.update({ where: { id }, data: { status: 'COMPLETE' } });
    await tx.auditLog.create({ data: { videoId: created.id, action: 'asset.uploaded', actor: metadata.demo ? 'demo-user' : 'studio-user', detailsJson: JSON.stringify({ platforms, size: session.totalBytes.toString() }) } });
    return created;
  });
  return NextResponse.json({ videoId: video.id, canonicalId: video.canonicalId, status: video.status });
}
