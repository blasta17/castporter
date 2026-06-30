'use client';

import { useState } from 'react';
import { Check, ExternalLink, KeyRound, Link2, LoaderCircle, Save, Unplug } from 'lucide-react';
import type { Platform } from '@/lib/types';
import { PLATFORM_DETAILS } from '@/lib/platforms';
import { PlatformMark } from './PlatformMark';
import { StatusPill } from './StatusPill';

type Connection = {
  platform: Platform;
  label: string;
  status: string;
  hasToken: boolean;
  metadata: Record<string, unknown>;
  lastError: string | null;
};

function ConnectionCard({ item }: { item: Connection }) {
  const detail = PLATFORM_DETAILS[item.platform];
  const [token, setToken] = useState('');
  const [instanceUrl, setInstanceUrl] = useState(String(item.metadata.instanceUrl || ''));
  const [channelId, setChannelId] = useState(String(item.metadata.channelId || ''));
  const [channel, setChannel] = useState(String(item.metadata.channel || 'news'));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const save = async (disconnect = false) => {
    setSaving(true); setMessage('');
    const metadata = item.platform === 'PEERTUBE' ? { instanceUrl, channelId } : item.platform === 'DAILYMOTION' ? { channel } : {};
    const response = await fetch(`/api/connections/${item.platform}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token || undefined, metadata, disconnect }),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) { setMessage(body.error || 'Could not save connection.'); return; }
    setMessage(disconnect ? 'Disconnected.' : 'Connection saved.');
    setToken('');
    setTimeout(() => window.location.reload(), 450);
  };

  const isWebsite = item.platform === 'WEBSITE';
  const isYouTube = item.platform === 'YOUTUBE';
  return (
    <article className="connection-card">
      <div className="connection-head">
        <div className="connection-brand"><PlatformMark platform={item.platform} size={42} /><div><h3>{detail.name}</h3><p>{detail.description}</p></div></div>
        <StatusPill status={item.status} />
      </div>
      <div className="capability-tags">{detail.capabilities.map((cap) => <span className="cap-tag" key={cap}>{cap}</span>)}</div>
      {!isWebsite && <div className="connection-form">
        {isYouTube ? <>
          <a className="btn btn-primary" href="/api/oauth/youtube/start"><Link2 size={15} />Connect with Google</a>
          <div className="tiny subtle">Requires YouTube OAuth variables in <span className="mono">.env</span>. Google returns the creator to this dashboard.</div>
          <div className="field"><label>Advanced: existing access token</label><input className="input" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder={item.hasToken ? 'Token already stored securely' : 'Paste a temporary OAuth access token'} /></div>
        </> : <div className="field"><label>Access token</label><input className="input" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder={item.hasToken ? 'Token already stored securely' : `Paste your ${detail.name} token`} /></div>}
        {item.platform === 'DAILYMOTION' && <div className="field"><label>Channel category</label><input className="input" value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="news" /></div>}
        {item.platform === 'PEERTUBE' && <div className="form-grid"><div className="field"><label>Instance URL</label><input className="input" value={instanceUrl} onChange={(event) => setInstanceUrl(event.target.value)} placeholder="https://video.example.com" /></div><div className="field"><label>Channel ID</label><input className="input" value={channelId} onChange={(event) => setChannelId(event.target.value)} placeholder="1" /></div></div>}
        <div className="flex gap-8 wrap"><button className="btn btn-primary btn-sm" onClick={() => save(false)} disabled={saving || (!token && !item.hasToken)}>{saving ? <LoaderCircle size={14} /> : <Save size={14} />}Save connection</button>{item.status === 'CONNECTED' && <button className="btn btn-danger btn-sm" onClick={() => save(true)} disabled={saving}><Unplug size={14} />Disconnect</button>}</div>
        {message && <div className={message.includes('Could') ? 'error-box' : 'success-box'}>{message}</div>}
        {item.lastError && <div className="error-box">{item.lastError}</div>}
      </div>}
      {isWebsite && <div className="success-box"><Check size={14} style={{ verticalAlign: 'middle', marginRight: 7 }} />The canonical website adapter is always available and serves files through the CVP asset gateway.</div>}
    </article>
  );
}

export function ConnectionManager({ connections, mode }: { connections: Connection[]; mode: string }) {
  return (
    <>
      <div className={mode === 'live' ? 'success-box' : 'upload-progress'} style={{ margin: '0 0 18px' }}>
        <div className="flex items-center justify-between gap-12"><div><strong>{mode === 'live' ? 'Live publishing mode' : 'Safe mock publishing mode'}</strong><div className="tiny subtle" style={{ marginTop: 5 }}>{mode === 'live' ? 'Connected adapters can send real videos through official platform APIs.' : 'Uploads remain local and adapters return realistic deterministic receipts. Switch CVP_PUBLISH_MODE to live after credentials are ready.'}</div></div>{mode === 'live' ? <ExternalLink size={18} /> : <KeyRound size={18} color="var(--mint)" />}</div>
      </div>
      <div className="connection-grid">{connections.map((item) => <ConnectionCard item={item} key={item.platform} />)}</div>
    </>
  );
}
