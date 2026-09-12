"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  CheckCheck,
  Send,
  User,
  Tag,
  Paperclip,
  Smile,
  MoreVertical,
  Flag,
  FileText,
  AlertCircle,
  Plus,
  Clock,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

function InboxContent() {
  const searchParams = useSearchParams();
  const initialConvId = searchParams.get("id");

  const [data, setData] = React.useState<any>(null);
  const [selectedConvId, setSelectedConvId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"all" | "unread" | "open" | "closed">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPageId, setSelectedPageId] = React.useState<string>("all");
  const [messageInput, setMessageInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [noteInput, setNoteInput] = React.useState("");
  const [isAddingNote, setIsAddingNote] = React.useState(false);
  const [isSavedRepliesOpen, setIsSavedRepliesOpen] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const loadData = React.useCallback(() => {
    fetch("/api/data/bootstrap")
      .then((res) => res.json())
      .then((res) => {
        if (res?.success) {
          setData(res.data);
          if (!selectedConvId && res.data.conversations?.length > 0) {
            setSelectedConvId(initialConvId || res.data.conversations[0].id);
          }
        }
      });
  }, [initialConvId, selectedConvId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data, selectedConvId]);

  if (!data) {
    return <LoadingState message="Loading conversations & messenger stream..." />;
  }

  const conversations = data?.conversations || [];
  const contacts = data?.contacts || [];
  const messages = data?.messages || [];
  const facebookPages = data?.pages || data?.facebookPages || [];
  const labels = data?.labels || [];
  const contactLabels = data?.contactLabels || [];
  const contactNotes = data?.contactNotes || [];
  const savedReplies = data?.savedReplies || [];

  // Filter conversations
  const filteredConversations = conversations.filter((conv: any) => {
    const contact = contacts.find((c: any) => c.id === conv.contactId);
    if (selectedPageId !== "all" && conv.pageId !== selectedPageId) return false;
    if (activeTab === "unread" && conv.unreadCount === 0) return false;
    if (activeTab === "open" && conv.status !== "open") return false;
    if (activeTab === "closed" && conv.status !== "closed") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = contact?.name?.toLowerCase().includes(q);
      const matchText = conv.lastMessageText?.toLowerCase().includes(q);
      if (!matchName && !matchText) return false;
    }
    return true;
  });

  const selectedConversation = conversations.find((c: any) => c.id === selectedConvId);
  const selectedContact = selectedConversation
    ? contacts.find((c: any) => c.id === selectedConversation.contactId)
    : null;
  const selectedPage = selectedConversation
    ? facebookPages.find((p: any) => p.id === selectedConversation.pageId)
    : null;
  const currentMessages = messages.filter((m: any) => m.conversationId === selectedConvId);
  const currentNotes = selectedContact
    ? contactNotes.filter((n: any) => n.contactId === selectedContact.id)
    : [];

  const assignedLabelIds = selectedContact
    ? contactLabels.filter((cl: any) => cl.contactId === selectedContact.id).map((cl: any) => cl.labelId)
    : [];
  const contactAssignedLabels = labels.filter((l: any) => assignedLabelIds.includes(l.id));

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConvId || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConvId,
          text: messageInput.trim(),
        }),
      });
      if (res.ok) {
        setMessageInput("");
        loadData();
      }
    } finally {
      setIsSending(false);
    }
  };

  // Add note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !selectedContact || isAddingNote) return;

    setIsAddingNote(true);
    try {
      const res = await fetch("/api/inbox/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          content: noteInput.trim(),
        }),
      });
      if (res.ok) {
        setNoteInput("");
        loadData();
      }
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* LEFT PANE: Conversation List */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-100/80 rounded-lg border-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
            />
          </div>

          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="w-full h-7 text-[11px] bg-white border border-slate-200 rounded-md px-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Facebook Pages ({facebookPages.length})</option>
            {facebookPages.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex gap-1 pt-1">
            {(["all", "unread", "open", "closed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-1 text-[11px] font-semibold capitalize rounded-md transition-colors",
                  activeTab === tab
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No conversations found matching criteria.
            </div>
          ) : (
            filteredConversations.map((conv: any) => {
              const contact = contacts.find((c: any) => c.id === conv.contactId);
              const page = facebookPages.find((p: any) => p.id === conv.pageId);
              const isSelected = conv.id === selectedConvId;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={cn(
                    "w-full text-left p-3 transition-colors flex items-start gap-3 hover:bg-slate-100/70",
                    isSelected ? "bg-indigo-50/70 border-l-4 border-indigo-600" : "bg-white"
                  )}
                >
                  <div className="relative">
                    <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-slate-200 border border-slate-200">
                      {contact?.profilePic ? (
                        <img src={contact.profilePic} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-bold text-xs text-slate-600">
                          {contact?.name?.slice(0, 2) || "MS"}
                        </div>
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-indigo-600 border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "text-xs font-bold truncate",
                          isSelected ? "text-indigo-950" : "text-slate-900"
                        )}
                      >
                        {contact?.name || "Customer"}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">12:45 PM</span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                      {conv.lastMessageText || "No messages"}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden">
                      {page && (
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold truncate max-w-[120px]">
                          {page.name}
                        </span>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="h-4 min-w-[16px] px-1 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CENTER PANE: Active Conversation */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation && selectedContact ? (
          <>
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300">
                  <img src={selectedContact.profilePic} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{selectedContact.name}</h3>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span>via {selectedPage?.name || "Facebook Page"}</span>
                    <span>&bull;</span>
                    <span className="text-emerald-600 font-semibold">Messenger Official</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={selectedConversation.status === "open" ? "success" : "secondary"}>
                  {selectedConversation.status.toUpperCase()}
                </Badge>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  {selectedConversation.status === "open" ? "Close" : "Reopen"}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
              <div className="text-center my-2">
                <span className="text-[10px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                  Conversation Started &bull; Meta Encrypted
                </span>
              </div>

              {currentMessages.map((msg: any) => {
                const isOutbound = msg.senderType === "agent" || msg.senderType === "page";
                return (
                  <div
                    key={msg.id}
                    className={cn("flex flex-col", isOutbound ? "items-end" : "items-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs",
                        isOutbound
                          ? "bg-indigo-600 text-white rounded-br-xs"
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400 font-medium px-1">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {isOutbound && (
                        <>
                          <span>&bull;</span>
                          <span className="capitalize">{msg.status}</span>
                          <CheckCheck className="h-3 w-3 text-indigo-600" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-slate-200 bg-white relative">
              {isSavedRepliesOpen && (
                <div className="absolute bottom-16 left-4 right-4 z-20 rounded-xl bg-white border border-slate-200 shadow-xl p-2 space-y-1">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-xs font-bold text-slate-700">
                    <span>Insert Saved Reply</span>
                    <button onClick={() => setIsSavedRepliesOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {savedReplies.map((sr: any) => (
                    <button
                      key={sr.id}
                      onClick={() => {
                        const content = sr.content.replace("{{name}}", selectedContact.name.split(" ")[0]);
                        setMessageInput(content);
                        setIsSavedRepliesOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg text-xs hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
                    >
                      <div className="font-semibold text-slate-800">{sr.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{sr.content}</div>
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="flex items-center gap-1.5 pb-1 text-slate-400">
                  <button
                    type="button"
                    onClick={() => setIsSavedRepliesOpen(!isSavedRepliesOpen)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-indigo-600 hover:bg-indigo-50 font-medium"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Saved Replies</span>
                  </button>
                </div>

                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={`Reply to ${selectedContact.name}... (Enter to send)`}
                    className="flex-1 resize-none rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <Button type="submit" size="md" isLoading={isSending} className="h-12 px-4 shrink-0 rounded-xl">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              title="Select a Conversation"
              description="Choose a conversation from the left pane to view customer messages and reply."
            />
          </div>
        )}
      </div>

      {/* RIGHT PANE: Customer Details */}
      <div className="w-72 border-l border-slate-200 p-4 bg-white overflow-y-auto space-y-6">
        {selectedContact ? (
          <>
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="mx-auto h-16 w-16 rounded-full overflow-hidden bg-slate-200 border-2 border-indigo-100 shadow-sm">
                <img src={selectedContact.profilePic} alt="" className="h-full w-full object-cover" />
              </div>
              <h4 className="mt-2 text-sm font-bold text-slate-900">{selectedContact.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">PSID: {selectedContact.psid}</p>
              <div className="mt-2">
                <Badge variant="default">{selectedPage?.name || "Facebook Page"}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                <span>Assigned Labels</span>
                <Tag className="h-3 w-3" />
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {contactAssignedLabels.map((lbl: any) => (
                  <span
                    key={lbl.id}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md text-white shadow-2xs"
                    style={{ backgroundColor: lbl.color }}
                  >
                    {lbl.name}
                  </span>
                ))}
                {contactAssignedLabels.length === 0 && (
                  <span className="text-xs text-slate-400">No labels assigned</span>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                <span>Internal Notes ({currentNotes.length})</span>
                <FileText className="h-3 w-3" />
              </h5>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {currentNotes.map((note: any) => (
                  <div key={note.id} className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                    <p>{note.content}</p>
                    <p className="text-[9px] text-amber-700/80">{new Date(note.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddNote} className="space-y-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Add an internal note..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Button type="submit" size="sm" variant="secondary" isLoading={isAddingNote} className="w-full text-xs">
                  Post Note
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="text-center text-xs text-slate-400 pt-8">
            Select a conversation to view customer details.
          </div>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <AppShell>
      <React.Suspense fallback={<LoadingState message="Loading inbox..." />}>
        <InboxContent />
      </React.Suspense>
    </AppShell>
  );
}
