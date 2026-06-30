import path from 'node:path';

export const dataDir = process.env.CVP_DATA_DIR || path.join(process.cwd(), 'data');
export const uploadDir = path.join(dataDir, 'uploads');
export const thumbnailDir = path.join(dataDir, 'thumbs');
export const manifestDir = path.join(dataDir, 'manifests');
export const publishMode = (process.env.CVP_PUBLISH_MODE || 'mock').toLowerCase();
export const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024 * 1024);
export const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080';
