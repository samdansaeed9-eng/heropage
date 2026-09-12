import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { verifyMetaSignature } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  let expectedToken = process.env.META_VERIFY_TOKEN;
  if (!expectedToken) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("META_VERIFY_TOKEN environment variable is required in production");
    }
    console.warn("WARNING: META_VERIFY_TOKEN is not set. Using insecure development default.");
    expectedToken = "heropage_webhook_verify_token_123";
  }

  // Meta Webhook Handshake Verification
  if (mode === "subscribe" && token === expectedToken) {
    console.log("[Meta Webhook] Successfully verified handshake with Meta challenge token");
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  console.warn("[Meta Webhook] Verification token mismatch");
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    let appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("META_APP_SECRET environment variable is required in production");
      }
      console.warn("WARNING: META_APP_SECRET is not set. Using insecure development default.");
      appSecret = "mock_meta_app_secret";
    }

    // Verify HMAC-SHA256 signature if in production or if signature header is present
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction || signature) {
      const isValid = verifyMetaSignature(rawBody, signature, appSecret);
      if (!isValid) {
        console.error("[Meta Webhook] Invalid HMAC signature detected from caller");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (payload.object !== "page") {
      return NextResponse.json({ status: "IGNORED_NON_PAGE_EVENT" }, { status: 200 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Process entries asynchronously into DB
    for (const entry of payload.entry || []) {
      const pageFbId = entry.id; // Meta Page ID

      for (const messagingEvent of entry.messaging || []) {
        const senderPsid = messagingEvent.sender?.id;
        const recipientPageId = messagingEvent.recipient?.id;

        // -------------------------------------------------------------
        // A) INBOUND MESSAGE
        // -------------------------------------------------------------
        if (messagingEvent.message) {
          const mid = messagingEvent.message.mid;
          const text = messagingEvent.message.text || "[Attachment / Media]";

          // 1. Idempotency check: check if mid already processed
          const existingData = db.read();
          if (mid && existingData.messages.some((m) => m.mid === mid)) {
            console.log(`[Meta Webhook] Skipping duplicate event mid=${mid}`);
            continue;
          }

          // 2. Locate matching FacebookPage in our Cloud DB
          let matchedPage = existingData.facebookPages.find(
            (p) => p.pageId === recipientPageId || p.pageId === pageFbId
          );

          // Fallback to first active page only when testing in non-production
          if (!matchedPage && existingData.facebookPages.length > 0 && process.env.NODE_ENV !== "production") {
            matchedPage = existingData.facebookPages[0];
          }

          if (!matchedPage) {
            console.warn(`[Meta Webhook] No connected FacebookPage found for ID ${recipientPageId}`);
            continue;
          }

          const orgId = matchedPage.organizationId;

          // 3. Find or create Contact
          let contact = existingData.contacts.find(
            (c) => c.organizationId === orgId && c.psid === senderPsid
          );

          if (!contact) {
            contact = {
              id: `cnt_${crypto.randomUUID()}`,
              organizationId: orgId,
              pageId: matchedPage.id,
              psid: senderPsid,
              name: `Customer ${senderPsid.slice(-4)}`,
              profilePic: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces`,
              createdAt: now,
              updatedAt: now,
            };
          }

          // 4. Find or create Conversation
          let conversation = existingData.conversations.find(
            (c) => c.organizationId === orgId && c.contactId === contact!.id
          );

          if (!conversation) {
            conversation = {
              id: `conv_${crypto.randomUUID()}`,
              organizationId: orgId,
              pageId: matchedPage.id,
              contactId: contact.id,
              status: "open",
              unreadCount: 0,
              lastMessageText: text,
              lastMessageAt: now,
              createdAt: now,
            };
          }

          // 5. Create Message Record
          const newMessage = {
            id: `msg_${crypto.randomUUID()}`,
            conversationId: conversation.id,
            organizationId: orgId,
            pageId: matchedPage.id,
            mid,
            senderId: senderPsid,
            recipientId: recipientPageId,
            senderType: "customer" as const,
            text,
            status: "delivered" as const,
            createdAt: now,
          };

          // 6. Record WebhookEvent for audit trail & idempotency
          const webhookRecord = {
            id: `evt_${crypto.randomUUID()}`,
            eventId: mid || `evt_raw_${crypto.randomUUID()}`,
            eventType: "messages",
            payload: JSON.stringify(messagingEvent),
            processed: true,
            createdAt: now,
          };

          // Atomic write update to DB
          db.update((draft) => {
            if (!draft.contacts.some((c) => c.id === contact!.id)) {
              draft.contacts.push(contact!);
            }
            const convIdx = draft.conversations.findIndex((c) => c.id === conversation!.id);
            if (convIdx === -1) {
              draft.conversations.push(conversation!);
            } else {
              draft.conversations[convIdx].lastMessageText = text;
              draft.conversations[convIdx].lastMessageAt = now;
              draft.conversations[convIdx].unreadCount = (draft.conversations[convIdx].unreadCount || 0) + 1;
              draft.conversations[convIdx].status = "open";
            }
            draft.messages.push(newMessage);
            draft.webhookEvents.push(webhookRecord);
          });

          console.log(`[Meta Webhook] Persisted incoming message from PSID ${senderPsid} on page ${matchedPage.name}`);
        }

        // -------------------------------------------------------------
        // B) DELIVERY RECEIPT
        // -------------------------------------------------------------
        if (messagingEvent.delivery) {
          const mids = messagingEvent.delivery.mids || [];
          db.update((draft) => {
            draft.messages.forEach((m) => {
              if (m.mid && mids.includes(m.mid)) {
                m.status = "delivered";
              }
            });
          });
        }

        // -------------------------------------------------------------
        // C) READ RECEIPT
        // -------------------------------------------------------------
        if (messagingEvent.read) {
          const watermark = messagingEvent.read.watermark;
          db.update((draft) => {
            draft.messages.forEach((m) => {
              if (m.senderId === senderPsid && new Date(m.createdAt).getTime() <= watermark) {
                m.status = "read";
              }
            });
          });
        }
      }
    }

    // Always respond immediately with 200 OK to satisfy Meta's strict timeout SLA
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (err: any) {
    console.error("[Meta Webhook] Processing error:", err);
    // Still return 200 so Meta doesn't retry flood, but log error internally
    return NextResponse.json({ status: "ERROR_LOGGED" }, { status: 200 });
  }
}
