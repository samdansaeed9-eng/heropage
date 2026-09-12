# Production Readiness Audit: Multi-Page Messenger SaaS ("HeroPage")

**Date**: September 12, 2026  
**Auditor**: Senior Software Architect & Production-Readiness Engineer  
**Project**: Multi-Page Messenger SaaS (HeroPage)  
**Target Architecture**: Enterprise Multi-Tenant Messenger SaaS (Meta Graph API Compliant)

---

## Executive Summary

HeroPage has completed its foundational user interface, client-side application shell, local atomic relational database abstraction, and baseline authentication and webhook endpoints. The frontend is clean, modern, responsive, and covers all 11 core application areas.

However, from an **operational production standpoint**, the platform is currently operating in a **hybrid local/mock architecture**:
- The UI layer is 100% complete and renders all target screens.
- Authentication, session security (AES-256-GCM / HS256 JWT), and webhook handshake/signature verification are genuinely implemented and functional.
- Inbound webhook processing actively persists customer contacts, conversation threads, and messages into the local relational store.
- Crucial production subsystems—including **Meta OAuth token exchange**, **outbound Meta Graph API message dispatch**, **asynchronous background queue workers (Redis/BullMQ)**, **managed cloud PostgreSQL**, **Stripe webhooks**, and **server-side tenant isolation enforcement on write routes**—are currently simulated, mocked, or pending implementation.

This audit provides an exhaustive component-by-component inspection across all 25 architecture dimensions, itemizes every mock and security vulnerability, highlights the top 10 production blockers, and outlines the exact implementation sequence required to reach commercial production readiness.

---

## Current Architecture

```
[ Browser Client ]
       │
       ▼ (Next.js 14 App Router / React 18 / Tailwind CSS)
[ Middleware (Route Protection & Session Verification) ]
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
[ /api/auth/* ]          [ /api/inbox/* ]         [ /api/webhooks/facebook ]
  (Bcrypt + JWT)       (Local Message Store)        (HMAC SHA256 Handshake)
       │                         │                         │
       └─────────────────────────┼─────────────────────────┘
                                 ▼
                     [ lib/db.ts Relational Store ]
                       (Local Atomic JSON / SQLite)
                                 │
                                 ▼
                     [ data/heropage.db.json ]
```

- **Runtime**: Node.js v24.14.1 on Windows Host
- **Framework**: Next.js 14.2.35 (App Router, Standalone Server capability)
- **Styling & Components**: Tailwind CSS 3.4.16 + Lucide React + custom design system tokens
- **Persistence**: File-backed relational store (`data/heropage.db.json`) using atomic temporary-file swap (`fs.renameSync`)
- **Crypto & Secrets**: AES-256-GCM symmetric token encryption at rest + HMAC-SHA256 timing-safe verification (`lib/crypto.ts`)

---

## Frontend

**Status**: ✅ REAL (UI/UX) / ⚠️ PARTIAL (API Data Wiring)

- **App Shell (`components/layout/AppShell.tsx`)**:
  - Global responsive layout with sidebar, collapsible mobile drawer, organization switcher, and user profile badge.
  - Active route detection and breadcrumb rendering.
- **Design System (`components/ui/*`)**:
  - High-quality, original components: `Button`, `Input`, `Badge`, `Card`, `Modal`, `EmptyState`, `LoadingState`.
  - Proper handling of UI states (Empty, Loading, Error, Success).
- **Navigation Coverage**:
  - All 11 target areas implemented: Dashboard, Inbox, Campaigns, Contacts, Templates, Pages, Analytics, Team, Billing, Settings, and Admin.
- **Data Flow Reality**:
  - Pages fetch data from `GET /api/data/bootstrap`.
  - Interactive write operations in `Inbox` (`/api/inbox/send` and `/api/inbox/notes`) call live backend endpoints.
  - Interactive write operations in `Pages` (Connect Page modal) and `Campaigns` (Launch wizard) simulate completion in client state via `setTimeout(..., 600)` rather than invoking a backend API route.

---

## Backend/API

**Status**: ⚠️ PARTIAL

