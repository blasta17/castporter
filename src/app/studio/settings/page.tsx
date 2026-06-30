import { Database, FileJson, KeyRound, RadioTower, Server, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const settings = [
    ['Protocol version', 'cvp/0.1'],
    ['Publishing mode', (process.env.CVP_PUBLISH_MODE || 'mock').toLowerCase()],
    ['Data directory', process.env.CVP_DATA_DIR || '/data'],
    ['Upload limit', `${Math.round(Number(process.env.MAX_UPLOAD_BYTES || 5368709120) / 1024 / 1024 / 1024)} GB`],
    ['Worker cadence', '2.5 seconds'],
    ['Analytics cadence', '15 minutes'],
  ];
  return (
    <div className="page-wrap">
      <div className="page-head"><div><h1>Protocol & system settings</h1><p>The installed reference implementation, storage model and production readiness checklist.</p></div></div>
      <div className="grid-3">
        <div className="metric-card"><div className="metric-top"><span>Protocol</span><FileJson size={16} color="var(--mint)" /></div><div className="metric-value" style={{ fontSize: 22 }}>CVP 0.1</div><div className="metric-delta positive">Schemas included</div></div>
        <div className="metric-card"><div className="metric-top"><span>Database</span><Database size={16} color="var(--mint)" /></div><div className="metric-value" style={{ fontSize: 22 }}>JSON store</div><div className="metric-delta">Persistent Docker volume</div></div>
        <div className="metric-card"><div className="metric-top"><span>Security</span><ShieldCheck size={16} color="var(--mint)" /></div><div className="metric-value" style={{ fontSize: 22 }}>AES-256-GCM</div><div className="metric-delta">Stored platform tokens</div></div>
      </div>
      <div className="grid-2 mt-16">
        <section className="panel"><div className="panel-head"><div><h2>Runtime configuration</h2><p>Effective values from the current container</p></div><Server size={16} color="var(--mint)" /></div><div className="panel-body">{settings.map(([key, value]) => <div className="summary-line" key={key}><span>{key}</span><strong className="mono">{value}</strong></div>)}</div></section>
        <section className="panel"><div className="panel-head"><div><h2>Production checklist</h2><p>Required before enabling live publishing</p></div><RadioTower size={16} color="var(--mint)" /></div><div className="panel-body stack">{[
          ['Replace APP_ENCRYPTION_KEY', 'Generate a unique 32+ character secret.'],
          ['Configure YouTube OAuth', 'Add client ID, secret and exact redirect URI.'],
          ['Connect platform accounts', 'Use the web Connections page—no CLI.'],
          ['Set CVP_PUBLISH_MODE=live', 'Only after testing every account.'],
          ['Add reverse proxy TLS', 'Use your domain and HTTPS in production.'],
          ['Move large assets to object storage', 'The local volume is suitable for MVP and demos.'],
        ].map(([title, note]) => <div className="flex gap-12" key={title}><span className="metric-icon"><KeyRound size={14} /></span><div><strong className="small">{title}</strong><div className="tiny subtle" style={{ marginTop: 4, lineHeight: 1.5 }}>{note}</div></div></div>)}</div></section>
      </div>
      <section className="panel mt-16"><div className="panel-head"><div><h2>Included protocol artifacts</h2><p>Open, portable contracts that can be implemented independently from CVP Studio.</p></div></div><div className="panel-body grid-3">{[
        ['Video manifest schema', 'Defines identity, asset fingerprint, metadata, rights and distribution copies.'],
        ['Platform receipt schema', 'Records the result of publish, update, sync and removal operations.'],
        ['Capability schema', 'Lets destinations declare support for upload, captions, chapters, analytics and more.'],
      ].map(([title, note]) => <div className="feature-card" style={{ minHeight: 170 }} key={title}><div className="feature-icon" style={{ marginBottom: 20 }}><FileJson size={19} /></div><h3>{title}</h3><p>{note}</p></div>)}</div></section>
    </div>
  );
}
