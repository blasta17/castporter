import type { Platform } from './types';

export const PLATFORM_DETAILS: Record<Platform, {
  name: string;
  short: string;
  description: string;
  capabilities: string[];
  accent: string;
}> = {
  YOUTUBE: {
    name: 'YouTube', short: 'YT', description: 'Global video distribution and discovery.',
    capabilities: ['4K', 'Chapters', 'Captions', 'Scheduling', 'Analytics'], accent: '#ff4e62',
  },
  DAILYMOTION: {
    name: 'Dailymotion', short: 'DM', description: 'Premium video hosting and syndication.',
    capabilities: ['4K', 'Captions', 'Ads', 'Geo rights'], accent: '#7b7dff',
  },
  VIMEO: {
    name: 'Vimeo', short: 'VI', description: 'High-quality creator and business video.',
    capabilities: ['Privacy', 'Review links', '4K', 'Analytics'], accent: '#37b8ff',
  },
  PEERTUBE: {
    name: 'PeerTube', short: 'PT', description: 'Open, federated and independently hosted video.',
    capabilities: ['Federation', 'Captions', 'P2P', 'Resumable upload'], accent: '#f39c55',
  },
  WEBSITE: {
    name: 'Your website', short: 'WEB', description: 'Canonical source and embeddable player.',
    capabilities: ['Ownership', 'Embeds', 'Downloads', 'First-party analytics'], accent: '#48d9a0',
  },
};

export const ALL_PLATFORMS = Object.keys(PLATFORM_DETAILS) as Platform[];
