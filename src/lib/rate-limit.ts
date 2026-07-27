// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60s'), // 5 attempts per 60 seconds
  analytics: true,
  prefix: 'auth:login', // namespaces the keys in Redis
});

/**
 * Looser limiter for benign public writes (search logging) - tight enough
 * to stop scripts, loose enough for real browsing.
 */
export const searchRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '60s'),
  analytics: true,
  prefix: 'public:search',
});
