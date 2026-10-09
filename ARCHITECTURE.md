# AEGIS AI architecture and delivery plan

## Repository inspection

The repository was empty at project start; there was no framework, source code, or existing product convention. This plan establishes a new Next.js App Router application.

## 1. Architecture and module boundaries

- `src/app`: server-rendered pages, route handlers, layouts, and accessible product UI.
- `src/components`: navigation, mission workbench, status indicators, and reusable controls.
- `src/server/auth`: authenticated principal resolution and authorization policy. Every protected handler obtains its organization scope here.
- `src/server/db`: Drizzle client, schema, migrations, and seed entry point.
- `src/server/missions`: mission use cases, input validation, task lifecycle, and read models.
- `src/server/agents`: typed state-machine contracts and provider adapters. Model-generated data is treated as untrusted and validated at the boundary.
- `src/server/tools`: explicit registry of allowlisted tools with schemas, authorization, and approval requirements.
- `src/server/jobs`: BullMQ queues, idempotent workers, retry limits, and cancellation checkpoints.
- `src/server/realtime`: event transport for progress and trace updates (SSE initially; persisted events are authoritative).
- `src/server/retrieval`: document ingestion, chunking, pgvector search, and source provenance.
- `src/server/observability`: audit events, redaction, budgets, latency, and provider usage.
- `src/lib`: shared domain types, schemas, formatting, and UI utilities.

Dependencies flow inward: route handlers call use cases; use cases depend on interfaces for persistence, providers, and queues. Browser code never receives provider credentials or privileged database access.

## 2. Database schema and migration plan

PostgreSQL is the source of truth. Drizzle migrations enable `vector` and create these organization-scoped entities: `users`, `organizations`, `memberships`, `missions`, `mission_tasks`, `mission_events`, `approvals`, `documents`, `document_chunks` (vector embedding), `sources`, `model_usage`, `api_integrations`, and `audit_logs`. UUID primary keys, timestamps, explicit status enums, foreign keys, uniqueness constraints, and indexes support idempotency and organization filtering. Add PostgreSQL row-level security after the first slice stabilizes; the application still enforces organization authorization on every read and write from day one. Migrations are committed and run before the worker/web process. Seed data is opt-in and visibly marked as demo data.

## 3. Agent and tool contracts

An execution is a versioned state machine: `queued → planning → awaiting_approval | running → verifying → succeeded | failed | cancelled`. A mission snapshot includes organization/user IDs, validated objective, constraints, budget/deadline, task DAG, attempt counters, event sequence, and cancellation flag. Agents return discriminated, Zod-validated results (plan, research findings with citations, analysis, proposed action, verification) with provenance and usage metadata. The orchestrator persists each transition and event before advancing. Retries are bounded and keyed by job/task/attempt. Tools are registered by stable name and version, accept schema-validated input, declare required permissions and whether approval is mandatory, and return `confirmed | rejected | uncertain` plus evidence. Only `confirmed` means success. Retrieved content is quoted as untrusted input and cannot grant instructions or permissions.

## 4. UI page map and design system

- Overview: active missions, truthful operational health, recent activity.
- Missions: searchable/filterable table and new-mission flow.
- Mission detail: objective, task graph, event timeline, citations, approval decisions, pause/resume/cancel.
- Research and knowledge: source library, ingestion state, retrieval preview.
- Analytics: model usage, latency, costs, budgets, and evaluation runs.
- Audit and settings: membership/roles, integrations, policy, and audit history.

Visual system: midnight navy (`#17252a`), warm ivory (`#f6f3eb`), antique brass (`#a88a52`), muted sage (`#758778`), restrained red for errors. Serif editorial display headings pair with a neutral sans-serif for controls/data. Thin rules, square-ish geometry, clear focus rings, keyboard navigation, responsive collapsible navigation, command palette, accessible tables, and explicit loading/empty/error/configuration states. Avoid synthetic metrics and false completion states.

## 5. Security and testing plan

Use server-only secrets, secure/httpOnly/sameSite cookies, password hashing or a vetted OIDC provider, organization membership and role checks in each use case, CSRF protection for cookie-authenticated mutations, Zod validation, rate limits, bounded request/job timeouts, concurrency and cost caps, redacted structured logs, audit records, and approval gates for sensitive tools. Prevent SSRF and unsafe URL/file access in ingestion; enforce MIME/size limits; isolate retrieved content from system instructions. Tests: unit tests for transitions, policy, schemas, budget/retry and idempotency; PostgreSQL integration tests for tenant scoping, constraints, queues, and APIs; Playwright end-to-end for login, mission creation, progress, approval, error and cancellation. CI runs typecheck, lint, unit/integration and critical E2E suites.

## 6. Phased implementation checklist

### Phase 1 — mission lifecycle vertical slice

- [ ] Establish app shell and visual tokens with responsive mission list/detail.
- [ ] Configure PostgreSQL/Drizzle migrations and explicit environment readiness states.
- [ ] Add server-side user/org authorization foundation.
- [ ] Create and validate a mission; persist a plan/task record and event history.
- [ ] Execute an end-to-end bounded demo-provider workflow through the explicit state machine; label demo mode and never imply external research/tool execution.
- [ ] Persist progress and show live/polling updates, traces, terminal errors, and retry/cancel controls.
- [ ] Add unit and database/API tests, seed, Docker, `.env.example`, and setup/deployment docs.

Acceptance: with configured PostgreSQL and Redis, a signed-in user can submit a mission, see a persisted plan progress through the bounded demo workflow, inspect its trace, and cancel or retry it; another organization cannot read or mutate it. Missing services/providers show actionable configuration states. Checks pass locally or their environmental blocker is documented.

### Phase 2 — provider-backed research and approvals

- [ ] Add server-side model adapters, budget enforcement, research agent, citation validation, tool registry, approval gates, pause/resume and SSE.
- [ ] Add organization and role management, external identity integration, rate limiting and audit views.

### Phase 3 — knowledge, analysis, and exports

- [ ] Add safe document ingestion, pgvector retrieval, project memory and source citations.
- [ ] Add CSV analysis, chart generation, report exports and richer mission planning.

### Phase 4 — operational maturity

- [ ] Add usage/cost/evaluation dashboards, tenant isolation hardening, observability alerts, load/failure tests, deployment pipeline and backup/recovery documentation.

## Phase 1 scope note

The first slice is intentionally a demo-provider lifecycle, not autonomous web research or external execution. It must be explicit in the interface and architecture so demo output cannot be mistaken for verified intelligence. Production auth, external identity, and the full agent/tool set are expanded in the next phases.
