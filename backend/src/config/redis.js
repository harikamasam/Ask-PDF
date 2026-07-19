import { createClient } from 'redis';
import { env } from './env.js';

let client;
let blockingClient;

function attachRedisLogging(redisClient, name) {
  redisClient.on('error', (error) => {
    console.error(`[redis:${name}]`, error.message);
  });
}

export async function getRedisClient() {
  if (!client) {
    client = createClient({ url: env.redisUrl });
    attachRedisLogging(client, 'main');
    await client.connect();
  }
  return client;
}

export async function getBlockingRedisClient() {
  if (!blockingClient) {
    blockingClient = createClient({ url: env.redisUrl });
    attachRedisLogging(blockingClient, 'blocking');
    await blockingClient.connect();
  }
  return blockingClient;
}

export async function closeRedis() {
  await Promise.allSettled([
    client?.quit(),
    blockingClient?.quit()
  ]);
}
