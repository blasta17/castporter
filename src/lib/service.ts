import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import type { DistributionStatus, Platform } from './types';
import { db } from './db';
import { decryptSecret, encryptSecret } from './crypto';
import { getAdapter } from './adapters';
import { buildManifest, persistManifest } from './cvp';
import { parseJson } from './json';
import { thumbnailDir } from './config';


function appendReceipt(existing: string, receipt: Record<string, unknown>): string {
  const parsed = parseJson<any>(existing, {});
  const history = Array.isArray(parsed.history)
    ? parsed.history
    : Object.keys(parsed).length > 0
      ? [parsed.latest || parsed]
      : [];
  return JSON.stringify({ latest: receipt, history: [...history, receipt] });
}

function execFile(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr || `${command} exited with ${code}`)));
  });
}

export async function analyzeVideo(videoId: string): Promise<void> {
  const video = await db.video.findUnique({ where: { id: videoId } });
  if (!video) return;
  try {
    const { stdout } = await execFile('ffprobe', [
      '-v', 'error', '-show_entries',
      'format=duration:stream=index,codec_type,codec_name,width,height',
      '-of', 'json', video.sourcePath,
    ]);
    const info = JSON.parse(stdout) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
    };
    const videoStream = info.streams?.find((stream) => stream.codec_type === 'video');
    const audioStream = info.streams?.find((stream) => stream.codec_type === 'audio');
    await fs.mkdir(thumbnailDir, { recursive: true });
    const thumbnailPath = path.join(thumbnailDir, `${video.id}.jpg`);
    try {
      await execFile('ffmpeg', ['-y', '-ss', '00:00:01', '-i', video.sourcePath, '-frames:v', '1', '-vf', 'scale=960:-2', thumbnailPath]);
    } catch {
      // Metadata analysis is still useful even when a thumbnail cannot be extracted.
    }
    const thumbnailExists = await fs.stat(thumbnailPath).then(() => true).catch(() => false);
    await db.video.update({
      where: { id: video.id },
      data: {
        durationSec: Number(info.format?.duration || 0) || null,
        width: videoStream?.width || null,
        height: videoStream?.height || null,
        videoCodec: videoStream?.codec_name || null,
        audioCodec: audioStream?.codec_name || null,
        thumbnailPath: thumbnailExists ? thumbnailPath : null,
        status: video.scheduledAt ? 'SCHEDULED' : 'READY',
      },
    });
    await db.auditLog.create({ data: { videoId, action: 'asset.analyzed', detailsJson: JSON.stringify({ duration: info.format?.duration, width: videoStream?.width, height: videoStream?.height }) } });
    await refreshManifest(videoId);
  } catch (error) {
    await db.video.update({ where: { id: video.id }, data: { status: video.scheduledAt ? 'SCHEDULED' : 'READY' } });
    await db.auditLog.create({ data: { videoId, action: 'asset.analysis_warning', detailsJson: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) } });
    await refreshManifest(videoId);
  }
}

async function refreshYouTubeToken(connectionId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!response.ok) return null;
  const body = await response.json() as { access_token: string; expires_in?: number };
  await db.platformConnection.update({
    where: { id: connectionId },
    data: {
      accessTokenEncrypted: encryptSecret(body.access_token),
      tokenExpiresAt: new Date(Date.now() + Number(body.expires_in || 3600) * 1000),
      status: 'CONNECTED', lastError: null,
    },
  });
  return body.access_token;
}

export async function buildPublishContext(distributionId: string) {
  const distribution = await db.distribution.findUnique({
    where: { id: distributionId }, include: { video: true },
  });
  if (!distribution) throw new Error('Distribution not found.');
  const connection = await db.platformConnection.findUnique({ where: { platform: distribution.platform } });
  let accessToken = decryptSecret(connection?.accessTokenEncrypted);
  const refreshToken = decryptSecret(connection?.refreshTokenEncrypted);
  if (distribution.platform === 'YOUTUBE' && connection?.tokenExpiresAt && connection.tokenExpiresAt.getTime() < Date.now() + 60_000 && refreshToken) {
    accessToken = await refreshYouTubeToken(connection.id, refreshToken) || accessToken;
  }
  return {
    video: distribution.video,
    distribution,
    connection,
    accessToken,
    refreshToken,
    metadata: parseJson<Record<string, unknown>>(connection?.metadataJson, {}),
  };
}

