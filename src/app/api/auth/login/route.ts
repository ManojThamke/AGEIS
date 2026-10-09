import { type NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db";
import { memberships, users } from "@/server/db/schema";
import { setSession } from "@/server/auth/session";
import { checkRateLimit } from "@/server/security/rate-limit";

const bodySchema = z.object({ password: z.string().min(1).max(200) });
export async function POST(request: NextRequest) {
  try {
    const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!await checkRateLimit("login", client, 10, 900)) return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429 });
    const input = bodySchema.parse(await request.json());
    const expected = process.env.DEMO_ACCESS_PASSWORD;
    if (process.env.AEGIS_DEMO_MODE !== "true" || !expected) return NextResponse.json({ error: "Demo sign-in is not configured." }, { status: 503 });
    const left = Buffer.from(input.password); const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return NextResponse.json({ error: "The password was not accepted." }, { status: 401 });
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, "demo@aegis.local"));
    if (!user) return NextResponse.json({ error: "Demo account is not seeded. Run npm run db:seed." }, { status: 503 });
    const [membership] = await db.select().from(memberships).where(eq(memberships.userId, user.id));
    if (!membership) return NextResponse.json({ error: "Demo account has no organization membership." }, { status: 503 });
    await setSession({ userId: user.id, organizationId: membership.organizationId, role: membership.role });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid sign-in request." }, { status: 400 });
    return NextResponse.json({ error: "Sign-in is unavailable. Check server configuration." }, { status: 503 });
  }
}
