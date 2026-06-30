import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  await db.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true, service: 'cvp-studio', protocol: 'cvp/0.1', time: new Date().toISOString() });
}
