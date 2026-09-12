# Project Status: Multi-Page Messenger SaaS ("HeroPage")

**Last Updated**: September 12, 2026  
**Auditor**: Senior Software Architect & Production-Readiness Engineer  
**Stage**: Production-Readiness Audit Complete — Ready for Phase 1 Transformation  

---

## Completed
- **Full Frontend SaaS Interface**:
  - Global responsive layout (`components/layout/AppShell.tsx`) with organization switcher and navigation.
  - Complete UI screens across all 11 core areas:
    - `/dashboard`: Operational cards, conversation feed, campaign progress, page health.
    - `/inbox`: 3-Pane customer support layout with live chat thread, status ticks (`sent`/`delivered`/`read`), composer, saved replies popup, customer PSID profile, labels, and internal team notes.
    - `/pages`: Facebook Page connection cards, OAuth permissions checklist, connect modal.
    - `/contacts`: Customer CRM with PSID directory, label filtering, search.
    - `/campaigns`: 7-Step broadcast creation wizard and delivery rate progress bars.
    - `/templates`: Meta-compliant template management with variables and approval status.
    - `/team`: Organization members directory with RBAC roles (`OWNER`, `ADMIN`, `AGENT`).
    - `/billing`: Subscription tier cards (Free, Starter, Pro, Business) and usage gauges.
    - `/analytics`: Volume charts, inbound/outbound breakdown, agent response time.
    - `/settings`: Webhook callback URL with copy helper, verify token, and token encryption status.
    - `/admin`: Super-admin system health status and raw webhook ingestion audit logs.
- **Authentication & Session Security**:
  - Salted password hashing via `bcryptjs` (salt rounds 10) in `lib/auth.ts`.
  - Signed HS256 JWT sessions via `jose` with `HttpOnly`, `SameSite=Lax`, and `Secure` cookies.
  - Endpoints: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/profile`.
  - Edge route protection middleware in `middleware.ts`.
- **Cryptography & Security**:
  - AES-256-GCM symmetric encryption for Facebook Page tokens at rest in `lib/crypto.ts`.
  - Meta `X-Hub-Signature-256` HMAC timing-safe signature verification.
- **Webhook Ingestion Engine**:
  - `GET /api/webhooks/facebook`: Meta handshake challenge verification.
  - `POST /api/webhooks/facebook`: Parses incoming messages, delivery, and read receipts; deduplicates events by `mid` (Idempotent); automatically provisions contacts, conversations, and messages.
- **Automated Tests Passing (`npm test`)**:
  - `tests/phase1-foundation.test.ts`: Crypto & HMAC verification.
  - `tests/phase2-auth.test.ts`: Bcrypt, JWT sessions, password modification.
  - `tests/phase7-webhook.test.ts`: Webhook handshake, payload parsing, idempotency.

---

## In Progress
- Architectural transition from local prototype/mock stage to production-ready enterprise SaaS.

---

## Blocked
- None currently blocking development.

---

## Production Blockers
1. **Local File Database (`data/heropage.db.json`)**: Needs migration to managed PostgreSQL via Prisma ORM for concurrency, transactions, and cloud persistence.
2. **Missing Outbound Meta Graph API Dispatch**: Outgoing messages in `/inbox` only save locally and do not dispatch to Meta's Send API (`https://graph.facebook.com/v19.0/me/messages`).
3. **Missing Meta OAuth Connection Flow**: Facebook Page connection currently simulates via a 600ms client timer instead of genuine Meta OAuth (`/oauth/access_token` and `/me/accounts`).
4. **Tenant Isolation Gap on Write Endpoints**: `/api/inbox/send` and `/api/inbox/notes` do not verify organization ownership of the target conversation/contact.
5. **Missing Asynchronous Queue Worker**: No background queue (BullMQ + Redis) to handle rate-limited campaign dispatching (250 msgs/sec Meta ceiling) and high-volume webhook ingestion.
6. **No Real-Time Transport (SSE / WebSockets)**: Incoming customer webhooks require manual page reload to display in the inbox.
7. **Mocked Campaign Engine Backend**: 7-Step campaign builder modal runs client-side `setTimeout` without persisting to database.
8. **Missing Stripe Billing Integration**: No checkout session generation, customer portal, or Stripe webhook listener.
9. **Hardcoded Analytics & Admin Data**: Analytics charts and admin telemetry display static hardcoded figures instead of database SQL aggregations.
10. **Unprovisioned Cloud Infrastructure**: Application currently runs on `localhost:3000` under Windows with no Docker container, HTTPS reverse proxy, or cloud database.

---

## Next Steps
1. **Migrate to PostgreSQL with Prisma ORM**: Setup Prisma schema matching existing domain entities 1:1.
2. **Harden Multi-Tenant Isolation**: Centralize server-side organization authorization on all write API routes.
3. **Build MetaProvider (Real & Mock)**: Connect `/api/inbox/send` to live Meta Graph API outbound sending.
4. **Implement Real-Time SSE Stream**: Add `GET /api/inbox/stream` for live message arrival without refreshing.
5. **Implement Meta OAuth Handshake**: Real Facebook Login, Page selection, and AES-256-GCM token storage.
6. **Implement Redis + BullMQ Queue**: Controlled rate-limited broadcast engine and async webhook processor.

---

## Known Issues
- Local file `data/heropage.db.json` cannot run concurrently across multiple serverless or container instances without data collisions.
- Outgoing replies currently assume immediate "delivered" status without waiting for Meta API confirmation.
