import { db } from '@/lib/db';
import { parseJson } from '@/lib/json';
import { ConnectionManager } from '@/components/ConnectionManager';

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const rows = await db.platformConnection.findMany({ orderBy: { platform: 'asc' } });
  const connections = rows.map((item) => ({ platform: item.platform, label: item.label, status: item.status, hasToken: Boolean(item.accessTokenEncrypted), metadata: parseJson<Record<string, unknown>>(item.metadataJson, {}), lastError: item.lastError }));
  return (
    <div className="page-wrap">
      <div className="page-head"><div><h1>Platform connections</h1><p>Connect official creator accounts from the dashboard. Creators never need to run a CLI or copy deployment commands.</p></div></div>
      {query.connected && <div className="success-box" style={{ marginBottom: 16 }}>YouTube connected successfully.</div>}
      {query.error && <div className="error-box" style={{ marginBottom: 16 }}>Connection error: {query.error.replaceAll('_', ' ')}</div>}
      <ConnectionManager connections={connections} mode={(process.env.CVP_PUBLISH_MODE || 'mock').toLowerCase()} />
    </div>
  );
}
