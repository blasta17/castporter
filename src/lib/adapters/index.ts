import type { Platform } from '../types';
import type { PlatformAdapter } from './types';
import { MockAdapter } from './mock';
import { YouTubeAdapter } from './youtube';
import { DailymotionAdapter } from './dailymotion';
import { VimeoAdapter } from './vimeo';
import { PeerTubeAdapter } from './peertube';
import { publishMode } from '../config';

export function getAdapter(platform: Platform, forceMock = false): PlatformAdapter {
  if (forceMock || publishMode !== 'live' || platform === 'WEBSITE') return new MockAdapter(platform);
  switch (platform) {
    case 'YOUTUBE': return new YouTubeAdapter();
    case 'DAILYMOTION': return new DailymotionAdapter();
    case 'VIMEO': return new VimeoAdapter();
    case 'PEERTUBE': return new PeerTubeAdapter();
    default: return new MockAdapter(platform);
  }
}
