import { env } from '../config/env.js';
import { Chunk } from '../models/Chunk.js';
import { Document } from '../models/Document.js';
import { setJobStatus } from '../services/jobStatusService.js';

export async function cleanupStaleJobs() {
  const staleBefore = new Date(Date.now() - env.jobStaleMinutes * 60 * 1000);
  const staleDocuments = await Document.find({
    status: { $in: ['queued', 'processing'] },
    updatedAt: { $lt: staleBefore }
  });

  for (const document of staleDocuments) {
    await Chunk.deleteMany({ documentId: document._id });
    document.status = 'failed';
    document.error = `Processing timed out after ${env.jobStaleMinutes} minutes`;
    await document.save();

    if (document.jobId) {
      await setJobStatus(document.jobId, {
        status: 'failed',
        stage: 'cleanup',
        progress: 100,
        error: document.error,
        documentId: document._id.toString()
      });
    }
  }

  return staleDocuments.length;
}

export function startCleanupInterval() {
  const interval = setInterval(() => {
    cleanupStaleJobs().catch((error) => {
      console.error('[cleanup]', error.message);
    });
  }, 5 * 60 * 1000);

  interval.unref?.();
}
