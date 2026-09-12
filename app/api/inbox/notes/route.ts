import { NextRequest } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const { contactId, content } = await req.json();
    if (!contactId || !content?.trim()) {
      return errorResponse("Contact ID and content are required", 400);
    }

    const db = getDb();
    const newNote = {
      id: `note_${crypto.randomUUID()}`,
      contactId,
      userId: user.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    db.update((draft) => {
      draft.contactNotes.push(newNote);
    });

    return successResponse(newNote);
  } catch (err: any) {
    console.error("Add note error:", err);
    return errorResponse("Failed to add note", 500);
  }
}