### Implemented Endpoints
1. `GET /health`: ✅ REAL (Reports uptime, environment, application status).
2. `POST /api/auth/signup`: ✅ REAL (Zod validation, bcrypt hash, user creation, auto-provisions organization and OWNER membership, sets HttpOnly session cookie).
3. `POST /api/auth/login`: ✅ REAL (Bcrypt verification, session token issuance).
4. `POST /api/auth/logout`: ✅ REAL (Clears session cookie).
5. `GET /api/auth/me`: ✅ REAL (Returns sanitized user profile and organization memberships; auto-seeds demo data if empty).
6. `PUT /api/auth/profile`: ✅ REAL (Updates display name and verifies current password before updating password).
7. `GET /api/data/bootstrap`: ⚠️ PARTIAL (Returns tenant-scoped data, but hardcodes the first organization membership; lacks multi-organization switching context).
8. `POST /api/inbox/send`: ⚠️ PARTIAL (Creates message record in database, updates conversation timestamps, but does NOT dispatch an outbound HTTP request to Meta Graph API).
9. `POST /api/inbox/notes`: ⚠️ PARTIAL (Appends note to contact, but lacks server-side tenant ownership validation).
10. `GET /api/webhooks/facebook`: ✅ REAL (Handles Meta webhook challenge verification).
11. `POST /api/webhooks/facebook`: ⚠️ PARTIAL (Validates HMAC-SHA256 signature, deduplicates by `mid`, parses incoming messages and delivery/read receipts, updates DB; lacks asynchronous worker queue).

### Missing Endpoints
- `GET /api/auth/oauth/facebook`: ❌ MISSING (Initiates Meta OAuth dialog).
- `GET /api/auth/oauth/facebook/callback`: ❌ MISSING (Exchanges authorization code for long-lived User and Page Access Tokens).
- `POST /api/pages/connect`: ❌ MISSING (Backend page connection and webhook subscription).
- `DELETE /api/pages/[id]`: ❌ MISSING (Disconnects page and revokes Meta webhook).
- `POST /api/campaigns`: ❌ MISSING (Validates and queues a broadcast campaign).
- `POST /api/templates`: ❌ MISSING (Submits template to Meta Graph API for review).
- `POST /api/team/invite`: ❌ MISSING (Sends email invite and assigns role).
- `POST /api/billing/checkout`: ❌ MISSING (Generates Stripe Checkout session URL).
- `POST /api/billing/webhook`: ❌ MISSING (Processes Stripe subscription events).
- `GET /api/inbox/stream`: ❌ MISSING (Real-time SSE or WebSocket stream for live message pushes).

---

## Database

**Status**: ⚠️ PARTIAL (Local Relational Schema Exists; Cloud PostgreSQL Missing)

- **Database Engine**: Local file-backed atomic JSON store (`lib/db.ts` -> `data/heropage.db.json`).
- **Persistence Mechanism**: Atomically writes to `.tmp` file and replaces via `fs.renameSync` to prevent file corruption on crash.
- **Relational Integrity**:
  - Enforces entity models matching the target domain: `users`, `organizations`, `memberships`, `facebookPages`, `contacts`, `conversations`, `messages`, `labels`, `contactLabels`, `contactNotes`, `savedReplies`, `templates`, `campaigns`, `campaignMessages`, `subscriptions`, `webhookEvents`.
- **Entity Completeness Audit**:
  - `Organization`: ✅ REAL
  - `User`: ✅ REAL
  - `OrganizationMembership`: ✅ REAL
  - `FacebookPage`: ✅ REAL
  - `Conversation`: ✅ REAL
  - `Message`: ✅ REAL
  - `Contact`: ✅ REAL
  - `Label`: ✅ REAL
  - `ContactLabel`: ✅ REAL
  - `ConversationLabel`: ❌ MISSING (Only contact labels are currently modeled)
  - `Note` (`ContactNote`): ✅ REAL
  - `SavedReply`: ✅ REAL
  - `Template`: ✅ REAL
  - `Campaign`: ✅ REAL
  - `CampaignRecipient` (`CampaignMessageRecord`): ⚠️ PARTIAL (Modeled as `campaignMessages`)
  - `MessageDelivery`: ⚠️ PARTIAL (Statuses updated on `MessageRecord`; no separate immutable delivery event log)
  - `Subscription`: ⚠️ PARTIAL (Schema exists, but no live Stripe subscription records)
  - `UsageRecord`: ❌ MISSING (Quota metrics are calculated on the fly; no monthly historical aggregation table)
  - `AuditLog`: ❌ MISSING (Only `WebhookEventRecord` exists; no general administrative audit log)
  - `WebhookEvent`: ✅ REAL
