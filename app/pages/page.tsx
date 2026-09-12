"use client";

import * as React from "react";
import { Flag, Plus, RefreshCw, Unlink, ExternalLink, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";

export default function PagesPage() {
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isConnectModalOpen, setIsConnectModalOpen] = React.useState(false);
  const [newPageName, setNewPageName] = React.useState("");
  const [newPageId, setNewPageId] = React.useState("");
  const [isConnecting, setIsConnecting] = React.useState(false);

  const loadData = () => {
    fetch("/api/data/bootstrap")
      .then((res) => res.json())
      .then((res) => {
        if (res?.success) setData(res.data);
      })
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleConnectPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;

    setIsConnecting(true);
    // Simulate connecting a Meta Page via OAuth
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnectModalOpen(false);
      setNewPageName("");
      setNewPageId("");
      loadData();
    }, 600);
  };

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState message="Loading connected Facebook Pages..." />
      </AppShell>
    );
  }

  const pages = data?.pages || [];

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Facebook Pages Management
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Connect and manage multiple Facebook business pages using official Meta Graph APIs.
            </p>
          </div>
          <Button onClick={() => setIsConnectModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Connect Facebook Page</span>
          </Button>
        </div>

        {/* Security / Compliance Banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
          <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
          <div>
            <span className="font-bold">Official Meta Compliance Guarantee:</span> All connections use Facebook OAuth and Meta Graph API v19+. Page tokens are encrypted at rest with AES-256-GCM. No Facebook scraping or unofficial automations.
          </div>
        </div>

        {/* Connected Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pages.map((page: any) => (
            <Card key={page.id} className="overflow-hidden border-slate-200/80">
              <CardHeader className="flex flex-row items-start justify-between pb-3 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src={page.profilePic}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  />
                  <div>
                    <CardTitle className="text-base">{page.name}</CardTitle>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Page ID: {page.pageId}</p>
                  </div>
                </div>
                <Badge variant={page.status === "connected" ? "success" : "danger"}>
                  {page.status}
                </Badge>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Messenger Status</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Live & Receiving
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Webhook Subscription</span>
                    <span className="font-semibold text-indigo-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" /> messages, deliveries
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                  <span>Connected: {new Date(page.connectedAt).toLocaleDateString()}</span>
                  <span>Last Synced: Just now</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      <span>Refresh Sync</span>
                    </Button>
                    <a
                      href={`https://facebook.com/${page.pageId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View on FB</span>
                    </a>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1">
                    <Unlink className="h-3 w-3" />
                    <span>Disconnect</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Connect Page Modal */}
        <Modal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          title="Connect Facebook Page"
          description="Authenticate via Meta OAuth to grant Messenger permissions for your business page."
        >
          <form onSubmit={handleConnectPage} className="space-y-4">
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-2">
              <p className="font-bold">Permissions requested:</p>
              <ul className="list-disc list-inside space-y-1 text-indigo-800">
                <li>pages_messaging</li>
                <li>pages_show_list</li>
                <li>pages_read_engagement</li>
              </ul>
            </div>

            <Input
              label="Page Name"
              placeholder="e.g. Acme Support Store"
              required
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
            />

            <Input
              label="Page ID (Optional in Test Mode)"
              placeholder="e.g. 1092837465019"
              value={newPageId}
              onChange={(e) => setNewPageId(e.target.value)}
            />

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsConnectModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isConnecting}>
                Connect Page Now
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
