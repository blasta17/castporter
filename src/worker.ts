import { db } from './lib/db';
import { analyzeVideo, cleanExpiredUploads, publishDistribution, syncDistribution } from './lib/service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let running = true;

async function tick() {
  await cleanExpiredUploads();

  const analysis = await db.video.findFirst({ where: { status: 'ANALYZING' }, orderBy: { createdAt: 'asc' } });
  if (analysis) {
    await analyzeVideo(analysis.id);
    return;
  }

  const dueScheduled = await db.video.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } }, select: { id: true }, take: 5,
  });
  for (const video of dueScheduled) {
    await db.video.update({ where: { id: video.id }, data: { status: 'PUBLISHING' } });
    await db.distribution.updateMany({ where: { videoId: video.id, status: 'SCHEDULED' }, data: { status: 'PUBLISHING' } });
  }

  const pending = await db.distribution.findFirst({ where: { status: 'PUBLISHING' }, orderBy: { updatedAt: 'asc' } });
  if (pending) {
    await publishDistribution(pending.id);
    return;
  }

  const stale = await db.distribution.findFirst({
    where: {
      status: 'PUBLISHED',
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } }],
    },
    orderBy: { lastSyncedAt: 'asc' },
  });
  if (stale) await syncDistribution(stale.id);
}

async function main() {
  console.log('[CVP worker] started');
  while (running) {
    try {
      await tick();
    } catch (error) {
      console.error('[CVP worker]', error);
    }
    await sleep(2500);
  }
  await db.$disconnect();
}

process.on('SIGTERM', () => { running = false; });
process.on('SIGINT', () => { running = false; });
void main();
