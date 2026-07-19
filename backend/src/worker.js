import { assertRuntimeEnv, env } from './config/env.js';
import { connectMongo } from './config/db.js';
import { closeRedis, getBlockingRedisClient, getRedisClient } from './config/redis.js';
import { cleanupStaleJobs, startCleanupInterval } from './pipeline/cleanup.js';
import { processDocumentJob } from './pipeline/processDocument.js';

assertRuntimeEnv();

let shuttingDown = false;

async function consumeJobs() {
  const redis = await getBlockingRedisClient();
  console.log(`AskPDF worker waiting on Redis queue "${env.queueName}"`);

  while (!shuttingDown) {
    const result = await redis.brPop(env.queueName, 0);
    if (!result?.element) {
      continue;
    }

    try {
      const job = JSON.parse(result.element);
      console.log(`Processing job ${job.jobId}`);
      await processDocumentJob(job);
      console.log(`Completed job ${job.jobId}`);
    } catch (error) {
      console.error('[worker job failed]', error.message);
    }
  }
}

async function start() {
  await connectMongo();
  await getRedisClient();
  await cleanupStaleJobs();
  startCleanupInterval();
  await consumeJobs();
}

process.on('SIGINT', async () => {
  shuttingDown = true;
  await closeRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  shuttingDown = true;
  await closeRedis();
  process.exit(0);
});

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
