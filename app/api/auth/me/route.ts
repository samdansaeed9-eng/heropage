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
  const memberships = db.memberships.filter((m) => m.userId === user.id);
  const orgIds = memberships.map((m) => m.organizationId);
  const organizations = db.organizations.filter((o) => orgIds.includes(o.id)).map((org) => {
    const mem = memberships.find((m) => m.organizationId === org.id);
    return {
      ...org,
      role: mem?.role || "VIEWER",
    };
  });

  // Automatically seed demo data for the first organization if empty
  if (organizations.length > 0) {
    seedDemoDataForOrg(organizations[0].id, user.id);
  }

  return successResponse({
    user,
    organizations,
  });
}
