import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock, Clock3, ExternalLink, FileJson, Film, Gauge, Globe2, HardDrive, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { parseJson } from '@/lib/json';
import { PLATFORM_DETAILS } from '@/lib/platforms';
import { StatusPill } from '@/components/StatusPill';
import { PlatformMark } from '@/components/PlatformMark';
import { VideoActions } from '@/components/VideoActions';
import { MetadataEditor } from '@/components/MetadataEditor';
import type { AuditLog, Distribution, Video } from '@/lib/types';

const number = (value: number) => new Intl.NumberFormat('en', { notation: value > 9999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
const size = (value: bigint) => `${(Number(value) / 1024 / 1024).toFixed(Number(value) > 1024 ** 3 ? 1 : 0)} MB`;

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rawVideo = await db.video.findUnique({ where: { id }, include: { distributions: { orderBy: { platform: 'asc' } }, auditLogs: { orderBy: { createdAt: 'desc' }, take: 16 } } });
  if (!rawVideo) notFound();
  const video = rawVideo as Video & { distributions: Distribution[]; auditLogs: AuditLog[] };
  const tags = parseJson<string[]>(video.tagsJson, []);
  const manifest = parseJson<Record<string, unknown>>(video.manifestJson, {});
  const totals = video.distributions.reduce<{ views: number; watch: number; revenue: bigint }>((acc, item) => ({ views: acc.views + item.views, watch: acc.watch + item.watchMinutes, revenue: acc.revenue + item.revenueMicros }), { views: 0, watch: 0, revenue: 0n });
  return (
    <div className="page-wrap">
      <div className="page-head">
        <div><Link href="/studio/library" className="tiny muted flex items-center gap-8" style={{ marginBottom: 10 }}><ArrowLeft size={13} />Back to library</Link><h1>Video workspace</h1><p>One canonical asset, its platform copies, portable manifest and complete audit trail.</p></div>
        <VideoActions videoId={video.id} status={video.status} />
      </div>

      <div className="video-hero">
        <div className="player-card"><video src={`/api/assets/${video.id}`} controls preload="metadata" poster={video.thumbnailPath ? `/api/assets/${video.id}?thumbnail=1` : undefined} /></div>
        <aside className="video-info">
          <div className="flex justify-between items-center"><StatusPill status={video.status} /><span className="tiny subtle">CVP 0.1</span></div>
          <h1>{video.title}</h1><p>{video.description || 'No description yet. Edit the universal metadata below.'}</p>
          <div className="canonical-id">{video.canonicalId}</div>
          <div className="summary-line"><span>Created</span><strong>{video.createdAt.toLocaleString()}</strong></div>
          <div className="summary-line"><span>Asset</span><strong>{video.width ? `${video.width}×${video.height}` : 'Analyzing'} · {size(video.sizeBytes)}</strong></div>
          <div className="summary-line"><span>Duration</span><strong>{video.durationSec ? `${Math.floor(video.durationSec / 60)}:${String(Math.round(video.durationSec % 60)).padStart(2, '0')}` : '—'}</strong></div>
          <div className="summary-line"><span>SHA-256</span><strong className="mono">{video.sha256.slice(0, 15)}…</strong></div>
        </aside>
      </div>

      <div className="grid-4 mt-16">
        <div className="metric-card"><div className="metric-top"><span>Universal views</span><Globe2 size={16} color="var(--mint)" /></div><div className="metric-value">{number(totals.views)}</div><div className="metric-delta">Across {video.distributions.length} copies</div></div>
        <div className="metric-card"><div className="metric-top"><span>Watch minutes</span><Clock3 size={16} color="var(--mint)" /></div><div className="metric-value">{number(totals.watch)}</div><div className="metric-delta">Normalized total</div></div>
        <div className="metric-card"><div className="metric-top"><span>Estimated revenue</span><Gauge size={16} color="var(--mint)" /></div><div className="metric-value">${(Number(totals.revenue) / 1_000_000).toFixed(2)}</div><div className="metric-delta">Adapter-reported</div></div>
        <div className="metric-card"><div className="metric-top"><span>Rights</span><ShieldCheck size={16} color="var(--mint)" /></div><div className="metric-value" style={{ fontSize: 19 }}>{video.license}</div><div className="metric-delta">{video.rightsOwner || 'Owner not specified'}</div></div>
      </div>

      <section className="panel mt-16">
        <div className="panel-head"><div><h2>Platform distribution</h2><p>Capability negotiation, publication receipts and synchronized reach</p></div><span className="status status-connected">{video.distributions.filter((item) => item.status === 'PUBLISHED').length}/{video.distributions.length} live</span></div>
        <div className="panel-body distribution-list">
          {video.distributions.map((item) => {
            const detail = PLATFORM_DETAILS[item.platform];
            const receipt = parseJson<Record<string, unknown>>(item.receiptJson, {});
            return <div className="distribution-row" key={item.id}>
              <div className="distribution-name"><PlatformMark platform={item.platform} size={38} /><div><strong>{detail.name}</strong><span>{item.externalId || 'Awaiting platform identifier'}</span></div></div>
              <div className="distribution-metrics"><span className="mini-metric"><strong>{number(item.views)}</strong><span>views</span></span><span className="mini-metric"><strong>{number(item.likes)}</strong><span>likes</span></span><span className="mini-metric"><strong>{item.lastSyncedAt ? item.lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</strong><span>last sync</span></span></div>
              <div className="flex items-center gap-8"><StatusPill status={item.status} />{item.externalUrl && <a className="btn btn-sm icon-btn" href={item.externalUrl} target="_blank" rel="noreferrer" aria-label={`Open ${detail.name}`}><ExternalLink size={14} /></a>}</div>
              {item.error && <div className="error-box" style={{ gridColumn: '1/-1', marginTop: 0 }}>{item.error}</div>}
              {Object.keys(receipt).length > 0 && <details style={{ gridColumn: '1/-1' }}><summary className="tiny muted" style={{ cursor: 'pointer' }}>View CVP platform receipt</summary><pre className="protocol-code" style={{ marginTop: 10, maxHeight: 240 }}>{JSON.stringify(receipt, null, 2)}</pre></details>}
            </div>;
          })}
        </div>
      </section>

      <div className="grid-2 mt-16">
        <section className="panel"><div className="panel-head"><div><h2>Universal metadata</h2><p>Changes update the canonical manifest; adapter propagation can be extended per platform.</p></div><Film size={16} color="var(--mint)" /></div><div className="panel-body"><MetadataEditor video={{ id: video.id, title: video.title, description: video.description, privacy: video.privacy, tags }} /></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Audit timeline</h2><p>Every operation is recorded against the CVP identity.</p></div><CalendarClock size={16} color="var(--mint)" /></div><div className="panel-body timeline">{video.auditLogs.map((log) => <div className="timeline-item" key={log.id}><span className="timeline-dot" /><div><strong>{log.action.replaceAll('.', ' ')}</strong><p>{log.actor} · {log.createdAt.toLocaleString()}</p></div></div>)}{!video.auditLogs.length && <div className="small muted">No audit entries yet.</div>}</div></section>
      </div>

      <section className="panel mt-16"><div className="panel-head"><div><h2>Portable CVP manifest</h2><p>This is the platform-independent source of truth generated for the video.</p></div><FileJson size={16} color="var(--mint)" /></div><div className="panel-body"><pre className="protocol-code" style={{ maxHeight: 520 }}>{JSON.stringify(manifest, null, 2)}</pre><div className="success-box"><HardDrive size={14} style={{ verticalAlign: 'middle', marginRight: 7 }} />The same manifest is persisted in the CVP data volume under <span className="mono">/data/manifests</span>.</div></div></section>
    </div>
  );
}
