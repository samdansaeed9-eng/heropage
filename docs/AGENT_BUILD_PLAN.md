# Page Instant Clone — Autonomous Agent Build Plan

*A linear, self-verifying task ledger for building the full product. Designed so the agent can execute tasks one at a time, verify each one mechanically, check it off, and never have to guess at a decision that should have been fixed once, globally.*

---

## HOW TO USE THIS DOCUMENT (read this before touching any code)

1. **This file is both the plan and the progress tracker.** Every task has a checkbox in its heading: `### [ ] [P00-T01] ...`. When — and only when — a task's **Verify** block passes, flip that box to `[x]` and commit. Never flip a box before running Verify.
2. **Work top to bottom.** Tasks are ordered so nothing depends on something written later. Do not jump ahead to a screen/feature whose dependencies aren't checked off yet.
3. **One task = one commit.** Commit message format: `P0X-T0Y: <task title>`. Small, reversible commits are what make "no mistakes, auto-check" possible — if a Verify step fails, you can `git revert` the last commit instead of hunting through a giant diff.
4. **Never invent a convention this document already fixes.** Part B below fixes the stack, folder layout, naming, and error-handling style *once*. If a task doesn't specify something and Part B does, Part B wins. If neither specifies something, pick the simplest option, write it down as a one-line "Decision:" note directly under that task in this file, and move on — don't stop and ask.
5. **Do not call real Meta/Facebook endpoints until Phase P05.** Phases before that use the **mock Meta client** built in Phase P04 so the whole backend can be built and self-tested without a live, App-Review-approved Facebook app. Swapping mock → real is a config flag, not a rewrite.
6. **If a Verify step fails twice in a row after honest attempts to fix it, stop and surface it** rather than weakening the check or skipping the task. A green checkmark on this list must always mean "actually works," never "moved on."
7. **Every task that touches Leads, Inbox, Labels, or Campaigns must be checked against the Employee Data Isolation rule** (Part B, §B.6) before it's marked done. This is the single most spec-critical correctness rule in the whole build and it is trivial to silently violate.

---

## PART A — NON-NEGOTIABLE OPERATING RULES

- **A1. Utility-only, server-enforced.** Every code path that creates or sends a template must hard-fail (not just UI-warn) if `category !== 'UTILITY'`. Enforce this in the service/validation layer, not only in a UI checkbox.
- **A2. Nothing sends synchronously.** Any operation that sends more than one message must go through the BullMQ queue built in Phase P10. A `for` loop calling the Graph API directly is a failed task, even if it "works" in a demo.
- **A3. Three identity layers stay physically separate.** `User` (owner/employee), the Facebook Page access token, and `AdminUser` never share a table, a JWT secret, or a session cookie name.
- **A4. Employee isolation is enforced at the query layer.** Every Prisma query that lists/reads Leads, Inbox conversations, or Labels for an `EMPLOYEE`-role user must filter by that employee's own scope (see Part B §B.6), not filter in the frontend after fetching everything.
- **A5. Secrets never touch logs or client responses.** Page access tokens are encrypted at rest (Part B §B.7) and are never returned by any API response body, ever.
- **A6. Every external-facing input is validated server-side** with a Zod schema before it reaches a service method.
- **A7. Treat Section 7 (Meta integration) as "verify against developers.facebook.com before shipping."** Where this plan names a specific Graph API field/endpoint, treat it as the best-known-at-writing-time value and re-confirm it against Meta's current Messenger Platform docs at Phase P05/P08/P18.

---

## PART B — FIXED TECHNICAL DECISIONS (read once, apply everywhere)

### B.1 — Monorepo layout
```
/repo
  /apps
    /web         # Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui — public site + dashboard
    /api         # NestJS, TypeScript, Prisma — REST API + Socket.IO gateway
    /worker      # Thin entrypoint that boots ONLY the BullMQ processors from apps/api's compiled output
  /packages
    /shared      # Zod schemas, shared enums/types, referral & quota constants
    /config      # base tsconfig.json, eslint config, prettier config
  docker-compose.yml   # postgres, redis, minio (local S3), for local dev only
  pnpm-workspace.yaml
  turbo.json
```
- Package manager: **pnpm** (workspaces). Monorepo orchestration: **Turborepo**.
- `apps/worker` is a separate *process* — it imports the same Bull queue/processor modules `apps/api` registers.

### B.2 — Language/framework versions (pin these; don't drift mid-build)

| Package | Version constraint |
|---|---|
| Node.js | 20.x LTS |
| Next.js | ^14 (App Router) |
| NestJS | ^10 |
| Prisma | ^5 |
| PostgreSQL | 15 or 16 |
| Redis | 7.x |
| BullMQ | ^5 |
| Socket.IO | ^4 |
| Tailwind CSS | ^3 |
| Zod | ^3 |
| argon2 | latest |

### B.3 — Auth token scheme
- Customer auth (`User`): JWT **access token** (15 min TTL) + JWT **refresh token** (7 day TTL), both in `httpOnly`, `secure`, `sameSite=lax` cookies named `pi_at` / `pi_rt`. Signed with `JWT_SECRET`.
- Admin auth (`AdminUser`): identical mechanism, **different cookie names** (`pia_at` / `pia_rt`) and a **different secret** (`ADMIN_JWT_SECRET`). Enforce with two separate NestJS Guards (`CustomerAuthGuard`, `AdminAuthGuard`) that each only verify their own secret.
- Password hashing: `argon2id`, default library params.

### B.4 — API conventions
- Base path: `/api/v1/...` for customer-facing routes, `/api/v1/admin/...` for admin routes.
- All list endpoints are paginated: `?page=1&pageSize=25`, response shape `{ items, total, page, pageSize }`.
- All error responses: `{ error: { code: string, message: string } }`.
- A `GET /api/v1/health` endpoint (no auth) must exist from Phase P00 onward, returning `{ status: "ok", db: "ok"|"down", redis: "ok"|"down" }`.

### B.5 — Naming conventions
- Prisma models: PascalCase singular (`User`, `Page`, `Lead`)
- REST resource paths: kebab-case plural (`/pages`, `/campaign-recipients`)
- React components: PascalCase file + export (`InboxThread.tsx`)
- Zod schemas live in `packages/shared/src/schemas/<domain>.ts`

### B.6 — Employee data isolation model
**Decision, fixed for this build:** isolation is by **assigned Page**, not by individual lead assignment.

- Add `pageAssignments` (owner assigns which Pages each employee can see) — see Phase P15.
- Every Lead/Inbox/Label query for an `EMPLOYEE` session must be scoped: `WHERE page.id IN (SELECT pageId FROM PageAssignment WHERE userId = :employeeId)`.
- Build this as a single reusable Prisma query helper — `getScopedPageIds(user)` — in `apps/api/src/common/scope.ts`. Do not reimplement the filter ad hoc in each service.
- An `OWNER` session's scope is "all Pages the owner owns," always.

### B.7 — Secrets/encryption
- Page access tokens: encrypted with `AES-256-GCM` using a key derived from `TOKEN_ENCRYPTION_KEY` (32-byte, base64, env var). Decrypt only inside the send/webhook worker code path.
- `.env` is git-ignored from `P00-T01` onward. A committed secret at any later phase is a failed task.

### B.8 — Meta/Graph API version pinning
- `FB_GRAPH_API_VERSION` env var, set once, referenced by the Meta client (Phase P04) — never hardcode a version string inside a request URL.

---

## PART C — ENVIRONMENT VARIABLES REFERENCE

Create `/repo/.env.example` (committed, no real values) in Phase P00:

