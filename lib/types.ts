export type Role = "OWNER" | "ADMIN" | "MANAGER" | "AGENT" | "VIEWER";

export type MessageStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed";

export type CampaignStatus = 
  | "draft" 
  | "scheduled" 
  | "running" 
  | "paused" 
  | "completed" 
  | "failed" 
  | "cancelled";

export type CampaignMessageStatus = 
  | "pending" 
  | "queued" 
  | "sending" 
  | "sent" 
  | "delivered" 
  | "failed" 
  | "skipped";

export type TemplateStatus = "draft" | "pending" | "approved" | "rejected" | "paused";

export type SubscriptionPlan = "free" | "starter" | "pro" | "business";

export interface PlanLimits {
  maxPages: number;
  maxTeamMembers: number;
  maxContacts: number;
  maxCampaignsPerMonth: number;
  maxMessagesPerMonth: number;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxPages: 1,
    maxTeamMembers: 1,
    maxContacts: 50,
    maxCampaignsPerMonth: 2,
    maxMessagesPerMonth: 200,
  },
  starter: {
    maxPages: 3,
    maxTeamMembers: 3,
    maxContacts: 1000,
    maxCampaignsPerMonth: 10,
    maxMessagesPerMonth: 5000,
  },
  pro: {
    maxPages: 10,
    maxTeamMembers: 10,
    maxContacts: 10000,
    maxCampaignsPerMonth: 50,
    maxMessagesPerMonth: 50000,
  },
  business: {
    maxPages: 50,
    maxTeamMembers: 50,
    maxContacts: 100000,
    maxCampaignsPerMonth: 500,
    maxMessagesPerMonth: 500000,
  },
};
