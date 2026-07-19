import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env and set it.`);
  }
  return value;
}

export function assertRuntimeEnv() {
  required('GEMINI_API_KEY');
  required('MONGODB_URI');
  required('REDIS_URL');
  required('CLIENT_ORIGIN');
}

export const env = {
  get geminiApiKey() {
    return process.env.GEMINI_API_KEY;
  },
  get mongoUri() {
    return process.env.MONGODB_URI;
  },
  get redisUrl() {
    return process.env.REDIS_URL;
  },
  get port() {
    return Number(process.env.PORT || 4000);
  },
  get clientOrigin() {
    return process.env.CLIENT_ORIGIN;
  },
  get uploadDir() {
    return process.env.UPLOAD_DIR || 'uploads';
  },
  get queueName() {
    return process.env.QUEUE_NAME || 'askpdf:jobs';
  },
  get jobStaleMinutes() {
    return Number(process.env.JOB_STALE_MINUTES || 30);
  },
  get similarityThreshold() {
    return Number(process.env.SIMILARITY_THRESHOLD || 0.55);
  },
  get topK() {
    return Number(process.env.TOP_K || 5);
  }
};
