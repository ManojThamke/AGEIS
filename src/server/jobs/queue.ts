import "server-only";
import { Queue } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | undefined;
let queue: Queue | undefined;
export function getMissionQueue() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not configured");
  connection ??= new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
  queue ??= new Queue("aegis-missions", { connection, defaultJobOptions: { attempts: 2, backoff: { type: "exponential", delay: 1500 }, removeOnComplete: 500, removeOnFail: 1000 } });
  return queue;
}
