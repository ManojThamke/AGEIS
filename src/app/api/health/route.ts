import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { getMissionQueue } from "@/server/jobs/queue";

export async function GET() {
  const checks: Record<string, string> = {
    database: process.env.DATABASE_URL ? "unavailable" : "missing",
    queue: process.env.REDIS_URL ? "unavailable" : "missing",
    session: process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32 ? "ready" : "missing",
    mode: process.env.AEGIS_DEMO_MODE === "true" ? "demo" : "provider-unconfigured",
  };
  if (process.env.DATABASE_URL) {
    try { await getDb().execute(sql`select 1`); checks.database = "ready"; } catch { checks.database = "unavailable"; }
  }
  if (process.env.REDIS_URL) {
    try { await getMissionQueue().waitUntilReady(); checks.queue = "ready"; } catch { checks.queue = "unavailable"; }
  }
  return NextResponse.json({ checks, ready: checks.database === "ready" && checks.queue === "ready" && checks.session === "ready" });
}
