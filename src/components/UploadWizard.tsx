'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Clock3, FileVideo, Globe2, ShieldCheck, UploadCloud, X } from 'lucide-react';
import type { Platform } from '@/lib/types';
import { ALL_PLATFORMS, PLATFORM_DETAILS } from '@/lib/platforms';

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
};

export function UploadWizard({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [tags, setTags] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>(demo ? ['YOUTUBE', 'DAILYMOTION', 'VIMEO', 'PEERTUBE', 'WEBSITE'] : ['YOUTUBE', 'DAILYMOTION', 'WEBSITE']);
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [rightsOwner, setRightsOwner] = useState('');
  const [license, setLicense] = useState('all-rights-reserved');
  const [schedule, setSchedule] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Preparing upload');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const selectFile = (next: File | undefined) => {
    if (!next) return;
    if (!next.type.startsWith('video/')) { setError('Please choose a video file.'); return; }
    setError('');
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    if (!title) setTitle(next.name.replace(/\.[^.]+$/, '').replaceAll(/[-_]+/g, ' '));
  };

  const togglePlatform = (platform: Platform) => {
    setPlatforms((current) => current.includes(platform) ? current.filter((value) => value !== platform) : [...current, platform]);
  };

  const canContinue = step === 1 ? Boolean(file) : step === 2 ? title.trim().length >= 2 : step === 3 ? platforms.length > 0 : true;

  const summary = useMemo(() => ({
    file: file?.name || 'Not selected',
    title: title || 'Untitled',
    destinations: `${platforms.length} platform${platforms.length === 1 ? '' : 's'}`,
    visibility: privacy,
    timing: schedule ? new Date(schedule).toLocaleString() : 'Publish when ready',
  }), [file, title, platforms, privacy, schedule]);

  const upload = async () => {
    if (!file || !title || !platforms.length) return;
    setUploading(true); setError(''); setProgress(0); setPhase('Creating secure upload session');
    try {
      const initResponse = await fetch('/api/uploads/init', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name, mimeType: file.type || 'video/mp4', size: file.size, title, description,
          language, tags: tags.split(',').map((value) => value.trim()).filter(Boolean), platforms, privacy,
          rightsOwner, license, territories: ['WORLDWIDE'], scheduledAt: schedule ? new Date(schedule).toISOString() : null, demo,
        }),
      });
      const init = await initResponse.json();
      if (!initResponse.ok) throw new Error(init.error || 'Could not initialize the upload.');
      const chunkSize = Number(init.chunkSize);
      let offset = Number(init.offset || 0);
      setPhase('Uploading video in resumable chunks');
      while (offset < file.size) {
        const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
        const response = await fetch(`/api/uploads/${init.uploadId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/octet-stream', 'X-Upload-Offset': String(offset) }, body: chunk,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'A video chunk could not be uploaded.');
        offset = Number(body.offset);
        setProgress(Math.min(96, Math.round((offset / file.size) * 96)));
      }
      setPhase('Creating the canonical CVP identity');
      const completeResponse = await fetch(`/api/uploads/${init.uploadId}/complete`, { method: 'POST' });
      const complete = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(complete.error || 'Could not finalize the upload.');
      setProgress(100); setPhase('Upload complete');
      await new Promise((resolve) => setTimeout(resolve, 450));
      router.push(demo ? `/demo?video=${complete.videoId}` : `/studio/videos/${complete.videoId}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed.');
      setUploading(false);
    }
  };

  return (
    <div className="wizard-layout">
      <section className="wizard-panel">
        <div className="wizard-head">
          <div><strong style={{ fontSize: 13 }}>{demo ? 'Interactive CVP demo' : 'New video distribution'}</strong><div className="tiny subtle" style={{ marginTop: 4 }}>No CLI required — everything happens in this interface.</div></div>
          <div className="steps">{[1, 2, 3, 4].map((value) => <span key={value} className={`step-dot ${value === step ? 'active' : value < step ? 'done' : ''}`}>{value < step ? <Check size={12} /> : value}</span>)}</div>
        </div>
        <div className="wizard-body">
          {step === 1 && (
            <div className="stack">
              {!file ? (
                <div className={`dropzone ${dragging ? 'dragging' : ''}`}
                  onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]); }}
                  onClick={() => inputRef.current?.click()}>
                  <div><div className="drop-icon"><UploadCloud size={28} /></div><h3>Drop your video here</h3><p>or click to browse your computer<br />MP4, WebM, MOV and other browser-supported video formats</p></div>
                  <input ref={inputRef} type="file" accept="video/*" onChange={(event) => selectFile(event.target.files?.[0])} />
                </div>
              ) : (
                <div className="file-preview">
                  <video src={preview} controls preload="metadata" />
                  <div className="file-meta"><strong>{file.name}</strong><span>{formatBytes(file.size)} · {file.type || 'video file'}</span><span>CVP will create a SHA-256 fingerprint and canonical identity.</span><button className="btn btn-sm btn-danger" style={{ marginTop: 13 }} onClick={() => { setFile(null); setPreview(''); }}><X size={14} />Remove</button></div>
                </div>
              )}
              <div className="grid-3">
                <div className="metric-card"><div className="metric-top"><span>Resumable</span><UploadCloud size={15} color="var(--mint)" /></div><div className="small muted" style={{ marginTop: 12, lineHeight: 1.55 }}>4 MB chunks continue safely after network interruptions.</div></div>
                <div className="metric-card"><div className="metric-top"><span>Fingerprint</span><ShieldCheck size={15} color="var(--mint)" /></div><div className="small muted" style={{ marginTop: 12, lineHeight: 1.55 }}>Every asset receives a verifiable SHA-256 digest.</div></div>
                <div className="metric-card"><div className="metric-top"><span>Canonical ID</span><Globe2 size={15} color="var(--mint)" /></div><div className="small muted" style={{ marginTop: 12, lineHeight: 1.55 }}>One stable identity maps every platform copy.</div></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <div className="field full"><label>Video title</label><input className="input" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="A clear, compelling title" /><span className="help">Used as the universal title and adapted to each destination.</span></div>
              <div className="field full"><label>Description</label><textarea className="textarea" value={description} maxLength={5000} onChange={(event) => setDescription(event.target.value)} placeholder="Tell viewers what this video is about…" /></div>
              <div className="field"><label>Primary language</label><select className="select" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="fr-CA">Français (Canada)</option><option value="fr">Français</option><option value="es">Español</option><option value="de">Deutsch</option><option value="zh">中文</option></select></div>
              <div className="field"><label>Tags</label><input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="documentary, montreal, travel" /><span className="help">Comma-separated; CVP normalizes platform limits.</span></div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}><div><strong style={{ fontSize: 14 }}>Choose destinations</strong><div className="tiny subtle" style={{ marginTop: 4 }}>CVP negotiates capabilities and records a receipt for every platform.</div></div><span className="status status-connected">{platforms.length} selected</span></div>
              <div className="platform-select-grid">
                {ALL_PLATFORMS.map((platform) => {
                  const detail = PLATFORM_DETAILS[platform]; const selected = platforms.includes(platform);
                  return <label key={platform} className={`platform-option ${selected ? 'selected' : ''}`}><input type="checkbox" checked={selected} onChange={() => togglePlatform(platform)} /><span className="platform-logo" style={{ background: `linear-gradient(145deg, ${detail.accent}, #243947)` }}>{detail.short}</span><span><strong>{detail.name}</strong><span>{detail.capabilities.slice(0, 3).join(' · ')}</span></span><span className="checkmark"><Check size={11} /></span></label>;
                })}
              </div>
              {!demo && <div className="success-box">Disconnected platforms run through the safe mock adapter until you add credentials under Connections. Set <span className="mono">CVP_PUBLISH_MODE=live</span> for real API publishing.</div>}
            </div>
          )}

          {step === 4 && (
            <div className="form-grid">
              <div className="field"><label>Visibility</label><select className="select" value={privacy} onChange={(event) => setPrivacy(event.target.value as any)}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></div>
              <div className="field"><label>Publish timing</label><input className="input" type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} /><span className="help">Leave blank to publish manually when analysis is ready.</span></div>
              <div className="field"><label>Rights owner</label><input className="input" value={rightsOwner} onChange={(event) => setRightsOwner(event.target.value)} placeholder="Your name or company" /></div>
              <div className="field"><label>License</label><select className="select" value={license} onChange={(event) => setLicense(event.target.value)}><option value="all-rights-reserved">All rights reserved</option><option value="CC-BY-4.0">Creative Commons BY 4.0</option><option value="CC-BY-SA-4.0">Creative Commons BY-SA 4.0</option><option value="public-domain">Public domain</option></select></div>
              <div className="field full"><div className="success-box"><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 7 }} />CVP will generate a digest-verified protocol manifest, distribution records and an auditable operation timeline.</div></div>
            </div>
          )}
          {error && <div className="error-box">{error}</div>}
          {uploading && <div className="upload-progress"><div className="upload-progress-head"><span>{phase}</span><strong>{progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>}
        </div>
        <div className="wizard-footer">
          <button className="btn" disabled={step === 1 || uploading} onClick={() => setStep((value) => Math.max(1, value - 1))}><ChevronLeft size={15} />Back</button>
          {step < 4 ? <button className="btn btn-primary" disabled={!canContinue || uploading} onClick={() => setStep((value) => Math.min(4, value + 1))}>Continue<ChevronRight size={15} /></button> : <button className="btn btn-primary" disabled={!canContinue || uploading} onClick={upload}><UploadCloud size={16} />{uploading ? 'Uploading…' : demo ? 'Run CVP demo' : schedule ? 'Upload & schedule' : 'Upload video'}</button>}
        </div>
      </section>
      <aside className="summary-card">
        <div className="flex items-center gap-12" style={{ marginBottom: 15 }}><div className="drop-icon" style={{ width: 40, height: 40, margin: 0, borderRadius: 12 }}><FileVideo size={18} /></div><div><h3 style={{ margin: 0 }}>Distribution summary</h3><div className="tiny subtle" style={{ marginTop: 4 }}>CVP protocol 0.1</div></div></div>
        {Object.entries(summary).map(([label, value]) => <div className="summary-line" key={label}><span>{label[0].toUpperCase() + label.slice(1)}</span><strong>{value}</strong></div>)}
        <div style={{ marginTop: 16 }}><div className="tiny subtle" style={{ marginBottom: 8 }}>Selected platforms</div><div className="platform-stack">{platforms.map((platform) => <span key={platform} className="platform-chip" style={{ width: 32, height: 32, background: PLATFORM_DETAILS[platform].accent }} title={PLATFORM_DETAILS[platform].name}>{PLATFORM_DETAILS[platform].short}</span>)}</div></div>
        <div className="success-box" style={{ marginTop: 18 }}><Clock3 size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Your browser handles the upload. The background worker handles analysis, publishing and analytics sync.</div>
      </aside>
    </div>
  );
}
