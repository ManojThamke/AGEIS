# AEGIS AI

AEGIS is a mission intelligence workbench. The current Phase 1 implementation is a **bounded demonstration workflow**: it records a mission, enqueues three traceable local steps, and labels all output as illustrative. It does not browse the web, call a model, or execute external actions.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for module boundaries, schema, contracts, security plan, page map, and delivery phases.

## Local setup

Requirements: Node.js 20.9+, npm, and Docker Compose.

1. Copy `.env.example` to `.env.local`. Change `SESSION_SECRET` to at least 32 random characters and set a private `DEMO_ACCESS_PASSWORD`.
2. Start PostgreSQL with pgvector and Redis: `docker compose up -d`.
3. Install packages: `npm install`.
4. Apply schema: `npm run db:migrate`.
5. Create the opt-in demo organization and member: `npm run db:seed`.
6. In separate terminals, run `npm run worker` and `npm run dev`.
7. Open `http://localhost:3000/sign-in` and enter the server-configured demo password.

The demo sign-in is a shared single-workspace credential for local evaluation, not production identity management. Do not expose this demo deployment publicly. Production rollout requires an OIDC provider, membership administration, trusted proxy configuration for forwarded client IP headers, deployment secrets, and review of organization isolation. Redis-backed rate limits are applied to sign-in and mission creation.

## Checks

- `npm run typecheck` — TypeScript static check.
- `npm test` — unit tests.
- `npm run test:e2e` — Playwright sign-in form smoke test (requires browser install via `npx playwright install chromium`).
- `npm run build` — optimized Next.js build.

Integration and end-to-end mission execution require PostgreSQL, Redis, the worker, and demo environment variables. Current scope does not include model integrations, human approvals, SSE, document ingestion, or report exports; these are tracked in the architecture phases.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | BullMQ Redis connection |
| `SESSION_SECRET` | HMAC signing secret (32+ chars) |
| `DEMO_ACCESS_PASSWORD` | Server-only local demo sign-in password |
| `AEGIS_DEMO_MODE` | Must be `true` to seed demo records and create demo workflow missions |
| `OPENAI_API_KEY` | Reserved for a future server-side model adapter; unused in Phase 1 |

## Operational notes

The worker uses bounded BullMQ retries and the database event stream is authoritative. The interface polls persisted state. Secrets are never returned by health endpoints. Tool actions and research output are absent in the demo. pgvector is enabled in the initial migration for later retrieval; no embeddings are created in this phase.
