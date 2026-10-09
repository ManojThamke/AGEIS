import { type NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db";
import { missionEvents, missionTasks, missions } from "@/server/db/schema";
import { requirePrincipal } from "@/server/auth/require-principal";
import { getMissionQueue } from "@/server/jobs/queue";

const actionSchema = z.object({ action: z.enum(["cancel", "retry"]) });
type Context = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();
export async function GET(_request: NextRequest, context: Context) {
  try {
    const principal = await requirePrincipal(); const { id } = await context.params;
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    const db = getDb();
    const [mission] = await db.select().from(missions).where(and(eq(missions.id, id), eq(missions.organizationId, principal.organizationId)));
    if (!mission) return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    const [tasks, events] = await Promise.all([
      db.select().from(missionTasks).where(eq(missionTasks.missionId, id)).orderBy(asc(missionTasks.sequence)),
      db.select().from(missionEvents).where(eq(missionEvents.missionId, id)).orderBy(asc(missionEvents.sequence)),
    ]);
    return NextResponse.json({ mission, tasks, events });
  } catch (error) {
    if (error instanceof Response) return NextResponse.json({ error: "Sign in to view missions." }, { status: error.status });
    return NextResponse.json({ error: "Mission service is unavailable." }, { status: 503 });
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const principal = await requirePrincipal(); const { id } = await context.params;
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    const { action } = actionSchema.parse(await request.json()); const db = getDb();
    const [mission] = await db.select().from(missions).where(and(eq(missions.id, id), eq(missions.organizationId, principal.organizationId)));
    if (!mission) return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    if (action === "cancel") {
      if (!["queued", "planning", "running", "verifying"].includes(mission.status)) return NextResponse.json({ error: "Only active missions can be cancelled." }, { status: 409 });
      await db.update(missions).set({ status: "cancelled", updatedAt: new Date() }).where(eq(missions.id, id));
      await db.update(missionTasks).set({ status: "cancelled" }).where(and(eq(missionTasks.missionId, id), eq(missionTasks.status, "queued")));
      const [last] = await db.select({ sequence: missionEvents.sequence }).from(missionEvents).where(eq(missionEvents.missionId, id)).orderBy(desc(missionEvents.sequence)).limit(1);
      await db.insert(missionEvents).values({ missionId: id, kind: "cancelled", message: "Cancellation requested by the user.", sequence: (last?.sequence ?? 0) + 1 });
      return NextResponse.json({ ok: true });
    }
    if (!["failed", "cancelled"].includes(mission.status)) return NextResponse.json({ error: "Only failed or cancelled missions can be retried." }, { status: 409 });
    await db.update(missions).set({ status: "queued", error: null, updatedAt: new Date() }).where(eq(missions.id, id));
    await db.update(missionTasks).set({ status: "queued", output: null }).where(eq(missionTasks.missionId, id));
    const [last] = await db.select({ sequence: missionEvents.sequence }).from(missionEvents).where(eq(missionEvents.missionId, id)).orderBy(desc(missionEvents.sequence)).limit(1);
    await db.insert(missionEvents).values({ missionId: id, kind: "retry", message: "Mission retry queued by the user.", sequence: (last?.sequence ?? 0) + 1 });
    try {
      await getMissionQueue().add("run-demo", { missionId: id }, { jobId: `${id}-${Date.now()}` });
    } catch {
      const message = "Queue unavailable; mission retry was not started.";
      await db.update(missions).set({ status: "failed", error: message, updatedAt: new Date() }).where(eq(missions.id, id));
      await db.insert(missionEvents).values({ missionId: id, kind: "error", message, sequence: (last?.sequence ?? 0) + 2 });
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return NextResponse.json({ error: "Sign in to update missions." }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid mission action." }, { status: 400 });
    return NextResponse.json({ error: "Mission update failed." }, { status: 503 });
  }
}
