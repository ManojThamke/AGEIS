import { pgTable, pgEnum, uuid, text, timestamp, integer, jsonb, vector, index, uniqueIndex } from "drizzle-orm/pg-core";

export const missionStatus = pgEnum("mission_status", ["queued", "planning", "awaiting_approval", "running", "verifying", "succeeded", "failed", "cancelled"]);
export const taskStatus = pgEnum("task_status", ["queued", "running", "succeeded", "failed", "cancelled"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(), email: text("email").notNull().unique(), displayName: text("display_name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").references(() => users.id).notNull(), organizationId: uuid("organization_id").references(() => organizations.id).notNull(), role: text("role").notNull().default("owner"),
}, (t) => [uniqueIndex("membership_user_org_unique").on(t.userId, t.organizationId)]);
export const missions = pgTable("missions", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").references(() => organizations.id).notNull(), createdBy: uuid("created_by").references(() => users.id).notNull(),
  title: text("title").notNull(), objective: text("objective").notNull(), status: missionStatus("status").notNull().default("queued"), provider: text("provider").notNull().default("demo"),
  budgetCents: integer("budget_cents").notNull().default(0), error: text("error"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("missions_org_created_idx").on(t.organizationId, t.createdAt)]);
export const missionTasks = pgTable("mission_tasks", {
  id: uuid("id").defaultRandom().primaryKey(), missionId: uuid("mission_id").references(() => missions.id, { onDelete: "cascade" }).notNull(), title: text("title").notNull(), agent: text("agent").notNull(), status: taskStatus("status").notNull().default("queued"), sequence: integer("sequence").notNull(), output: jsonb("output"),
}, (t) => [index("mission_tasks_order_idx").on(t.missionId, t.sequence)]);
export const missionEvents = pgTable("mission_events", {
  id: uuid("id").defaultRandom().primaryKey(), missionId: uuid("mission_id").references(() => missions.id, { onDelete: "cascade" }).notNull(), kind: text("kind").notNull(), message: text("message").notNull(), sequence: integer("sequence").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), metadata: jsonb("metadata"),
}, (t) => [uniqueIndex("mission_event_sequence_unique").on(t.missionId, t.sequence)]);
export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").references(() => organizations.id).notNull(), content: text("content").notNull(), embedding: vector("embedding", { dimensions: 1536 }), metadata: jsonb("metadata"),
});
