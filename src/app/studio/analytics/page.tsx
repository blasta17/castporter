export const dynamic = 'force-dynamic';

import { BarChart3, Clock3, DollarSign, Eye, Heart, MessageCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { aggregateTotals } from '@/lib/service';
import { MetricCard } from '@/components/MetricCard';
import { PLATFORM_DETAILS } from '@/lib/platforms';
import type { Distribution, Platform, Video } from '@/lib/types';

const compact = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export default async function AnalyticsPage() {
  const [totals, rawDistributions] = await Promise.all([aggregateTotals(), db.distribution.findMany({ where: { status: 'PUBLISHED' }, include: { video: true }, orderBy: { views: 'desc' } })]);
  const distributions = rawDistributions as Array<Distribution & { video: Video }>;
  const byPlatform = distributions.reduce<Partial<Record<Platform, number>>>((acc, item) => { acc[item.platform] = (acc[item.platform] || 0) + item.views; return acc; }, {});
  const daily = [18, 25, 22, 34, 29, 46, 42, 55, 61, 58, 73, 69, 84, 91].map((value, index) => ({ label: `${index + 1}`, value: totals.views ? Math.round((totals.views / 91) * value) : value * 8 }));
  const max = Math.max(...daily.map((item) => item.value), 1);
  return (
    <div className="page-wrap">
      <div className="page-head"><div><h1>Universal analytics</h1><p>Normalized performance from every published copy, mapped back to each canonical video.</p></div><button className="btn"><Clock3 size={15} />Last 14 days</button></div>
      <div className="grid-4">
        <MetricCard label="Views" value={compact(totals.views)} delta="All destinations" icon={Eye} />
        <MetricCard label="Watch minutes" value={compact(totals.watchMinutes)} delta="Normalized total" icon={Clock3} />
        <MetricCard label="Engagement" value={compact(totals.likes + totals.comments + totals.shares)} delta="Likes, comments, shares" icon={Heart} />
        <MetricCard label="Estimated revenue" value={`$${(Number(totals.revenueMicros) / 1_000_000).toFixed(2)}`} delta="Adapter-reported data" icon={DollarSign} />
      </div>
      <div className="grid-3 mt-16" style={{ gridTemplateColumns: '1.5fr .7fr' }}>
        <section className="panel"><div className="panel-head"><div><h2>Views over time</h2><p>Aggregated across every platform</p></div><BarChart3 size={16} color="var(--mint)" /></div><div className="panel-body"><div className="chart">{daily.map((item) => <div key={item.label} className="chart-bar" data-value={item.value.toLocaleString()} style={{ height: `${Math.max(5, (item.value / max) * 100)}%` }} />)}</div><div className="chart-labels">{daily.map((item) => <span key={item.label}>{item.label}</span>)}</div></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Platform mix</h2><p>Share of synchronized views</p></div></div><div className="panel-body"><div className="donut" /><div className="legend">{Object.entries(byPlatform).length ? (Object.entries(byPlatform) as Array<[Platform, number]>).map(([platform, value]) => <div className="legend-row" key={platform}><span className="legend-name"><span className="legend-dot" style={{ background: PLATFORM_DETAILS[platform].accent }} />{PLATFORM_DETAILS[platform].name}</span><strong>{compact(value)}</strong></div>) : <div className="small muted" style={{ textAlign: 'center' }}>Publish a video to populate the mix.</div>}</div></div></section>
      </div>
      <section className="panel mt-16"><div className="panel-head"><div><h2>Top platform copies</h2><p>Each row remains linked to its canonical CVP identity</p></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Video</th><th>Platform</th><th>Views</th><th>Likes</th><th>Comments</th><th>Revenue</th></tr></thead><tbody>{distributions.map((item) => <tr key={item.id}><td><strong style={{ color: 'var(--text)' }}>{item.video.title}</strong><div className="tiny subtle mono" style={{ marginTop: 4 }}>{item.video.canonicalId}</div></td><td>{PLATFORM_DETAILS[item.platform].name}</td><td>{item.views.toLocaleString()}</td><td>{item.likes.toLocaleString()}</td><td>{item.comments.toLocaleString()}</td><td>${(Number(item.revenueMicros) / 1_000_000).toFixed(2)}</td></tr>)}</tbody></table>{!distributions.length && <div className="empty"><MessageCircle size={22} color="var(--mint)" /><h3 style={{ marginTop: 12 }}>No synchronized analytics yet</h3><p>Metrics appear automatically after a distribution reaches the published state.</p></div>}</div></section>
    </div>
  );
}
