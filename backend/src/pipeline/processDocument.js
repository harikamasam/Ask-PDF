import fs from 'node:fs/promises';
import { Chunk } from '../models/Chunk.js';
import { Document } from '../models/Document.js';
import { embedText } from '../services/geminiService.js';
import { setJobStatus } from '../services/jobStatusService.js';
import { chunkPages } from './chunkText.js';
import { parsePdf } from './parsePdf.js';

export async function processDocumentJob(job) {
  const { jobId, documentId, filePath } = job;
  const document = await Document.findById(documentId);

  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  try {
    document.status = 'processing';
    document.processingStartedAt = new Date();
    document.error = undefined;
    await document.save();
    await setJobStatus(jobId, { status: 'processing', stage: 'parsing', progress: 10, documentId });

    const parsed = await parsePdf(filePath);
    await setJobStatus(jobId, {
      status: 'processing',
      stage: 'chunking',
      progress: 30,
      documentId,
      pageCount: parsed.pageCount
    });

    const chunks = chunkPages(parsed.pages);
    await setJobStatus(jobId, {
      status: 'processing',
      stage: 'embedding',
      progress: 45,
      documentId,
      totalChunks: chunks.length
    });

    await Chunk.deleteMany({ documentId });

    const embeddedChunks = [];
    for (const chunk of chunks) {
      const embedding = await embedText(chunk.text);
      embeddedChunks.push({
        documentId,
        jobId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        sourcePage: chunk.sourcePage,
        embedding
      });

      const progress = 45 + Math.round(((chunk.chunkIndex + 1) / chunks.length) * 40);
      await setJobStatus(jobId, {
        status: 'processing',
        stage: 'embedding',
        progress,
        documentId,
        totalChunks: chunks.length,
        completedChunks: chunk.chunkIndex + 1
      });
    }

    await setJobStatus(jobId, { status: 'processing', stage: 'indexing', progress: 90, documentId });
    await Chunk.insertMany(embeddedChunks, { ordered: true });

    document.status = 'ready';
    document.totalChunks = embeddedChunks.length;
    document.completedAt = new Date();
    await document.save();

    await setJobStatus(jobId, {
      status: 'ready',
      stage: 'ready',
      progress: 100,
      documentId,
      totalChunks: embeddedChunks.length
    });

    await fs.unlink(filePath).catch(() => {});
  } catch (error) {
    await Chunk.deleteMany({ documentId });
    document.status = 'failed';
    document.error = error.message;
    await document.save();
    await setJobStatus(jobId, {
      status: 'failed',
      stage: 'failed',
      progress: 100,
      documentId,
      error: error.message
    });
    throw error;
  }
}