```env
# --- App ---
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
JWT_SECRET=
JWT_REFRESH_SECRET=
ADMIN_JWT_SECRET=
ADMIN_JWT_REFRESH_SECRET=
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pageinstant
REDIS_URL=redis://localhost:6379
TOKEN_ENCRYPTION_KEY=

# --- Facebook / Meta (Phase P04+) ---
META_MOCK_MODE=true
FB_APP_ID=
FB_APP_SECRET=
FB_WEBHOOK_VERIFY_TOKEN=
FB_GRAPH_API_VERSION=v21.0

# --- Storage (Phase P00 / P13) ---
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=pageinstant-dev
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# --- Crypto payment display (Phase P13) ---
CRYPTO_USDT_TRC20_ADDRESS=
BANK_TRANSFER_IBAN=
BANK_TRANSFER_ACCOUNT_NAME=
BANK_TRANSFER_BANK_NAME=

# --- Email (Phase P02 / P15) ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

# --- Support (Phase P17) ---
WHATSAPP_SUPPORT_NUMBER=
```

---

## PART D — GLOBAL VERIFICATION TOOLKIT

Run these from the repo root unless noted.

| ID | Command | Passes when |
|---|---|---|
| `CHECK:TYPECHECK` | `pnpm -w typecheck` | zero TS errors across all packages |
| `CHECK:LINT` | `pnpm -w lint` | zero eslint errors |
| `CHECK:UNIT` | `pnpm -w test` | all unit tests green |
| `CHECK:BUILD` | `pnpm -w build` | all three apps build without error |
| `CHECK:MIGRATE` | `pnpm --filter api exec prisma migrate status` | prints "Database schema is up to date!" |
| `CHECK:API-UP` | `curl -sf http://localhost:4000/api/v1/health` | JSON body `{"status":"ok","db":"ok","redis":"ok"}` |
| `CHECK:SEED` | `pnpm --filter api exec prisma db seed` | exits 0, and re-running it is idempotent |

---

## PART E — PHASE-BY-PHASE TASK LEDGER

---

### PHASE P00 — Repo & Environment Bootstrap

#### [ ] [P00-T01] Initialize monorepo skeleton
- **Depends on:** none
- **Files:** `/repo/pnpm-workspace.yaml`, `/repo/turbo.json`, `/repo/.gitignore`, `/repo/.env.example`, `/repo/apps/*`, `/repo/packages/*`
- **Do:**
  1. `pnpm init` at root, add `pnpm-workspace.yaml` listing `apps/*` and `packages/*`.
  2. Add root `turbo.json` with pipeline tasks `build`, `lint`, `test`, `typecheck`.
  3. `.gitignore`: `node_modules`, `.env`, `.next`, `dist`, `*.tsbuildinfo`.
  4. Create empty `apps/web`, `apps/api`, `apps/worker`, `packages/shared`, `packages/config` folders.
  5. Write `.env.example` exactly as in Part C.
- **Verify:** `pnpm install` exits 0; `git check-ignore .env` prints `.env`.

#### [ ] [P00-T02] Scaffold `apps/api` (NestJS) with a working `/health` endpoint
- **Depends on:** P00-T01
- **Files:** `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/health/health.controller.ts`
- **Do:**
  1. `nest new` inside `apps/api`, TypeScript, strict mode on.
  2. Implement `GET /api/v1/health` per Part B.4.
  3. Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` and global exception filter producing the Part B.4 error shape.
- **Verify:** `CHECK:API-UP` passes.

#### [ ] [P00-T03] Scaffold `apps/web` (Next.js 14 App Router + Tailwind + shadcn/ui)
- **Depends on:** P00-T01
- **Files:** `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/tailwind.config.ts`
- **Do:**
  1. `create-next-app` inside `apps/web`, TypeScript, App Router, Tailwind.
  2. Install/init shadcn/ui with a neutral base theme.
  3. Placeholder `/` page rendering "Page Instant Clone".
- **Verify:** `curl -sf http://localhost:3000 | grep -qi "Page Instant Clone"`.

#### [ ] [P00-T04] Docker Compose for local Postgres, Redis, MinIO
- **Depends on:** P00-T01
- **Files:** `/repo/docker-compose.yml`
- **Do:** Define `postgres:16`, `redis:7`, `minio/minio` services matching the ports in `.env.example` (5432, 6379, 9000/9001).
- **Verify:** `docker compose ps` shows all services `healthy`/`running`; `curl -sf http://localhost:9000/minio/health/live`.

#### [ ] [P00-T05] Shared config packages (`packages/config`, `packages/shared`)
- **Depends on:** P00-T01
- **Files:** `packages/config/tsconfig.base.json`, `packages/config/eslint-preset.js`, `packages/shared/src/index.ts`
- **Do:** Base strict `tsconfig`; a shared ESLint preset; `packages/shared` exports an (initially empty) `schemas/` and `constants/` folder.
- **Verify:** `CHECK:TYPECHECK`, `CHECK:LINT` both pass.

#### [ ] [P00-T06] CI-equivalent local script + README quickstart
- **Depends on:** P00-T02, P00-T03, P00-T04
- **Files:** `/repo/scripts/verify-all.sh`, `/repo/README.md`
- **Do:** `verify-all.sh` runs `CHECK:TYPECHECK`, `CHECK:LINT`, `CHECK:UNIT`, `CHECK:BUILD`, and (if services up) `CHECK:API-UP`. README documents the full local dev setup steps.
- **Verify:** running the script end-to-end on a clean clone exits 0.

---

### PHASE P01 — Database Schema & Migrations

#### [ ] [P01-T01] Install Prisma, point at local Postgres
- **Depends on:** P00-T04, P00-T02
- **Files:** `apps/api/prisma/schema.prisma`, `apps/api/src/prisma/prisma.service.ts`
- **Do:** `prisma init` inside `apps/api`; wire a NestJS `PrismaService` (extends `PrismaClient`, `onModuleInit` connects) and a global `PrismaModule`.
- **Verify:** `pnpm --filter api exec prisma db pull` connects without error.

