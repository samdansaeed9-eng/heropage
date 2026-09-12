# Architecture Audit: Multi-Page Messenger SaaS ("HeroPage")

**Date**: September 12, 2026  
**Auditor**: Lead Software Engineer & Product Architect  
**Project**: Multi-Page Messenger SaaS (HeroPage)  
**Status**: Greenfield Repository Baseline Audit (Phase 0)

---

## Executive Summary

This architecture audit establishes the structural baseline for **HeroPage**, a production-grade multi-tenant SaaS platform allowing businesses and agencies to connect multiple Facebook Pages and manage Messenger conversations, unified inboxes, contacts, labels, message campaigns, templates, teams, and billing from a single dashboard using official Meta APIs.

As verified during repository inspection, this is a **greenfield repository**. There is no legacy or preexisting application code in the target workspace (`C:\Users\Samdan\.gemini\antigravity\scratch\heropage`). Therefore, this audit serves as our architectural assessment, baseline audit, and technical risk blueprint before initiating Phase 1.

---

## 1. Baseline System Analysis

| Dimension | Current State | Target Specification Requirement |
| :--- | :--- | :--- |
| **Framework** | Greenfield (None) | Next.js (App Router) + TypeScript + Node.js runtime |
| **Frontend Architecture** | Greenfield (None) | React 19/18, Tailwind CSS, Lucide React, Desktop-first responsive layout |
| **Backend Architecture** | Greenfield (None) | Next.js API route handlers + modular domain service layers |
| **Database** | Greenfield (None) | Relational SQL (PostgreSQL/SQLite via Prisma ORM) with strict foreign keys & indexing |
| **Authentication** | Greenfield (None) | Secure multi-tenant session auth, salted hashing (Argon2/Bcrypt), session cookies |
| **Authorization & Multi-tenancy** | Greenfield (None) | Strict `organization_id` tenant isolation, RBAC (OWNER, ADMIN, MANAGER, AGENT, VIEWER) |
| **Meta / Facebook Integration** | Greenfield (None) | Meta Graph API v19+ OAuth, token exchange, multi-page connection, encrypted token storage |
| **Messenger Integration** | Greenfield (None) | Graph API Send API, bidirectional message handling, dual Provider pattern (Real & Mock) |
| **Webhooks** | Greenfield (None) | Fast Meta SHA256 HMAC signature verification, raw event store, idempotent queue processing |
| **Background Jobs & Queue** | Greenfield (None) | Controlled asynchronous queue for message delivery, rate limiting, retry backoff & DLQ |
| **API Surface** | Greenfield (None) | Clean RESTful endpoints under `/api/*`, strictly deriving tenant context from session |
| **UI Design System** | Greenfield (None) | Original modern SaaS design system, unified states (Loading, Empty, Error, Success) |
| **Contacts & Labels** | Greenfield (None) | Contact profiles, identifiers (PSID), organization-scoped labels & internal notes |
| **Campaigns Engine** | Greenfield (None) | 7-step wizard, audience segmentation by label, variable interpolation, scheduled execution |
| **Message Templates** | Greenfield (None) | Meta policy-compliant templates with validation & status tracking |
| **Team Management** | Greenfield (None) | Organization invites, role assignment, per-page access delegation |
| **Billing & Usage Limits** | Greenfield (None) | Subscription tiers (Free, Starter, Pro, Business), usage limit enforcement, Stripe service |
| **Automated Tests** | Greenfield (None) | Unit, integration, authorization, webhook idempotency, and E2E mock suites |
| **Deployment & DevOps** | Greenfield (None) | Dockerized container, health check endpoint (`/health`), production readiness |
| **Environment Variables** | Greenfield (None) | Fully documented `.env.example` with zero hardcoded credentials |
| **Security Mechanisms** | Greenfield (None) | AES-256-GCM token encryption at rest, CSRF protection, input validation (Zod), rate limits |

---

## 2. Gap & Readiness Analysis

### 1. What Already Works
- **Runtime Environment**: Host workstation is verified with Node.js v24.14.1, npm 11.12.1, and Python 3.14.4.
- **Repository Isolation**: Workspace root established at `C:\Users\Samdan\.gemini\antigravity\scratch\heropage` ensuring zero contamination with other scratch folders or external codebases.

### 2. What Partially Works
- *None*: Clean slate with no partially implemented half-features or corrupted schema migrations.

### 3. What is Missing
- Complete application stack across all 25 designated phases (from foundational architecture and authentication to billing, campaigns queue, and deployment).

### 4. What Should Be Reused
- **Modern Architectural Standards**:
  - Next.js App Router for unified SSR and API endpoints.
  - Prisma ORM for type-safe database access, automated migrations, and schema modeling.
  - Zod for strict runtime schema validation of all API payloads and webhook bodies.
  - Tailwind CSS + modular design token components for the original UI system.
  - Provider Abstraction (`MetaProvider`: `RealMetaProvider` and `MockMetaProvider`) for safe zero-risk local development and deterministic E2E testing.

