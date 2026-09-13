# HeroPage SaaS — Architecture, Database Migration & Manual Local Billing Specification

**Document Version:** 1.0.0  
**Target Audience:** Engineering Team / Full-Stack Developers  
**Scope:** Architecture Overview, PostgreSQL + Prisma Migration, Manual Local Billing Pipeline, Security Boundaries, and API Specifications.

---

## 1. Executive Summary & Product Overview

**HeroPage** is a multi-tenant B2B SaaS platform designed for e-commerce brands, digital marketing agencies, and high-volume online businesses. It connects directly with the official Meta Graph API to provide:
- Multi-page Facebook Messenger inbox with unified team collaboration
- Real-time Webhook message ingestion, deduplication, and routing
- Contact/Lead CRM with tags, notes, and custom attributes
- Bulk messaging templates and audience-targeted broadcast campaigns
- Multi-tenant role-based access control (RBAC)

### Critical Business Decision: Manual Local Billing (No Stripe)
Stripe and automated recurring card gateways are **not used**. The target market operates locally, requiring **manual local payment verification**:
1. **Bank Transfer** (Direct bank wire/IBAN)
2. **Crypto** (USDT TRC-20)
3. Extensible architecture to support **JazzCash** and **EasyPaisa** in subsequent releases without refactoring core billing logic.

All pricing, quotas, and invoices are denominated in **PKR** (Pakistani Rupee).

---

## 2. System Architecture & Multi-Tenancy Security Rules

### 2.1 The Cardinal Security Rules
Every developer working on this codebase **must strictly enforce** the following non-negotiable rules:

1. **Never Trust Client-Side State or Plan Flags:**
   - A user clicking "Upgrade" or selecting a plan in the frontend **never** activates a paid subscription.
   - Subscriptions are activated **only** when an authorized Admin approves a submitted payment with a verified receipt.
2. **Enforce Tenant Isolation on Every Query:**
   - **Never** accept `organizationId` from client request bodies (`req.body`) as an authoritative identifier.
   - Always derive `organizationId` strictly from the verified session context via `requireOrgContext()` (`session.membership.organizationId`).
   - Every read, write, update, and delete operation on domain entities (Contacts, Conversations, Notes, Campaigns, Payments, Subscriptions) must include `where: { organizationId }`.
3. **Fail-Closed Subscription Checks:**
   - Features gated by plan quotas (e.g. creating pages, sending broadcast campaigns, adding team members) must call `hasActivePlan(organizationId, requiredPlan)` server-side.
   - If `subscription.status !== 'ACTIVE'` or `currentPeriodEnd < now()`, the organization automatically reverts to the `FREE` plan limits.

---

## 3. Database Migration: JSON to PostgreSQL + Prisma

The development prototype (`data/heropage.db.json`) is being replaced with a production-grade relational database: **PostgreSQL managed via Prisma ORM**.

### 3.1 Proposed Prisma Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ----------------------------------------------------------------------
// Enums
// ----------------------------------------------------------------------

enum Role {
  OWNER
  ADMIN
  MANAGER
  AGENT
  VIEWER
}

enum SubscriptionPlan {
  FREE
  STARTER
  PRO
  BUSINESS
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELED
}

enum PaymentStatus {
  PENDING
  APPROVED
  REJECTED
}

enum PaymentMethod {
  BANK_TRANSFER
  USDT_TRC20
  JAZZCASH      // For future extension
  EASYPAISA     // For future extension
}

enum MessageStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  READ
  FAILED
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  RUNNING
  PAUSED
  COMPLETED
  FAILED
  CANCELLED
}

enum CampaignMessageStatus {
  PENDING
  QUEUED
  SENDING
  SENT
  DELIVERED
  FAILED
  SKIPPED
}

enum TemplateStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
  PAUSED
}

// ----------------------------------------------------------------------
// Core Auth & Multi-Tenancy
// ----------------------------------------------------------------------

model User {
  id            String         @id @default(cuid())
  name          String
  email         String         @unique
  passwordHash  String
  isSuperAdmin  Boolean        @default(false)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  memberships   Membership[]
  contactNotes  ContactNote[]
  reviewedPayments Payment[]   @relation("ReviewedByAdmin")

  @@index([email])
}

