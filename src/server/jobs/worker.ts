import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { eq, and, max, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { missionEvents, missionTasks, missions } from "../db/schema";
import { demoResult, demoSteps } from "../agents/demo-workflow";
import { loadLocalEnvironment } from "../load-local-env";

loadLocalEnvironment();
if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not configured");
const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
const db = getDb();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function event(missionId: string, kind: string, message: string) {
  const [last] = await db.select({ sequence: max(missionEvents.sequence) }).from(missionEvents).where(eq(missionEvents.missionId, missionId));
  await db.insert(missionEvents).values({ missionId, kind, message, sequence: Number(last?.sequence ?? 0) + 1 });
}

async function run(job: Job<{ missionId: string }>) {
  const { missionId } = job.data;
  const [mission] = await db.select().from(missions).where(eq(missions.id, missionId));
  if (!mission) return;
  const [claim] = await db.update(missions).set({ status: "planning", error: null, updatedAt: new Date() }).where(and(eq(missions.id, missionId), eq(missions.organizationId, mission.organizationId), inArray(missions.status, ["queued", "failed"]))).returning({ id: missions.id });
  if (!claim) return;
  await event(missionId, "status", "Demo workflow started. No external provider is configured.");
  try {
    for (let index = 0; index < demoSteps.length; index += 1) {
      const [current] = await db.select({ status: missions.status }).from(missions).where(eq(missions.id, missionId));
      if (current?.status === "cancelled") return;
      const step = demoSteps[index];
      await db.update(missions).set({ status: index === 2 ? "verifying" : "running", updatedAt: new Date() }).where(eq(missions.id, missionId));
      await db.update(missionTasks).set({ status: "running" }).where(and(eq(missionTasks.missionId, missionId), eq(missionTasks.sequence, index + 1)));
      await event(missionId, "agent", `${step.agent}: ${step.title}`);
      await sleep(700);
      const [afterStep] = await db.select({ status: missions.status }).from(missions).where(eq(missions.id, missionId));
      if (afterStep?.status === "cancelled") {
        await db.update(missionTasks).set({ status: "cancelled" }).where(and(eq(missionTasks.missionId, missionId), eq(missionTasks.sequence, index + 1), eq(missionTasks.status, "running")));
        return;
      }
      const output = index === 2 ? demoResult(mission.objective) : { mode: "demo", step: step.title };
      await db.update(missionTasks).set({ status: "succeeded", output }).where(and(eq(missionTasks.missionId, missionId), eq(missionTasks.sequence, index + 1)));
      await event(missionId, "task", `${step.title} — demonstration step complete.`);
    }
    await db.update(missions).set({ status: "succeeded", updatedAt: new Date() }).where(eq(missions.id, missionId));
    await event(missionId, "complete", "Demo workflow completed. Output is illustrative and contains no verified external findings.");
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Unexpected workflow failure";
    await db.update(missions).set({ status: "failed", error: message, updatedAt: new Date() }).where(eq(missions.id, missionId));
    await event(missionId, "error", message);
    throw error;
  }
}

new Worker("aegis-missions", run, { connection, concurrency: 4, lockDuration: 60_000 });
console.log("AEGIS demo mission worker is running");
