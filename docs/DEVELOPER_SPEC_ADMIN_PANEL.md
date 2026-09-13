# Developer Specification: Internal Admin Panel (Super Admin)

**Document Version:** 1.0.0  
**Target Audience:** Backend & Frontend Engineers, DevOps, Security Team  
**Scope:** Architecture, Dedicated Identity Layer, RBAC, Database Schema, Route Protection Middleware, API Specifications, Core Modules, and Audit Logging.

---

## 1. Overview & Security Architecture

The Internal Admin Panel is a dedicated, staff-only operational cockpit designed for finance, customer support, and DevOps teams to control billing approvals, manage tenant accounts, assign bespoke plan quotas, and monitor infrastructure health.

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC INTERNET                          │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
    [ Customer Traffic ]              [ Staff / Admin Traffic ]
  auth via: heropage_session           auth via: heropage_admin_session
  cookie: Lax, /                       cookie: Strict, /admin
               │                               │
               ▼                               ▼
    ┌──────────────────────┐        ┌──────────────────────────────┐
    │   Customer App       │        │    Internal Admin Panel      │
    │   /inbox, /campaigns │        │    /admin/payments           │
    │   /contacts, etc.    │        │    /admin/accounts           │
    └──────────────────────┘        │    /admin/plans, /admin/system│
                                    └──────────────┬───────────────┘
                                                   │
                                                   ▼
                                    ┌──────────────────────────────┐
                                    │ Admin RBAC + Audit Logger    │
                                    │ (admin_users + admin_audit_logs)
                                    └──────────────────────────────┘
```

### 1.1 Total Isolation Principle
- **Separate Identity Layer:** Internal staff do not authenticate against standard customer `users`. Admin credentials reside strictly in `admin_users`.
- **Dedicated Session Management:** Staff sessions use an isolated HTTP cookie (`heropage_admin_session`) with `SameSite=Strict`, `HttpOnly`, `Secure`, and short-lived expiration (12 hours).
- **No Proxy Operations:** Staff have read-only access to customer leads, conversations, and labels solely for diagnostic and dispute resolution. Admins cannot impersonate users, send broadcast campaigns, or connect Facebook Pages on behalf of customer accounts.

### 1.2 Security Safeguards
- **IP Allowlist Enforcement:** Optional environment-controlled CIDR block list (`ADMIN_IP_ALLOWLIST`) enforced at the middleware edge.
- **Two-Factor Authentication (2FA / TOTP):** Required for all Super Admin accounts performing financial approvals or plan overrides.
- **Strict Tenant Read-Only Isolation:** Direct mutations to customer data are forbidden. All modifications are confined to billing, quotas, account status, and audit trails.

---

## 2. Database Schema (Admin Specific)

This schema integrates with the PostgreSQL + Prisma data model defined in `docs/DEVELOPER_SPEC_MANUAL_BILLING_AND_DB.md`.

```prisma
// ----------------------------------------------------------------------
// Internal Staff & Admin Identity Layer
// ----------------------------------------------------------------------

enum AdminRole {
  ADMIN        // Support triage, view metrics, read-only customer context
  SUPER_ADMIN  // Billing approvals, quota modifications, plan overrides, staff management
}

enum AuditActionType {
  PAYMENT_APPROVED
  PAYMENT_REJECTED
  CUSTOM_PLAN_ASSIGNED
  PLAN_LIMITS_MODIFIED
  ACCOUNT_SUSPENDED
  ACCOUNT_REACTIVATED
  ADMIN_LOGIN_SUCCESS
  ADMIN_LOGIN_FAILED
}

model AdminUser {
  id           String      @id @default(cuid())
  name         String
  email        String      @unique
  passwordHash String
  role         AdminRole   @default(ADMIN)
  isActive     Boolean     @default(true)
  twoFactorSecret String?  // Base32 TOTP secret encrypted at rest
  twoFactorEnabled Boolean @default(false)
  lastLoginAt  DateTime?
  lastLoginIp  String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  reviewedPayments Payment[]        @relation("ReviewedByAdmin")
  auditLogs        AdminAuditLog[]

  @@index([email])
  @@index([role])
}

