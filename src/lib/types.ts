export type Platform = 'YOUTUBE' | 'DAILYMOTION' | 'VIMEO' | 'PEERTUBE' | 'WEBSITE';
export type VideoStatus = 'DRAFT' | 'UPLOADING' | 'ANALYZING' | 'READY' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'PARTIAL' | 'FAILED' | 'ARCHIVED';
export type DistributionStatus = 'PENDING' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'SYNCING' | 'FAILED' | 'REMOVED';
export type UploadStatus = 'CREATED' | 'UPLOADING' | 'COMPLETE' | 'FAILED' | 'EXPIRED';
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface Video {
  id: string;
  canonicalId: string;
  title: string;
  description: string;
  filename: string;
  sourcePath: string;
  thumbnailPath: string | null;
  mimeType: string;
  sizeBytes: bigint;
  sha256: string;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  language: string;
  tagsJson: string;
  chaptersJson: string;
  privacy: string;
  status: VideoStatus;
  rightsOwner: string;
  license: string;
  territoriesJson: string;
  scheduledAt: Date | null;
  manifestJson: string;
  demo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Distribution {
  id: string;
  videoId: string;
  platform: Platform;
  status: DistributionStatus;
  externalId: string | null;
  externalUrl: string | null;
  error: string | null;
  receiptJson: string;
  capabilitiesJson: string;
  publishedAt: Date | null;
  lastSyncedAt: Date | null;
  views: number;
  watchMinutes: number;
  likes: number;
  comments: number;
  shares: number;
  revenueMicros: bigint;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadSession {
  id: string;
  filename: string;
  mimeType: string;
  totalBytes: bigint;
  bytesReceived: bigint;
  tempPath: string;
  metadataJson: string;
  status: UploadStatus;
  error: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformConnection {
  id: string;
  platform: Platform;
  label: string;
  status: ConnectionStatus;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
  metadataJson: string;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsEvent {
  id: string;
  videoId: string;
  platform: Platform;
  type: string;
  value: number;
  metadataJson: string;
  occurredAt: Date;
}

export interface AuditLog {
  id: string;
  videoId: string | null;
  action: string;
  actor: string;
  detailsJson: string;
  createdAt: Date;
}
