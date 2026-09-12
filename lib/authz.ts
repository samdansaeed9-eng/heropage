import { getCurrentUser } from "./auth";
import { getDb, type MembershipRecord } from "./db";

export interface OrgContext {
  userId: string;
  organizationId: string;
  role: MembershipRecord["role"];
}

export async function requireOrgContext(): Promise<OrgContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const db = getDb().read();
  const membership = db.memberships.find((m) => m.userId === user.id);
  if (!membership) return null;

  return {
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}

export function belongsToOrg(resourceOrgId: string | undefined, ctx: OrgContext): boolean {
  return !!resourceOrgId && resourceOrgId === ctx.organizationId;
}