model AdminAuditLog {
  id          String          @id @default(cuid())
  adminId     String
  action      AuditActionType
  targetType  String          // "PAYMENT" | "ORGANIZATION" | "USER" | "SYSTEM"
  targetId    String          // Target resource primary key
  details     Json            // Captures before/after diffs, reason, and IP
  ipAddress   String
  userAgent   String?
  createdAt   DateTime        @default(now())

  admin       AdminUser       @relation(fields: [adminId], references: [id], onDelete: Restrict)

  @@index([adminId])
  @@index([action])
  @@index([targetType, targetId])
  @@index([createdAt])
}
```

### 2.1 Foreign Key Linkage in Payments Table
```prisma
// Add to Payment model in schema.prisma:
model Payment {
  // ... existing fields ...
  reviewedByAdminId  String?
  reviewedAt         DateTime?
  rejectionReason    String?
  
  reviewer           AdminUser? @relation("ReviewedByAdmin", fields: [reviewedByAdminId], references: [id], onDelete: SetNull)

  @@index([reviewedByAdminId])
}
```

---

## 3. Route Structure & Middleware Guard

All routes under `/admin` and `/api/admin` are strictly intercepted by admin authorization middleware.

### 3.1 Page Routes
| Route | Access Level | Description |
|---|---|---|
| `/admin/login` | Public (Staff Only) | Admin sign-in screen with optional TOTP prompt |
| `/admin/payments` | Admin, Super Admin | Verification queue for pending bank transfers and crypto payments |
| `/admin/accounts` | Admin, Super Admin | Searchable directory of customer accounts, quotas, and health |
| `/admin/accounts/[id]` | Admin, Super Admin | Account detail, connected pages count, seat count, and audit log |
| `/admin/plans` | Super Admin Only | Global plan config & bespoke custom quota assignment |
| `/admin/templates` | Admin, Super Admin | Review queue for Meta HSM / message templates |
| `/admin/system` | Super Admin Only | High-level metrics: throughput, Redis queue lag, webhook errors |
| `/admin/audit` | Super Admin Only | Immutable security audit trail |

### 3.2 Authorization Middleware (`middleware.ts`)
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/request";
import { verifyAdminSessionToken } from "./lib/admin-auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin routes except /admin/login
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = req.cookies.get("heropage_admin_session")?.value;
    
    if (!adminToken) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyAdminSessionToken(adminToken);
    if (!payload || !payload.adminId) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    // IP allowlist check (if configured)
    const allowedIps = process.env.ADMIN_IP_ALLOWLIST?.split(",").map(s => s.trim());
    if (allowedIps && allowedIps.length > 0) {
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || req.ip || "";
      if (!allowedIps.includes(clientIp)) {
        return new NextResponse("Access Forbidden: IP not in allowlist", { status: 403 });
      }
    }

    // Pass validated admin identity downstream in headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-admin-id", payload.adminId);
    requestHeaders.set("x-admin-role", payload.role);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}
```

---

## 4. Core Modules & Feature Requirements

### A. Payments Queue (Manual Billing Verification)
Because HeroPage handles local bank transfers and USDT TRC-20 payments without automated gateway webhooks, the admin payment queue is the platform's financial gatekeeper.

- **Pending List UI:**
  - Displays submitted payments with status `PENDING`.
  - Columns: Date/Time, Customer Name, Organization, Plan Tier, Amount (PKR), Method (Bank Transfer / Crypto), Transaction Reference ID.
  - One-click secure receipt preview modal (loads via private streaming endpoint `GET /api/admin/payments/[id]/receipt`).
