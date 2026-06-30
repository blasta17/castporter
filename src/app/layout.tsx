import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'CVP Studio', template: '%s · CVP Studio' },
  description: 'One canonical video. Every platform. One source of truth.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
