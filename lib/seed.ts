import { getDb, DatabaseSchema } from "./db";
import { encryptToken } from "./crypto";

export function seedDemoDataForOrg(orgId: string, userId: string) {
  const db = getDb();
  const data = db.read();

  // Check if this org already has data
  const existingPages = data.facebookPages.filter((p) => p.organizationId === orgId);
  if (existingPages.length > 0) {
    return; // Already seeded
  }

  const now = new Date().toISOString();
  const pastHour = new Date(Date.now() - 3600000).toISOString();
  const past2Hours = new Date(Date.now() - 7200000).toISOString();
  const pastDay = new Date(Date.now() - 86400000).toISOString();

  // 1. Facebook Pages
  const page1Id = `page_${orgId}_1`;
  const page2Id = `page_${orgId}_2`;

  const page1 = {
    id: page1Id,
    organizationId: orgId,
    pageId: "109823485712984",
    name: "Aura Athletics Official",
    profilePic: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=100&h=100&fit=crop&crop=faces",
    accessTokenEncrypted: encryptToken("EAAGm0PX4ZB1sBA...mock_page1_token"),
    status: "connected" as const,
    webhookSubscribed: true,
    connectedAt: pastDay,
    lastSyncedAt: now,
  };

  const page2 = {
    id: page2Id,
    organizationId: orgId,
    pageId: "982340192849102",
    name: "Aura Footwear & Gear",
    profilePic: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop&crop=faces",
    accessTokenEncrypted: encryptToken("EAAGm0PX4ZB1sBA...mock_page2_token"),
    status: "connected" as const,
    webhookSubscribed: true,
    connectedAt: pastDay,
    lastSyncedAt: now,
  };

  // 2. Organization Labels
  const label1 = { id: `lbl_${orgId}_vip`, organizationId: orgId, name: "VIP Customer", color: "#6366f1", createdAt: pastDay };
  const label2 = { id: `lbl_${orgId}_lead`, organizationId: orgId, name: "Hot Lead", color: "#f59e0b", createdAt: pastDay };
  const label3 = { id: `lbl_${orgId}_support`, organizationId: orgId, name: "Order Issue", color: "#ef4444", createdAt: pastDay };
  const label4 = { id: `lbl_${orgId}_campaign`, organizationId: orgId, name: "Summer Promo Target", color: "#10b981", createdAt: pastDay };

  // 3. Contacts
  const contact1 = {
    id: `cnt_${orgId}_1`,
    organizationId: orgId,
    pageId: page1Id,
    psid: "psid_9823749812",
    name: "Alex Rivera",
    profilePic: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces",
    assignedUserId: userId,
    createdAt: pastDay,
    updatedAt: now,
  };

  const contact2 = {
    id: `cnt_${orgId}_2`,
    organizationId: orgId,
    pageId: page1Id,
    psid: "psid_7841928374",
    name: "Elena Rostova",
    profilePic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    assignedUserId: userId,
    createdAt: pastDay,
    updatedAt: pastHour,
  };

  const contact3 = {
    id: `cnt_${orgId}_3`,
    organizationId: orgId,
    pageId: page2Id,
    psid: "psid_6719284918",
    name: "Marcus Vance",
    profilePic: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=faces",
    assignedUserId: undefined,
    createdAt: pastDay,
    updatedAt: past2Hours,
  };

  // 4. Contact Labels
  const contactLabels = [
    { contactId: contact1.id, labelId: label1.id },
    { contactId: contact1.id, labelId: label4.id },
    { contactId: contact2.id, labelId: label2.id },
    { contactId: contact3.id, labelId: label3.id },
  ];

  // 5. Conversations
  const conv1 = {
    id: `conv_${orgId}_1`,
    organizationId: orgId,
    pageId: page1Id,
    contactId: contact1.id,
    status: "open" as const,
    assignedUserId: userId,
    unreadCount: 1,
    lastMessageText: "Can I get an update on my tracking number for the Pro Runners?",
    lastMessageAt: now,
    createdAt: pastDay,
  };

  const conv2 = {
    id: `conv_${orgId}_2`,
    organizationId: orgId,
    pageId: page1Id,
    contactId: contact2.id,
    status: "open" as const,
    assignedUserId: userId,
    unreadCount: 0,
    lastMessageText: "Thanks for the discount code! Ordering right now.",
    lastMessageAt: pastHour,
    createdAt: pastDay,
  };

  const conv3 = {
    id: `conv_${orgId}_3`,
    organizationId: orgId,
    pageId: page2Id,
    contactId: contact3.id,
    status: "open" as const,
    assignedUserId: undefined,
    unreadCount: 2,
    lastMessageText: "Is size 11 available in midnight black?",
    lastMessageAt: past2Hours,
    createdAt: pastDay,
  };

  // 6. Messages
  const messages = [
    {
      id: `msg_${orgId}_1_1`,
      conversationId: conv1.id,
      organizationId: orgId,
      pageId: page1Id,
      senderId: contact1.psid,
      recipientId: page1.pageId,
      senderType: "customer" as const,
      text: "Hi there! I placed an order yesterday.",
      status: "read" as const,
      createdAt: pastHour,
    },
    {
      id: `msg_${orgId}_1_2`,
      conversationId: conv1.id,
      organizationId: orgId,
      pageId: page1Id,
      senderId: page1.pageId,
      recipientId: contact1.psid,
      senderType: "agent" as const,
      text: "Hello Alex! Thank you for reaching out. Let me look up your order details right away.",
      status: "delivered" as const,
      createdAt: pastHour,
    },
    {
      id: `msg_${orgId}_1_3`,
      conversationId: conv1.id,
      organizationId: orgId,
      pageId: page1Id,
      senderId: contact1.psid,
      recipientId: page1.pageId,
      senderType: "customer" as const,
      text: "Can I get an update on my tracking number for the Pro Runners?",
      status: "delivered" as const,
      createdAt: now,
    },
    {
      id: `msg_${orgId}_2_1`,
      conversationId: conv2.id,
      organizationId: orgId,
      pageId: page1Id,
      senderId: contact2.psid,
      recipientId: page1.pageId,
      senderType: "customer" as const,
      text: "Do you have any active summer promotions?",
      status: "read" as const,
      createdAt: past2Hours,
    },
    {
      id: `msg_${orgId}_2_2`,
      conversationId: conv2.id,
      organizationId: orgId,
      pageId: page1Id,
      senderId: page1.pageId,
      recipientId: contact2.psid,
      senderType: "agent" as const,
      text: "Yes Elena! You can use code SUMMER20 for 20% off all apparel.",
      status: "read" as const,
      createdAt: pastHour,
    },
    {
      id: `msg_${orgId}_2_3`,
      conversationId: conv2.id,
      organizationId: orgId,
      pageId: page1Id,
      senderId: contact2.psid,
      recipientId: page1.pageId,
      senderType: "customer" as const,
      text: "Thanks for the discount code! Ordering right now.",
      status: "read" as const,
      createdAt: pastHour,
    },
    {
      id: `msg_${orgId}_3_1`,
      conversationId: conv3.id,
      organizationId: orgId,
      pageId: page2Id,
      senderId: contact3.psid,
      recipientId: page2.pageId,
      senderType: "customer" as const,
      text: "Is size 11 available in midnight black?",
      status: "delivered" as const,
      createdAt: past2Hours,
    },
  ];

  // 7. Internal Notes
  const contactNotes = [
    {
      id: `note_${orgId}_1`,
      contactId: contact1.id,
      userId,
      content: "Alex is an early VIP backer. Always prioritize express dispatch.",
      createdAt: pastHour,
    },
  ];

  // 8. Saved Replies
  const savedReplies = [
    {
      id: `sr_${orgId}_1`,
      organizationId: orgId,
      name: "Greeting & Welcome",
      content: "Hello {{name}}! Thank you for messaging us. How can we assist you today?",
      createdBy: userId,
      createdAt: pastDay,
    },
    {
      id: `sr_${orgId}_2`,
      organizationId: orgId,
      name: "Shipping & Tracking Policy",
      content: "All orders are dispatched within 24 business hours. You will receive an automated tracking link once the courier scans your parcel.",
      createdBy: userId,
      createdAt: pastDay,
    },
  ];

  // 9. Templates
  const templates = [
    {
      id: `tmpl_${orgId}_1`,
      organizationId: orgId,
      name: "order_confirmation_v2",
      category: "UTILITY",
      language: "en_US",
      status: "approved" as const,
      content: "Hi {{first_name}}, your order #{{order_id}} has been confirmed and is being prepped for dispatch.",
      variables: ["first_name", "order_id"],
      metaTemplateId: "meta_tmpl_9823471",
      createdBy: userId,
      createdAt: pastDay,
      updatedAt: pastDay,
    },
    {
      id: `tmpl_${orgId}_2`,
      organizationId: orgId,
      name: "summer_flash_promo",
      category: "MARKETING",
      language: "en_US",
      status: "approved" as const,
      content: "Hey {{first_name}}! Summer sale is live for 48 hours. Enjoy 20% off with your VIP code {{code}}.",
      variables: ["first_name", "code"],
      metaTemplateId: "meta_tmpl_4781293",
      createdBy: userId,
      createdAt: pastDay,
      updatedAt: pastDay,
    },
  ];

  // 10. Campaigns
  const campaigns = [
    {
      id: `cmp_${orgId}_1`,
      organizationId: orgId,
      name: "Summer VIP Early Access",
      templateId: templates[1].id,
      status: "running" as const,
      audienceFilter: { labels: [label1.id, label4.id] },
      totalAudience: 150,
      queuedCount: 12,
      sentCount: 138,
      deliveredCount: 134,
      failedCount: 4,
      skippedCount: 0,
      createdAt: pastDay,
    },
    {
      id: `cmp_${orgId}_2`,
      organizationId: orgId,
      name: "Fall Collection Launch",
      templateId: templates[0].id,
      status: "scheduled" as const,
      audienceFilter: { allEligible: true },
      totalAudience: 420,
      queuedCount: 420,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      skippedCount: 0,
      createdAt: pastHour,
      scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    },
  ];

  // 11. Additional Team Members
  const user2Id = `usr_agent_clara_${orgId}`;
  const nowUser2 = {
    id: user2Id,
    name: "Clara Davis",
    email: "clara.support@agency.com",
    passwordHash: "$2a$10$Thle3mkH0RZqdGLXEG6iWOAAGKAXhONhWhFEWprIBq5bUcGptrb7C",
    createdAt: pastDay,
    updatedAt: pastDay,
  };

  const mem2 = {
    id: `mem_${orgId}_clara`,
    userId: user2Id,
    organizationId: orgId,
    role: "AGENT" as const,
    createdAt: pastDay,
  };

  db.update((draft) => {
    draft.facebookPages.push(page1, page2);
    draft.labels.push(label1, label2, label3, label4);
    draft.contacts.push(contact1, contact2, contact3);
    draft.contactLabels.push(...contactLabels);
    draft.conversations.push(conv1, conv2, conv3);
    draft.messages.push(...messages);
    draft.contactNotes.push(...contactNotes);
    draft.savedReplies.push(...savedReplies);
    draft.templates.push(...templates);
    draft.campaigns.push(...campaigns);
    if (!draft.users.some((u) => u.id === user2Id)) {
      draft.users.push(nowUser2);
    }
    if (!draft.memberships.some((m) => m.id === mem2.id)) {
      draft.memberships.push(mem2);
    }
  });
}
