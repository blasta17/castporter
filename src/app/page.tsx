import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2, CloudUpload, Fingerprint, Globe2, RefreshCw, ShieldCheck, Sparkles, Waypoints } from 'lucide-react';
import { Brand } from '@/components/Brand';

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <Brand />
        <nav className="nav-links"><a href="#product">Product</a><a href="#protocol">Protocol</a><Link href="/demo">Demo</Link><Link href="/studio/connections">Platforms</Link></nav>
        <div className="header-actions"><Link href="/demo" className="btn">View demo</Link><Link href="/studio" className="btn btn-primary">Open studio<ArrowRight size={15} /></Link></div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">Creator Video Portability Protocol</div>
          <h1>One video.<br /><span className="gradient-text">Every platform.</span></h1>
          <p className="hero-copy">Upload once through a friendly web interface. CVP creates a canonical identity, adapts your metadata, publishes each copy and brings every result back into one source of truth.</p>
          <div className="hero-actions"><Link href="/demo" className="btn btn-primary btn-lg"><Sparkles size={18} />Try the interactive demo</Link><Link href="/studio/publish" className="btn btn-lg"><CloudUpload size={18} />Publish a video</Link></div>
          <div className="hero-note"><span className="dot-online" />No CLI, no source repository and no platform-by-platform upload workflow.</div>
        </div>
        <div className="hero-visual">
          <div className="glow-orb" />
          <div className="window">
            <div className="window-bar">
              <span className="window-dot" />
              <span className="window-dot" />
              <span className="window-dot" />
              <div className="window-url">studio.cvp.local/publish</div>
            </div>
            <div className="window-body">
              <div className="fake-drop">
                <div className="fake-drop-icon"><CloudUpload size={24} /></div>
                <strong>Life in Montréal.mp4</strong>
                <div className="small muted" style={{ marginTop: 8 }}>842 MB · 4K · Fingerprint verified</div>
                <div className="progress-track" style={{ marginTop: 18 }}>
                  <div className="progress-fill" style={{ width: '82%' }} />
                </div>
                <div className="flex justify-between tiny subtle" style={{ marginTop: 8 }}>
                  <span>Publishing canonical asset</span><span>82%</span>
                </div>
              </div>
              <div className="platform-row">
                {['YT', 'DM', 'VI', 'PT'].map((name, index) => (
                  <div className="platform-mini" key={name}>
                    <div className="platform-orb" style={{ background: ['#ff4e62', '#7b7dff', '#37b8ff', '#f39c55'][index] }}>{name}</div>
                    {['YouTube', 'Dailymotion', 'Vimeo', 'PeerTube'][index]}
                    <div className="tiny" style={{ color: 'var(--mint)', marginTop: 5 }}>Ready</div>
                  </div>
                ))}
              </div>
              <div className="panel" style={{ marginTop: 16 }}>
                <div className="panel-body flex items-center justify-between">
                  <div>
                    <div className="tiny subtle">Canonical identity</div>
                    <div className="mono small" style={{ color: 'var(--mint)', marginTop: 5 }}>cvp:video:8c74f3a1…</div>
                  </div>
                  <CheckCircle2 size={20} color="var(--mint)" />
                </div>
              </div>
            </div>
          </div>
          <div className="float-card">
            <div className="flex items-center justify-between"><strong>Universal reach</strong><BarChart3 size={16} color="var(--mint)" /></div>
            <div className="float-metric">1.46M</div>
            <div className="tiny subtle">views synchronized across 5 copies</div>
          </div>
        </div>
      </section>

      <div className="logo-strip">{['YouTube', 'Dailymotion', 'Vimeo', 'PeerTube', 'Your website'].map((item) => <div className="logo-pill" key={item}>{item}</div>)}</div>

      <section className="section" id="product">
        <div className="section-heading"><div><div className="eyebrow">Built for the whole lifecycle</div><h2>Deposit the video.<br />CVP handles the rest.</h2></div><p>The interface guides creators from upload to rights, destinations, publication and analytics—while the protocol preserves a portable record underneath.</p></div>
        <div className="feature-grid">
          <article className="feature-card"><div className="feature-icon"><Fingerprint size={21} /></div><h3>Canonical identity</h3><p>A stable CVP ID and SHA-256 fingerprint connect every platform copy back to the same original asset.</p></article>
          <article className="feature-card"><div className="feature-icon"><Waypoints size={21} /></div><h3>Capability negotiation</h3><p>CVP understands which platform supports chapters, scheduling, captions, privacy and analytics before publishing.</p></article>
          <article className="feature-card"><div className="feature-icon"><RefreshCw size={21} /></div><h3>Bidirectional sync</h3><p>Metadata, publishing receipts and performance metrics flow back into one consistent creator workspace.</p></article>
          <article className="feature-card"><div className="feature-icon"><ShieldCheck size={21} /></div><h3>Rights-aware distribution</h3><p>Owner, license, territories and visibility travel with the video as explicit portable metadata.</p></article>
          <article className="feature-card"><div className="feature-icon"><Globe2 size={21} /></div><h3>Open adapters</h3><p>Start with official platform APIs today, then allow native CVP implementations as the ecosystem grows.</p></article>
          <article className="feature-card"><div className="feature-icon"><CloudUpload size={21} /></div><h3>Resumable browser upload</h3><p>Large files are uploaded in chunks from the web dashboard. Creators never need a terminal or deployment CLI.</p></article>
        </div>
      </section>

      <section className="section" id="protocol">
        <div className="protocol-band">
          <div><div className="eyebrow">Open foundation</div><h2 style={{ fontSize: 40, letterSpacing: '-.045em', margin: '14px 0' }}>A protocol, not another locked dashboard.</h2><p className="hero-copy" style={{ fontSize: 15 }}>CVP Studio is the reference product. The included schemas define portable manifests, platform receipts and capability declarations that other services can implement.</p><Link href="/studio/settings" className="btn btn-primary" style={{ marginTop: 18 }}>Explore the protocol<ArrowRight size={15} /></Link></div>
          <pre className="protocol-code">{`{
  "protocol": "cvp/0.1",
  "id": "cvp:video:8c74f3a1",
  "asset": {
    "sha256": "a8347d…",
    "duration_seconds": 426
  },
  "rights": {
    "owner": "Creator Studio",
    "territories": ["WORLDWIDE"]
  },
  "distribution": [
    { "platform": "youtube", "status": "published" },
    { "platform": "peertube", "status": "published" }
  ]
}`}</pre>
        </div>
      </section>

      <footer className="site-footer"><Brand /><span>CVP Studio 0.1 · Open protocol reference implementation</span><span>Publish once. Own the identity. Operate everywhere.</span></footer>
    </main>
  );
}
