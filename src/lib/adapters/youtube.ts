import { createReadStream } from 'node:fs';
import type { OperationResult, PlatformAdapter, PublishContext, PublishResult, SyncResult } from './types';

export class YouTubeAdapter implements PlatformAdapter {
  async publish(ctx: PublishContext): Promise<PublishResult> {
    if (!ctx.accessToken) throw new Error('YouTube is not connected. Complete OAuth from Connections.');
    const payload = {
      snippet: {
        title: ctx.video.title,
        description: ctx.video.description,
        tags: JSON.parse(ctx.video.tagsJson || '[]'),
        categoryId: String(ctx.metadata.categoryId || '22'),
        defaultLanguage: ctx.video.language,
      },
      status: {
        privacyStatus: ctx.video.privacy === 'unlisted' ? 'unlisted' : ctx.video.privacy === 'private' ? 'private' : 'public',
        selfDeclaredMadeForKids: false,
      },
    };
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': ctx.video.sizeBytes.toString(),
        'X-Upload-Content-Type': ctx.video.mimeType,
      },
      body: JSON.stringify(payload),
    });
    if (!init.ok) throw new Error(`YouTube upload initialization failed: ${await init.text()}`);
    const location = init.headers.get('location');
    if (!location) throw new Error('YouTube did not return a resumable upload URL.');
    const upload = await fetch(location, {
      method: 'PUT',
      headers: { 'Content-Type': ctx.video.mimeType, 'Content-Length': ctx.video.sizeBytes.toString() },
      body: createReadStream(ctx.video.sourcePath) as unknown as BodyInit,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    if (!upload.ok) throw new Error(`YouTube upload failed: ${await upload.text()}`);
    const result = await upload.json() as { id: string };
    return {
      externalId: result.id,
      externalUrl: `https://youtube.com/watch?v=${result.id}`,
      capabilities: { upload: true, resumable_upload: true, metadata_sync: true, analytics: true, captions: true, scheduling: true },
      receipt: { protocol: 'cvp/0.1', operation: 'publish', platform: 'youtube', canonical_id: ctx.video.canonicalId, external_id: result.id, completed_at: new Date().toISOString() },
    };
  }

  async updateMetadata(ctx: PublishContext): Promise<OperationResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('YouTube connection or video ID is missing.');
    const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,status', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ctx.distribution.externalId,
        snippet: { title: ctx.video.title, description: ctx.video.description, tags: JSON.parse(ctx.video.tagsJson || '[]'), categoryId: String(ctx.metadata.categoryId || '22'), defaultLanguage: ctx.video.language },
        status: { privacyStatus: ctx.video.privacy === 'unlisted' ? 'unlisted' : ctx.video.privacy === 'private' ? 'private' : 'public', selfDeclaredMadeForKids: false },
      }),
    });
    if (!response.ok) throw new Error(`YouTube metadata update failed: ${await response.text()}`);
    return { receipt: { protocol: 'cvp/0.1', operation: 'update', platform: 'youtube', canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async remove(ctx: PublishContext): Promise<OperationResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('YouTube connection or video ID is missing.');
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(ctx.distribution.externalId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ctx.accessToken}` } });
    if (!response.ok && response.status !== 204) throw new Error(`YouTube removal failed: ${await response.text()}`);
    return { receipt: { protocol: 'cvp/0.1', operation: 'delete', platform: 'youtube', canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async sync(ctx: PublishContext): Promise<SyncResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('YouTube connection or video ID is missing.');
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(ctx.distribution.externalId)}`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });
    if (!response.ok) throw new Error(`YouTube analytics sync failed: ${await response.text()}`);
    const body = await response.json() as { items?: Array<{ statistics?: Record<string, string> }> };
    const stats = body.items?.[0]?.statistics || {};
    return {
      views: Number(stats.viewCount || 0), watchMinutes: ctx.distribution.watchMinutes,
      likes: Number(stats.likeCount || 0), comments: Number(stats.commentCount || 0),
      shares: ctx.distribution.shares, revenueMicros: ctx.distribution.revenueMicros,
      raw: body as unknown as Record<string, unknown>,
    };
  }
}
