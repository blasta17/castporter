import Link from 'next/link';
import { Play } from 'lucide-react';
import type { Distribution, Video } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { StatusPill } from './StatusPill';
import { PLATFORM_DETAILS } from '@/lib/platforms';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: value > 9999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

export function VideoTable({ videos }: { videos: Array<Video & { distributions: Distribution[] }> }) {
  if (!videos.length) return (
    <div className="empty"><div className="empty-icon"><Play size={22} /></div><h3>No videos yet</h3><p>Drop your first video into CVP Studio and publish it everywhere from one friendly workflow.</p><Link href="/studio/publish" className="btn btn-primary btn-sm">Publish a video</Link></div>
  );
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>Video</th><th>Status</th><th>Destinations</th><th>Views</th><th>Published</th></tr></thead>
        <tbody>
          {videos.map((video) => {
            const views = video.distributions.reduce((sum, item) => sum + item.views, 0);
            return (
              <tr key={video.id}>
                <td>
                  <Link href={`/studio/videos/${video.id}`} className="video-cell">
                    {video.thumbnailPath ? <img className="video-thumb" src={`/api/assets/${video.id}?thumbnail=1`} alt="" /> : <div className="video-thumb video-thumb-placeholder"><Play size={16} /></div>}
                    <div><strong>{video.title}</strong><span className="mono tiny subtle">{video.canonicalId}</span></div>
                  </Link>
                </td>
                <td><StatusPill status={video.status} /></td>
                <td><div className="platform-stack">{video.distributions.map((item) => <span key={item.id} className="platform-chip" style={{ background: PLATFORM_DETAILS[item.platform].accent }} title={PLATFORM_DETAILS[item.platform].name}>{PLATFORM_DETAILS[item.platform].short}</span>)}</div></td>
                <td><strong style={{ color: 'var(--text)' }}>{formatNumber(views)}</strong></td>
                <td>{formatDistanceToNow(video.createdAt, { addSuffix: true })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
