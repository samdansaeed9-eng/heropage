import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { seedDemoDataForOrg } from "@/lib/seed";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }

  const db = getDb().read();
  const membership = db.memberships.find((m) => m.userId === user.id);
  if (!membership) {
    return errorResponse("No organization membership found", 403, "FORBIDDEN");
  }

  const orgId = membership.organizationId;
  seedDemoDataForOrg(orgId, user.id);

  const freshDb = getDb().read();
  const org = freshDb.organizations.find((o) => o.id === orgId);
  const pages = freshDb.facebookPages.filter((p) => p.organizationId === orgId);
  const contacts = freshDb.contacts.filter((c) => c.organizationId === orgId);
  const conversations = freshDb.conversations.filter((c) => c.organizationId === orgId);
  const messages = freshDb.messages.filter((m) => m.organizationId === orgId);
  const labels = freshDb.labels.filter((l) => l.organizationId === orgId);
  const templates = freshDb.templates.filter((t) => t.organizationId === orgId);
  const campaigns = freshDb.campaigns.filter((c) => c.organizationId === orgId);
  const savedReplies = freshDb.savedReplies.filter((s) => s.organizationId === orgId);
  const orgContactIds = new Set(contacts.map((c) => c.id));
  const contactNotes = freshDb.contactNotes.filter((n) => orgContactIds.has(n.contactId));
  const contactLabels = freshDb.contactLabels.filter((cl) => orgContactIds.has(cl.contactId));

  const memberships = freshDb.memberships.filter((m) => m.organizationId === orgId);
  const teamUsers = freshDb.users.filter((u) => memberships.some((m) => m.userId === u.id)).map((u) => {
    const mem = memberships.find((m) => m.userId === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: mem?.role || "VIEWER",
      createdAt: u.createdAt,
    };
  });

  return successResponse({
    organization: org,
    role: membership.role,
    pages,
    facebookPages: pages,
    contacts,
    conversations,
    messages,
    labels,
    templates,
    campaigns,
    savedReplies,
    contactNotes,
    contactLabels,
    team: teamUsers,
  });
}