- **PostgreSQL Migration Readiness**:
  - The TypeScript schema in `lib/db.ts` uses strict IDs, foreign keys, and timestamps. It can be translated 1:1 into a Prisma or Drizzle PostgreSQL schema without data loss.

---

## Authentication

**Status**: ✅ REAL

- **Implementation**: Salted password hashing with `bcryptjs` (cost factor 10).
- **Session Architecture**: Stateless signed HS256 JWT tokens using `jose`.
- **Cookie Security**: `HttpOnly`, `SameSite=Lax`, `Path=/`, `maxAge=7 days`. `Secure` flag automatically enforced when `NODE_ENV=production`.
- **Credential Protection**: Passwords are never returned in JSON payloads (scrubbed via destructuring before response).
- **Route Guard**: Edge middleware in `middleware.ts` intercepts requests to `/dashboard`, `/inbox`, `/pages`, etc., redirecting unauthenticated visitors to `/login?from=...`.
- **User Profile**: Full name updates and password changes with current-password verification (`PUT /api/auth/profile`).

---

## Multi-Tenancy

**Status**: ⚠️ PARTIAL / 🔴 SECURITY RISK ON CERTAIN ROUTES

- **Data Modeling**: Every business record (`FacebookPage`, `Contact`, `Conversation`, `Message`, `Label`, `Campaign`, `Template`, `SavedReply`) contains an `organizationId` foreign key.
- **Tenant Isolation Enforcement**:
  - `GET /api/data/bootstrap`: ✅ Securely derives `organizationId` from authenticated user membership.
  - `POST /api/inbox/send`: 🔴 **VULNERABILITY**: Accepts `conversationId` without validating that the authenticated user belongs to the organization that owns that conversation. A malicious user could send messages into another organization's conversation thread by guessing or supplying their UUID.
  - `POST /api/inbox/notes`: 🔴 **VULNERABILITY**: Accepts `contactId` without verifying tenant membership.
  - **Organization Switching**: Lacks support for users who belong to multiple organizations (currently hardcodes the first organization).

---

## Meta Integration

**Status**: ❌ MOCK / ⚠️ PARTIAL

| Capability | Status | Inspection Finding |
| :--- | :--- | :--- |
| **Meta OAuth Flow** | ❌ MISSING | No OAuth initiation or code exchange routes exist. |
| **Permissions Requested** | ⚠️ PARTIAL | Documented in UI (`pages_messaging`, `pages_show_list`), but not configured in an OAuth client. |
| **Page Access Token Storage** | ✅ REAL | Encrypted at rest using AES-256-GCM via `lib/crypto.ts`. |
| **Page Retrieval & Sync** | ❌ MOCK | Seeded mock pages ("Aura Athletics", "Aura Footwear") in database; no live Graph API `/me/accounts` call. |
| **Page Connection/Disconnection** | ❌ MOCK | UI modal uses `setTimeout(..., 600)` in client state; does not call a backend endpoint. |
| **Webhook Verification (GET)** | ✅ REAL | Implemented in `app/api/webhooks/facebook/route.ts` and tested with challenge tokens. |
| **Webhook Signature (POST)** | ✅ REAL | Timing-safe HMAC-SHA256 signature verification in `lib/crypto.ts`. |
| **Inbound Messages** | ✅ REAL (Ingestion) | Correctly parses Meta webhook entries and writes to DB. |
| **Outbound Messages** | ❌ MOCK | `POST /api/inbox/send` saves a message to the local DB only; does NOT call Meta's Send API (`POST https://graph.facebook.com/v19.0/me/messages`). |
| **Delivery / Read Receipts** | ✅ REAL (Parser) | Updates message state to `delivered` / `read` when incoming webhook receipts arrive. |
| **Provider Abstraction** | ❌ MISSING | Dual provider pattern (`MetaProvider` with `MockMetaProvider` and `RealMetaProvider`) is not yet formalized into clean injectable classes. |

---

## Facebook Pages

**Status**: ⚠️ PARTIAL (UI Real, Meta API Mocked)

