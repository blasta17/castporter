import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './config';
import type {
  AnalyticsEvent, AuditLog, ConnectionStatus, Distribution, DistributionStatus,
  Platform, PlatformConnection, UploadSession, UploadStatus, Video, VideoStatus,
} from './types';

type Store = {
  videos: Video[];
  distributions: Distribution[];
  uploadSessions: UploadSession[];
  platformConnections: PlatformConnection[];
  analyticsEvents: AnalyticsEvent[];
  auditLogs: AuditLog[];
};

const storePath = path.join(dataDir, 'cvp-store.json');
const lockPath = path.join(dataDir, '.cvp-store.lock');
const emptyStore = (): Store => ({ videos: [], distributions: [], uploadSessions: [], platformConnections: [], analyticsEvents: [], auditLogs: [] });
const dateKeys = new Set(['scheduledAt', 'createdAt', 'updatedAt', 'publishedAt', 'lastSyncedAt', 'expiresAt', 'tokenExpiresAt', 'occurredAt']);
const bigintKeys = new Set(['sizeBytes', 'revenueMicros', 'totalBytes', 'bytesReceived']);

function revive(_key: string, value: unknown) {
  if (typeof value === 'object' && value && '__bigint' in value) return BigInt((value as { __bigint: string }).__bigint);
  if (typeof value === 'object' && value && '__date' in value) return new Date((value as { __date: string }).__date);
  return value;
}

function replacer(this: Record<string, unknown>, key: string, value: unknown) {
  const source = (this as Record<string, unknown>)[key];
  if (typeof source === 'bigint') return { __bigint: source.toString() };
  if (source instanceof Date) return { __date: source.toISOString() };
  return value;
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(storePath); } catch { await fs.writeFile(storePath, JSON.stringify(emptyStore(), replacer, 2)); }
}

async function readStore(): Promise<Store> {
  await ensureStore();
  const raw = await fs.readFile(storePath, 'utf8');
  const parsed = JSON.parse(raw, revive) as Store;
  // Backward-compatible revival if a user manually edited JSON.
  for (const collection of Object.values(parsed) as unknown as Array<Array<Record<string, unknown>>>) {
    for (const row of collection) {
      for (const [key, value] of Object.entries(row)) {
        if (dateKeys.has(key) && typeof value === 'string') row[key] = new Date(value);
        if (bigintKeys.has(key) && typeof value === 'string' && /^\d+$/.test(value)) row[key] = BigInt(value);
      }
    }
  }
  return parsed;
}

