export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { CloudUpload, Filter, Search } from 'lucide-react';
import { db } from '@/lib/db';
import { VideoTable } from '@/components/VideoTable';

export default async function LibraryPage() {
  const videos = await db.video.findMany({ include: { distributions: true }, orderBy: { createdAt: 'desc' } });
  return (
    <div className="page-wrap">
      <div className="page-head"><div><h1>Video library</h1><p>{videos.length} canonical asset{videos.length === 1 ? '' : 's'} with their destinations, status and reach.</p></div><Link href="/studio/publish" className="btn btn-primary"><CloudUpload size={15} />New video</Link></div>
      <div className="panel">
        <div className="panel-head"><div className="search-box" style={{ width: 340 }}><Search size={15} />Search by title or canonical ID</div><button className="btn btn-sm"><Filter size={14} />Filters</button></div>
        <VideoTable videos={videos} />
      </div>
    </div>
  );
}
