'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Bell, ChevronDown, CircleHelp, CloudUpload, Film, Gauge, Library,
  Search, Settings, Share2, Sparkles, Video, Waypoints,
} from 'lucide-react';
import { Brand } from './Brand';

const nav = [
  { href: '/studio', label: 'Overview', icon: Gauge },
  { href: '/studio/publish', label: 'Publish video', icon: CloudUpload },
  { href: '/studio/library', label: 'Video library', icon: Library },
  { href: '/studio/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/studio/connections', label: 'Connections', icon: Waypoints },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-switch">
          <div className="workspace-meta">
            <span className="workspace-avatar">CV</span>
            <div><strong>Creator workspace</strong><span>Local single-tenant</span></div>
          </div>
          <ChevronDown size={14} color="var(--subtle)" />
        </div>
        <div className="nav-section-label">Workspace</div>
        <nav className="side-nav">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/studio' ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} className={active ? 'active' : ''}><Icon size={17} />{label}{label === 'Publish video' && <span className="nav-badge">+</span>}</Link>;
          })}
        </nav>
        <div className="nav-section-label">Manage</div>
        <nav className="side-nav">
          <Link href="/demo"><Sparkles size={17} />Public demo</Link>
          <Link href="/studio/settings" className={pathname.startsWith('/studio/settings') ? 'active' : ''}><Settings size={17} />Settings</Link>
          <a href="/protocol-specification.md"><Share2 size={17} />CVP protocol</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <strong>CVP Starter</strong>
            <p>Mock publishing is active. Connect platform accounts to switch to live distribution.</p>
            <Link className="btn btn-sm" href="/studio/connections"><Video size={14} />Configure</Link>
          </div>
          <nav className="side-nav" style={{ marginTop: 10 }}>
            <a href="/README.md"><CircleHelp size={17} />Documentation</a>
          </nav>
        </div>
      </aside>
      <main className="app-main">
        <header className="app-topbar">
          <div className="search-box"><Search size={15} />Search videos, IDs, platforms…</div>
          <div className="top-actions">
            <Link className="btn btn-sm" href="/studio/publish"><CloudUpload size={15} />New video</Link>
            <button className="btn icon-btn" aria-label="Notifications"><Bell size={16} /></button>
            <div className="user-chip">MC</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
