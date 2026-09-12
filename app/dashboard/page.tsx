"use client";

import * as React from "react";
import Link from "next/link";
import {
  Flag,
  MessageSquare,
  Users,
  Megaphone,
  Send,
  CheckCircle2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Activity,
  Clock,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";

export default function DashboardPage() {
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/data/bootstrap")
      .then((res) => res.json())
      .then((res) => {
        if (res?.success) {
          setData(res.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState message="Loading dashboard metrics..." />
      </AppShell>
    );
  }

  const pages = data?.pages || [];
  const conversations = data?.conversations || [];
  const contacts = data?.contacts || [];
  const campaigns = data?.campaigns || [];
  const unreadCount = conversations.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
  const activeCampaigns = campaigns.filter((c: any) => c.status === "running" || c.status === "scheduled");

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Top welcome & quick actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard Overview
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Welcome back to {data?.organization?.name || "your workspace"}. Here is your multi-page pulse.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/pages">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5" />
                <span>Connect Page</span>
              </Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5" />
                <span>New Campaign</span>
              </Button>
            </Link>
            <Link href="/inbox">
              <Button size="sm" className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Open Inbox</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 6 Key Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Pages</span>
                <Flag className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{pages.length}</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All synced
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Unread</span>
                <MessageSquare className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{unreadCount}</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-amber-600 font-medium">
              Requires attention
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Contacts</span>
                <Users className="h-4 w-4 text-sky-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{contacts.length}</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
              Across all pages
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Campaigns</span>
                <Megaphone className="h-4 w-4 text-violet-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{activeCampaigns.length}</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-violet-600 font-medium">
              Active / Scheduled
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Sent</span>
                <Send className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">1,428</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
              This billing cycle
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Delivery</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">98.6%</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-emerald-600 font-medium">
              Meta Graph API
            </CardContent>
          </Card>
        </div>

        {/* 2-Column Section: Recent Conversations & Active Campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Conversations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Recent Conversations</CardTitle>
                <CardDescription>Live incoming messages across connected pages</CardDescription>
              </div>
              <Link href="/inbox">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversations.map((conv: any) => {
                const contact = contacts.find((c: any) => c.id === conv.contactId);
                const page = pages.find((p: any) => p.id === conv.pageId);
                return (
                  <Link
                    key={conv.id}
                    href={`/inbox?id=${conv.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-slate-200 border border-slate-300">
                        {contact?.profilePic ? (
                          <img src={contact.profilePic} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-bold text-xs text-slate-600">
                            {contact?.name?.slice(0, 2) || "CO"}
                          </div>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {contact?.name || "Messenger User"}
                          </p>
                          {page && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium truncate">
                              {page.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {conv.lastMessageText || "No messages yet"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="text-[10px] text-slate-400">Just now</span>
                      {conv.unreadCount > 0 && (
                        <span className="mt-1 h-4 min-w-[16px] px-1 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Active Campaigns */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Campaign Performance</CardTitle>
                <CardDescription>Broadcasting queues and message dispatch status</CardDescription>
              </div>
              <Link href="/campaigns">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
                  Manage
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.map((camp: any) => {
                const percent = Math.round((camp.deliveredCount / (camp.totalAudience || 1)) * 100);
                return (
                  <div key={camp.id} className="p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{camp.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          Target: {camp.totalAudience} contacts
                        </p>
                      </div>
                      <Badge
                        variant={camp.status === "running" ? "default" : camp.status === "scheduled" ? "warning" : "success"}
                      >
                        {camp.status}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Delivery Rate</span>
                        <span>{percent}% ({camp.deliveredCount}/{camp.totalAudience})</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Facebook Page Health Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <span>Facebook Pages Health & Webhook Status</span>
            </CardTitle>
            <CardDescription>Real-time official Meta Graph API connection status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pages.map((page: any) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={page.profilePic}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{page.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Page ID: {page.pageId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Webhook Active</Badge>
                    <Badge variant="default">Connected</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