- **UI (`app/pages/page.tsx`)**: Fully rendered cards displaying Page name, ID, status, webhook active badges, and synchronization timestamps.
- **Connect Page Action**: Simulates connection via a 600ms timer; does not execute Meta OAuth or store a genuine Facebook Page Access Token.
- **Disconnect / Refresh Actions**: Client-side UI triggers only; no backend sync endpoint.

---

## Webhooks

**Status**: ⚠️ PARTIAL (Core Flow Functional, Background Queue Missing)

- **Endpoint**: `/api/webhooks/facebook`
- **GET Verification**: Fully working; matches `hub.verify_token` against `META_VERIFY_TOKEN` and echoes `hub.challenge`.
- **POST Ingestion**:
  - Reads raw text body for HMAC-SHA256 verification.
  - Deduplicates events using Meta `mid` against both `messages` and `webhookEvents` tables (Idempotent).
  - Automatically matches or provisions `Contact` and `Conversation` records in DB.
  - Returns HTTP 200 within milliseconds to meet Meta's timeout requirements.
- **Missing Architecture**:
  - Events are processed synchronously within the request handler before returning HTTP 200. In production, high-volume webhooks must be placed onto a lightweight in-memory or Redis queue (e.g. BullMQ) so the HTTP endpoint returns 200 in <50ms without risking timeout during heavy database writes.

---

## Inbox

**Status**: ⚠️ PARTIAL (UI Real, Live Webhooks Functional, Realtime Push Missing)

- **UI Layout**: 3-Pane desktop-first layout (Left: Filters & threads; Center: Message stream & composer; Right: Customer profile, labels, and notes).
- **Thread List**: Accurately displays customer names, avatars, unread counts, last message snippets, and associated Facebook Pages.
- **Filtering & Search**: Client-side search by name/text, status filtering (`all`, `unread`, `open`, `closed`), and per-page filtering are operational.
- **Replying**: Message composer sends payload to `POST /api/inbox/send`, immediately updates thread, and resets unread count.
- **Saved Replies**: Interactive popup inserts canned responses with variable substitution (`{{name}}`).
- **Missing Realtime Sync**: The inbox does not have a Server-Sent Events (SSE) or WebSocket connection. When a new webhook arrives from Meta, the browser must be manually refreshed or polled to see the new message.

---

## Messages

**Status**: ⚠️ PARTIAL

- **Schema**: Stores `id`, `conversationId`, `organizationId`, `pageId`, `mid`, `senderId`, `recipientId`, `senderType`, `text`, `status`, and `createdAt`.
- **Status Lifecycle**: Supports `queued`, `sending`, `sent`, `delivered`, `read`, and `failed`.
- **Inbound vs. Outbound**: Outbound messages are currently created directly in `delivered` state in DB without passing through a network call to Meta Graph API.

---

## Contacts

**Status**: ✅ REAL (In Local DB) / ⚠️ PARTIAL (Graph API Sync Missing)

