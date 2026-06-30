import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Distribution, Video } from './types';
import { manifestDir } from './config';
import { parseJson } from './json';

export type CVPManifest = {
  protocol: 'cvp/0.1';
  id: string;
  created_at: string;
  creator: { id: string; display_name: string };
  asset: {
    sha256: string;
    filename: string;
    mime_type: string;
    size_bytes: string;
    duration_seconds: number | null;
    width: number | null;
    height: number | null;
    video_codec: string | null;
    audio_codec: string | null;
  };
  metadata: {
    title: string;
    description: string;
    language: string;
    tags: string[];
    chapters: Array<{ start: number; title: string }>;
  };
  rights: {
    owner: string;
    license: string;
    territories: string[];
  };
  distribution: Array<{
    platform: string;
    status: string;
    external_id: string | null;
    external_url: string | null;
  }>;
  integrity: { algorithm: 'sha256'; digest: string };
};

export function createCanonicalId(): string {
  return `cvp:video:${crypto.randomUUID()}`;
}

export function buildManifest(video: Video & { distributions: Distribution[] }): CVPManifest {
  const unsigned = {
    protocol: 'cvp/0.1' as const,
    id: video.canonicalId,
    created_at: video.createdAt.toISOString(),
    creator: {
      id: 'cvp:creator:local-workspace',
      display_name: video.rightsOwner || 'CVP Studio creator',
    },
    asset: {
      sha256: video.sha256,
      filename: video.filename,
      mime_type: video.mimeType,
      size_bytes: video.sizeBytes.toString(),
      duration_seconds: video.durationSec,
      width: video.width,
      height: video.height,
      video_codec: video.videoCodec,
      audio_codec: video.audioCodec,
    },
    metadata: {
      title: video.title,
      description: video.description,
      language: video.language,
      tags: parseJson<string[]>(video.tagsJson, []),
      chapters: parseJson<Array<{ start: number; title: string }>>(video.chaptersJson, []),
    },
    rights: {
      owner: video.rightsOwner,
      license: video.license,
      territories: parseJson<string[]>(video.territoriesJson, ['WORLDWIDE']),
    },
    distribution: video.distributions.map((item) => ({
      platform: item.platform.toLowerCase(),
      status: item.status.toLowerCase(),
      external_id: item.externalId,
      external_url: item.externalUrl,
    })),
  };

  const digest = crypto.createHash('sha256').update(JSON.stringify(unsigned)).digest('hex');
  return { ...unsigned, integrity: { algorithm: 'sha256', digest } };
}

export async function persistManifest(manifest: CVPManifest): Promise<string> {
  await fs.mkdir(manifestDir, { recursive: true });
  const filename = `${manifest.id.replaceAll(':', '_')}.json`;
  const target = path.join(manifestDir, filename);
  await fs.writeFile(target, JSON.stringify(manifest, null, 2));
  return target;
}
