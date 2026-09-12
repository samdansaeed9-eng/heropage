import { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      const firstError = validated.error.errors[0]?.message || "Validation failed";
      return errorResponse(firstError, 400, "VALIDATION_ERROR");
    }

    const { email, password } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    const db = getDb();
    const data = db.read();

    const user = data.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Generate session token and set cookie
    const token = await createSessionToken({ userId: user.id, email: user.email });
    await setSessionCookie(token);

    // Get user's active organizations
    const userMemberships = data.memberships.filter((m) => m.userId === user.id);
    const orgIds = userMemberships.map((m) => m.organizationId);
    const userOrgs = data.organizations.filter((o) => orgIds.includes(o.id));

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      organizations: userOrgs,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return errorResponse("An error occurred during login", 500, "INTERNAL_ERROR");
  }
}