model Organization {
  id            String             @id @default(cuid())
  name          String
  slug          String             @unique
  plan          SubscriptionPlan   @default(FREE)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  memberships   Membership[]
  facebookPages FacebookPage[]
  contacts      Contact[]
  conversations Conversation[]
  messages      Message[]
  labels        Label[]
  contactNotes  ContactNote[]
  savedReplies  SavedReply[]
  templates     Template[]
  campaigns     Campaign[]
  subscriptions Subscription[]
  payments      Payment[]

  @@index([slug])
}

model Membership {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           Role         @default(VIEWER)
  createdAt      DateTime     @default(now())

  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([organizationId])
  @@index([userId])
}

// ----------------------------------------------------------------------
// Billing & Manual Payment Models
// ----------------------------------------------------------------------

model Subscription {
  id                 String             @id @default(cuid())
  organizationId     String
  plan               SubscriptionPlan   @default(FREE)
  status             SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime           @default(now())
  currentPeriodEnd   DateTime
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  organization       Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  payments           Payment[]

  @@index([organizationId])
  @@index([status, currentPeriodEnd])
}

model Payment {
  id                   String           @id @default(cuid())
  organizationId       String
  subscriptionId       String?
  plan                 SubscriptionPlan
  amount               Decimal          @db.Decimal(10, 2)
  currency             String           @default("PKR")
  paymentMethod        PaymentMethod
  transactionReference String
  receiptUrl           String
  receiptMimeType      String
  receiptFileSize      Int
  status               PaymentStatus    @default(PENDING)
  submittedAt          DateTime         @default(now())
  reviewedAt           DateTime?
  reviewedBy           String?
  rejectionReason      String?
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  organization         Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  subscription         Subscription?    @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  reviewer             User?            @relation("ReviewedByAdmin", fields: [reviewedBy], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([status])
  @@index([transactionReference])
}

// ----------------------------------------------------------------------
// Facebook Messenger Domain
// ----------------------------------------------------------------------

model FacebookPage {
  id                   String         @id @default(cuid())
  organizationId       String
  pageId               String         @unique
  name                 String
  profilePic           String?
  accessTokenEncrypted String
  status               String         @default("connected")
  webhookSubscribed    Boolean        @default(true)
  connectedAt          DateTime       @default(now())
  lastSyncedAt         DateTime       @default(now())

  organization         Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  contacts             Contact[]
  conversations        Conversation[]
  messages             Message[]

  @@index([organizationId])
  @@index([pageId])
}

model Contact {
  id             String          @id @default(cuid())
  organizationId String
  pageId         String
  psid           String
  name           String
  profilePic     String?
  assignedUserId String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  page           FacebookPage    @relation(fields: [pageId], references: [id], onDelete: Cascade)
  conversations  Conversation[]
  contactLabels  ContactLabel[]
  contactNotes   ContactNote[]
  campaignMsgs   CampaignMessage[]

  @@unique([organizationId, pageId, psid])
  @@index([organizationId])
  @@index([psid])
}

model Conversation {
  id              String         @id @default(cuid())
  organizationId  String
  pageId          String
  contactId       String
  status          String         @default("open")
  assignedUserId  String?
  unreadCount     Int            @default(0)
  lastMessageText String?
  lastMessageAt   DateTime       @default(now())
  createdAt       DateTime       @default(now())

  organization    Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  page            FacebookPage   @relation(fields: [pageId], references: [id], onDelete: Cascade)
  contact         Contact        @relation(fields: [contactId], references: [id], onDelete: Cascade)
  messages        Message[]

  @@unique([organizationId, contactId])
  @@index([organizationId])
  @@index([pageId])
  @@index([lastMessageAt])
}

model Message {
  id             String         @id @default(cuid())
  conversationId String
  organizationId String
  pageId         String
  mid            String?        @unique
  senderId       String
  recipientId    String
  senderType     String         // "customer" | "page" | "agent"
  text           String
  attachments    String[]       @default([])
  status         MessageStatus  @default(SENT)
  failureReason  String?
  createdAt      DateTime       @default(now())

  conversation   Conversation   @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  page           FacebookPage   @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([organizationId])
  @@index([mid])
}

model Label {
  id             String         @id @default(cuid())
  organizationId String
  name           String
  color          String
  description    String?
  createdAt      DateTime       @default(now())

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  contactLabels  ContactLabel[]

  @@unique([organizationId, name])
  @@index([organizationId])
}

model ContactLabel {
  contactId      String
  labelId        String

  contact        Contact        @relation(fields: [contactId], references: [id], onDelete: Cascade)
  label          Label          @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([contactId, labelId])
}

model ContactNote {
  id             String         @id @default(cuid())
  contactId      String
  organizationId String
  userId         String
  content        String
  createdAt      DateTime       @default(now())

  contact        Contact        @relation(fields: [contactId], references: [id], onDelete: Cascade)
  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([contactId])
}

model SavedReply {
  id             String         @id @default(cuid())
  organizationId String
  name           String
  content        String
  createdBy      String
  createdAt      DateTime       @default(now())

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}

model Template {
  id             String         @id @default(cuid())
  organizationId String
  name           String
  category       String
  language       String
  status         TemplateStatus @default(DRAFT)
  content        String
  variables      String[]       @default([])
  metaTemplateId String?
  createdBy      String
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  campaigns      Campaign[]

  @@index([organizationId])
}

model Campaign {
  id             String         @id @default(cuid())
  organizationId String
  name           String
  templateId     String
  status         CampaignStatus @default(DRAFT)
  audienceFilter Json           // { labels?: string[], excludeLabels?: string[], allEligible?: boolean }
  totalAudience  Int            @default(0)
  queuedCount    Int            @default(0)
  sentCount      Int            @default(0)
  deliveredCount Int            @default(0)
  failedCount    Int            @default(0)
  skippedCount   Int            @default(0)
  createdAt      DateTime       @default(now())
  scheduledAt    DateTime?

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  template       Template       @relation(fields: [templateId], references: [id], onDelete: Restrict)
  campaignMsgs   CampaignMessage[]

  @@index([organizationId])
  @@index([status])
}

model CampaignMessage {
  id             String                @id @default(cuid())
  campaignId     String
  contactId      String
  pageId         String
  templateId     String
  status         CampaignMessageStatus @default(PENDING)
  attemptCount   Int                   @default(0)
  failureReason  String?
  scheduledAt    DateTime?
  sentAt         DateTime?
  deliveredAt    DateTime?
  failedAt       DateTime?

  campaign       Campaign              @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  contact        Contact               @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([campaignId])
  @@index([status])
}

model WebhookEvent {
  id             String         @id @default(cuid())
  eventId        String         @unique
  eventType      String
  payload        String         @db.Text
  processed      Boolean        @default(false)
  createdAt      DateTime       @default(now())

  @@index([eventId])
}
```

---

## 4. Central Plan Configuration & Limits

All subscription pricing and quotas are defined in **one single place** (`lib/plans.ts`). Neither components nor routes may hardcode or duplicate these values.

```typescript
// lib/plans.ts
export type SubscriptionPlan = "FREE" | "STARTER" | "PRO" | "BUSINESS";

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  pricePKR: number;
  description: string;
  popular?: boolean;
  limits: {
    maxPages: number;
    maxTeamMembers: number;
    maxContacts: number;
    maxCampaignsPerMonth: number;
    maxMessagesPerMonth: number;
  };
}