- **Action Controls:**
  - **Approve Button:** Triggers confirmation modal $\rightarrow$ calls `POST /api/admin/payments/[id]/approve`.
  - **Reject Button:** Opens mandatory reason dialog (e.g. *"Transaction reference not found on bank statement"*, *"Blurry receipt"*) $\rightarrow$ calls `POST /api/admin/payments/[id]/reject`.
- **Backend Transaction Workflow (`approve`):**
  1. Open Prisma transaction (`prisma.$transaction`).
  2. Query payment with row lock; verify status is `PENDING`.
  3. Mark payment `APPROVED`, set `reviewedByAdminId = admin.id`, `reviewedAt = now()`.
  4. Upsert `Subscription` for the organization: set status `ACTIVE`, `currentPeriodStart = now()`, `currentPeriodEnd = now() + 30 days`.
  5. Reset organization monthly broadcast counter (`monthlyMessagesSent = 0`).
  6. Update `Organization.plan` to the approved plan.
  7. Write record to `AdminAuditLog` with `action: PAYMENT_APPROVED`.

---

### B. Accounts Directory (Tenant Management)
A central CRM for customer accounts, resource tracking, and fraud/abuse triage.

- **Searchable / Filterable Table:**
  - Search by organization name, slug, owner email, or connected Facebook Page ID.
  - Filter by Plan Tier (`FREE`, `STARTER`, `PRO`, `BUSINESS`, `CUSTOM`) and Status (`ACTIVE`, `EXPIRED`, `SUSPENDED`).
- **Metrics Displayed per Account:**
  - **Connected Pages:** Current count vs allowed plan limit.
  - **Contacts CRM:** Total ingested leads vs plan limit.
  - **Message Quota:** Current month's sent broadcast messages vs quota limit.
  - **Team Seats:** Total active employee seats vs limit.
  - **Subscription Expiry:** Days remaining until current period ends.
- **Account Actions (Super Admin Only):**
  - **Suspend Organization:** Halts all outgoing campaigns and API calls for non-payment or Meta Terms-of-Service violations.
  - **Reactivate Organization:** Restores account to normal operation.

---

### C. Custom Plan Assignment (Enterprise Quotas)
Allows Super Admins to bypass fixed pricing tiers for enterprise clients, high-volume e-commerce brands, or negotiated agency contracts.

- **Configuration Modal / Form Fields:**
  - `Organization ID` (Target account)
  - `Bespoke Price (PKR)`
  - `Max Facebook Pages` (e.g. 25)
  - `Max Team Members` (e.g. 30 seats)
  - `Max Contacts CRM` (e.g. 250,000)
  - `Monthly Message Quota` (e.g. 1,000,000 messages/month)
  - `Max Monthly Campaigns` (e.g. 500)
  - `Subscription Duration` (in days, default: 30)
- **Database Action:**
  - Creates or updates a bespoke `customPlanConfig` JSON object linked to the organization.
  - Sets `Organization.plan = CUSTOM`.
  - Sets `Subscription.plan = CUSTOM` with the computed expiry date.
  - Writes record to `AdminAuditLog` (`CUSTOM_PLAN_ASSIGNED`) capturing all before/after limits.

---

### D. System Health Dashboard
A real-time DevOps and operational monitoring dashboard to detect systemic issues before customers report service outages.

- **Aggregate Platform Metrics:**
  - Total broadcast messages sent across the platform this month.
  - Active connected Facebook Pages platform-wide.
  - Total active tenant organizations.
  - Inbound webhook event volume (events / min).
- **Infrastructure Health Monitors:**
  - **Webhook Error Rate:** Graph of 4xx/5xx responses from `/api/webhooks/facebook` over the last 24 hours.
  - **Redis BullMQ Queue Latency:** Oldest unprocessed job age in the broadcast queue. Flag warning if job age $> 5\text{ minutes}$.
  - **Database Connection Pool:** Active vs idle PostgreSQL connections.
  - **Storage Usage:** Total disk size consumed by customer payment receipts.

---

