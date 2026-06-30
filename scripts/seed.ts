import { db } from '../src/lib/db';
import { encryptSecret } from '../src/lib/crypto';

const connections = [
  { platform: 'YOUTUBE' as const, label: 'YouTube', metadata: {} },
  { platform: 'DAILYMOTION' as const, label: 'Dailymotion', metadata: { channel: 'news' } },
  { platform: 'VIMEO' as const, label: 'Vimeo', metadata: {} },
  { platform: 'PEERTUBE' as const, label: 'PeerTube', metadata: { instanceUrl: '', channelId: '' } },
  { platform: 'WEBSITE' as const, label: 'Your website', metadata: {} },
];

async function main() {
  for (const item of connections) {
    await db.platformConnection.upsert({
      where: { platform: item.platform },
      update: {},
      create: {
        platform: item.platform,
        label: item.label,
        status: item.platform === 'WEBSITE' ? 'CONNECTED' : 'DISCONNECTED',
        metadataJson: JSON.stringify(item.metadata),
        accessTokenEncrypted: item.platform === 'WEBSITE' ? encryptSecret('local') : null,
      },
    });
  }
  console.log('[CVP] database ready');
}

main().finally(() => db.$disconnect());