#### [ ] [P01-T02] Write the full Prisma schema
- **Depends on:** P01-T01
- **Files:** `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  OWNER
  EMPLOYEE
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         UserRole
  ownerId      String?
  owner        User?    @relation("OwnerEmployees", fields: [ownerId], references: [id])
  employees    User[]   @relation("OwnerEmployees")
  createdAt    DateTime @default(now())

  ownedPages       Page[]            @relation("PageOwner")
  connectedPages   Page[]            @relation("PageConnector")
  labels           Label[]
  templates        Template[]
  campaigns        Campaign[]
  referral         Referral?
  referredSignups  ReferralRedemption[] @relation("ReferredUser")
  subscriptions    Subscription[]
  payments         Payment[]
  pageAssignments  PageAssignment[]
}

enum PageStatus {
  ACTIVE
  REVOKED
}

model Page {
  id                       String     @id @default(cuid())
  ownerId                  String
  owner                    User       @relation("PageOwner", fields: [ownerId], references: [id])
  connectedByUserId        String
  connectedBy              User       @relation("PageConnector", fields: [connectedByUserId], references: [id])
  fbPageId                 String     @unique
  pageName                 String
  pageCategory             String?
  pageAccessTokenEncrypted String
  tokenCreatedAt           DateTime   @default(now())
  status                   PageStatus @default(ACTIVE)

  leads         Lead[]
  templates     Template[]
  campaignPages CampaignPage[]
  messageLogs   MessageLog[]
  assignments   PageAssignment[]
}

model PageAssignment {
  id     String @id @default(cuid())
  pageId String
  page   Page   @relation(fields: [pageId], references: [id])
  userId String
  user   User   @relation(fields: [userId], references: [id])

  @@unique([pageId, userId])
}

model Lead {
  id            String    @id @default(cuid())
  pageId        String
  page          Page      @relation(fields: [pageId], references: [id])
  psid          String
  name          String?
  profilePicUrl String?
  lastMessageAt DateTime?
  createdAt     DateTime  @default(now())

  labels              LeadLabel[]
  campaignRecipients  CampaignRecipient[]
  messageLogs         MessageLog[]

  @@unique([pageId, psid])
}

model Label {
  id      String @id @default(cuid())
  ownerId String
  owner   User   @relation(fields: [ownerId], references: [id])
  name    String
  color   String

  leadLabels             LeadLabel[]
  campaignAudienceLabels CampaignAudienceLabel[]

  @@unique([ownerId, name])
}

model LeadLabel {
  leadId  String
  lead    Lead  @relation(fields: [leadId], references: [id])
  labelId String
  label   Label @relation(fields: [labelId], references: [id])

  @@id([leadId, labelId])
}

enum TemplateSource {
  GENERAL_LIBRARY
  PAGE_OWNED
  IMPORTED
}

enum MetaTemplateStatus {
  PENDING
  APPROVED
  REJECTED
}

model Template {
  id               String              @id @default(cuid())
  ownerId          String
  owner            User                @relation(fields: [ownerId], references: [id])
  pageId           String?
  page             Page?               @relation(fields: [pageId], references: [id])
  name             String
  language         String
  category         String              @default("UTILITY")
  source           TemplateSource
  metaTemplateName String?
  metaStatus       MetaTemplateStatus  @default(PENDING)
  bodyText         String
  variablesCount   Int                 @default(0)
  createdAt        DateTime            @default(now())

  campaigns   Campaign[]
  messageLogs MessageLog[]
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  COMPLETED
  FAILED
}

model Campaign {
  id          String         @id @default(cuid())
  ownerId     String
  owner       User           @relation(fields: [ownerId], references: [id])
  templateId  String
  template    Template       @relation(fields: [templateId], references: [id])
  status      CampaignStatus @default(DRAFT)
  scheduledAt DateTime?
  createdAt   DateTime       @default(now())

  campaignPages  CampaignPage[]
  audienceLabels CampaignAudienceLabel[]
  recipients     CampaignRecipient[]
}

model CampaignPage {
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  pageId     String
  page       Page     @relation(fields: [pageId], references: [id])

  @@id([campaignId, pageId])
}

enum AudienceMode {
  INCLUDE
  EXCLUDE
}

model CampaignAudienceLabel {
  campaignId String
  campaign   Campaign     @relation(fields: [campaignId], references: [id])
  labelId    String
  label      Label        @relation(fields: [labelId], references: [id])
  mode       AudienceMode

  @@id([campaignId, labelId, mode])
}

enum RecipientStatus {
  QUEUED
  SENT
  FAILED
}

model CampaignRecipient {
  id         String          @id @default(cuid())
  campaignId String
  campaign   Campaign        @relation(fields: [campaignId], references: [id])
  leadId     String
  lead       Lead            @relation(fields: [leadId], references: [id])
  status     RecipientStatus @default(QUEUED)
  error      String?

  @@unique([campaignId, leadId])
}

model MessageLog {
  id         String    @id @default(cuid())
  pageId     String
  page       Page      @relation(fields: [pageId], references: [id])
  leadId     String
  lead       Lead      @relation(fields: [leadId], references: [id])
  templateId String?
  template   Template? @relation(fields: [templateId], references: [id])
  sentAt     DateTime  @default(now())
  status     String
  messageId  String?
  error      String?
}

model Referral {
  id           String @id @default(cuid())
  userId       String @unique
  user         User   @relation(fields: [userId], references: [id])
  code         String @unique
  bonusBalance Int    @default(0)

  redemptions ReferralRedemption[]
}

model ReferralRedemption {
  id             String   @id @default(cuid())
  referralId     String
  referral       Referral @relation(fields: [referralId], references: [id])
  referredUserId String
  referredUser   User     @relation("ReferredUser", fields: [referredUserId], references: [id])
  convertedPlan  String?
  bonusAwarded   Int?
  createdAt      DateTime @default(now())
}

enum PlanKey {
  STARTER
  BASIC
  PREMIUM
  BUSINESS
  CUSTOM
}

model Plan {
  id                  String  @id @default(cuid())
  key                 PlanKey @unique
  priceUsd            Float?
  monthlyMessageQuota Int?
  employeeSeatLimit   Int?
  supportTier         String?

  subscriptions Subscription[]
  payments      Payment[]
}

enum SubscriptionStatus {
  ACTIVE
  PENDING
  EXPIRED
}

model Subscription {
  id                    String             @id @default(cuid())
  userId                String
  user                  User               @relation(fields: [userId], references: [id])
  planId                String
  plan                  Plan               @relation(fields: [planId], references: [id])
  status                SubscriptionStatus @default(PENDING)
  renewsAt              DateTime?
  messagesUsedThisCycle Int                @default(0)
}

enum PaymentMethod {
  BANK_TRANSFER
  CRYPTO
}

enum PaymentStatus {
  PENDING
  APPROVED
  REJECTED
}

model Payment {
  id                String        @id @default(cuid())
  userId            String
  user              User          @relation(fields: [userId], references: [id])
  planId            String
  plan              Plan          @relation(fields: [planId], references: [id])
  amountUsd         Float
  method            PaymentMethod
  receiptFileUrl    String
  cryptoTxId        String?
  status            PaymentStatus @default(PENDING)
  reviewedByAdminId String?
  reviewedByAdmin   AdminUser?    @relation(fields: [reviewedByAdminId], references: [id])
  createdAt         DateTime      @default(now())
  reviewedAt        DateTime?
}

enum AdminRole {
  ADMIN
  SUPER_ADMIN
}

model AdminUser {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  role         AdminRole

  reviewedPayments Payment[]
  auditLogs        AdminAuditLog[]
}

model AdminAuditLog {
  id         String    @id @default(cuid())
  adminId    String
  admin      AdminUser @relation(fields: [adminId], references: [id])
  action     String
  targetType String
  targetId   String
  metadata   Json?
  createdAt  DateTime  @default(now())
}
```

- **Verify:** `pnpm --filter api exec prisma validate`.

#### [ ] [P01-T03] First migration + generated client
- **Depends on:** P01-T02
- **Do:** `pnpm --filter api exec prisma migrate dev --name init`.
- **Verify:** `CHECK:MIGRATE` passes.

#### [ ] [P01-T04] Seed script: plans + referral bonus table + one dev admin user
- **Depends on:** P01-T03
- **Files:** `apps/api/prisma/seed.ts`, `packages/shared/src/constants/plans.ts`
- **Plan table (encode verbatim in shared constants):**
  - `starter: { price: 10, quota: 35000, seats: 1 }`
  - `basic: { price: 20, quota: 270000, seats: 3 }`
  - `premium: { price: 49, quota: 700000, seats: 5 }`
  - `business: { price: 99, quota: 1800000, seats: 13 }`
  - `custom: { price: null, quota: null, seats: null }` (admin-assigned per account)
