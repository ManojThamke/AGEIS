import "server-only";
import { createHash } from "node:crypto";
import IORedis from "ioredis";

let redis: IORedis | undefined;
const script = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n`;

export async function checkRateLimit(scope: string, identity: string, limit: number, windowSeconds: number) {
  if (!process.env.REDIS_URL) throw new Error("Rate limiting requires REDIS_URL");
  redis ??= new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true, connectTimeout: 2500 });
  const digest = createHash("sha256").update(identity || "unknown").digest("hex");
  const count = Number(await redis.eval(script, 1, `aegis:rate:${scope}:${digest}`, String(windowSeconds)));
  return count <= limit;
}
