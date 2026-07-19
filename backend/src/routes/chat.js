import express from 'express';
import { env } from '../config/env.js';
import { Document } from '../models/Document.js';
import { Conversation } from '../models/Conversation.js';
import { embedQuery, streamGroundedAnswer } from '../services/geminiService.js';
import { findTopChunks } from '../services/vectorSearchService.js';

const router = express.Router();

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const { documentId, question, conversationHistory = [] } = req.body;
    if (!documentId || !question || typeof question !== 'string') {
      sendEvent(res, 'error', { message: 'documentId and question are required' });
      res.end();
      return;
    }

    const document = await Document.findById(documentId).lean();
    if (!document || document.status !== 'ready') {
      sendEvent(res, 'error', { message: 'Document is not ready for chat' });
      res.end();
      return;
    }

    const queryEmbedding = await embedQuery(question);
    const topChunks = await findTopChunks({
      documentId,
      queryEmbedding,
      topK: env.topK
    });

    // Temporary calibration log — remove once threshold is settled
    console.log('[askpdf:similarity]', {
      documentId,
      question,
      threshold: env.similarityThreshold,
      topScores: topChunks.map((chunk) => ({
        chunkIndex: chunk.chunkIndex,
        sourcePage: chunk.sourcePage,
        score: Number(chunk.score.toFixed(4))
      }))
    });

    const topScore = topChunks[0]?.score || 0;
    if (topScore < env.similarityThreshold) {
      const message = "I don't have enough information in this document to answer that.";
      sendEvent(res, 'low_confidence', {
        message,
        topScore,
        threshold: env.similarityThreshold
      });
      await Conversation.create({
        documentId,
        messages: [
          { role: 'user', content: question },
          { role: 'assistant', content: message }
        ]
      });
      res.end();
      return;
    }

    const sources = topChunks.map((chunk, index) => ({
      label: `Source ${index + 1}`,
      chunkIndex: chunk.chunkIndex,
      sourcePage: chunk.sourcePage,
      score: Number(chunk.score.toFixed(4)),
      preview: `${chunk.text.slice(0, 220)}${chunk.text.length > 220 ? '...' : ''}`
    }));

    sendEvent(res, 'metadata', { sources });

    let answer = '';
    for await (const token of streamGroundedAnswer({ question, chunks: topChunks, conversationHistory })) {
      answer += token;
      sendEvent(res, 'token', { token });
    }

    await Conversation.create({
      documentId,
      messages: [
        { role: 'user', content: question },
        { role: 'assistant', content: answer }
      ]
    });

    sendEvent(res, 'done', { sources });
    res.end();
  } catch (error) {
    sendEvent(res, 'error', { message: error.message || 'Chat failed' });
    res.end();
  }
});

export { router as chatRouter };