async function writeStore(store: Store) {
  await fs.mkdir(dataDir, { recursive: true });
  const temp = `${storePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(store, replacer, 2));
  await fs.rename(temp, storePath);
}

async function withLock<T>(fn: (store: Store) => Promise<T> | T): Promise<T> {
  await ensureStore();
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try { handle = await fs.open(lockPath, 'wx'); break; } catch (error: any) {
      if (error?.code !== 'EEXIST') throw error;
      const stale = await fs.stat(lockPath).then((stat) => Date.now() - stat.mtimeMs > 60_000).catch(() => false);
      if (stale) { await fs.unlink(lockPath).catch(() => undefined); continue; }
      await new Promise((resolve) => setTimeout(resolve, 20 + Math.min(attempt, 20) * 5));
    }
  }
  if (!handle) throw new Error('CVP store is busy.');
  try {
    const store = await readStore();
    const result = await fn(store);
    await writeStore(store);
    return result;
  } finally {
    await handle.close().catch(() => undefined);
    await fs.unlink(lockPath).catch(() => undefined);
  }
}

function clone<T>(value: T): T { return structuredClone(value); }

function compareValue(actual: any, condition: any): boolean {
  if (condition === null || typeof condition !== 'object' || condition instanceof Date) return actual === condition || (actual instanceof Date && condition instanceof Date && actual.getTime() === condition.getTime());
  if ('in' in condition) return condition.in.includes(actual);
  const normalizedActual = actual instanceof Date ? actual.getTime() : actual;
  if ('lt' in condition && !(normalizedActual < (condition.lt instanceof Date ? condition.lt.getTime() : condition.lt))) return false;
  if ('lte' in condition && !(normalizedActual <= (condition.lte instanceof Date ? condition.lte.getTime() : condition.lte))) return false;
  if ('gt' in condition && !(normalizedActual > (condition.gt instanceof Date ? condition.gt.getTime() : condition.gt))) return false;
  if ('gte' in condition && !(normalizedActual >= (condition.gte instanceof Date ? condition.gte.getTime() : condition.gte))) return false;
  return true;
}

function matches(row: any, where?: Record<string, any>): boolean {
  if (!where) return true;
  if (Array.isArray(where.OR) && !where.OR.some((part: any) => matches(row, part))) return false;
  for (const [key, condition] of Object.entries(where)) {
    if (key === 'OR') continue;
    if (!compareValue(row[key], condition)) return false;
  }
  return true;
}

function sortRows<T extends Record<string, any>>(rows: T[], orderBy?: Record<string, 'asc' | 'desc'>): T[] {
  if (!orderBy) return rows;
  const [key, direction] = Object.entries(orderBy)[0];
  return rows.sort((a, b) => {
    const av = a[key] instanceof Date ? a[key].getTime() : a[key];
    const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
    if (av === bv) return 0;
    const result = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1;
    return direction === 'desc' ? -result : result;
  });
}

function applyData<T extends Record<string, any>>(row: T, data: Record<string, any>): T {
  for (const [key, value] of Object.entries(data)) if (value !== undefined) (row as any)[key] = value;
  if ('updatedAt' in row) (row as any).updatedAt = new Date();
  return row;
}

function attachVideo(store: Store, video: Video, include?: any): any {
  const result: any = clone(video);
  if (include?.distributions) {
    let rows = store.distributions.filter((item) => item.videoId === video.id).map(clone);
    if (typeof include.distributions === 'object') rows = sortRows(rows, include.distributions.orderBy);
    result.distributions = rows;
  }
  if (include?.auditLogs) {
    let rows = store.auditLogs.filter((item) => item.videoId === video.id).map(clone);
    if (typeof include.auditLogs === 'object') {
      rows = sortRows(rows, include.auditLogs.orderBy);
      if (include.auditLogs.take) rows = rows.slice(0, include.auditLogs.take);
    }
    result.auditLogs = rows;
  }
  return result;
}

function attachDistribution(store: Store, distribution: Distribution, include?: any): any {
  const result: any = clone(distribution);
  if (include?.video) result.video = clone(store.videos.find((video) => video.id === distribution.videoId) || null);
  return result;
}

export const db = {
  video: {
    async findUnique(args: any) {
      const store = await readStore();
      const row = store.videos.find((item) => matches(item, args.where));
      return row ? attachVideo(store, row, args.include) : null;
    },
    async findMany(args: any = {}) {
      const store = await readStore();
      let rows = store.videos.filter((item) => matches(item, args.where));
      rows = sortRows(rows, args.orderBy);
      if (args.take) rows = rows.slice(0, args.take);
      return rows.map((item) => attachVideo(store, item, args.include));
    },
    async findFirst(args: any = {}) {
      const rows = await this.findMany({ ...args, take: 1 });
      return rows[0] || null;
    },
    async count(args: any = {}) {
      const store = await readStore();
      return store.videos.filter((item) => matches(item, args.where)).length;
    },
    async create(args: any) {
      return withLock((store) => {
        const now = new Date();
        const row: Video = {
          id: crypto.randomUUID(), canonicalId: args.data.canonicalId, title: args.data.title,
          description: args.data.description ?? '', filename: args.data.filename, sourcePath: args.data.sourcePath,
          thumbnailPath: args.data.thumbnailPath ?? null, mimeType: args.data.mimeType,
          sizeBytes: BigInt(args.data.sizeBytes), sha256: args.data.sha256, durationSec: args.data.durationSec ?? null,
          width: args.data.width ?? null, height: args.data.height ?? null, videoCodec: args.data.videoCodec ?? null,
          audioCodec: args.data.audioCodec ?? null, language: args.data.language ?? 'en', tagsJson: args.data.tagsJson ?? '[]',
          chaptersJson: args.data.chaptersJson ?? '[]', privacy: args.data.privacy ?? 'public',
          status: (args.data.status ?? 'ANALYZING') as VideoStatus, rightsOwner: args.data.rightsOwner ?? '',
          license: args.data.license ?? 'all-rights-reserved', territoriesJson: args.data.territoriesJson ?? '["WORLDWIDE"]',
          scheduledAt: args.data.scheduledAt ?? null, manifestJson: args.data.manifestJson ?? '{}', demo: args.data.demo ?? false,
          createdAt: now, updatedAt: now,
        };
        store.videos.push(row);
        return clone(row);
      });
    },
    async update(args: any) {
      return withLock((store) => {
        const row = store.videos.find((item) => matches(item, args.where));
        if (!row) throw new Error('Video not found.');
        applyData(row as any, args.data);
        return clone(row);
      });
    },
    async deleteMany(args: any = {}) {
      return withLock((store) => {
        const ids = new Set(store.videos.filter((item) => matches(item, args.where)).map((item) => item.id));
        store.videos = store.videos.filter((item) => !ids.has(item.id));
        store.distributions = store.distributions.filter((item) => !ids.has(item.videoId));
        store.analyticsEvents = store.analyticsEvents.filter((item) => !ids.has(item.videoId));
        store.auditLogs = store.auditLogs.filter((item) => !item.videoId || !ids.has(item.videoId));
        return { count: ids.size };
      });
    },
  },
  distribution: {
    async findUnique(args: any) {
      const store = await readStore();
      const row = store.distributions.find((item) => matches(item, args.where));
      return row ? attachDistribution(store, row, args.include) : null;
    },
    async findMany(args: any = {}) {
      const store = await readStore();
      let rows = store.distributions.filter((item) => matches(item, args.where));
      rows = sortRows(rows, args.orderBy);
      if (args.take) rows = rows.slice(0, args.take);
      return rows.map((item) => attachDistribution(store, item, args.include));
    },
    async findFirst(args: any = {}) {
      const rows = await this.findMany({ ...args, take: 1 });
      return rows[0] || null;
    },
    async createMany(args: any) {
      return withLock((store) => {
        const now = new Date();
        for (const data of args.data) {
          const row: Distribution = {
            id: crypto.randomUUID(), videoId: data.videoId, platform: data.platform as Platform,
            status: (data.status ?? 'PENDING') as DistributionStatus, externalId: null, externalUrl: null,
            error: null, receiptJson: '{}', capabilitiesJson: '{}', publishedAt: null, lastSyncedAt: null,
            views: 0, watchMinutes: 0, likes: 0, comments: 0, shares: 0, revenueMicros: 0n,
            createdAt: now, updatedAt: now,
          };
          store.distributions.push(row);
        }
        return { count: args.data.length };
      });
    },
    async update(args: any) {
      return withLock((store) => {
        const row = store.distributions.find((item) => matches(item, args.where));
        if (!row) throw new Error('Distribution not found.');
        applyData(row as any, args.data);
        return clone(row);
      });
    },
    async updateMany(args: any) {
      return withLock((store) => {
        let count = 0;
        for (const row of store.distributions) if (matches(row, args.where)) { applyData(row as any, args.data); count += 1; }
        return { count };
      });
    },
  },
  uploadSession: {
    async create(args: any) {
      return withLock((store) => {
        const now = new Date();
        const row: UploadSession = {
          id: crypto.randomUUID(), filename: args.data.filename, mimeType: args.data.mimeType,
          totalBytes: BigInt(args.data.totalBytes), bytesReceived: BigInt(args.data.bytesReceived ?? 0),
          tempPath: args.data.tempPath, metadataJson: args.data.metadataJson,
          status: (args.data.status ?? 'CREATED') as UploadStatus, error: args.data.error ?? null,
          expiresAt: args.data.expiresAt, createdAt: now, updatedAt: now,
        };
        store.uploadSessions.push(row); return clone(row);
      });
    },
    async findUnique(args: any) { const store = await readStore(); const row = store.uploadSessions.find((item) => matches(item, args.where)); return row ? clone(row) : null; },
    async findMany(args: any = {}) { const store = await readStore(); let rows = store.uploadSessions.filter((item) => matches(item, args.where)); rows = sortRows(rows, args.orderBy); return rows.map(clone); },
    async update(args: any) { return withLock((store) => { const row = store.uploadSessions.find((item) => matches(item, args.where)); if (!row) throw new Error('Upload session not found.'); applyData(row as any, args.data); return clone(row); }); },
  },
  platformConnection: {
    async findUnique(args: any) { const store = await readStore(); const row = store.platformConnections.find((item) => matches(item, args.where)); return row ? clone(row) : null; },
    async findMany(args: any = {}) { const store = await readStore(); let rows = store.platformConnections.filter((item) => matches(item, args.where)); rows = sortRows(rows, args.orderBy); return rows.map(clone); },
    async update(args: any) { return withLock((store) => { const row = store.platformConnections.find((item) => matches(item, args.where)); if (!row) throw new Error('Connection not found.'); applyData(row as any, args.data); return clone(row); }); },
    async upsert(args: any) {
      return withLock((store) => {
        const existing = store.platformConnections.find((item) => matches(item, args.where));
        if (existing) { applyData(existing as any, args.update || {}); return clone(existing); }
        const now = new Date(); const data = args.create;
        const row: PlatformConnection = {
          id: crypto.randomUUID(), platform: data.platform as Platform, label: data.label,
          status: (data.status ?? 'DISCONNECTED') as ConnectionStatus,
          accessTokenEncrypted: data.accessTokenEncrypted ?? null, refreshTokenEncrypted: data.refreshTokenEncrypted ?? null,
          tokenExpiresAt: data.tokenExpiresAt ?? null, metadataJson: data.metadataJson ?? '{}', lastError: data.lastError ?? null,
          createdAt: now, updatedAt: now,
        };
        store.platformConnections.push(row); return clone(row);
      });
    },
  },
  analyticsEvent: {
    async createMany(args: any) {
      return withLock((store) => {
        for (const data of args.data) store.analyticsEvents.push({ id: crypto.randomUUID(), videoId: data.videoId, platform: data.platform as Platform, type: data.type, value: data.value ?? 0, metadataJson: data.metadataJson ?? '{}', occurredAt: data.occurredAt ?? new Date() });
        return { count: args.data.length };
      });
    },
  },
  auditLog: {
    async create(args: any) {
      return withLock((store) => {
        const data = args.data;
        const row: AuditLog = { id: crypto.randomUUID(), videoId: data.videoId ?? null, action: data.action, actor: data.actor ?? 'system', detailsJson: data.detailsJson ?? '{}', createdAt: data.createdAt ?? new Date() };
        store.auditLogs.push(row); return clone(row);
      });
    },
  },
  async $transaction<T>(fn: (tx: any) => Promise<T>) { return fn(db); },
  async $disconnect() { return undefined; },
  async $queryRaw(_strings: TemplateStringsArray, ..._values: unknown[]) { await ensureStore(); return [{ ok: 1 }]; },
};