export async function publishDistribution(distributionId: string): Promise<void> {
  const ctx = await buildPublishContext(distributionId);
  const adapter = getAdapter(ctx.distribution.platform, ctx.video.demo);
  try {
    await db.distribution.update({ where: { id: distributionId }, data: { status: 'PUBLISHING', error: null } });
    const result = await adapter.publish(ctx);
    await db.distribution.update({
      where: { id: distributionId },
      data: {
        status: 'PUBLISHED', externalId: result.externalId, externalUrl: result.externalUrl,
        receiptJson: appendReceipt(ctx.distribution.receiptJson, result.receipt), capabilitiesJson: JSON.stringify(result.capabilities),
        publishedAt: new Date(), error: null,
      },
    });
    await db.auditLog.create({ data: { videoId: ctx.video.id, action: 'distribution.published', detailsJson: JSON.stringify({ platform: ctx.distribution.platform, externalId: result.externalId }) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.distribution.update({ where: { id: distributionId }, data: { status: 'FAILED', error: message } });
    await db.auditLog.create({ data: { videoId: ctx.video.id, action: 'distribution.failed', detailsJson: JSON.stringify({ platform: ctx.distribution.platform, error: message }) } });
  }
  await reconcileVideoStatus(ctx.video.id);
  await refreshManifest(ctx.video.id);
}

export async function syncDistribution(distributionId: string): Promise<void> {
  const ctx = await buildPublishContext(distributionId);
  const adapter = getAdapter(ctx.distribution.platform, ctx.video.demo);
  try {
    await db.distribution.update({ where: { id: distributionId }, data: { status: 'SYNCING', error: null } });
    const result = await adapter.sync(ctx);
    await db.distribution.update({
      where: { id: distributionId },
      data: {
        status: 'PUBLISHED', views: result.views, watchMinutes: result.watchMinutes,
        likes: result.likes, comments: result.comments, shares: result.shares,
        revenueMicros: result.revenueMicros, lastSyncedAt: new Date(), error: null,
      },
    });
    const now = new Date();
    await db.analyticsEvent.createMany({ data: [
      { videoId: ctx.video.id, platform: ctx.distribution.platform, type: 'views', value: result.views, occurredAt: now },
      { videoId: ctx.video.id, platform: ctx.distribution.platform, type: 'watch_minutes', value: result.watchMinutes, occurredAt: now },
      { videoId: ctx.video.id, platform: ctx.distribution.platform, type: 'likes', value: result.likes, occurredAt: now },
    ] });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.distribution.update({ where: { id: distributionId }, data: { status: 'PUBLISHED', error: message } });
  }
}

export async function reconcileVideoStatus(videoId: string): Promise<void> {
  const distributions = await db.distribution.findMany({ where: { videoId } });
  const statuses = distributions.map((item) => item.status);
  let status: 'PUBLISHING' | 'PUBLISHED' | 'PARTIAL' | 'FAILED' = 'PUBLISHING';
  if (statuses.every((value) => value === 'PUBLISHED')) status = 'PUBLISHED';
  else if (statuses.some((value) => value === 'PUBLISHED') && statuses.every((value) => ['PUBLISHED', 'FAILED'].includes(value))) status = 'PARTIAL';
  else if (statuses.length > 0 && statuses.every((value) => value === 'FAILED')) status = 'FAILED';
  await db.video.update({ where: { id: videoId }, data: { status } });
}

export async function refreshManifest(videoId: string): Promise<void> {
  const video = await db.video.findUnique({ where: { id: videoId }, include: { distributions: true } });
  if (!video) return;
  const manifest = buildManifest(video);
  await persistManifest(manifest);
  await db.video.update({ where: { id: videoId }, data: { manifestJson: JSON.stringify(manifest) } });
}

export async function queueVideoForPublishing(videoId: string, targetStatus: DistributionStatus = 'PUBLISHING'): Promise<void> {
  await db.video.update({ where: { id: videoId }, data: { status: targetStatus === 'SCHEDULED' ? 'SCHEDULED' : 'PUBLISHING' } });
  await db.distribution.updateMany({ where: { videoId, status: { in: ['PENDING', 'SCHEDULED', 'FAILED', 'REMOVED'] } }, data: { status: targetStatus, error: null } });
}

export async function propagateMetadata(videoId: string): Promise<{ updated: number; failed: number }> {
  const distributions = await db.distribution.findMany({ where: { videoId, status: 'PUBLISHED' } });
  let updated = 0;
  let failed = 0;
  for (const distribution of distributions) {
    const ctx = await buildPublishContext(distribution.id);
    const adapter = getAdapter(distribution.platform, ctx.video.demo);
    try {
      if (!adapter.updateMetadata) throw new Error(`${distribution.platform} adapter does not support metadata updates.`);
      const result = await adapter.updateMetadata(ctx);
      await db.distribution.update({
        where: { id: distribution.id },
        data: { receiptJson: appendReceipt(distribution.receiptJson, result.receipt), error: null },
      });
      await db.auditLog.create({ data: { videoId, action: 'metadata.propagated', detailsJson: JSON.stringify({ platform: distribution.platform }) } });
      updated += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.distribution.update({ where: { id: distribution.id }, data: { error: message } });
      await db.auditLog.create({ data: { videoId, action: 'metadata.propagation_failed', detailsJson: JSON.stringify({ platform: distribution.platform, error: message }) } });
      failed += 1;
    }
  }
  await refreshManifest(videoId);
  return { updated, failed };
}

export async function unpublishVideo(videoId: string): Promise<{ removed: number; failed: number }> {
  const distributions = await db.distribution.findMany({ where: { videoId, status: 'PUBLISHED' } });
  let removed = 0;
  let failed = 0;
  for (const distribution of distributions) {
    const ctx = await buildPublishContext(distribution.id);
    const adapter = getAdapter(distribution.platform, ctx.video.demo);
    try {
      if (!adapter.remove) throw new Error(`${distribution.platform} adapter does not support removal.`);
      const result = await adapter.remove(ctx);
      await db.distribution.update({
        where: { id: distribution.id },
        data: { status: 'REMOVED', receiptJson: appendReceipt(distribution.receiptJson, result.receipt), error: null },
      });
      await db.auditLog.create({ data: { videoId, action: 'distribution.removed', detailsJson: JSON.stringify({ platform: distribution.platform, externalId: distribution.externalId }) } });
      removed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.distribution.update({ where: { id: distribution.id }, data: { error: message } });
      await db.auditLog.create({ data: { videoId, action: 'distribution.removal_failed', detailsJson: JSON.stringify({ platform: distribution.platform, error: message }) } });
      failed += 1;
    }
  }
  const remaining = await db.distribution.findMany({ where: { videoId } });
  const allRemoved = remaining.length > 0 && remaining.every((item) => item.status === 'REMOVED');
  await db.video.update({ where: { id: videoId }, data: { status: allRemoved ? 'ARCHIVED' : failed ? 'PARTIAL' : 'ARCHIVED' } });
  await refreshManifest(videoId);
  return { removed, failed };
}

export async function aggregateTotals() {
  const distributions = await db.distribution.findMany({ where: { status: 'PUBLISHED' } });
  return distributions.reduce((acc, item) => ({
    views: acc.views + item.views,
    watchMinutes: acc.watchMinutes + item.watchMinutes,
    likes: acc.likes + item.likes,
    comments: acc.comments + item.comments,
    shares: acc.shares + item.shares,
    revenueMicros: acc.revenueMicros + item.revenueMicros,
  }), { views: 0, watchMinutes: 0, likes: 0, comments: 0, shares: 0, revenueMicros: 0n });
}

export async function cleanExpiredUploads(): Promise<void> {
  const expired = await db.uploadSession.findMany({ where: { expiresAt: { lt: new Date() }, status: { in: ['CREATED', 'UPLOADING'] } } });
  for (const session of expired) {
    await fs.unlink(session.tempPath).catch(() => undefined);
    await db.uploadSession.update({ where: { id: session.id }, data: { status: 'EXPIRED' } });
  }
}
