import { NextRequest } from "next/server";
import crypto from "crypto";
import { requireOrgContext, belongsToOrg } from "@/lib/authz";
import { getDb } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrgContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const { conversationId, text } = await req.json();
    if (!conversationId || !text?.trim()) {
      return errorResponse("Conversation ID and message text are required", 400);
    }

    const db = getDb();
    const data = db.read();

    const conv = data.conversations.find((c) => c.id === conversationId);
    if (!conv) return errorResponse("Conversation not found", 404);

    if (!belongsToOrg(conv.organizationId, ctx)) {
      return errorResponse("Conversation not found", 404, "NOT_FOUND");
    }

    const contact = data.contacts.find((c) => c.id === conv.contactId);
    const now = new Date().toISOString();

    const newMessage = {
      id: `msg_${crypto.randomUUID()}`,
      conversationId: conv.id,
      organizationId: conv.organizationId,
      pageId: conv.pageId,
      senderId: conv.pageId,
      recipientId: contact ? contact.psid : "unknown",
      senderType: "agent" as const,
      text: text.trim(),
      status: "delivered" as const, // Simulating delivery
      createdAt: now,
    };

    db.update((draft) => {
      draft.messages.push(newMessage);
      const c = draft.conversations.find((item) => item.id === conv.id);
      if (c) {
        c.lastMessageText = text.trim();
        c.lastMessageAt = now;
        c.unreadCount = 0; // Outgoing message clears unread
      }
    });

    return successResponse(newMessage);
  } catch (err: any) {
    console.error("Inbox send error:", err);
    return errorResponse("Failed to send message", 500);
  }
}
