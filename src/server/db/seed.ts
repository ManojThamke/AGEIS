import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { memberships, organizations, users } from "./schema";
import { loadLocalEnvironment } from "../load-local-env";

async function seed() {
  loadLocalEnvironment();
  if (process.env.AEGIS_DEMO_MODE !== "true") throw new Error("Refusing to seed demo records unless AEGIS_DEMO_MODE=true");
  const db = getDb();
  let [organization] = await db.select().from(organizations).where(eq(organizations.name, "AEGIS Demonstration"));
  if (!organization) [organization] = await db.insert(organizations).values({ name: "AEGIS Demonstration" }).returning();
  let [user] = await db.select().from(users).where(eq(users.email, "demo@aegis.local"));
  if (!user) [user] = await db.insert(users).values({ email: "demo@aegis.local", displayName: "Demo member" }).returning();
  await db.insert(memberships).values({ userId: user.id, organizationId: organization.id, role: "owner" }).onConflictDoNothing();
  console.log("Seeded demo organization and demo member. Credentials are configured in the server environment.");
  process.exit(0);
}

seed().catch((error) => { console.error(error); process.exit(1); });
