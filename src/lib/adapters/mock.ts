import crypto from 'node:crypto';
import type { OperationResult, PlatformAdapter, PublishContext, PublishResult, SyncResult } from './types';
import { appUrl } from '../config';

function stableNumber(input: string, min: number, max: number): number {
  const hash = crypto.createHash('sha256').update(input).digest();
  const value = hash.readUInt32BE(0) / 0xffffffff;
  return Math.round(min + value * (max - min));
}

export class MockAdapter implements PlatformAdapter {
  constructor(private readonly platform: string) {}

  async publish(ctx: PublishContext): Promise<PublishResult> {
    await new Promise((resolve) => setTimeout(resolve, 650));
    const externalId = `${this.platform.toLowerCase()}_${ctx.video.id.slice(-10)}`;
    const baseUrls: Record<string, string> = {
      YOUTUBE: 'https://youtube.com/watch?v=',
      DAILYMOTION: 'https://dailymotion.com/video/',
      VIMEO: 'https://vimeo.com/',
      PEERTUBE: 'https://peertube.example/w/',
      WEBSITE: `${appUrl}/api/assets/`,
    };
    return {
      externalId,
      externalUrl: this.platform === 'WEBSITE'
        ? `${baseUrls.WEBSITE}${ctx.video.id}`
        : `${baseUrls[this.platform] || '#'}${externalId}`,
      capabilities: {
        upload: true,
        metadata_sync: true,
        analytics: true,
        captions: this.platform !== 'WEBSITE',
        scheduling: ['YOUTUBE', 'VIMEO', 'WEBSITE'].includes(this.platform),
      },
      receipt: {
        protocol: 'cvp/0.1',
        operation: 'publish',
        mode: 'mock',
        platform: this.platform.toLowerCase(),
        canonical_id: ctx.video.canonicalId,
        external_id: externalId,
        completed_at: new Date().toISOString(),
        digest: crypto.createHash('sha256').update(`${ctx.video.canonicalId}:${this.platform}`).digest('hex'),
      },
    };
  }

  async updateMetadata(ctx: PublishContext): Promise<OperationResult> {
    await new Promise((resolve) => setTimeout(resolve, 280));
    return { receipt: { protocol: 'cvp/0.1', operation: 'update', mode: 'mock', platform: this.platform.toLowerCase(), canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async remove(ctx: PublishContext): Promise<OperationResult> {
    await new Promise((resolve) => setTimeout(resolve, 280));
    return { receipt: { protocol: 'cvp/0.1', operation: 'unpublish', mode: 'mock', platform: this.platform.toLowerCase(), canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async sync(ctx: PublishContext): Promise<SyncResult> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const seed = `${ctx.video.canonicalId}:${this.platform}:${new Date().toISOString().slice(0, 10)}`;
    const views = Math.max(ctx.distribution.views, stableNumber(seed, 650, 87000));
    return {
      views,
      watchMinutes: Math.max(ctx.distribution.watchMinutes, Math.round(views * 2.8)),
      likes: Math.max(ctx.distribution.likes, Math.round(views * 0.043)),
      comments: Math.max(ctx.distribution.comments, Math.round(views * 0.004)),
      shares: Math.max(ctx.distribution.shares, Math.round(views * 0.006)),
      revenueMicros: BigInt(Math.round(views * 1700)),
      raw: { mode: 'mock', synced_at: new Date().toISOString() },
    };
  }
}
