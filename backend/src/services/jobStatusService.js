import { getRedisClient } from '../config/redis.js';

export function jobKey(jobId) {
  return `job:${jobId}`;
}

export async function setJobStatus(jobId, fields) {
  const redis = await getRedisClient();
  const normalized = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value == null ? '' : String(value)])
  );
  await redis.hSet(jobKey(jobId), normalized);
  await redis.expire(jobKey(jobId), 60 * 60 * 24);
}

export async function getJobStatus(jobId) {
  const redis = await getRedisClient();
  return redis.hGetAll(jobKey(jobId));
}

export async function enqueueJob(queueName, job) {
  const redis = await getRedisClient();
  await redis.rPush(queueName, JSON.stringify(job));
}
