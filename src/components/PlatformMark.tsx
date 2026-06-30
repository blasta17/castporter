import type { Platform } from '@/lib/types';
import { PLATFORM_DETAILS } from '@/lib/platforms';

export function PlatformMark({ platform, size = 36 }: { platform: Platform; size?: number }) {
  const detail = PLATFORM_DETAILS[platform];
  return (
    <span className="platform-logo" style={{ width: size, height: size, background: `linear-gradient(145deg, ${detail.accent}, #233947)` }} title={detail.name}>
      {detail.short}
    </span>
  );
}
