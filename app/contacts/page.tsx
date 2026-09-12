"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Search, Plus, MessageSquare, Tag, FileText, ArrowUpDown } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";

export default function ContactsPage() {
  const [data, setData] = React.useState<any>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedLabel, setSelectedLabel] = React.useState<string>("all");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/data/bootstrap")
      .then((res) => res.json())
      .then((res) => {
        if (res?.success) setData(res.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState message="Loading contacts directory..." />
      </AppShell>
    );
  }

  const contacts = data?.contacts || [];
  const pages = data?.pages || [];
  const labels = data?.labels || [];
  const contactLabels = data?.contactLabels || [];

  const filteredContacts = contacts.filter((c: any) => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedLabel !== "all") {
      const hasLabel = contactLabels.some((cl: any) => cl.contactId === c.id && cl.labelId === selectedLabel);
      if (!hasLabel) return false;
    }
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Customer Contacts & Leads
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Multi-page customer CRM and Page-Scoped ID (PSID) profiles.
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Contact</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts by name or PSID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            className="h-9 text-xs bg-white border border-slate-200 rounded-xl px-3 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Labels</option>
            {labels.map((lbl: any) => (
              <option key={lbl.id} value={lbl.id}>
                {lbl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Contacts Table */}
        <Card className="overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[10px] text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Connected Page</th>
                  <th className="px-6 py-3.5">Facebook PSID</th>
                  <th className="px-6 py-3.5">Labels</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((contact: any) => {
                  const page = pages.find((p: any) => p.id === contact.pageId);
                  const assignedLabels = labels.filter((l: any) =>
                    contactLabels.some((cl: any) => cl.contactId === contact.id && cl.labelId === l.id)
                  );

                  return (
                    <tr key={contact.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={contact.profilePic}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{contact.name}</span>
                            <span className="text-[10px] text-slate-400">ID: {contact.id.slice(0, 10)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant="secondary">{page?.name || "Page"}</Badge>
                      </td>

                      <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                        {contact.psid}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {assignedLabels.map((lbl: any) => (
                            <span
                              key={lbl.id}
                              className="px-2 py-0.5 text-[9px] font-bold rounded-md text-white shadow-2xs"
                              style={{ backgroundColor: lbl.color }}
                            >
                              {lbl.name}
                            </span>
                          ))}
                          {assignedLabels.length === 0 && (
                            <span className="text-slate-400 text-[10px]">None</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link href="/inbox">
                          <Button variant="outline" size="sm" className="h-7 text-xs flex items-center gap-1.5 ml-auto">
                            <MessageSquare className="h-3 w-3 text-indigo-600" />
                            <span>Message</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
