import fs from "fs";
import path from "path";
import type { Role, SubscriptionPlan, MessageStatus, CampaignStatus, CampaignMessageStatus, TemplateStatus } from "./types";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipRecord {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  createdAt: string;
}

export interface FacebookPageRecord {
  id: string;
  organizationId: string;
  pageId: string;
  name: string;
  profilePic?: string;
  accessTokenEncrypted: string;
  status: "connected" | "disconnected" | "error";
  webhookSubscribed: boolean;
  connectedAt: string;
  lastSyncedAt: string;
}

export interface ContactRecord {
  id: string;
  organizationId: string;
  pageId: string;
  psid: string;
  name: string;
  profilePic?: string;
  assignedUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationRecord {
  id: string;
  organizationId: string;
  pageId: string;
  contactId: string;
  status: "open" | "closed";
  assignedUserId?: string;
  unreadCount: number;
  lastMessageText?: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  organizationId: string;
  pageId: string;
  mid?: string; // Meta message ID for deduplication
  senderId: string;
  recipientId: string;
  senderType: "customer" | "page" | "agent";
  text: string;
  attachments?: string[];
  status: MessageStatus;
  failureReason?: string;
  createdAt: string;
}

export interface LabelRecord {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
}

export interface ContactLabelRecord {
  contactId: string;
  labelId: string;
}

export interface ContactNoteRecord {
  id: string;
  contactId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface SavedReplyRecord {
  id: string;
  organizationId: string;
  name: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface TemplateRecord {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  language: string;
  status: TemplateStatus;
  content: string;
  variables: string[];
  metaTemplateId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecord {
  id: string;
  organizationId: string;
  name: string;
  templateId: string;
  status: CampaignStatus;
  audienceFilter: {
    labels?: string[];
    excludeLabels?: string[];
    allEligible?: boolean;
  };
  totalAudience: number;
  queuedCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  scheduledAt?: string;
}

export interface CampaignMessageRecord {
  id: string;
  campaignId: string;
  contactId: string;
  pageId: string;
  templateId: string;
  status: CampaignMessageStatus;
  attemptCount: number;
  failureReason?: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
}

export interface SubscriptionRecord {
  id: string;
  organizationId: string;
  plan: SubscriptionPlan;
  status: "active" | "past_due" | "canceled";
  currentPeriodEnd: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface WebhookEventRecord {
  id: string;
  eventId: string; // Meta event ID or mid for idempotency
  eventType: string;
  payload: string;
  processed: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserRecord[];
  organizations: OrganizationRecord[];
  memberships: MembershipRecord[];
  facebookPages: FacebookPageRecord[];
  contacts: ContactRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  labels: LabelRecord[];
  contactLabels: ContactLabelRecord[];
  contactNotes: ContactNoteRecord[];
  savedReplies: SavedReplyRecord[];
  templates: TemplateRecord[];
  campaigns: CampaignRecord[];
  campaignMessages: CampaignMessageRecord[];
  subscriptions: SubscriptionRecord[];
  webhookEvents: WebhookEventRecord[];
}

const DEFAULT_DB_DATA: DatabaseSchema = {
  users: [],
  organizations: [],
  memberships: [],
  facebookPages: [],
  contacts: [],
  conversations: [],
  messages: [],
  labels: [],
  contactLabels: [],
  contactNotes: [],
  savedReplies: [],
  templates: [],
  campaigns: [],
  campaignMessages: [],
  subscriptions: [],
  webhookEvents: [],
};

const DB_FILE_PATH = path.resolve(process.cwd(), "data", "heropage.db.json");

function ensureDbDirectory() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readDb(): DatabaseSchema {
  try {
    ensureDbDirectory();
    if (!fs.existsSync(DB_FILE_PATH)) {
      writeDb(DEFAULT_DB_DATA);
      return DEFAULT_DB_DATA;
    }
    const content = fs.readFileSync(DB_FILE_PATH, "utf-8");
    return JSON.parse(content) as DatabaseSchema;
  } catch (err) {
    console.error("Error reading database file:", err);
    return DEFAULT_DB_DATA;
  }
}

export function writeDb(data: DatabaseSchema): void {
  ensureDbDirectory();
  const tempPath = `${DB_FILE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempPath, DB_FILE_PATH); // Atomic replacement
}

export function getDb() {
  return {
    read: readDb,
    write: writeDb,
    update: (updater: (db: DatabaseSchema) => void) => {
      const db = readDb();
      updater(db);
      writeDb(db);
      return db;
    },
  };
}