- **Directory (`app/contacts/page.tsx`)**: Displays all contacts, profile images, Page-Scoped IDs (PSIDs), and associated labels.
- **Auto-Provisioning**: Inbound webhook messages from new PSIDs automatically create a new `ContactRecord` linked to the correct Page and Organization.
- **Missing**: No Meta Graph API profile enrichment (fetching customer's real first/last name and profile picture from Meta using `GET /{psid}?fields=first_name,last_name,profile_pic` with Page Access Token).

---

## Labels

**Status**: ⚠️ PARTIAL

- **Management**: Organization-scoped labels (`id`, `organizationId`, `name`, `color`, `description`) are rendered in UI and seeded in DB.
- **Contact Labeling**: `ContactLabelRecord` connects labels to contacts.
- **Missing**: Dedicated CRUD API endpoints (`POST /api/labels`, `PUT /api/labels/[id]`, `DELETE /api/labels/[id]`, and `POST /api/contacts/[id]/labels`).

---

## Templates

**Status**: ⚠️ PARTIAL (UI Real, Meta Submission Missing)

- **UI (`app/templates/page.tsx`)**: Displays approved and pending templates with Meta categories (`UTILITY`, `MARKETING`), language codes, and variable placeholders.
- **Missing**: No API route to submit new templates to Meta (`POST /{page_id}/message_templates`) or check template approval status via webhook / polling.

---

## Campaigns

**Status**: ❌ MOCK

- **UI (`app/campaigns/page.tsx`)**: 7-Step creation wizard (Name &rarr; Pages &rarr; Audience &rarr; Template &rarr; Variables &rarr; Review &rarr; Launch).
- **Backend Flow**: When clicking "Launch Broadcast Now", the modal executes a 600ms `setTimeout` in the browser. It does NOT submit to an API endpoint or create records in `campaigns` or `campaignMessages`.
- **Delivery Progress**: Progress bars and stat cards in the UI display seeded numbers; they are not connected to a background dispatch worker.

---

## Queue/Workers

**Status**: ❌ MISSING

- **Current State**: Zero background workers or queue processes exist.
- **Production Requirement**: Campaign broadcasts and webhook processing require an asynchronous job queue (e.g. BullMQ backed by Redis, or a database-backed job runner) with:
  - Token-bucket rate limiting (Meta allows ~250 calls/sec per Page).
  - Exponential retry backoff for network or rate-limit errors.
  - Message status progression (`pending` &rarr; `queued` &rarr; `sending` &rarr; `sent` &rarr; `delivered`).
  - Dead-letter handling for failed messages.

---

## Teams/RBAC

**Status**: ⚠️ PARTIAL

- **Roles Defined**: `OWNER`, `ADMIN`, `MANAGER`, `AGENT`, `VIEWER`.
- **UI (`app/team/page.tsx`)**: Lists members, email addresses, and roles.
- **Enforcement**: RBAC permissions are not currently validated inside API route handlers. Any authenticated member can perform any action regardless of whether their role is `VIEWER` or `OWNER`.
- **Invites**: "Invite Team Member" button has no backend route or transactional email delivery (Resend / SendGrid).

---

## Billing

**Status**: ❌ MOCK

- **UI (`app/billing/page.tsx`)**: Tier cards (Free, Starter, Pro, Business) with limit breakdowns and a simulated plan toggle.
- **Backend Flow**: No Stripe integration exists. No checkout session route (`POST /api/billing/checkout`), no customer portal route, and no Stripe webhook handler (`POST /api/billing/webhook`) to handle `checkout.session.completed` or `customer.subscription.deleted`.
- **Quota Checks**: Quotas in `lib/types.ts` (`PLAN_LIMITS`) are not enforced on write operations (e.g., creating a 4th page on a Free plan is not blocked server-side).

---

## Analytics

**Status**: ❌ MOCK

- **UI (`app/analytics/page.tsx`)**: Renders chart bars and metrics (messages sent, resolution times, agent activity).
- **Data Source**: All metrics, percentages, and chart bar heights are hardcoded static numbers in the React component; they do not query server-side aggregated database metrics.

---

## Cloud Storage

**Status**: ❌ MISSING

- **Database**: Local JSON file (`data/heropage.db.json`) on developer's C: drive.
- **Media / Attachments**: Image URLs in demo data point to public Unsplash placeholders. No S3 / Cloudflare R2 object storage integration exists to host uploaded customer images or campaign media.

---

## Security

**Status**: ⚠️ PARTIAL (Strong Foundations; Key Gaps Exist)

### Strengths
- ✅ Passwords hashed with bcrypt (salt rounds 10).
- ✅ Session tokens signed with HS256 JWT in HttpOnly, SameSite=Lax cookies.
- ✅ Facebook Page tokens encrypted with AES-256-GCM at rest.
- ✅ Meta webhook signature verified with timing-safe HMAC-SHA256.
- ✅ Secrets and credentials excluded from source control (`.env` in `.gitignore`).

### Vulnerabilities & Gaps
- 🔴 **Tenant Isolation Gap**: `/api/inbox/send` and `/api/inbox/notes` do not verify that the target conversation/contact belongs to the authenticated user's organization.
- 🔴 **RBAC Authorization Missing**: API routes do not verify whether a user has permission (e.g., `VIEWER` vs `ADMIN`) before performing operations.
- ⚠️ **Missing CSRF Token Protection**: While `SameSite=Lax` cookies prevent simple cross-origin POSTs, state-changing API endpoints should validate custom headers (e.g. `X-Requested-With`) or origin headers.
- ⚠️ **Missing API Rate Limiter**: Endpoints (`/api/auth/login`, `/api/auth/signup`) lack IP-based rate limiting, leaving them vulnerable to brute-force credential stuffing.

---

## Testing

**Status**: ⚠️ PARTIAL

- **Automated Tests Implemented (`npm test`)**:
  - `tests/phase1-foundation.test.ts`: AES-256-GCM token encryption/decryption, Meta HMAC-SHA256 verification.
  - `tests/phase2-auth.test.ts`: Bcrypt hashing, session JWT signing & tamper detection, duplicate signup rejection, password update.
  - `tests/phase7-webhook.test.ts`: Meta Webhook handshake challenge, payload parsing, Cloud DB ingestion, and idempotency protection against duplicate `mid`.
- **Missing Automated Tests**:
  - ❌ Tenant isolation tests (Org A accessing Org B).
  - ❌ RBAC permission enforcement tests.
  - ❌ Campaign creation and queue rate-limiting tests.
  - ❌ E2E flows (signup &rarr; connect page &rarr; receive webhook &rarr; send reply).

---

## Deployment

**Status**: ❌ NOT PROVISIONED

- Currently running locally on `http://localhost:3000` under Windows.
- No `Dockerfile` or `docker-compose.yml` for containerized production execution.
- No cloud PostgreSQL database (Supabase, Neon, AWS RDS) provisioned.
- No public domain or HTTPS reverse proxy (Caddy / Nginx / Cloudflare) to receive live Meta webhooks without tunneling.

---

## Mock/Placeholder Components

| # | File Path | Function / Component | Current Mock Behavior | Required Production Replacement |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `lib/seed.ts` | `seedDemoDataForOrg()` | Seeds fake Facebook pages ("Aura Athletics"), mock contacts, and simulated message threads upon login. | Real Meta OAuth flow storing genuine Facebook Page Access Tokens and real incoming customer webhooks. |
| 2 | `app/api/inbox/send/route.ts` | `POST` | Saves message to local DB with status `delivered`, but sends nothing over the internet. | Calls Meta Graph API `POST https://graph.facebook.com/v19.0/me/messages` using the page's decrypted Page Access Token. |
| 3 | `app/pages/page.tsx` | `handleConnectPage()` | Runs a 600ms `setTimeout()` and closes modal without contacting Facebook. | Redirects user to Meta OAuth URL (`facebook.com/v19.0/dialog/oauth`), exchanges code for tokens, and subscribes to webhooks. |
| 4 | `app/campaigns/page.tsx` | `handleLaunchCampaign()` | Runs a 600ms `setTimeout()` and closes wizard without creating DB records. | Posts to `/api/campaigns`, writes to `campaigns` and `campaignMessages` tables, and enqueues jobs in a rate-limited worker. |
| 5 | `app/billing/page.tsx` | `setCurrentPlan()` | Updates client React state; no billing transaction occurs. | Calls `/api/billing/checkout` to create a Stripe Checkout Session and redirects to Stripe. |
| 6 | `app/analytics/page.tsx` | `AnalyticsPage()` | Displays hardcoded static numbers and SVG bar heights. | Calls `/api/analytics` which runs SQL aggregation queries over genuine message and conversation records. |
| 7 | `app/admin/page.tsx` | `AdminPage()` | Hardcodes mock table rows for webhook logs and 99.98% uptime. | Queries genuine `webhookEvents` records and health telemetry from the database. |
| 8 | `app/team/page.tsx` | "Invite Member" button | Button click does nothing; no modal or API endpoint exists. | Implements invite modal calling `POST /api/team/invite` with transactional email delivery. |
| 9 | `app/templates/page.tsx` | "Submit Template" button | Button click does nothing. | Implements modal calling `POST /api/templates` to submit template to Meta Graph API for review. |
| 10 | `lib/db.ts` | `readDb()` / `writeDb()` | Reads and writes JSON to a local file on the C: drive. | Replaces local file I/O with Prisma ORM connecting to a managed PostgreSQL cluster with pooling. |

---

## Production Blockers

The **10 most critical production blockers** preventing commercial use:

1. **Local File Database (`data/heropage.db.json`)**:
   - *Blocker*: Cannot scale horizontally, cannot run on serverless/ephemeral containers (Vercel/Railway will wipe the file on redeploy), and lacks ACID transactions across concurrent requests. Must be replaced with managed PostgreSQL.
2. **Missing Outbound Meta Graph API Message Dispatch**:
   - *Blocker*: Replying in `/inbox` only updates the local database; it never sends a message back to the customer's Facebook Messenger.
3. **Missing Meta OAuth Connection Pipeline**:
   - *Blocker*: Real businesses cannot connect their Facebook Pages; connection is currently simulated with a client timer and seeded data.
4. **Tenant Isolation Vulnerability on Write Endpoints**:
   - *Blocker*: `/api/inbox/send` and `/api/inbox/notes` do not verify organization ownership, allowing cross-tenant data tampering if IDs are guessed.
5. **Missing Asynchronous Background Queue Worker**:
   - *Blocker*: Broadcasting campaigns and processing high-throughput webhooks without a rate-limited queue (BullMQ/Redis) will trigger Meta API rate-limit bans (250 req/sec limit) and webhook timeout failures.
6. **No Real-Time Transport (SSE / WebSockets)**:
   - *Blocker*: Inbound customer messages received by webhooks do not appear in the active Inbox UI without a manual page refresh.
   - *Required*: Server-Sent Events (SSE) route streaming new messages directly into the UI.
7. **No Real Stripe Billing Integration**:
   - *Blocker*: Users cannot subscribe, pay, upgrade, or be charged. Subscription status and quota limits are not enforced.
8. **Client-Side Mocked Campaign Engine**:
   - *Blocker*: The 7-step campaign builder does not persist campaigns to the database or schedule broadcasts.
9. **Hardcoded Analytics & Admin Console**:
   - *Blocker*: Business metrics, message volumes, delivery rates, and webhook logs are mock data rather than server-side database aggregations.
10. **No Production Hosting & HTTPS Webhook URL**:
    - *Blocker*: Meta will not deliver production webhooks to `localhost:3000`. Requires a public domain with HTTPS, production environment configuration, and container deployment.

---

## Recommended Architecture

```
[ Facebook Platform ]
  │  ▲
  │  │ (OAuth & Webhooks)
  ▼  │ (Meta Graph API v19+)
[ Production Cloud: Docker / VPS / PaaS ]
  │
  ├── [ Nginx / Cloudflare (SSL & Reverse Proxy) ]
  │     │
  │     ▼
  ├── [ Next.js 14 App Server ]
  │     ├── [ UI App Shell (React 18 + SSE Client) ]
  │     ├── [ Auth & RBAC Middleware ]
  │     ├── [ REST API Route Handlers (/api/*) ]
  │     └── [ MetaProvider Service Layer ]
  │           ├── MockMetaProvider (Development/Tests)
  │           └── RealMetaProvider (Production Graph API)
  │
  ├── [ Redis + BullMQ Queue Cluster ]
  │     ├── Webhook Ingestion Worker (Fast ACK, Async Parse)
  │     └── Campaign Dispatch Worker (Rate-Limited Token Bucket)
  │
  ├── [ Managed PostgreSQL Database (Prisma ORM) ]
  │     ├── Strict compound indexes (org_id, page_id, contact_id)
  │     ├── Foreign key cascading & tenant isolation queries
  │     └── Migration history & seeders
  │
  └── [ Stripe Billing Service ]
        ├── Checkout Session Generator
        └── Webhook Handler (Subscription Lifecycle)
```

---

## Recommended Implementation Order

To transform this existing codebase into a commercial production SaaS with zero regressions:

### Step 1: Database Migration to PostgreSQL & Prisma ORM
- Install Prisma and `@prisma/client`.
- Define PostgreSQL schema mapping the existing `lib/db.ts` interfaces 1:1.
- Generate Prisma client and create initial migration.
- Replace `lib/db.ts` file calls with Prisma query services while preserving existing data structures.

### Step 2: Multi-Tenant Security & Tenant Isolation Hardening
- Audit and patch `/api/inbox/send`, `/api/inbox/notes`, and `/api/data/bootstrap` to strictly derive `organizationId` from session membership.
- Block any request where the user does not belong to the entity's organization.
- Add organization switching context.

### Step 3: Meta Provider Architecture & Outbound Message Dispatch
- Create `MetaProvider` interface with `RealMetaProvider` and `MockMetaProvider`.
- Wire `POST /api/inbox/send` to call `metaProvider.sendMessage()` so outgoing agent replies actually reach the customer on Facebook Messenger using the encrypted Page Access Token.

### Step 4: Real-Time SSE Stream for Unified Inbox
- Implement `GET /api/inbox/stream` (Server-Sent Events).
- Connect `app/inbox/page.tsx` to the stream so incoming webhook messages appear instantly in the chat thread without refreshing.

### Step 5: Meta OAuth Integration & Page Management
- Implement `GET /api/auth/oauth/facebook` and `GET /api/auth/oauth/facebook/callback`.
- Fetch authorized pages via `GET /me/accounts`, encrypt tokens with AES-256-GCM, and persist to `FacebookPage` table.
- Implement `DELETE /api/pages/[id]` to disconnect pages.

### Step 6: Asynchronous Queue Worker (Redis + BullMQ)
- Setup BullMQ worker for:
  1. Offloading heavy webhook payload parsing.
  2. Campaign message dispatch with rate-limiting (max 25 msgs/sec per page).

### Step 7: Campaign Engine Backend Wiring
- Create `POST /api/campaigns` to validate audience segmentation, evaluate templates, and enqueue broadcast jobs.
- Wire the 7-step UI wizard to submit to this route.

### Step 8: Contact Enrichment & Labels Management
- Add CRUD endpoints for labels (`/api/labels`).
- Add background PSID enrichment via Meta Graph API (`GET /{psid}?fields=first_name,last_name,profile_pic`).

### Step 9: Stripe Billing Integration & Quota Enforcement
- Install `stripe` SDK.
- Implement `/api/billing/checkout` and `/api/billing/webhook`.
- Enforce plan quotas on page connections, contacts, and monthly broadcast counts.

### Step 10: Real Database Analytics & Admin Telemetry
- Replace static numbers in `/analytics` and `/admin` with Prisma SQL aggregations.
- Implement audit log recording for sensitive administrative actions.

### Step 11: Production Deployment & Dockerization
- Create `Dockerfile` and `docker-compose.yml` (Next.js + Redis + PostgreSQL).
- Create production `.env` documentation.
- Implement health monitoring and backup procedures.

---

## Risk Assessment

| Risk Area | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Meta API Rate-Limiting & Bans** | High | High | Implement token-bucket throttler in queue worker; never send campaigns in raw loops. |
| **Cross-Tenant Data Leakage** | Critical | Medium | Centralize database queries in a tenant-aware repository layer that mandates `organizationId`. |
| **Webhook Delivery Timeouts** | High | High | Acknowledge Meta with HTTP 200 within 50ms and push payloads to Redis queue for background execution. |
| **Database Corruption / Data Loss** | Critical | High (with file DB) | Migrate from file-based `heropage.db.json` to managed PostgreSQL with daily automated snapshots. |
| **Token Compromise** | Critical | Low | Maintain AES-256-GCM encryption at rest; never return Page Access Tokens to the client. |

---

## Final Readiness Score

| Category | Score (0–100) | Status |
| :--- | :--- | :--- |
| **Frontend UI/UX** | **95 / 100** | ✅ All 11 navigation views complete and styled |
| **Authentication & Sessions** | **90 / 100** | ✅ Secure Bcrypt + signed JWT + HttpOnly cookies |
| **Database Architecture** | **45 / 100** | ⚠️ Relational schema ready, but on local JSON file |
| **Multi-Tenancy Isolation** | **55 / 100** | ⚠️ Schema isolated, but write endpoints lack ownership checks |
| **Meta Webhook Handling** | **75 / 100** | ⚠️ Handshake, HMAC, & deduplication work; queue missing |
| **Meta Graph API Outbound** | **15 / 100** | ❌ Outbound message sending is purely local/mock |
| **Campaign Broadcasting** | **20 / 100** | ❌ 7-Step UI wizard complete; backend queue missing |
| **Billing & Monetization** | **15 / 100** | ❌ UI tiers displayed; Stripe integration missing |
| **Real-Time Messaging** | **10 / 100** | ❌ No SSE or WebSocket transport connected |
| **Production Deployment** | **10 / 100** | ❌ Localhost only; no Docker or Cloud PostgreSQL |
| **OVERALL READINESS SCORE** | **43 / 100** | **PROTOTYPE / LOCAL MVP STAGE** |