- **Referral bonus table (keyed by the referred user's plan):**
  - `starter: 10000`, `basic: 20000`, `premium: 50000`, `business: 100000`, `custom: 200000`
- **Do:** `seed.ts` upserts the four fixed `Plan` rows and one `AdminUser` using `argon2` hashing. Make the seed idempotent (`upsert`, not `create`).
- **Verify:** `CHECK:SEED` (run it twice; second run must also exit 0).

#### [ ] [P01-T05] `getScopedPageIds` isolation helper + unit tests
- **Depends on:** P01-T03
- **Files:** `apps/api/src/common/scope.ts`, `apps/api/src/common/scope.spec.ts`
- **Do:** Given a `User` (with `role` and `id`), return `Page.id[]` the caller may see. Write unit tests asserting `employeeA`'s scope excludes `employeeB`'s assigned page, and vice versa.
- **Verify:** `CHECK:UNIT` (this file's tests specifically pass).

---

### PHASE P02 — Core Customer Auth (Owner/Employee) + App Shell

#### [ ] [P02-T01] Zod schemas for signup/login (shared)
- **Depends on:** P00-T05
- **Files:** `packages/shared/src/schemas/auth.ts`
- **Do:** `SignUpSchema { email, password (min 8), businessName }`, `LoginSchema { email, password }`.
- **Verify:** `CHECK:TYPECHECK`, `CHECK:UNIT`.

#### [ ] [P02-T02] Signup endpoint
- **Depends on:** P02-T01, P01-T04
- **Do:**
  1. `POST /api/v1/auth/signup` — validates, hashes password (argon2id), creates `User{role: OWNER}`.
  2. Do **not** auto-create a `Subscription` — fresh owner has no active plan until Billing (Phase P13).
  3. Create their `Referral` row (unique 8-char nanoid code) immediately on signup.
  4. Issue the two auth cookies (`pi_at`, `pi_rt`) per Part B.3 on success.
- **Verify:** Duplicate-email signup returns 409.

#### [ ] [P02-T03] Login, refresh, logout endpoints
- **Depends on:** P02-T02
- **Do:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`. Wrong password → 401 generic "invalid credentials."
- **Verify:** `CHECK:UNIT`; manual curl round-trip.

#### [ ] [P02-T04] `CustomerAuthGuard` + `@CurrentUser()` decorator + role guard
- **Depends on:** P02-T03
- **Files:** `apps/api/src/auth/customer-auth.guard.ts`, `apps/api/src/auth/current-user.decorator.ts`, `apps/api/src/auth/roles.guard.ts`
- **Do:** Guard verifies `pi_at` against `JWT_SECRET` only (never `ADMIN_JWT_SECRET`).
- **Verify:** `CHECK:UNIT` covering the cross-cookie-rejection case.

#### [ ] [P02-T05] Employee invite flow (owner-only)
- **Depends on:** P02-T04
- **Do:** `POST /employees/invite {email}` creates `User{role: EMPLOYEE, ownerId}` with a one-time invite token, emails invite link (stub `EmailService` interface now, wire SMTP in P15). `POST /employees/accept-invite {token, password}` sets their password and logs them in. Leave seat-limit enforcement as a stub with `// TODO(P15-T03)` marker.
- **Verify:** `CHECK:UNIT` for the invite→accept round trip.

#### [ ] [P02-T06] Next.js `/auth` page (tabbed sign in/up)
- **Depends on:** P02-T03
- **Files:** `apps/web/app/auth/page.tsx`
- **Verify:** manual browser check: sign up → redirected to `/dashboard`; refresh → still logged in.

#### [ ] [P02-T07] Dashboard app shell (spec §6.1) with route guarding
- **Depends on:** P02-T06
- **Files:** `apps/web/app/(dashboard)/layout.tsx`
- **Do:** Top bar, left sidebar with three nav groups (Workspace / Messaging / Account), bottom user chip. `/employees` and `/billing` nav items hidden (not just disabled) for `EMPLOYEE`-role sessions.
- **Verify:** manual: owner sees all nav; employee cannot see `/employees` or `/billing`.

#### [ ] [P02-T08] Profile screen: email change (confirm-link) + password change
- **Depends on:** P02-T07
- **Verify:** `CHECK:UNIT` for "email not changed until confirm link clicked" and "wrong current password rejected."

---

### PHASE P03 — Internal Admin Auth (Fully Separate Identity Layer)

#### [ ] [P03-T01] Admin login endpoint + guard
- **Depends on:** P01-T04
- **Files:** `apps/api/src/admin-auth/*`
- **Do:** `POST /api/v1/admin/auth/login` verifies against `AdminUser` table, signs with `ADMIN_JWT_SECRET`, sets `pia_at`/`pia_rt` cookies. `AdminAuthGuard` is a **separate class** from `CustomerAuthGuard`.
- **Verify:** `CHECK:UNIT`: customer token against admin-only route → 401.

#### [ ] [P03-T02] `/admin/login` Next.js page
- **Depends on:** P03-T01
- **Verify:** manual login as seeded admin succeeds; unauthenticated `/admin/payments` → redirects to `/admin/login`.

#### [ ] [P03-T03] Admin audit-log write helper
- **Depends on:** P03-T01, P01-T02
- **Files:** `apps/api/src/admin-audit/admin-audit.service.ts`
- **Do:** `recordAdminAction(adminId, action, targetType, targetId, metadata?)` helper writing an `AdminAuditLog` row. Every later admin-panel mutation must call this.
- **Verify:** `CHECK:UNIT`: calling the helper produces exactly one `AdminAuditLog` row.

#### [ ] [P03-T04] 2FA + IP allowlist scaffolding
- **Depends on:** P03-T01
- **Do:** TOTP secret field on `AdminUser` + `POST /admin/auth/verify-2fa` step. `ADMIN_IP_ALLOWLIST` env var (comma-separated CIDRs) checked by middleware, no-op when empty.
- **Verify:** manual toggle of the env var reproduces both allow/deny behaviors.

---

### PHASE P04 — Meta API Abstraction Layer + Mock Mode

#### [ ] [P04-T01] Define the `MetaClient` interface
- **Depends on:** P00-T05
- **Files:** `apps/api/src/meta/meta-client.interface.ts`

```typescript
interface MetaClient {
  exchangeForLongLivedPageToken(shortLivedUserToken: string, pageId: string): Promise<{ pageAccessToken: string }>;
  listOwnedPages(userToken: string): Promise<{ fbPageId: string; pageName: string; pageCategory?: string }[]>;
  subscribeWebhookFields(pageAccessToken: string, pageId: string, fields: string[]): Promise<void>;
  searchTemplateLibrary(query: { language?: string; keyword?: string }): Promise<{ libraryTemplateName: string; bodyText: string; language: string }[]>;
  cloneLibraryTemplate(pageAccessToken: string, pageId: string, libraryTemplateName: string, exampleValues: string[]): Promise<{ metaTemplateId: string; status: 'PENDING'|'APPROVED'|'REJECTED' }>;
  createTemplate(pageAccessToken: string, pageId: string, input: { name: string; language: string; bodyText: string; headerText?: string; buttons?: any[]; exampleValues: string[] }): Promise<{ metaTemplateId: string; status: 'PENDING'|'APPROVED'|'REJECTED' }>;
  sendTemplateMessage(pageAccessToken: string, psid: string, templateName: string, language: string, componentValues: string[]): Promise<{ messageId: string }>;
  sendPlainMessage(pageAccessToken: string, psid: string, text: string, humanAgentTag?: boolean): Promise<{ messageId: string }>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean;
}
```

- **Verify:** `CHECK:TYPECHECK`.

#### [ ] [P04-T02] `MockMetaClient` implementation
- **Depends on:** P04-T01
- **Files:** `apps/api/src/meta/mock-meta.client.ts`
- **Do:** Implement every method with deterministic fake data. Library clones return `status: APPROVED`; own templates return `status: PENDING` (mirrors real-world approval speed).
- **Verify:** `CHECK:UNIT` — a test calling each method once and asserting shape.

#### [ ] [P04-T03] `RealMetaClient` skeleton
- **Depends on:** P04-T01
- **Files:** `apps/api/src/meta/real-meta.client.ts`
- **Do:** Stub every method to `throw new Error('not implemented until Phase P05/P08')`.
- **Verify:** `CHECK:TYPECHECK`.

#### [ ] [P04-T04] DI wiring: `META_MOCK_MODE` picks the implementation
- **Depends on:** P04-T02, P04-T03
- **Files:** `apps/api/src/meta/meta.module.ts`
- **Do:** Provider factory reading `process.env.META_MOCK_MODE` and binding the `MetaClient` interface token accordingly.
- **Verify:** `CHECK:UNIT` with env var set both ways.

---

### PHASE P05 — Facebook Login for Business + Page Connection

> ⚠️ Re-verify the exact required OAuth scopes against Meta's current Messenger Platform docs before implementing this phase.

#### [ ] [P05-T01] `Pages` module — connect flow (mock-backed)
- **Depends on:** P04-T04, P02-T04
- **Do:**
  1. `GET /pages/connect/start` — owner-only, returns OAuth URL or mock redirect.
  2. `POST /pages/connect/callback` — under mock mode, creates fake `Page` rows.
  3. `GET /pages` (list), `DELETE /pages/:id` (sets `status: REVOKED`, does not hard-delete).
- **Verify:** `CHECK:UNIT`; manual mock connect flow produces visible `Page` rows.

#### [ ] [P05-T02] Token encryption at rest
- **Depends on:** P05-T01
- **Files:** `apps/api/src/common/crypto.ts`
- **Do:** `encryptToken`/`decryptToken` using AES-256-GCM. `GET /pages` response never includes decrypted or raw token.
- **Verify:** `CHECK:UNIT` asserting the DTO serializer strips the token field entirely.

#### [ ] [P05-T03] Real Facebook OAuth implementation
- **Depends on:** P05-T01, P05-T02
- **Do:** Implement `exchangeForLongLivedPageToken` and `listOwnedPages` against the real Graph API. Confirm current scope names against Meta's live docs.
- **Verify:** manual, against a real test Facebook Page: full connect flow produces a working `Page` row.

#### [ ] [P05-T04] `/pages` screen
- **Depends on:** P05-T01
- **Verify:** manual UI walk-through of connect (mock) → listed → disconnect → removed.

#### [ ] [P05-T05] Dashboard "Connected pages" preview + empty state
- **Depends on:** P05-T04
- **Verify:** fresh account → sees CTA; after connecting → sees preview list.

#### [ ] [P05-T06] Employee view-only restriction on Pages
- **Depends on:** P05-T04, B.6
- **Verify:** employee session sees only their assigned Pages in a disabled read-only list.

---

### PHASE P06 — Webhook Receiver + Lead Ingestion

#### [ ] [P06-T01] Webhook verify (challenge) endpoint
- **Depends on:** P04-T04
- **Files:** `apps/api/src/webhooks/webhooks.controller.ts`
- **Do:** `GET /webhooks/facebook` echoes `hub.challenge` when `hub.verify_token` matches.
- **Verify:** `curl "http://localhost:4000/webhooks/facebook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=123"` returns body `123`.

#### [ ] [P06-T02] Webhook receiver: signature verification + raw body handling
- **Depends on:** P06-T01
- **Do:** `POST /webhooks/facebook` reads raw body, calls `MetaClient.verifyWebhookSignature` before touching payload. Reject 401 on failure.
- **Verify:** `CHECK:UNIT`: malformed signature → 401, zero rows written.

#### [ ] [P06-T03] Normalize inbound events → `Lead` + `MessageLog` upserts
- **Depends on:** P06-T02
- **Do:** Parse Meta messaging webhook payload: upsert `Lead` on `(pageId, psid)`, insert `MessageLog`, flip `Template.metaStatus` on `message_template_status_update` events.
- **Verify:** `CHECK:UNIT` with fixture payloads asserting correct upsert behavior and idempotency.

#### [ ] [P06-T04] Webhook field subscription on Page connect
- **Depends on:** P06-T02, P05-T01
- **Do:** Wire `subscribeWebhookFields` into the Page-connect flow so every newly connected Page is subscribed to required fields immediately.
- **Verify:** `CHECK:UNIT`: connecting a mock Page results in a recorded `subscribeWebhookFields` call.

#### [ ] [P06-T05] Local webhook testing harness (fixture replay script)
- **Depends on:** P06-T03
- **Files:** `apps/api/test/fixtures/webhooks/*.json`, `apps/api/scripts/replay-webhook.ts`
- **Do:** Realistic fixture payloads (new message, postback, delivery receipt, template status update) + script that POSTs them with correctly-computed mock signatures.
- **Verify:** `pnpm --filter api exec ts-node scripts/replay-webhook.ts` runs all fixtures all-pass.

---

### PHASE P07 — Realtime Bridge (WebSocket)

#### [ ] [P07-T01] Socket.IO gateway with JWT-authenticated handshake
- **Depends on:** P02-T04, P00-T02
- **Files:** `apps/api/src/realtime/inbox.gateway.ts`
- **Do:** Namespace `/inbox`; handshake auth reads `pi_at` cookie, rejects connection if invalid.
- **Verify:** `CHECK:UNIT`: connection with no/garbage cookie is rejected at handshake.

#### [ ] [P07-T02] Room model: one room per assigned Page
- **Depends on:** P07-T01, P01-T05
- **Do:** On connect, join socket to rooms derived from `getScopedPageIds(user)`, one room per page (`page:<pageId>`).
- **Verify:** `CHECK:UNIT`: two employee sockets with disjoint page assignments each only join their own page rooms.

#### [ ] [P07-T03] Webhook → gateway bridge: emit `new_message` / `template_status_changed`
- **Depends on:** P07-T02, P06-T03
- **Do:** After webhook handler commits, emit `new_message` event to that page's room; emit `template_status_changed` on status flips.
- **Verify:** replay-webhook.ts while a test socket client is connected → asserts event arrives.

#### [ ] [P07-T04] Client-side desktop notification + live Inbox subscription hook
- **Depends on:** P07-T03
- **Files:** `apps/web/lib/useInboxSocket.ts`
- **Verify:** manual: non-focused window shows desktop notification; Inbox thread updates without page refresh.

---

### PHASE P08 — Template Library

> ⚠️ Re-verify placeholder rules, category enforcement, and rejection causes against Meta's current docs before shipping.

#### [ ] [P08-T01] Server-side template validators (shared Zod + pure validation function)
- **Depends on:** P00-T05
- **Files:** `packages/shared/src/schemas/template.ts`, `apps/api/src/templates/template-validation.ts`
- **Enforce rules:**
  - Placeholders are positional (`{{1}}…{{n}}`, sequential, no gaps) **or** named (`{{snake_case_name}}`), never mixed.
  - Body must not start or end on a placeholder.
  - No special characters inside a placeholder.
  - `category` is **always** forced to `"UTILITY"` server-side (Rule A1).
- **Verify:** `CHECK:UNIT` — every rule has positive and negative test cases.

#### [ ] [P08-T02] `GET /templates/library` (search Meta's pre-built library)
- **Depends on:** P08-T01, P04-T04
- **Verify:** `CHECK:UNIT` against `MockMetaClient`'s fixed fake library.

#### [ ] [P08-T03] `POST /templates/clone-from-library`
- **Depends on:** P08-T02
- **Verify:** `CHECK:UNIT`.

#### [ ] [P08-T04] `POST /templates` (create own template)
- **Depends on:** P08-T01, P08-T02
- **Do:** Run P08-T01 validators first with human-readable error codes; calls `MetaClient.createTemplate`. A request with `category: "MARKETING"` is rejected 400 before Meta client is ever called (proves Rule A1).
- **Verify:** `CHECK:UNIT`.

#### [ ] [P08-T05] `GET /templates` (list, filtered by All/General/Imported/New + status badge)
- **Depends on:** P08-T04
- **Verify:** `CHECK:UNIT` for each filter value.

#### [ ] [P08-T06] `/library` screen
- **Depends on:** P08-T05
- **Do:** Tabs/filters, template cards with body preview, language, status badge, Preview action, and "Send bulk" action deep-linking to Campaigns wizard.
- **Verify:** manual: clone library template (mock) → Approved badge; create own template with broken placeholder → shows specific validator error.

#### [ ] [P08-T07] Real Graph API implementation for template endpoints
- **Depends on:** P08-T04, P05-T03
- **Verify:** manual, against a real sandbox Page: create one real UTILITY template, confirm it appears in Meta Business Manager.

---

### PHASE P09 — Inbox: Conversational Replies + Single-Recipient Template Send

#### [ ] [P09-T01] `GET /inbox/conversations` (scoped list)
- **Depends on:** P01-T05, P06-T03
- **Verify:** `CHECK:UNIT` for isolation and unread toggle.

#### [ ] [P09-T02] `GET /inbox/conversations/:leadId/messages` (thread pane)
- **Depends on:** P09-T01
- **Verify:** `CHECK:UNIT`: out-of-scope lead id → 403, not 404.

#### [ ] [P09-T03] Send a conversational reply — window-aware
- **Depends on:** P09-T02, P04-T04
- **Do:** If inside messaging window, `sendPlainMessage(humanAgentTag: false)`; if outside, require explicit `humanAgentTag: true` confirmation. Never auto-send outside-window messages without explicit human confirmation.
- **Verify:** `CHECK:UNIT` covering both window states.

#### [ ] [P09-T04] Saved/canned replies
- **Depends on:** P09-T03
- **Do:** Owner-scoped CRUD (`CannedReply{ownerId, title, body}`).
- **Verify:** `CHECK:UNIT` CRUD round trip.

#### [ ] [P09-T05] Single-recipient template send
- **Depends on:** P09-T02, P08-T05, P05-T02
- **Do:** `POST /inbox/conversations/:leadId/send-template {templateId, componentValues}` — decrypts Page token, calls `MetaClient.sendTemplateMessage`, writes `MessageLog`. Hard-rejects if `Template.category !== 'UTILITY'`.
- **Verify:** `CHECK:UNIT`; manual: Inbox → pick lead → send Utility template → appears in Logs.

#### [ ] [P09-T06] `/inbox` screen: 3-pane layout wired to realtime
- **Depends on:** P09-T05, P07-T04
- **Verify:** manual full walkthrough: receive mock inbound → live in list → reply → send Utility template → correct thread order.

#### [ ] [P09-T07] Employee scoping enforced on every Inbox endpoint (explicit re-check)
- **Depends on:** P09-T01 through P09-T05
- **Verify:** `CHECK:UNIT` with "cross-employee access attempt" test per Inbox endpoint.

---

### PHASE P10 — Bulk Campaigns (Wizard + Queue-Based Sending)

> ⚠️ Rule A2 lives or dies in this phase: nothing here ever calls the Meta client in a tight loop from a request handler.

#### [ ] [P10-T01] BullMQ setup: queue, worker process, retry/backoff policy
- **Depends on:** P00-T04
- **Files:** `apps/api/src/queue/campaign.queue.ts`, `apps/worker/src/main.ts`
- **Do:** Define `campaign-sends` BullMQ queue. `apps/worker` boots standalone, registers the processor, and is runnable/killable independently of the API process. Configure a conservative rate limiter (document the constant, tune against real Meta rate limits before real launch).
- **Verify:** kill the worker, confirm the API keeps serving `CHECK:API-UP`.

#### [ ] [P10-T02] Campaign creation endpoints (draft → audience resolution)
- **Depends on:** P10-T01, P01-T02
- **Do:** `POST /campaigns` (draft), `PATCH /campaigns/:id/audience` (include/exclude labels), `GET /campaigns/:id/audience-preview` (count + capped sample, no recipient rows materialized yet).
- **Verify:** `CHECK:UNIT`: exclude must win over include for the same lead.

#### [ ] [P10-T03] Compliance checkbox + scheduling cap
- **Depends on:** P10-T02
- **Do:** `PATCH /campaigns/:id/review { complianceConfirmed: true, scheduledAt? }` — reject if `complianceConfirmed !== true`; reject `scheduledAt` more than 3 days out (named constant).
- **Verify:** `CHECK:UNIT` for both rejection cases.

#### [ ] [P10-T04] Submit → materialize recipients → enqueue jobs (never send inline)
- **Depends on:** P10-T03, P10-T01, P08-T04
- **Do:** `POST /campaigns/:id/submit` — re-validates `Template.category === 'UTILITY'` (A1 defense in depth), resolves final audience, bulk-inserts one `CampaignRecipient{status: QUEUED}` per lead, enqueues **one BullMQ job per recipient** (not one batched job).
- **Verify:** `CHECK:UNIT` asserting job count === recipient count.

#### [ ] [P10-T05] Recipient-send processor (runs in `apps/worker`)
- **Depends on:** P10-T04
- **Do:** Decrypts Page token, calls `MetaClient.sendTemplateMessage`, sets `CampaignRecipient.status = SENT` or `FAILED` with actual error string persisted. When last recipient job completes, flips `Campaign.status` and emits `campaign_progress` realtime event with `{sent, failed, remaining}`.
- **Verify:** `CHECK:UNIT` including one forced-failure case; manual: watch Campaign status progress from `SENDING` → `COMPLETED`.

#### [ ] [P10-T06] `GET /campaigns` / `GET /campaigns/:id`
- **Depends on:** P10-T05
- **Verify:** `CHECK:UNIT`.

#### [ ] [P10-T07] `/campaigns` four-stage wizard UI + live progress bar
- **Depends on:** P10-T06, P07-T04
- **Do:** Stage 1: Choose Pages, Stage 2: Audience with live preview count, Stage 3: Choose template (deep-linkable from Library), Stage 4: Review & send (compliance checkbox, schedule picker capped at +3 days), submit → progress screen subscribed to `campaign_progress` events.
- **Verify:** manual full run under mock mode: campaign completes, rows in Logs.

#### [ ] [P10-T08] Load/rate-limit sanity check
- **Depends on:** P10-T05
- **Do:** Script that enqueues a few hundred fake recipients against mock client and confirms wall-clock completion is consistent with configured rate limiter.
- **Verify:** assert observed throughput ≤ `limiter.max` per `limiter.duration`.

---

### PHASE P11 — Labels + Audience Targeting

#### [ ] [P11-T01] Label CRUD (owner-scoped)
- **Depends on:** P01-T02, P02-T04
- **Verify:** `CHECK:UNIT` CRUD + count-accuracy test.

#### [ ] [P11-T02] Assign/unassign labels to a lead
- **Depends on:** P11-T01, P09-T06
- **Do:** `POST/DELETE /leads/:id/labels/:labelId`, scope-checked per B.6.
- **Verify:** `CHECK:UNIT`.

#### [ ] [P11-T03] `/labels` screen
- **Depends on:** P11-T01
- **Verify:** manual CRUD walkthrough.

#### [ ] [P11-T04] `/leads` screen + Page/label filters
- **Depends on:** P11-T02, P01-T05
- **Do:** Scoped via `getScopedPageIds`, filterable by Page and Label. Re-check A4 on this screen specifically.
- **Verify:** manual: label filter shows only correctly-labeled leads; employee only sees their assigned Pages' leads.

---

### PHASE P12 — Logs Screen

#### [ ] [P12-T01] `GET /logs` — read-only, paginated, filterable
- **Depends on:** P01-T05, P09-T05, P10-T05
- **Do:** Mirrors `MessageLog` (sent time, Page, Lead, Template, Status, Message ID, Error). Filters: Page, status, date range. Scoped per B.6.
- **Verify:** `CHECK:UNIT` for filter combinations and isolation.

#### [ ] [P12-T02] `/logs` screen
- **Depends on:** P12-T01
- **Do:** Read-only table. Raw `error` string must be visible, not swallowed into a generic "failed" label.
- **Verify:** manual: forced-failure mock send shows real error text.

#### [ ] [P12-T03] CSV export (optional/stretch)
- **Depends on:** P12-T01
- **Do:** `GET /logs/export.csv` honoring the same filters.
- **Verify:** `CHECK:UNIT` — exported CSV row count matches the filtered query's count.

---

### PHASE P13 — Billing (Manual Verification, Customer Side)

#### [ ] [P13-T01] `POST /payments` (submit a payment for review)
- **Depends on:** P01-T04, P00-T04 (S3/MinIO)
- **Do:** Owner-only. Uploads receipt to S3-compatible storage (size-capped, image/PDF MIME-checked), creates `Payment{status: PENDING}`.
- **Verify:** `CHECK:UNIT` for oversized and wrong-MIME rejections; manual: valid small PDF upload succeeds.

#### [ ] [P13-T02] Payment-method display views (bank transfer / crypto)
- **Depends on:** P13-T01
- **Do:** Bank transfer: renders `BANK_TRANSFER_IBAN`, account name, bank name — all copy-to-clipboard from env. Crypto: renders QR code + address with "wrong network = funds lost" warning.
- **Verify:** manual: both views render real env-configured values.

#### [ ] [P13-T03] Approval → activates subscription + resets quota
- **Depends on:** P13-T01, P01-T02
- **Files:** `apps/api/src/billing/billing.service.ts`
- **Do:** `approvePayment(paymentId, adminId)` flips status, upserts `ACTIVE` `Subscription`, resets `messagesUsedThisCycle = 0`, calls P03-T03 audit-log helper. Double-approval returns 409.
- **Verify:** `CHECK:UNIT` covering approve, reject, and double-approve paths.

#### [ ] [P13-T04] Quota enforcement middleware/guard
- **Depends on:** P13-T03, P09-T05, P10-T04
- **Do:** Shared check rejecting sends when `messagesUsedThisCycle >= plan.monthlyMessageQuota`. Employees consume the **same shared counter** as the owner — never a per-employee counter.
- **Verify:** `CHECK:UNIT`: employee send pushes owner's shared counter; at-limit rejection case confirmed.

#### [ ] [P13-T05] `/billing` screen
- **Depends on:** P13-T02, P13-T04
- **Do:** Plan cards (Starter/Basic/Premium/Business) + hidden Custom card with "Contact us" CTA. Quota usage sourced from subscription row (same query as dashboard quota pill).
- **Verify:** manual: submit mock receipt → Payment row pending → after approval → billing screen and dashboard quota pill reflect new plan.

---

### PHASE P14 — Internal Admin Panel

> Every mutation in this phase must call the P03-T03 audit-log helper.

#### [ ] [P14-T01] `/admin/payments` — pending queue + approve/reject
- **Depends on:** P13-T03, P03-T01
- **Do:** `GET /admin/payments?status=pending`, `POST /admin/payments/:id/approve`, `POST /admin/payments/:id/reject` calling `billing.service` methods and audit-log helper.
- **Verify:** `CHECK:UNIT` asserting the audit-log side effect specifically.

#### [ ] [P14-T02] `/admin/accounts` — searchable customer accounts view
- **Depends on:** P03-T01, P01-T02
- **Do:** `GET /admin/accounts?search=` — plan, quota usage, connected-Page count, employee count. Read-only.
- **Verify:** `CHECK:UNIT` for search + count-accuracy.

#### [ ] [P14-T03] `/admin/plans` — Custom plan assignment
- **Depends on:** P14-T02, P01-T02
- **Do:** `POST /admin/accounts/:userId/assign-custom-plan {priceUsd, monthlyMessageQuota, employeeSeatLimit}` — creates per-account `Plan{key: CUSTOM}` row, flips subscription. Audit-logged. Custom plan on Account A never affects other accounts.
- **Verify:** `CHECK:UNIT`.

#### [ ] [P14-T04] `/admin/templates` — optional pre-Meta moderation queue
- **Depends on:** P08-T04
- **Decision:** If skipping, explicitly mark `[skipped: relying on Meta review]` rather than leaving ambiguous.
- **Verify:** if implemented, `CHECK:UNIT`; if skipped, explicit skip note.

#### [ ] [P14-T05] `/admin/system` — global health metrics
- **Depends on:** P06-T03, P10-T05
- **Do:** Messages sent platform-wide this month, webhook error rate, oldest unprocessed BullMQ job age.
- **Verify:** manual: stop worker → confirm "oldest unprocessed job age" climbs.

#### [ ] [P14-T06] `/admin` layout + nav + audit log viewer
- **Depends on:** P14-T01 through P14-T05, P03-T03
- **Verify:** manual: log in at `/admin/login` → approve payment → see it in Accounts → see in audit log.

#### [ ] [P14-T07] Admin panel isolation — negative test suite
- **Depends on:** P14-T06
- **Do:** Confirm no customer-facing (`pi_at`-authenticated) route can reach any `/admin/*` controller method, and `admin_users` never joins into any customer-facing query response.
- **Verify:** `CHECK:UNIT`.

---

### PHASE P15 — Employees (Seats, Isolation, Shared Quota)

#### [ ] [P15-T01] Page-assignment endpoints (owner assigns which Pages an employee can see)
- **Depends on:** P01-T02, P05-T01
- **Do:** `POST/DELETE /employees/:id/page-assignments/:pageId` — owner-only.
- **Verify:** `CHECK:UNIT`.

#### [ ] [P15-T02] Real SMTP wiring for the `EmailService` stub
- **Depends on:** P02-T05
- **Do:** Implement against `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`. Keep a `LoggingEmailService` fallback when SMTP vars are empty.
- **Verify:** manual: with SMTP vars empty, invite flow prints email to server logs; with SMTP vars set, real email arrives.

#### [ ] [P15-T03] Real seat-limit enforcement (resolves `TODO(P15-T03)` from P02-T05)
- **Depends on:** P15-T02, P13-T03
- **Do:** `POST /employees/invite` now checks `currentEmployeeCount < plan.employeeSeatLimit`. Owner with zero active subscription cannot invite any employees at all (clear error, not a null crash).
- **Verify:** `CHECK:UNIT` for at-limit rejection and no-active-plan rejection.

#### [ ] [P15-T04] `/employees` screen (owner-only)
- **Depends on:** P15-T03, P15-T01
- **Verify:** manual: invite up to seat limit → next attempt shows upgrade-prompt error; assign Page A to employee 1 only → employee 2 cannot see Page A's leads.

#### [ ] [P15-T05] Shared-quota visibility for employees
- **Depends on:** P13-T04
- **Do:** Employee dashboard/quota pill shows the **same** owner-wide `used/limit` numbers (read-only).
- **Verify:** manual: two employee logins show identical live-matching quota numbers after one sends.

#### [ ] [P15-T06] End-to-end employee isolation regression suite
- **Depends on:** all of P15, P09-T07, P11-T04
- **Do:** One consolidated automated test file: Leads, Inbox, Labels, Logs, Pages — each asserting employee A cannot read/write anything scoped to employee B's assigned Pages, and both share the same quota counter.
- **Verify:** `CHECK:UNIT` — any future failure of this suite is a release-blocking regression.

---

### PHASE P16 — Referrals

#### [ ] [P16-T01] `GET /referrals/me` — code, link, stats
- **Depends on:** P02-T02
- **Verify:** `CHECK:UNIT`.

#### [ ] [P16-T02] `?ref=<code>` capture on signup
- **Depends on:** P02-T02, P16-T01
- **Do:** Signup accepts optional `ref` param. Invalid code is silently ignored (signup still succeeds).
- **Verify:** `CHECK:UNIT`.

#### [ ] [P16-T03] Conversion → bonus award (hooked into billing approval, P13-T03)
- **Depends on:** P16-T02, P13-T03, P01-T04
- **Do:** When `approvePayment` activates subscription for a user with an unconverted `ReferralRedemption`, look up bonus by the referred user's plan tier from `packages/shared` constant, increment referrer's `bonusBalance`. Changing the lookup table numbers changes future awards without touching `billing.service` code.
- **Verify:** `CHECK:UNIT` for the full chain: signup-with-ref → admin approves → referrer's `bonusBalance` increases by exactly that plan's table value.

#### [ ] [P16-T04] `/referrals` screen
- **Depends on:** P16-T01, P16-T03
- **Verify:** manual: copy referral link, sign up second account through it, approve payment via admin, confirm referrer's screen reflects new bonus.

#### [ ] [P16-T05] Dismissible referral banner on Dashboard
- **Depends on:** P16-T01, P02-T07
- **Do:** "Don't show again" dismiss persisted per-user.
- **Verify:** manual: dismiss → survives logout/login.

---

### PHASE P17 — Public Marketing Site + Legal Pages

#### [ ] [P17-T01] Visual direction pass
- **Depends on:** P00-T03
- **Do:** Deliberately choose a typography/color/spacing direction before writing markup. Write a short note naming the chosen direction (typeface pairing, accent color, overall tone) directly in this task.
- **Decision (fill in before building):** _______________
- **Verify:** written direction note exists in this file.

#### [ ] [P17-T02] Homepage
- **Depends on:** P17-T01
- **Do:** Hero (headline + 2 CTAs), stat strip, 8-category Utility-template showcase grid, 4-feature grid, numbered 4-step "how it works," two deep-dive sections, trial-stats banner, pricing table (pull live numbers from `packages/shared` plan constants — not hand-typed duplicates), closing CTA, footer. Write original copy.
- **Verify:** automated test asserting pricing table numbers match `packages/shared` plan constants.

#### [ ] [P17-T03] `/privacy` — full clause checklist
- **Depends on:** P17-T01
- **Do:** Cover all required privacy clauses including: collection sources (direct/Facebook-login/automatic), no-collection-of-passwords/friends-list statement, usage + no-sell-data, Messenger-only delivery scope, data-sharing categories, concrete retention table per data type, self-serve disconnect + manual-deletion-request path with turnaround SLA, user rights, security statement, children's-privacy statement, update clause. Flag prominently that legal counsel review is required before launch.
- **Verify:** manual checklist cross-off against every required privacy clause.

#### [ ] [P17-T04] `/terms` — full clause checklist
- **Depends on:** P17-T01
- **Do:** Cover all required terms clauses: Messenger/Utility-only service scope, eligibility, user responsibilities (authorized Pages, Meta policy compliance, no spam, consent record-keeping), Page connection grant + disconnection, acceptable-use list, availability disclaimer, IP ownership split, warranty disclaimer + liability limitation, termination terms, governing law/jurisdiction. Same "have counsel review" caveat.
- **Verify:** manual checklist cross-off against every required Terms clause.

#### [ ] [P17-T05] Footer/support widget wiring
- **Depends on:** P17-T02
- **Do:** One component mounted in both marketing site footer and dashboard persistent support widget, linking to `WHATSAPP_SUPPORT_NUMBER`.
- **Verify:** manual: clicking from both locations opens correct WhatsApp deep link.

#### [ ] [P17-T06] SEO/meta basics for marketing pages
- **Depends on:** P17-T02, P17-T03, P17-T04
- **Do:** Per-page `<title>`/meta description, OpenGraph tags, `sitemap.xml`, `robots.txt` covering only public routes (never index `/dashboard`, `/admin`).
- **Verify:** `curl -sf http://localhost:3000/sitemap.xml` lists only public routes; `robots.txt` disallows `/dashboard`, `/admin`.

---

### PHASE P18 — Meta App Review Prep & Business Verification

> ⚠️ Start this phase well before planned launch. Budget real calendar time; rejections are common on first submission.

#### [ ] [P18-T01] Flip `META_MOCK_MODE=false` end to end against a real sandbox Page
- **Depends on:** P05-T03, P08-T07
- **Do:** Real Facebook App + test Page: connect → clone library template → send to real test PSID → receive real inbound webhook → reply → run tiny real bulk campaign → confirm Logs show real `message_id`s.
- **Verify:** every step completes against Meta's real test-mode infrastructure.

#### [ ] [P18-T02] Screencast + use-case write-up for App Review submission
- **Depends on:** P18-T01
- **Do:** Record: Page connection consent screen, sending a Utility template, Inbox reply flow. Write a clear, specific use-case description — transactional/utility only, tied to actual product.
- **Verify:** human reviews recording start-to-finish confirming it matches the live product, not a mock-mode version.

#### [ ] [P18-T03] Business Verification submission
- **Depends on:** none (can run in parallel)
- **Do:** Complete Meta's Business Verification for the company entity that owns the Facebook App. Pull current document requirements live from developers.facebook.com at submission time.
- **Verify:** Business Verification status shows approved in Meta Business Manager.

#### [ ] [P18-T04] Re-verify every "confirm against current docs" flag throughout this plan
- **Depends on:** P18-T01
- **Do:** Sweep this file for every "re-verify against Meta's current docs" note (Phases P05, P06, P08) and confirm each one against developers.facebook.com as of this date.
- **Verify:** dated note added confirming sweep was done and what (if anything) changed.

---

### PHASE P19 — Final Hardening / Security / QA Pass

#### [ ] [P19-T01] Risk: promotional content through the Utility pipe
- **Do:** Confirm `category` is force-set server-side in every template-creation and every send code path.
- **Verify:** `CHECK:UNIT` — all A1-tagged tests across P08/P09/P10 still pass.

#### [ ] [P19-T02] Risk: employee data leakage
- **Do:** Re-run the full P15-T06 isolation regression suite against the complete app.
- **Verify:** `CHECK:UNIT` — zero failures.

#### [ ] [P19-T03] Risk: synchronous bulk sending
- **Do:** Re-run the P10-T08 rate-limit sanity script against current code.
- **Verify:** throughput still ≤ configured limiter.

#### [ ] [P19-T04] Risk: manual payment approval is an ongoing operational cost
- **Do:** Write an operational note naming who staffs the `/admin/payments` queue post-launch and the realistic SLA communicated on the Billing screen.
- **Operational Note (fill in before launch):** Queue owner: _______________ | SLA: _______________
- **Verify:** the note exists with a real owner and SLA, not a placeholder.

#### [ ] [P19-T05] Risk: Meta policy drift
- **Do:** Confirm P18-T04's docs sweep is dated within the last few weeks of planned launch.
- **Verify:** date check.

#### [ ] [P19-T06] Secrets audit
- **Do:** `git log -p | grep -iE "secret|token|password"` (or `gitleaks`) across full history — confirm zero real credentials were ever committed.
- **Verify:** scan tool exits clean.

#### [ ] [P19-T07] Full regression: run every phase's Verify block back to back
- **Do:** Re-run `./scripts/verify-all.sh` plus a manual pass through this document's Verify steps in order.
- **Verify:** every checkbox in this document is `[x]`, and `./scripts/verify-all.sh` exits 0.

---

## PART F — FINAL GO-LIVE ACCEPTANCE CHECKLIST

Don't flip real customer traffic on until every line below is true:

- [ ] All P00–P19 checkboxes in this document are checked, each with its Verify step actually run.
- [ ] `META_MOCK_MODE=false` in the production environment, with a Business-Verified, App-Reviewed Facebook App (P18 complete).
- [ ] Employee isolation regression suite (P15-T06) passes against production-shaped data, not just fixtures.
- [ ] `/privacy` and `/terms` (P17-T03/T04) have been reviewed by real legal counsel.
- [ ] A real human is rostered to staff `/admin/payments` with the SLA actually promised on the Billing screen (P19-T04).
- [ ] Secrets audit (P19-T06) is clean, and `TOKEN_ENCRYPTION_KEY`/`JWT_SECRET`/`ADMIN_JWT_SECRET` in production are freshly generated, not carried over from local dev.
- [ ] BullMQ rate limiter (P10-T01) is tuned against Meta's *actual current* per-Page/per-app rate limits, re-confirmed at P18 time.

---

*End of agent build plan. Treat every "re-verify against Meta's current docs" note throughout as a live instruction — Meta's Messenger policy has changed materially multiple times in the past year and will again.*