### E. Audit Logging System
Every administrative action that modifies tenant status, permissions, quotas, or financial records must be immutably recorded.

- **Tracked Events:**
  - `PAYMENT_APPROVED`: Admin ID, Payment ID, Org ID, Plan, Amount.
  - `PAYMENT_REJECTED`: Admin ID, Payment ID, Org ID, Rejection Reason.
  - `CUSTOM_PLAN_ASSIGNED`: Admin ID, Org ID, bespoke quota details.
  - `ACCOUNT_SUSPENDED` / `REACTIVATED`: Admin ID, Org ID, Reason.
  - `ADMIN_LOGIN_SUCCESS` / `FAILED`: Email, IP Address, User Agent.
- **Audit Log Entry Interface:**
  ```typescript
  // lib/admin-audit.ts
  export async function logAdminAction(params: {
    adminId: string;
    action: AuditActionType;
    targetType: "PAYMENT" | "ORGANIZATION" | "USER" | "SYSTEM";
    targetId: string;
    details: Record<string, unknown>;
    req: Request;
  }) {
    const ipAddress = params.req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const userAgent = params.req.headers.get("user-agent") || undefined;

    return prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details as any,
        ipAddress,
        userAgent,
      },
    });
  }
  ```

---

## 5. API Endpoints Specification

### 5.1 Admin Authentication
- `POST /api/admin/auth/login`: Authenticates staff against `admin_users`. Returns signed `heropage_admin_session` cookie.
- `POST /api/admin/auth/logout`: Clears admin session cookie.
- `GET /api/admin/auth/me`: Returns current admin user profile and role (`ADMIN` or `SUPER_ADMIN`).

### 5.2 Payment Verification
- `GET /api/admin/payments?status=PENDING&page=1&limit=25`: Returns paginated payment verification queue.
- `GET /api/admin/payments/:id/receipt`: Streams verified payment receipt from `ReceiptStorage` with admin auth check.
- `POST /api/admin/payments/:id/approve`: Approves payment, updates subscription, logs audit event.
- `POST /api/admin/payments/:id/reject`: Rejects payment with `{ reason: string }`, logs audit event.

### 5.3 Account Management & Custom Plans
- `GET /api/admin/accounts?search=&plan=&status=&page=1`: List customer organizations with live quota metrics.
- `GET /api/admin/accounts/:id`: Account deep-dive (members, connected pages, usage breakdown).
- `POST /api/admin/accounts/:id/custom-plan`: Assign bespoke custom quotas (Super Admin only).
- `POST /api/admin/accounts/:id/suspend`: Suspend tenant access (Super Admin only).
- `POST /api/admin/accounts/:id/reactivate`: Reactivate tenant access.

### 5.4 System & Audit Logs
- `GET /api/admin/system/metrics`: Aggregate platform health and queue lag.
- `GET /api/admin/audit?limit=50&action=&adminId=`: Query audit log records.

---

## 6. Testing & Verification Checklist

| # | Test Scenario | Expected Outcome |
|---|---|---|
| 1 | Standard customer user attempts to access `/admin/payments` | Redirected to `/admin/login` with 401/403 |
| 2 | Invalid credentials submitted to `/api/admin/auth/login` | Returns 401; logs `ADMIN_LOGIN_FAILED` in audit table |
| 3 | Valid admin logs in | Sets `heropage_admin_session` cookie with `SameSite=Strict` |
| 4 | Regular `ADMIN` tries to assign custom plan | Returns `403 Forbidden` (requires `SUPER_ADMIN`) |
| 5 | Super Admin approves pending payment | Atomic transaction marks payment approved, creates active subscription, resets message counter, logs audit |
| 6 | Super Admin rejects payment without reason | Rejection blocked with 400 Bad Request |
| 7 | Super Admin assigns custom quota | Quotas immediately reflected in organization usage queries |
| 8 | Double-approval prevention | Re-submitting approval on approved payment returns 409 Conflict |
