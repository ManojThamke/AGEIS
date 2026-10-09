import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db";
import { missionEvents, missionTasks, missions } from "@/server/db/schema";
import { requirePrincipal } from "@/server/auth/require-principal";
import { getMissionQueue } from "@/server/jobs/queue";
import { demoSteps } from "@/server/agents/demo-workflow";
import { checkRateLimit } from "@/server/security/rate-limit";

const createSchema = z.object({ objective: z.string().trim().min(12).max(2000) });
export async function GET() {
  try {
    const principal = await requirePrincipal();
    const rows = await getDb().select().from(missions).where(eq(missions.organizationId, principal.organizationId)).orderBy(desc(missions.createdAt)).limit(100);
    return NextResponse.json({ missions: rows });
  } catch (error) {
    if (error instanceof Response) return NextResponse.json({ error: "Sign in to view missions." }, { status: error.status });
    return NextResponse.json({ error: "Mission service is unavailable." }, { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const principal = await requirePrincipal();
    if (!await checkRateLimit("create-mission", principal.userId, 30, 3600)) return NextResponse.json({ error: "Mission creation limit reached. Try again later." }, { status: 429 });
    const { objective } = createSchema.parse(await request.json());
    if (process.env.AEGIS_DEMO_MODE !== "true") return NextResponse.json({ error: "Configure a model provider before creating live missions." }, { status: 503 });
    const db = getDb();
    const title = objective.split(/[.!?\n]/)[0].trim().slice(0, 80) || "Untitled mission";
    const mission = await db.transaction(async (tx) => {
      const [created] = await tx.insert(missions).values({ organizationId: principal.organizationId, createdBy: principal.userId, title, objective }).returning();
      await tx.insert(missionTasks).values(demoSteps.map((step, index) => ({ missionId: created.id, title: step.title, agent: step.agent, sequence: index + 1 })));
      await tx.insert(missionEvents).values({ missionId: created.id, kind: "created", message: "Mission received and queued for the demo workflow.", sequence: 1 });
      return created;
    });
    try { await getMissionQueue().add("run-demo", { missionId: mission.id }, { jobId: mission.id }); }
    catch {
      await db.update(missions).set({ status: "failed", error: "Queue unavailable; mission was saved but not started." }).where(eq(missions.id, mission.id));
      await db.insert(missionEvents).values({ missionId: mission.id, kind: "error", message: "Queue unavailable; mission was saved but not started.", sequence: 2 });
      return NextResponse.json({ mission, warning: "Queue unavailable; start services and retry the mission." }, { status: 202 });
    }
    return NextResponse.json({ mission }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return NextResponse.json({ error: "Sign in to create missions." }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter an objective between 12 and 2,000 characters." }, { status: 400 });
    return NextResponse.json({ error: "Mission could not be created. Check database and queue configuration." }, { status: 503 });
  }
}
