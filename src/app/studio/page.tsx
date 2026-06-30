export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Activity, ArrowRight, BarChart3, CloudUpload, Eye, Film, PlayCircle, Share2, TimerReset, Waypoints } from 'lucide-react';
import { db } from '@/lib/db';
import { aggregateTotals } from '@/lib/service';
import { MetricCard } from '@/components/MetricCard';
import { VideoTable } from '@/components/VideoTable';
import { PLATFORM_DETAILS } from '@/lib/platforms';
import { StatusPill } from '@/components/StatusPill';

const compact = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export default async function StudioDashboard() {
  const [videos, totalVideos, connections, totals] = await Promise.all([
    db.video.findMany({ include: { distributions: true }, orderBy: { createdAt: 'desc' }, take: 6 }),
    db.video.count(),
    db.platformConnection.findMany(),
    aggregateTotals(),
  ]);
  const publishedCopies = videos.flatMap((video) => video.distributions).filter((item) => item.status === 'PUBLISHED').length;
  const activeConnections = connections.filter((item) => item.status === 'CONNECTED').length;
  const reach = videos.flatMap((video) => video.distributions).reduce<Record<string, number>>((acc, item) => { acc[item.platform] = (acc[item.platform] || 0) + item.views; return acc; }, {});
  const maxReach = Math.max(...Object.values(reach), 1);

  return (
    <div className="page-wrap">
      <div className="page-head">
        <div><h1>Good morning, Creator</h1><p>Your canonical video library and every platform copy, in one place.</p></div>
        <div className="page-actions"><Link className="btn" href="/demo"><PlayCircle size={15} />Run demo</Link><Link className="btn btn-primary" href="/studio/publish"><CloudUpload size={15} />Publish video</Link></div>
      </div>

      <div className="grid-4">
        <MetricCard label="Total reach" value={compact(totals.views)} delta="Synchronized platform views" icon={Eye} />
        <MetricCard label="Watch time" value={`${compact(totals.watchMinutes)} min`} delta="Unified across destinations" icon={TimerReset} />
        <MetricCard label="Canonical videos" value={String(totalVideos)} delta={`${publishedCopies} published copies`} icon={Film} />
        <MetricCard label="Connections" value={`${activeConnections}/5`} delta={process.env.CVP_PUBLISH_MODE === 'live' ? 'Live API mode' : 'Safe mock mode'} icon={Waypoints} />
      </div>

      <div className="grid-3 mt-16" style={{ gridTemplateColumns: '1.5fr .8fr .8fr' }}>
        <section className="panel">
          <div className="panel-head"><div><h2>Reach by destination</h2><p>Current synchronized view totals</p></div><Link href="/studio/analytics" className="btn btn-sm">Full analytics<ArrowRight size={13} /></Link></div>
          <div className="panel-body">
            {Object.keys(reach).length ? <div className="stack">{Object.entries(reach).map(([platform, value]) => <div key={platform}><div className="flex justify-between small" style={{ marginBottom: 7 }}><span className="muted">{PLATFORM_DETAILS[platform as keyof typeof PLATFORM_DETAILS].name}</span><strong>{compact(value)}</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.max(4, (value / maxReach) * 100)}%` }} /></div></div>)} </div> : <div className="empty" style={{ padding: '28px 10px' }}><Activity size={22} color="var(--mint)" /><h3 style={{ marginTop: 12 }}>Reach begins after publishing</h3><p>Your first synchronized analytics will appear here automatically.</p></div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Protocol health</h2><p>CVP 0.1 services</p></div><StatusPill status="connected" /></div>
          <div className="panel-body stack">
            {[['Upload gateway', 'Healthy'], ['Background worker', 'Running'], ['Manifest digest', 'Ready'], ['Analytics sync', '15 min']].map(([label, value]) => <div className="summary-line" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Fast actions</h2><p>No terminal required</p></div><Share2 size={16} color="var(--mint)" /></div>
          <div className="panel-body stack"><Link className="btn" href="/studio/publish"><CloudUpload size={15} />Upload a video</Link><Link className="btn" href="/studio/connections"><Waypoints size={15} />Connect platforms</Link><Link className="btn" href="/studio/library"><BarChart3 size={15} />Browse library</Link></div>
        </section>
      </div>

      <section className="panel mt-16">
        <div className="panel-head"><div><h2>Recent videos</h2><p>Canonical assets and their latest distribution state</p></div><Link href="/studio/library" className="btn btn-sm">View all<ArrowRight size={13} /></Link></div>
        <VideoTable videos={videos} />
      </section>
    </div>
  );
}
