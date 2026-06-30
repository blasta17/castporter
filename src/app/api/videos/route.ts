import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeBigInts } from '@/lib/json';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100);
  const videos = await db.video.findMany({ include: { distributions: true }, orderBy: { createdAt: 'desc' }, take: limit });
  return NextResponse.json(serializeBigInts(videos));
}
