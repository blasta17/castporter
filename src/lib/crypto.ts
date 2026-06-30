import crypto from 'node:crypto';

function key(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY || 'development-only-key-change-me-please';
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(value?: string | null): string | null {
  if (!value) return null;
  const [ivRaw, tagRaw, payloadRaw] = value.split('.');
  if (!ivRaw || !tagRaw || !payloadRaw) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(payloadRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