### 5. What Should Be Replaced / Avoided
- **Avoid Single-Tenant Assumptions**: Never use ambient user queries without an explicit `organization_id` filter.
- **Avoid In-Memory Only States**: Avoid volatile queue states for campaign sending; persist all job items with state transitions (`pending`, `queued`, `sending`, `sent`, `delivered`, `failed`, `skipped`).
- **Avoid Uncontrolled Loops**: Reject naive `for` loops for campaign dispatch that could trigger Meta rate-limiting bans.
- **Avoid Scraping/Browser Automation**: Strictly enforce Meta official Graph API endpoints only.

### 6. What is Dangerous to Rewrite / Architectural Hazards
1. **Multi-Tenancy Tenant Leakage**:
   - *Risk*: A missing `organization_id` in a query could leak Facebook pages, customer leads, or conversations between competing organizations.
   - *Mitigation*: Service-layer query wrappers enforcing tenant context on every database read and write.
2. **Meta Token Exposure**:
   - *Risk*: Exposing Facebook Page Access Tokens or User Access Tokens to client-side bundles or unencrypted database fields.
   - *Mitigation*: AES-256-GCM encryption at rest; token scrubbing in all API serialization layers.
3. **Webhook Duplicate Delivery & Race Conditions**:
   - *Risk*: Meta retries unacknowledged webhooks; network delays can deliver duplicate `message_deliveries` or `messages` events.
   - *Mitigation*: Store raw `WebhookEvent` with unique `event_id` / Meta `mid`, return HTTP 200 immediately, and enforce database deduplication before insertion.
4. **Messenger Policy & Rate Limit Violations**:
   - *Risk*: Exceeding 250 calls/sec or violating Meta's 24-hour messaging window with promotional content.
   - *Mitigation*: Campaign queue with token-bucket rate limiters and explicit message tag / template compliance checks.

### 7. Existing Technical Debt
- Because this is a fresh implementation, there is **zero existing technical debt**. Our primary objective is to keep it that way by building strictly incrementally, phase by phase, with comprehensive test coverage and documentation.

---

## 3. Recommended Implementation Roadmap (Phases 1–25)

1. **Phase 1: Architecture Cleanup & Project Foundation**
   - Initialize Next.js, TypeScript, Tailwind, ESLint, directory structures, and core utilities.
2. **Phase 2: Authentication**
   - User signup, login, session handling, password hashing, and user profile.
3. **Phase 3: Organizations & Multi-Tenancy**
   - Organization creation, membership, role-based authorization (RBAC), and tenant context middleware.
4. **Phase 4: Database Foundation**
   - Prisma schema, migrations, foreign keys, indexes, and seeders.
5. **Phase 5: Meta Connection**
   - Facebook OAuth flow, encrypted token storage, provider abstraction (`MockMetaProvider` / `RealMetaProvider`).
6. **Phase 6: Facebook Pages Management**
   - Multi-page listing, connect, disconnect, token refresh, connection health indicators.
7. **Phase 7: Webhooks**
   - Signature verification (`X-Hub-Signature-256`), raw event recording, idempotency, event dispatching.
8. **Phase 8: Conversations**
   - Conversation thread model, pagination, unread counters, assignment, filters, search.
9. **Phase 9: Messages**
   - Messenger send/receive, delivery status transitions, attachment support, optimistic UI.
10. **Phase 10: Contacts**
    - Contact directory, PSID mapping, profile view, interaction history.
11. **Phase 11: Labels & Notes**
    - Organization labels, color tokens, contact labeling, internal team notes.
12. **Phase 12: Saved Replies**
    - Quick canned response creation, insertion shortcuts into conversation composer.
13. **Phase 13: Templates**
    - Meta-compliant message templates, variable placeholders, status lifecycle.
14. **Phase 14: Campaign Engine**
    - Multi-step campaign builder wizard, audience segmentation by label, variable mapping.
15. **Phase 15: Campaign Queue**
    - Asynchronous message job worker, rate limiting, retry backoff, failure accounting.
16. **Phase 16: Campaign Analytics**
    - Real-time campaign stats, delivery vs failure ratios, timeline, and export.
17. **Phase 17: Teams & Permissions**
    - Team invites, role enforcement, Page-level access restriction.
18. **Phase 18: Dashboard**
    - Top-level operational metrics, recent conversations, campaign summary, quick actions.
19. **Phase 19: Billing**
    - Plan tiers (Free, Starter, Pro, Business), Stripe billing abstraction, checkout & webhook handling.
20. **Phase 20: Usage Limits**
    - Strict server-side quota checks (pages, contacts, messages, team members).
21. **Phase 21: Analytics**
    - Time-filtered server-aggregated analytics (messages, conversations, agent activity).
22. **Phase 22: Admin**
    - Super-admin overview: system logs, tenant monitoring, feature flags, webhook debugging.
23. **Phase 23: Security Hardening**
    - CSRF, helmet headers, audit logs, rate limiters, token encryption audit.
24. **Phase 24: Testing**
    - Automated test suites: unit, integration, authorization, idempotency, and E2E flows.
25. **Phase 25: Deployment**
    - Production Dockerfile, health check (`GET /health`), environment docs, deployment verification.
