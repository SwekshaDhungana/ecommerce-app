import Redis from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.UPSTASH_REDIS_URL);
// await client.set("foo", "bar");
