import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { UploadWizard } from '@/components/UploadWizard';
import { DemoResult } from '@/components/DemoResult';

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ video?: string }> }) {
  const { video } = await searchParams;
  return (
    <main className="demo-page">
      <div className="demo-shell">
        <div className="demo-top"><Brand /><div className="flex items-center gap-12"><span className="demo-badge"><Sparkles size={13} />Safe interactive demo</span><Link href="/" className="btn btn-sm"><ArrowLeft size={14} />Back</Link></div></div>
        {!video && <><div className="demo-intro"><div className="eyebrow" style={{ justifyContent: 'center' }}>See CVP in motion</div><h1>Drop a video. Watch one identity become five platform copies.</h1><p>This demo accepts your local video, uploads it through the resumable browser flow and runs the complete CVP pipeline with safe simulated platform adapters.</p></div><UploadWizard demo /><p className="demo-note">Files remain inside your local CVP Docker volume. The demo does not transmit them to YouTube, Dailymotion, Vimeo or PeerTube.</p></>}
        {video && <DemoResult videoId={video} />}
      </div>
    </main>
  );
}
