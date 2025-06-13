import Redis from "ioredis";
import { env } from "@/env";

const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

export const redis = redisClient;
