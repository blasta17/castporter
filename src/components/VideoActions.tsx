'use client';

import { useEffect, useState } from 'react';
import { CloudUpload, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';

export function VideoActions({ videoId, status }: { videoId: string; status: string }) {
  const [busy, setBusy] = useState<'publish' | 'sync' | 'unpublish' | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (['ANALYZING', 'PUBLISHING', 'SCHEDULED'].includes(status)) {
      const timer = setInterval(() => window.location.reload(), 3500);
      return () => clearInterval(timer);
    }
  }, [status]);

  const action = async (name: 'publish' | 'sync' | 'unpublish') => {
    if (name === 'unpublish' && !window.confirm('Remove every published platform copy? The canonical CVP asset will remain archived in this workspace.')) return;
    setBusy(name); setError('');
    const response = await fetch(`/api/videos/${videoId}/${name}`, { method: 'POST' });
    const body = await response.json();
    if (!response.ok) { setError(body.error || `${name} failed.`); setBusy(''); return; }
    setTimeout(() => window.location.reload(), 650);
  };
  const canPublish = ['READY', 'PARTIAL', 'FAILED', 'ARCHIVED'].includes(status);
  const canSync = ['PUBLISHED', 'PARTIAL'].includes(status);
  const canUnpublish = ['PUBLISHED', 'PARTIAL'].includes(status);
  return (
    <div>
      <div className="flex gap-8 wrap">
        <button className="btn btn-primary" disabled={!canPublish || Boolean(busy)} onClick={() => action('publish')}>{busy === 'publish' ? <LoaderCircle size={15} /> : <CloudUpload size={15} />}{status === 'PARTIAL' || status === 'FAILED' ? 'Retry failed copies' : status === 'ARCHIVED' ? 'Republish copies' : 'Publish everywhere'}</button>
        <button className="btn" disabled={!canSync || Boolean(busy)} onClick={() => action('sync')}>{busy === 'sync' ? <LoaderCircle size={15} /> : <RefreshCw size={15} />}Sync analytics</button>
        <button className="btn btn-danger" disabled={!canUnpublish || Boolean(busy)} onClick={() => action('unpublish')}>{busy === 'unpublish' ? <LoaderCircle size={15} /> : <Trash2 size={15} />}Unpublish copies</button>
      </div>
      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
