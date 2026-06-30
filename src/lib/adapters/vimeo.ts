import fs from 'node:fs/promises';
import type { OperationResult, PlatformAdapter, PublishContext, PublishResult, SyncResult } from './types';

const TUS_CHUNK_SIZE = 8 * 1024 * 1024;

export class VimeoAdapter implements PlatformAdapter {
  async publish(ctx: PublishContext): Promise<PublishResult> {
    if (!ctx.accessToken) throw new Error('Vimeo access token is missing.');
    const headers = { Authorization: `Bearer ${ctx.accessToken}`, Accept: 'application/vnd.vimeo.*+json;version=3.4' };
    const createResponse = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload: { approach: 'tus', size: ctx.video.sizeBytes.toString() },
        name: ctx.video.title,
        description: ctx.video.description,
        privacy: { view: ctx.video.privacy === 'public' ? 'anybody' : 'nobody' },
      }),
    });
    if (!createResponse.ok) throw new Error(`Vimeo upload initialization failed: ${await createResponse.text()}`);
    const created = await createResponse.json() as { uri: string; link?: string; upload?: { upload_link?: string } };
    const uploadLink = created.upload?.upload_link;
    if (!uploadLink) throw new Error('Vimeo did not return a TUS upload URL.');

    const handle = await fs.open(ctx.video.sourcePath, 'r');
    try {
      let offset = 0;
      const total = Number(ctx.video.sizeBytes);
      while (offset < total) {
        const length = Math.min(TUS_CHUNK_SIZE, total - offset);
        const chunk = Buffer.allocUnsafe(length);
        const { bytesRead } = await handle.read(chunk, 0, length, offset);
        const upload = await fetch(uploadLink, {
          method: 'PATCH',
          headers: {
            'Tus-Resumable': '1.0.0',
            'Upload-Offset': String(offset),
            'Content-Type': 'application/offset+octet-stream',
            'Content-Length': String(bytesRead),
          },
          body: chunk.subarray(0, bytesRead),
        });
        if (!upload.ok && upload.status !== 204) throw new Error(`Vimeo TUS upload failed: ${await upload.text()}`);
        offset = Number(upload.headers.get('upload-offset') || offset + bytesRead);
      }
    } finally {
      await handle.close();
    }

    const externalId = created.uri.split('/').pop() || created.uri;
    return {
      externalId,
      externalUrl: created.link || `https://vimeo.com/${externalId}`,
      capabilities: { upload: true, resumable_upload: true, metadata_sync: true, analytics: true, privacy: true, review_links: true },
      receipt: { protocol: 'cvp/0.1', operation: 'publish', platform: 'vimeo', canonical_id: ctx.video.canonicalId, external_id: externalId, completed_at: new Date().toISOString() },
    };
  }

  async updateMetadata(ctx: PublishContext): Promise<OperationResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('Vimeo connection or video ID is missing.');
    const response = await fetch(`https://api.vimeo.com/videos/${ctx.distribution.externalId}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json', Accept: 'application/vnd.vimeo.*+json;version=3.4' },
      body: JSON.stringify({ name: ctx.video.title, description: ctx.video.description, privacy: { view: ctx.video.privacy === 'public' ? 'anybody' : 'nobody' } }),
    });
    if (!response.ok) throw new Error(`Vimeo metadata update failed: ${await response.text()}`);
    return { receipt: { protocol: 'cvp/0.1', operation: 'update', platform: 'vimeo', canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async remove(ctx: PublishContext): Promise<OperationResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('Vimeo connection or video ID is missing.');
    const response = await fetch(`https://api.vimeo.com/videos/${ctx.distribution.externalId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ctx.accessToken}`, Accept: 'application/vnd.vimeo.*+json;version=3.4' } });
    if (!response.ok && response.status !== 204) throw new Error(`Vimeo removal failed: ${await response.text()}`);
    return { receipt: { protocol: 'cvp/0.1', operation: 'delete', platform: 'vimeo', canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async sync(ctx: PublishContext): Promise<SyncResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('Vimeo connection or video ID is missing.');
    const response = await fetch(`https://api.vimeo.com/videos/${ctx.distribution.externalId}`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}`, Accept: 'application/vnd.vimeo.*+json;version=3.4' },
    });
    if (!response.ok) throw new Error(`Vimeo sync failed: ${await response.text()}`);
    const raw = await response.json() as Record<string, any>;
    return {
      views: Number(raw.stats?.plays || 0), watchMinutes: ctx.distribution.watchMinutes,
      likes: Number(raw.metadata?.connections?.likes?.total || 0),
      comments: Number(raw.metadata?.connections?.comments?.total || 0),
      shares: ctx.distribution.shares, revenueMicros: ctx.distribution.revenueMicros, raw,
    };
  }
}
