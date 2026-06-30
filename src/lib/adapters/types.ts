import type { Distribution, PlatformConnection, Video } from '../types';

export type PublishContext = {
  video: Video;
  distribution: Distribution;
  connection: PlatformConnection | null;
  accessToken: string | null;
  refreshToken: string | null;
  metadata: Record<string, unknown>;
};

export type PublishResult = {
  externalId: string;
  externalUrl: string;
  receipt: Record<string, unknown>;
  capabilities: Record<string, boolean | string | number>;
};

export type OperationResult = {
  receipt: Record<string, unknown>;
  raw?: Record<string, unknown>;
};

export type SyncResult = {
  views: number;
  watchMinutes: number;
  likes: number;
  comments: number;
  shares: number;
  revenueMicros: bigint;
  raw: Record<string, unknown>;
};

export interface PlatformAdapter {
  publish(ctx: PublishContext): Promise<PublishResult>;
  sync(ctx: PublishContext): Promise<SyncResult>;
  updateMetadata?(ctx: PublishContext): Promise<OperationResult>;
  remove?(ctx: PublishContext): Promise<OperationResult>;
}
