"use client";

import * as React from "react";
import { FileText, Plus, ShieldCheck, CheckCircle2, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";

export default function TemplatesPage() {
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
        <LoadingState message="Loading message templates..." />
      </AppShell>
    );
  }

  const templates = data?.templates || [];

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Meta Message Templates
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Official WhatsApp & Messenger pre-approved broadcast templates complying with Meta policies.
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Submit Template</span>
          </Button>
        </div>

        {/* Template List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tmpl: any) => (
            <Card key={tmpl.id} className="border-slate-200">
              <CardHeader className="flex flex-row items-start justify-between pb-3 bg-slate-50/50 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">{tmpl.name}</CardTitle>
                    <Badge variant="success" className="text-[10px]">
                      {tmpl.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    ID: {tmpl.metaTemplateId || "meta_tmpl_local"} &bull; {tmpl.category} &bull; {tmpl.language}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-xs text-slate-800 leading-relaxed">
                  {tmpl.content}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                  <span>Variables: {tmpl.variables?.join(", ") || "None"}</span>
                  <span>Updated: {new Date(tmpl.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
