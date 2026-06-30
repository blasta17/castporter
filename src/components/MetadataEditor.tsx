'use client';

import { useState } from 'react';
import { RadioTower, Save } from 'lucide-react';

export function MetadataEditor({ video }: { video: { id: string; title: string; description: string; privacy: string; tags: string[] } }) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [privacy, setPrivacy] = useState(video.privacy);
  const [tags, setTags] = useState(video.tags.join(', '));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (propagate: boolean) => {
    setBusy(true); setMessage('');
    const response = await fetch(`/api/videos/${video.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, privacy, tags: tags.split(',').map((item) => item.trim()).filter(Boolean) }) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || 'Update failed.'); setBusy(false); return; }
    if (propagate) {
      const push = await fetch(`/api/videos/${video.id}/propagate`, { method: 'POST' });
      const result = await push.json();
      setMessage(result.failed ? `Canonical manifest updated. ${result.updated} platform copies updated; ${result.failed} failed.` : `Canonical manifest and ${result.updated} published copies updated.`);
    } else {
      setMessage('Canonical metadata and CVP manifest updated.');
    }
    setBusy(false);
    setTimeout(() => window.location.reload(), 900);
  };
  return <div className="form-grid"><div className="field full"><label>Universal title</label><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="field full"><label>Description</label><textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} /></div><div className="field"><label>Visibility</label><select className="select" value={privacy} onChange={(event) => setPrivacy(event.target.value)}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></div><div className="field"><label>Tags</label><input className="input" value={tags} onChange={(event) => setTags(event.target.value)} /></div><div className="field full"><div className="flex gap-8 wrap"><button className="btn" disabled={busy} onClick={() => save(false)}><Save size={15} />Save canonical metadata</button><button className="btn btn-primary" disabled={busy} onClick={() => save(true)}><RadioTower size={15} />Save & push to platforms</button></div>{message && <div className={message.includes('failed') ? 'error-box' : 'success-box'}>{message}</div>}</div></div>;
}
