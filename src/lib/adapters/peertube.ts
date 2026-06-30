import { createReadStream } from 'node:fs';
import FormData from 'form-data';
import type { OperationResult, PlatformAdapter, PublishContext, PublishResult, SyncResult } from './types';

export class PeerTubeAdapter implements PlatformAdapter {
  async publish(ctx: PublishContext): Promise<PublishResult> {
    if (!ctx.accessToken) throw new Error('PeerTube access token is missing.');
    const instance = String(ctx.metadata.instanceUrl || '').replace(/\/$/, '');
    const channelId = String(ctx.metadata.channelId || '');
    if (!instance || !channelId) throw new Error('PeerTube instance URL and channel ID are required.');
    const form = new FormData();
    form.append('channelId', channelId);
    form.append('name', ctx.video.title);
    form.append('description', ctx.video.description);
    form.append('privacy', ctx.video.privacy === 'public' ? '1' : '3');
    form.append('videofile', createReadStream(ctx.video.sourcePath), {
      filename: ctx.video.filename,
      contentType: ctx.video.mimeType,
      knownLength: Number(ctx.video.sizeBytes),
    });
    const response = await fetch(`${instance}/api/v1/videos/upload`, {
      method: 'POST',
      headers: { ...form.getHeaders(), Authorization: `Bearer ${ctx.accessToken}` },
      body: form as unknown as BodyInit,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    if (!response.ok) throw new Error(`PeerTube upload failed: ${await response.text()}`);
    const raw = await response.json() as { video?: { uuid?: string; shortUUID?: string } };
    const externalId = raw.video?.uuid || raw.video?.shortUUID;
    if (!externalId) throw new Error('PeerTube did not return a video identifier.');
    return {
      externalId,
      externalUrl: `${instance}/w/${externalId}`,
      capabilities: { upload: true, metadata_sync: true, analytics: true, federation: true, p2p: true },
      receipt: { protocol: 'cvp/0.1', operation: 'publish', platform: 'peertube', canonical_id: ctx.video.canonicalId, external_id: externalId, completed_at: new Date().toISOString() },
    };
  }

  async updateMetadata(ctx: PublishContext): Promise<OperationResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('PeerTube connection or video ID is missing.');
    const instance = String(ctx.metadata.instanceUrl || '').replace(/\/$/, '');
    const response = await fetch(`${instance}/api/v1/videos/${ctx.distribution.externalId}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ctx.video.title, description: ctx.video.description, privacy: ctx.video.privacy === 'public' ? 1 : 3 }),
    });
    if (!response.ok && response.status !== 204) throw new Error(`PeerTube metadata update failed: ${await response.text()}`);
    return { receipt: { protocol: 'cvp/0.1', operation: 'update', platform: 'peertube', canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async remove(ctx: PublishContext): Promise<OperationResult> {
    if (!ctx.accessToken || !ctx.distribution.externalId) throw new Error('PeerTube connection or video ID is missing.');
    const instance = String(ctx.metadata.instanceUrl || '').replace(/\/$/, '');
    const response = await fetch(`${instance}/api/v1/videos/${ctx.distribution.externalId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ctx.accessToken}` } });
    if (!response.ok && response.status !== 204) throw new Error(`PeerTube removal failed: ${await response.text()}`);
    return { receipt: { protocol: 'cvp/0.1', operation: 'delete', platform: 'peertube', canonical_id: ctx.video.canonicalId, external_id: ctx.distribution.externalId, completed_at: new Date().toISOString() } };
  }

  async sync(ctx: PublishContext): Promise<SyncResult> {
    const instance = String(ctx.metadata.instanceUrl || '').replace(/\/$/, '');
    if (!instance || !ctx.distribution.externalId) throw new Error('PeerTube instance or video ID is missing.');
    const response = await fetch(`${instance}/api/v1/videos/${ctx.distribution.externalId}`);
    if (!response.ok) throw new Error(`PeerTube sync failed: ${await response.text()}`);
    const raw = await response.json() as Record<string, unknown>;
    return {
      views: Number(raw.views || 0), watchMinutes: ctx.distribution.watchMinutes,
      likes: Number(raw.likes || 0), comments: Number(raw.comments || 0),
      shares: ctx.distribution.shares, revenueMicros: 0n, raw,
    };
  }
}
