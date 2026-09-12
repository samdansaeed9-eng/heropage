import { NextRequest } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(2).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = signupSchema.safeParse(body);

    if (!validated.success) {
      const firstError = validated.error.errors[0]?.message || "Validation failed";
      return errorResponse(firstError, 400, "VALIDATION_ERROR", validated.error.flatten());
    }

    const { name, email, password, organizationName } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    const db = getDb();
    const data = db.read();

    // Check existing email
    const existing = data.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return errorResponse("An account with this email already exists", 409, "USER_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${crypto.randomUUID()}`;
    const orgId = `org_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const newUser = {
      id: userId,
      name,
      email: normalizedEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const newOrg = {
      id: orgId,
      name: organizationName || `${name.split(" ")[0]}'s Workspace`,
      slug: (organizationName || `${name.split(" ")[0]}-workspace`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      plan: "free" as const,
      createdAt: now,
      updatedAt: now,
    };

    const newMembership = {
      id: `mem_${crypto.randomUUID()}`,
      userId,
      organizationId: orgId,
      role: "OWNER" as const,
      createdAt: now,
    };

    db.update((draft) => {
      draft.users.push(newUser);
      draft.organizations.push(newOrg);
      draft.memberships.push(newMembership);
    });

    // Create session token and set cookie
    const token = await createSessionToken({ userId, email: normalizedEmail });
    await setSessionCookie(token);

    return successResponse({
      user: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
      organization: newOrg,
    }, 201);
  } catch (err: any) {
    console.error("Signup error:", err);
    return errorResponse("Failed to create account. Please try again.", 500, "INTERNAL_ERROR");
  }
}