export const PLANS: Record<SubscriptionPlan, PlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Free Tier",
    pricePKR: 0,
    description: "Best for indie makers starting with 1 Facebook Page.",
    limits: {
      maxPages: 1,
      maxTeamMembers: 1,
      maxContacts: 50,
      maxCampaignsPerMonth: 2,
      maxMessagesPerMonth: 200,
    },
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    pricePKR: 4999,
    description: "For boutique stores and small agencies.",
    limits: {
      maxPages: 3,
      maxTeamMembers: 3,
      maxContacts: 1000,
      maxCampaignsPerMonth: 10,
      maxMessagesPerMonth: 5000,
    },
  },
  PRO: {
    id: "PRO",
    name: "Pro Agency",
    pricePKR: 12999,
    description: "For high-volume multi-page marketing teams.",
    popular: true,
    limits: {
      maxPages: 10,
      maxTeamMembers: 10,
      maxContacts: 10000,
      maxCampaignsPerMonth: 50,
      maxMessagesPerMonth: 50000,
    },
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Enterprise",
    pricePKR: 29999,
    description: "High volume, dedicated queue priority & unlimited scale.",
    limits: {
      maxPages: 50,
      maxTeamMembers: 50,
      maxContacts: 100000,
      maxCampaignsPerMonth: 500,
      maxMessagesPerMonth: 500000,
    },
  },
};
```

---

## 5. Manual Local Billing Engine & Workflow

```
                  ┌─────────────────────────────────────┐
                  │          Billing Page UI            │
                  │   User views plans in PKR & Usage   │
                  └──────────────────┬──────────────────┘
                                     │ User selects plan & clicks Upgrade
                                     ▼
                  ┌─────────────────────────────────────┐
                  │            Payment Modal            │
                  │   Select: Bank Transfer OR USDT     │
                  │   Shows configured public accounts  │
                  └──────────────────┬──────────────────┘
                                     │ 1. Copies details & pays offline
                                     │ 2. Uploads Receipt (PNG/JPG/PDF <= 5MB)
                                     │ 3. Enters Transaction Reference ID
                                     ▼
                  ┌─────────────────────────────────────┐
                  │      POST /api/billing/payments     │
                  │   Validates MIME, size, plan price  │
                  │   Stores receipt via ReceiptStorage │
                  │   Creates Payment with status=PENDING
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │         Admin Portal Table          │
                  │     GET /api/admin/payments         │
                  │   Review receipt, tx ID, customer   │
                  └──────────┬──────────────────┬───────┘
                             │                  │
               APPROVE CLICKED                  REJECT CLICKED (Reason req.)
                             │                  │
                             ▼                  ▼
       ┌───────────────────────────────┐  ┌───────────────────────────────┐
       │ POST /api/admin/payments/...  │  │ POST /api/admin/payments/...  │
       │           /approve            │  │           /reject             │
       │                               │  │                               │
       │ Atomic DB Transaction:        │  │ - Status -> REJECTED          │
       │ 1. Lock payment (status check)│  │ - Record rejectionReason      │
       │ 2. Status -> APPROVED         │  │ - Subscription unchanged      │
       │ 3. Update/Create Subscription │  │                               │
       │    status = ACTIVE            │  └───────────────────────────────┘
       │    periodStart = now()        │
       │    periodEnd = now() + 30 days│
       │ 4. Update Org.plan = plan     │
       └───────────────────────────────┘
