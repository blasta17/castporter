import fs from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await db.uploadSession.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: 'Upload session not found.' }, { status: 404 });
  if (!['CREATED', 'UPLOADING'].includes(session.status)) return NextResponse.json({ error: `Upload is ${session.status.toLowerCase()}.` }, { status: 409 });

  const requestedOffset = BigInt(request.headers.get('x-upload-offset') || '-1');
  if (requestedOffset !== session.bytesReceived) {
    return NextResponse.json({ error: 'Offset mismatch.', expectedOffset: session.bytesReceived.toString() }, { status: 409 });
  }
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length === 0) return NextResponse.json({ error: 'Empty chunk.' }, { status: 400 });
  if (session.bytesReceived + BigInt(body.length) > session.totalBytes) return NextResponse.json({ error: 'Chunk exceeds declared file size.' }, { status: 400 });

  const handle = await fs.open(session.tempPath, 'r+');
  try {
    await handle.write(body, 0, body.length, Number(session.bytesReceived));
  } finally {
    await handle.close();
  }
  const nextOffset = session.bytesReceived + BigInt(body.length);
  await db.uploadSession.update({ where: { id }, data: { bytesReceived: nextOffset, status: 'UPLOADING' } });
  return NextResponse.json({ uploadId: id, offset: nextOffset.toString(), complete: nextOffset === session.totalBytes });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await db.uploadSession.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: 'Upload session not found.' }, { status: 404 });
  return NextResponse.json({ id, offset: session.bytesReceived.toString(), total: session.totalBytes.toString(), status: session.status });
}
