import type { LucideIcon } from 'lucide-react';

export function MetricCard({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: LucideIcon }) {
  return (
    <div className="metric-card">
      <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={16} /></span></div>
      <div className="metric-value">{value}</div>
      <div className={`metric-delta ${delta.startsWith('+') ? 'positive' : ''}`}>{delta}</div>
    </div>
  );
}
