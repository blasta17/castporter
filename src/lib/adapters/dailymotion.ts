import { createReadStream } from 'node:fs';
import FormData from 'form-data';
import type { OperationResult, PlatformAdapter, PublishContext, PublishResult, SyncResult } from './types';

export class DailymotionAdapter implements PlatformAdapter {
  async publish(ctx: PublishContext): Promise<PublishResult> {
    if (!ctx.accessToken) throw new Error('Dailymotion access token is missing.');
    const auth = { Authorization: `Bearer ${ctx.accessToken}` };
    const urlResponse = await fetch('https://api.dailymotion.com/file/upload', { headers: auth });
    if (!urlResponse.ok) throw new Error(`Dailymotion upload URL failed: ${await urlResponse.text()}`);
    const { upload_url } = await urlResponse.json() as { upload_url: string };
    const form = new FormData();
    form.append('file', createReadStream(ctx.video.sourcePath), {
      filename: ctx.video.filename,
      contentType: ctx.video.mimeType,
      knownLength: Number(ctx.video.sizeBytes),
    });
    const fileResponse = await fetch(upload_url, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form as unknown as BodyInit,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    if (!fileResponse.ok) throw new Error(`Dailymotion file upload failed: ${await fileResponse.text()}`);
    const { url } = await fileResponse.json() as { url: string };
    const create = new URLSearchParams({
      url,
      title: ctx.video.title,
      description: ctx.video.description,
      channel: String(ctx.metadata.channel || 'news'),
      published: ctx.video.privacy === 'public' ? 'true' : 'false',
    });
    const createResponse = await fetch('https://api.dailymotion.com/me/videos', {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: create,
    });
    if (!createResponse.ok) throw new Error(`Dailymotion video creation failed: ${await createResponse.text()}`);
    const result = await createResponse.json() as { id: string };
    return {
      externalId: result.id,
      externalUrl: `https://dailymotion.com/video/${result.id}`,
      capabilities: { upload: true, metadata_sync: true, analytics: true, captions: true, geo_rights: true },
      receipt: { protocol: 'cvp/0.1', operation: 'publish', platform: 'dailymotion', canonical_id: ctx.video.canonicalId, external_id: result.id, completed_at: new Date().toISOString() },
    };
  }

  async updateMetadata(ctx: PublishContext): Promise<OperationResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('Dailymotion connection or video ID is missing.');
    const response = await fetch(`https://api.dailymotion.com/video/${ctx.distribution.externalId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ title: ctx.video.title, description: ctx.video.description, published: ctx.video.privacy === 'public' ? 'true' : 'false' }),
    });
    if (!response.ok) throw new Error(`Dailymotion metadata update failed: ${await response.text()}`);
    return { receipt: { protocol: 'cvp/0.1', operation: 'update', platform: 'dailymotion', canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async remove(ctx: PublishContext): Promise<OperationResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('Dailymotion connection or video ID is missing.');
    const response = await fetch(`https://api.dailymotion.com/video/${ctx.distribution.externalId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ctx.accessToken}` } });
    if (!response.ok && response.status !== 204) throw new Error(`Dailymotion removal failed: ${await response.text()}`);
    return { receipt: { protocol: 'cvp/0.1', operation: 'delete', platform: 'dailymotion', canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async sync(ctx: PublishContext): Promise<SyncResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('Dailymotion connection or video ID is missing.');
    const fields = 'views_total,likes_total,comments_total';
    const response = await fetch(`https://api.dailymotion.com/video/${ctx.distribution.externalId}?fields=${fields}`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });
    if (!response.ok) throw new Error(`Dailymotion sync failed: ${await response.text()}`);
    const raw = await response.json() as Record<string, unknown>;
    return {
      views: Number(raw.views_total || 0), watchMinutes: ctx.distribution.watchMinutes,
      likes: Number(raw.likes_total || 0), comments: Number(raw.comments_total || 0),
      shares: ctx.distribution.shares, revenueMicros: ctx.distribution.revenueMicros, raw,
    };
  }
}
