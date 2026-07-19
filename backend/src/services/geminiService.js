import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const embeddingModel = 'gemini-embedding-001';
const embeddingDimensions = 768;
const generationModel = 'gemini-2.5-flash';

let ai;

function getClient() {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return ai;
}

/** gemini-embedding-001 does not unit-normalize truncated (<3072) vectors. */
function l2Normalize(values) {
  let sumSquares = 0;
  for (let index = 0; index < values.length; index += 1) {
    sumSquares += values[index] * values[index];
  }

  const magnitude = Math.sqrt(sumSquares);
  if (!magnitude) {
    return values;
  }

  return values.map((value) => value / magnitude);
}

function extractEmbedding(response) {
  const values = response?.embedding?.values || response?.embeddings?.[0]?.values;
  if (!Array.isArray(values)) {
    throw new Error('Gemini embedding response did not include vector values');
  }
  if (values.length !== embeddingDimensions) {
    throw new Error(
      `Expected ${embeddingDimensions}-dimensional embedding, got ${values.length}`
    );
  }
  return l2Normalize(values);
}

export async function embedText(text) {
  const client = getClient();
  const response = await client.models.embedContent({
    model: embeddingModel,
    contents: text,
    config: {
      outputDimensionality: embeddingDimensions,
      // Indexing side of retrieval / Q&A pairs
      taskType: 'RETRIEVAL_DOCUMENT'
    }
  });
  return extractEmbedding(response);
}

export async function embedQuery(question) {
  const client = getClient();
  const response = await client.models.embedContent({
    model: embeddingModel,
    contents: question,
    config: {
      outputDimensionality: embeddingDimensions,
      // Chatbox Q&A pairing per Gemini docs (with RETRIEVAL_DOCUMENT docs)
      taskType: 'QUESTION_ANSWERING'
    }
  });
  return extractEmbedding(response);
}

export async function* streamGroundedAnswer({ question, chunks, conversationHistory = [] }) {
  const client = getClient();
  const context = chunks.map((chunk, index) => {
    return `[Source ${index + 1} | page ${chunk.sourcePage} | chunk ${chunk.chunkIndex}]\n${chunk.text}`;
  }).join('\n\n');

  const historyText = conversationHistory
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');

  const prompt = [
    'You are AskPDF, a document-grounded Q&A assistant.',
    'Answer the user using ONLY the retrieved document excerpts.',
    'If the excerpts do not contain the answer, say: "I don\'t have enough information in this document to answer that."',
    'Do not use outside knowledge. Do not guess.',
    'Cite supporting excerpts inline using source labels like [Source 1, page 3].',
    '',
    historyText ? `Conversation history:\n${historyText}\n` : '',
    `Retrieved document excerpts:\n${context}`,
    '',
    `Question: ${question}`
  ].join('\n');

  const stream = await client.models.generateContentStream({
    model: generationModel,
    contents: prompt,
    config: {
      temperature: 0.2
    }
  });

  for await (const chunk of stream) {
    const text = typeof chunk.text === 'function' ? chunk.text() : chunk.text;
    if (text) {
      yield text;
    }
  }
}