```

### 5.1 Dynamic Expiration Evaluation
Rather than relying solely on cron jobs, **subscription expiration is evaluated on-the-fly**:
Whenever any billing query, feature access check, or user bootstrap request runs:
```typescript
if (subscription.status === "ACTIVE" && new Date(subscription.currentPeriodEnd) < new Date()) {
  // Mark expired in database
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "EXPIRED" }
  });
  // Demote organization active plan
  await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: "FREE" }
  });
}
```

---

## 6. Secure Receipt Storage Abstraction

Uploaded receipts contain sensitive banking/transaction proofs. They must not be made publicly accessible or stored insecurely.

```typescript
// lib/storage/receipt-storage.ts
export interface ReceiptUploadResult {
  storagePath: string;
  url: string;
  fileSize: number;
  mimeType: string;
}

export interface ReceiptStorage {
  upload(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<ReceiptUploadResult>;
  getStream(storagePath: string): Promise<NodeJS.ReadableStream>;
  delete(storagePath: string): Promise<void>;
}
```

### Storage Implementation:
- **Development:** `LocalReceiptStorage` writes files to a private, non-public directory (`storage/receipts/`, outside Next.js `/public`). Files are served strictly through an authenticated endpoint: `GET /api/billing/receipts/[id]` with role verification.
- **Production:** Implement `S3ReceiptStorage` or `R2ReceiptStorage` (AWS S3, Cloudflare R2, Supabase Storage) implementing the exact same `ReceiptStorage` interface without touching any billing business logic.

### File Validation Criteria:
- Allowed MIME types: `image/png`, `image/jpeg`, `application/pdf`
- Maximum file size: `5 * 1024 * 1024` bytes (5MB)
- Sanitization: Filenames are discarded. Files are saved using UUID/CUID filenames (`receipt_${paymentId}_${Date.now()}.${ext}`).

---

## 7. Configurable Payment Methods & Environment Variables

Payment accounts are managed via environment variables (or database records). No bank credentials or wallet addresses are ever hardcoded in client code.

```env
# ==============================================================================
# HERO PAGE - PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================
APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/heropage?schema=public"

# Security Secrets (Minimum 32 / 64 characters)
SESSION_SECRET="super-secret-session-key-change-me-in-production-min-32-chars"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Meta Graph API
META_APP_ID="your_meta_app_id"
META_APP_SECRET="your_meta_app_secret"
META_VERIFY_TOKEN="your_webhook_verify_token"
META_GRAPH_API_VERSION="v19.0"

# Local Payment Configuration: Bank Wire
PAYMENT_BANK_NAME="Meezan Bank Limited"
PAYMENT_BANK_ACCOUNT_TITLE="HeroPage Technologies Private Limited"
PAYMENT_BANK_ACCOUNT_NUMBER="02010108923481"
PAYMENT_BANK_IBAN="PK36MEZN0002010108923481"

# Local Payment Configuration: Crypto
PAYMENT_USDT_NETWORK="TRC20"
PAYMENT_USDT_WALLET_ADDRESS="TXyz1234567890ExampleTRC20WalletAddressHeroPage"

# Local Storage
RECEIPT_STORAGE_DIR="./storage/receipts"
```

---

## 8. Complete API Specifications

### 8.1 Public / Tenant Billing Endpoints

#### `GET /api/billing`
- **Auth:** Authenticated User (`requireOrgContext`)
- **Response:**
  ```json
  {
    "subscription": {
      "plan": "PRO",
      "status": "ACTIVE",
      "currentPeriodStart": "2026-09-01T00:00:00.000Z",
      "currentPeriodEnd": "2026-10-01T00:00:00.000Z",
      "isExpired": false
    },
    "usage": {
      "connectedPages": 2,
      "maxPages": 10,
      "contactsCount": 3,
      "maxContacts": 10000,
      "campaignsThisMonth": 2,
      "maxCampaignsPerMonth": 50,
      "messagesThisMonth": 138,
      "maxMessagesPerMonth": 50000
    },
    "availablePlans": [ ...PLANS ],
    "recentPayments": [ ... ]
  }
  ```

#### `GET /api/billing/payment-methods`
- **Auth:** Authenticated User
- **Response:**
  ```json
  {
    "methods": [
      {
        "id": "BANK_TRANSFER",
        "title": "Bank Transfer (Pakistan)",
        "currency": "PKR",
        "instructions": {
          "bankName": "Meezan Bank Limited",
          "accountTitle": "HeroPage Technologies Private Limited",
          "accountNumber": "02010108923481",
          "iban": "PK36MEZN0002010108923481"
        }
      },
      {
        "id": "USDT_TRC20",
        "title": "USDT (TRC-20)",
        "currency": "USDT / PKR Equivalent",
        "instructions": {
          "network": "TRC20",
          "walletAddress": "TXyz1234567890ExampleTRC20WalletAddressHeroPage"
        }
      }
    ]
  }
  ```

#### `POST /api/billing/payments`
- **Auth:** Authenticated User (Tenant isolated)
- **Body:** `multipart/form-data`
  - `plan`: `"STARTER"` | `"PRO"` | `"BUSINESS"`
  - `paymentMethod`: `"BANK_TRANSFER"` | `"USDT_TRC20"`
  - `transactionReference`: string (minimum 4 characters)
  - `receipt`: File (PNG, JPG, PDF up to 5MB)
- **Validation:**
  - Verify file MIME type and buffer signature
  - Verify plan exists and calculate exact `amount` in PKR
  - Reject if organization already has an unresolved `PENDING` payment for the same plan
- **Status Returned:** `201 Created` with `{ status: "PENDING" }`

#### `GET /api/billing/payments`
- **Auth:** Authenticated User
- **Filter:** Strictly `where: { organizationId: ctx.organizationId }`
- **Response:** List of payments ordered by `submittedAt DESC` with status and any `rejectionReason`.

---

### 8.2 Admin Payment Verification Endpoints

#### `GET /api/admin/payments`
- **Auth:** Super-Admin or System Role check (`user.isSuperAdmin === true`)
- **Query Params:** `?status=PENDING&page=1&limit=20`
- **Response:** Paginated pending payments with customer name, organization details, transaction reference, amount, and receipt download URL.

#### `POST /api/admin/payments/:id/approve`
- **Auth:** Super-Admin only
- **Execution:** Database Transaction:
  ```typescript
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id } });
    if (!payment || payment.status !== "PENDING") {
      throw new Error("Payment is not pending review.");
    }
    
    // 1. Mark Approved
    await tx.payment.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: adminUser.id,
      },
    });

    // 2. Compute 30-day billing cycle
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 3. Upsert Active Subscription
    await tx.subscription.upsert({
      where: { organizationId: payment.organizationId },
      create: {
        organizationId: payment.organizationId,
        plan: payment.plan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: payment.plan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // 4. Update Organization Plan
    await tx.organization.update({
      where: { id: payment.organizationId },
      data: { plan: payment.plan },
    });
  });
  ```

#### `POST /api/admin/payments/:id/reject`
- **Auth:** Super-Admin only
- **Body:** `{ "reason": "Transaction reference not found on bank statement." }`
- **Execution:**
  - Verify payment is currently `PENDING`.
  - Update status to `REJECTED`, set `rejectionReason`, `reviewedAt`, and `reviewedBy`.
  - Leave existing organization subscription completely untouched.

---

## 9. Comprehensive Testing Matrix

The following test suites must be created under `tests/billing-and-db.test.ts`:

| # | Test Case Description | Expected Result |
|---|---|---|
| 1 | Free tier user requests gated features | Free quota limits applied; cannot exceed 1 Page or 50 Contacts |
| 2 | User clicks "Upgrade" on billing page | Client request does not alter organization plan in DB |
| 3 | Valid payment submission | Record created with status `PENDING`, receipt file persisted |
| 4 | Attempt payment submission with another `organizationId` | Backend ignores body param and uses session context |
| 5 | Non-admin user calls `/api/admin/payments/approve` | Returns `403 Forbidden` |
| 6 | Super-admin approves pending payment | Atomic transaction sets status `APPROVED`, activates subscription |
| 7 | Super-admin rejects pending payment with reason | Payment status `REJECTED`, reason recorded, subscription unchanged |
| 8 | Double approval attempt on already approved payment | Second call rejected with conflict error; idempotent |
| 9 | Expired subscription evaluation | Subscription with `currentPeriodEnd < now` evaluates to `EXPIRED` |
| 10 | Receipt size validation | Files exceeding 5MB are rejected with `413 Payload Too Large` |
| 11 | Malicious file upload attempt (`.exe`, `.sh`, `.php`) | Rejected by MIME type and magic byte verification |
| 12 | Payment amount tampering in submission | Calculated amount validated server-side against `PLANS[plan].pricePKR` |
| 13 | Payment history isolation | Organization A cannot read payments or receipts belonging to Organization B |

---

## 10. Developer Execution Checklist

1. **Install Prisma and Dependencies:**
   ```bash
   npm install @prisma/client
   npm install -D prisma
   ```
2. **Setup Schema & Migrate:**
   ```bash
   npx prisma init --datasource-provider postgresql
   # Copy schema from Section 3
   npx prisma migrate dev --name init_heropage_saas
   ```
3. **Seed Database:**
   Update `lib/seed.ts` to populate the initial Demo Organization and Users via Prisma Client.
4. **Remove All Legacy Stripe References:**
   - Delete any Stripe references in `app/billing/page.tsx`
   - Remove `stripeCustomerId` and `stripeSubscriptionId` from schemas
   - Clean `.env.example`
5. **Implement Billing Routes & Receipt Storage:**
   - `lib/plans.ts`
   - `lib/storage/receipt-storage.ts`
   - `app/api/billing/route.ts`
   - `app/api/billing/payment-methods/route.ts`
   - `app/api/billing/payments/route.ts`
   - `app/api/admin/payments/route.ts`
   - `app/api/admin/payments/[id]/approve/route.ts`
   - `app/api/admin/payments/[id]/reject/route.ts`
6. **Update Billing UI:**
   - Currency display: **PKR**
   - Modal with copyable Bank and USDT details
   - Receipt upload form with client preview
   - Payment history table showing status badges (`Pending`, `Approved`, `Rejected`)
7. **Run Verification:**
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```
