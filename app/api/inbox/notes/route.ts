import { NextRequest } from "next/server";
import crypto from "crypto";
import { requireOrgContext, belongsToOrg } from "@/lib/authz";
import { getDb } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrgContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const { contactId, content } = await req.json();
    if (!contactId || !content?.trim()) {
      return errorResponse("Contact ID and content are required", 400);
    }

    const db = getDb();
    const data = db.read();

    const contact = data.contacts.find((c) => c.id === contactId);
    if (!contact) {
      return errorResponse("Contact not found", 404, "NOT_FOUND");
    }

    if (!belongsToOrg(contact.organizationId, ctx)) {
      return errorResponse("Contact not found", 404, "NOT_FOUND");
    }

    const newNote = {
      id: `note_${crypto.randomUUID()}`,
      contactId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
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
