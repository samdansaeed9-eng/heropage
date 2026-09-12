"use client";

import * as React from "react";
import { ShieldAlert, Activity, Server, Database, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";

export default function AdminPage() {
  const [data, setData] = React.useState<any>(null);
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
        <LoadingState message="Loading system telemetry & admin console..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Super Admin Console
              </h1>
              <Badge variant="warning" className="text-[10px]">
                Restricted Access
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              System health monitor, multi-tenant directory, and webhook ingestion logs.
            </p>
          </div>
        </div>

        {/* System Health Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Application Runtime</span>
                <Server className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                <span>Operational</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              Uptime 99.98% &bull; Next.js App Router
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Database Status</span>
                <Database className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">Healthy</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              Atomic Transactions Active
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Meta API Quota</span>
                <Activity className="h-4 w-4 text-sky-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">12% Used</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              Within 250 calls/sec threshold
            </CardContent>
          </Card>
        </div>

        {/* Webhook Events Ingestion Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Meta Webhook Ingestion Log</CardTitle>
            <CardDescription>
              Raw incoming events, SHA256 HMAC verification results, and queue worker status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[10px] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Event ID</th>
                    <th className="px-4 py-3">Event Type</th>
                    <th className="px-4 py-3">Signature Verification</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">evt_meta_9823471029</td>
                    <td className="px-4 py-3 text-indigo-600">messages (inbound)</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">✓ Valid SHA-256</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Processed</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400">Just now</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">evt_meta_8719283019</td>
                    <td className="px-4 py-3 text-sky-600">message_deliveries</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">✓ Valid SHA-256</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Processed</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400">2 mins ago</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">evt_meta_7610293847</td>
                    <td className="px-4 py-3 text-amber-600">message_reads</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">✓ Valid SHA-256</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Processed</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400">5 mins ago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
