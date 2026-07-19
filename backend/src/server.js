import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { assertRuntimeEnv, env } from './config/env.js';
import { connectMongo } from './config/db.js';
import { getRedisClient } from './config/redis.js';
import { errorHandler } from './middleware/errorHandler.js';
import { chatRouter } from './routes/chat.js';
import { documentsRouter } from './routes/documents.js';

assertRuntimeEnv();

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'askpdf-api' });
});

app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);
app.use(errorHandler);

async function start() {
  await connectMongo();
  await getRedisClient();
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`AskPDF API listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
