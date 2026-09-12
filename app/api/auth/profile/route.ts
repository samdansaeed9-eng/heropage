import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const body = await req.json();
    const validated = updateProfileSchema.safeParse(body);
    if (!validated.success) {
      return errorResponse(validated.error.errors[0]?.message || "Validation failed", 400);
    }

    const { name, currentPassword, newPassword } = validated.data;
    const db = getDb();
    const user = db.read().users.find((u) => u.id === currentUser.id);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Password change verification
    if (newPassword) {
      if (!currentPassword) {
        return errorResponse("Current password is required to set a new password", 400);
      }
      const isMatch = await verifyPassword(currentPassword, user.passwordHash);
      if (!isMatch) {
        return errorResponse("Incorrect current password", 400);
      }
      user.passwordHash = await hashPassword(newPassword);
    }

    if (name) {
      user.name = name;
    }

    user.updatedAt = new Date().toISOString();

    db.update((draft) => {
      const idx = draft.users.findIndex((u) => u.id === user.id);
      if (idx !== -1) draft.users[idx] = user;
    });

    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      updatedAt: user.updatedAt,
    });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return errorResponse("Failed to update profile", 500);
  }
}
