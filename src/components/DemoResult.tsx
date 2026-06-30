'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { PLATFORM_DETAILS } from '@/lib/platforms';

type VideoPayload = {
  id: string;
  canonicalId: string;
  title: string;
  status: string;
  thumbnailPath: string | null;
  distributions: Array<{ id: string; platform: keyof typeof PLATFORM_DETAILS; status: string; externalUrl: string | null; views: number; error: string | null }>;
};

export function DemoResult({ videoId }: { videoId: string }) {
  const [video, setVideo] = useState<VideoPayload | null>(null);
  const [error, setError] = useState('');
  const publishTriggered = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Demo video not found.');
        if (!cancelled) setVideo(body);
        if (!publishTriggered.current && ['READY', 'SCHEDULED'].includes(body.status)) {
          publishTriggered.current = true;
          await fetch(`/api/videos/${videoId}/publish`, { method: 'POST' });
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load the demo.');
      }
    };
    void poll();
    const timer = setInterval(poll, 1800);
    return () => { cancelled = true; clearInterval(timer); };
  }, [videoId]);

  const reset = async () => {
    await fetch('/api/demo/reset', { method: 'POST' });
    window.location.href = '/demo';
  };

  if (error) return <div className="error-box" style={{ maxWidth: 760, margin: '40px auto' }}>{error}</div>;
  if (!video) return <div className="panel" style={{ maxWidth: 760, margin: '40px auto' }}><div className="empty"><LoaderCircle size={28} className="spin" /><h3 style={{ marginTop: 16 }}>Preparing your CVP demo</h3><p>The worker is creating the canonical asset record.</p></div></div>;

  const done = ['PUBLISHED', 'PARTIAL'].includes(video.status);
  const stages = [
    { label: 'Upload received', done: true },
    { label: 'Asset analyzed and fingerprinted', done: video.status !== 'ANALYZING' },
    { label: 'Canonical CVP manifest created', done: video.status !== 'ANALYZING' },
    { label: 'Platform copies distributed', done },
    { label: 'Analytics synchronized', done: video.distributions.some((item) => item.views > 0) },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="panel">
        <div className="panel-head"><div><h2>Live protocol run</h2><p>Your uploaded file is moving through the same backend workflow used by the studio.</p></div><StatusPill status={video.status} /></div>
        <div className="panel-body">
          <div className="grid-2">
            <div className="player-card"><video src={`/api/assets/${video.id}`} controls preload="metadata" /></div>
            <div>
              <div className="eyebrow">Canonical video</div><h2 style={{ margin: '13px 0 8px', letterSpacing: '-.035em' }}>{video.title}</h2><div className="canonical-id">{video.canonicalId}</div>
              <div className="timeline" style={{ marginTop: 20 }}>{stages.map((stage) => <div className="timeline-item" key={stage.label}><span className="timeline-dot" style={{ background: stage.done ? 'var(--mint)' : 'var(--subtle)', boxShadow: stage.done ? undefined : 'none' }} /><div><strong>{stage.label}</strong><p>{stage.done ? 'Completed and recorded in the audit trail.' : 'The background worker is processing this stage.'}</p></div></div>)}</div>
            </div>
          </div>
          <div className="platform-select-grid" style={{ marginTop: 20 }}>
            {video.distributions.map((item) => {
              const detail = PLATFORM_DETAILS[item.platform];
              return <div className="platform-option selected" key={item.id}><span className="platform-logo" style={{ background: detail.accent }}>{detail.short}</span><span><strong>{detail.name}</strong><span>{item.error || (item.views ? `${item.views.toLocaleString()} demo views synchronized` : 'Adapter running')}</span></span><span className="checkmark">{item.status === 'PUBLISHED' ? <Check size={11} /> : <LoaderCircle size={11} />}</span></div>;
            })}
          </div>
          <div className="flex justify-between wrap gap-12" style={{ marginTop: 22 }}><button className="btn" onClick={reset}><RotateCcw size={15} />Reset demo</button><Link href={`/studio/videos/${video.id}`} className="btn btn-primary">Open full video workspace<ArrowRight size={15} /></Link></div>
        </div>
      </div>
      <div className="demo-note"><Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />Demo publishing uses deterministic mock adapters, so no platform credentials are needed. The same adapter interface switches to official APIs in live mode.</div>
    </div>
  );
}
