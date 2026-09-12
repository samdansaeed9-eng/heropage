"use client";

import * as React from "react";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Users,
  Flag,
  FileText,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

export default function CampaignsPage() {
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);

  // Wizard state (7 Steps)
  const [wizardStep, setWizardStep] = React.useState(1);
  const [campaignName, setCampaignName] = React.useState("");
  const [selectedPageIds, setSelectedPageIds] = React.useState<string[]>([]);
  const [audienceType, setAudienceType] = React.useState<"all" | "labels">("labels");
  const [selectedLabels, setSelectedLabels] = React.useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("");
  const [varFirstName, setVarFirstName] = React.useState("first_name");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadData = () => {
    fetch("/api/data/bootstrap")
      .then((res) => res.json())
      .then((res) => {
        if (res?.success) {
          setData(res.data);
          if (res.data.templates?.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(res.data.templates[0].id);
          }
          if (res.data.pages?.length > 0 && selectedPageIds.length === 0) {
            setSelectedPageIds([res.data.pages[0].id]);
          }
        }
      })
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleLaunchCampaign = () => {
    setIsSubmitting(true);
    // Simulate campaign creation
    setTimeout(() => {
      setIsSubmitting(false);
      setIsWizardOpen(false);
      setWizardStep(1);
      setCampaignName("");
      loadData();
    }, 600);
  };

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState message="Loading campaign broadcasts..." />
      </AppShell>
    );
  }

  const campaigns = data?.campaigns || [];
  const pages = data?.pages || [];
  const templates = data?.templates || [];
  const labels = data?.labels || [];

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Messenger Campaigns Engine
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Orchestrate Meta-compliant broadcast messages, audience segmentation, and queue dispatch.
            </p>
          </div>
          <Button onClick={() => setIsWizardOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </Button>
        </div>

        {/* Campaign List */}
        <div className="space-y-4">
          {campaigns.map((camp: any) => {
            const template = templates.find((t: any) => t.id === camp.templateId);
            const deliveryRate = Math.round((camp.deliveredCount / (camp.totalAudience || 1)) * 100);
            const failureRate = Math.round((camp.failedCount / (camp.totalAudience || 1)) * 100);

            return (
              <Card key={camp.id} className="overflow-hidden border-slate-200/80">
                <CardHeader className="p-5 pb-3 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{camp.name}</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Template: <span className="font-mono text-indigo-600 font-medium">{template?.name || "Standard Template"}</span>
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      camp.status === "running"
                        ? "default"
                        : camp.status === "scheduled"
                        ? "warning"
                        : camp.status === "completed"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {camp.status.toUpperCase()}
                  </Badge>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600">Broadcast Delivery Status</span>
                      <span className="text-indigo-600">{deliveryRate}% Delivered</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${deliveryRate}%` }} />
                      <div className="bg-rose-500 h-full transition-all" style={{ width: `${failureRate}%` }} />
                    </div>
                  </div>

                  {/* 5 Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Audience</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">{camp.totalAudience}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Queued</span>
                      <span className="text-sm font-bold text-amber-600 mt-0.5 block">{camp.queuedCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sent</span>
                      <span className="text-sm font-bold text-indigo-600 mt-0.5 block">{camp.sentCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivered</span>
                      <span className="text-sm font-bold text-emerald-600 mt-0.5 block">{camp.deliveredCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Failed</span>
                      <span className="text-sm font-bold text-rose-600 mt-0.5 block">{camp.failedCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 7-Step Campaign Wizard Modal */}
        <Modal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          title={`Create Campaign (Step ${wizardStep} of 7)`}
          description="Build a compliant Meta Messenger broadcast with label segmentation."
          className="max-w-xl"
        >
          <div className="space-y-6">
            {/* Step 1: Name */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Step 1: Campaign Name</h4>
                <Input
                  label="Campaign Title"
                  placeholder="e.g. VIP Summer Flash Sale 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Step 2: Select Pages */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Step 2: Select Facebook Pages</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pages.map((p: any) => (
                    <label
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={p.profilePic} alt="" className="h-7 w-7 rounded-lg object-cover" />
                        <span className="text-xs font-semibold text-slate-900">{p.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedPageIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPageIds([...selectedPageIds, p.id]);
                          else setSelectedPageIds(selectedPageIds.filter((id) => id !== p.id));
                        }}
                        className="rounded text-indigo-600"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Audience */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Step 3: Audience Segmentation</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="aud"
                      checked={audienceType === "all"}
                      onChange={() => setAudienceType("all")}
                    />
                    <span>All Eligible Contacts</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="aud"
                      checked={audienceType === "labels"}
                      onChange={() => setAudienceType("labels")}
                    />
                    <span>Specific Labels</span>
                  </label>
                </div>

                {audienceType === "labels" && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {labels.map((lbl: any) => (
                      <button
                        key={lbl.id}
                        type="button"
                        onClick={() => {
                          if (selectedLabels.includes(lbl.id)) {
                            setSelectedLabels(selectedLabels.filter((id) => id !== lbl.id));
                          } else {
                            setSelectedLabels([...selectedLabels, lbl.id]);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                          selectedLabels.includes(lbl.id)
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {lbl.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Select Template */}
            {wizardStep === 4 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Step 4: Select Meta Approved Template</h4>
                <div className="space-y-2">
                  {templates.map((tmpl: any) => (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-colors",
                        selectedTemplateId === tmpl.id
                          ? "border-indigo-600 bg-indigo-50/40"
                          : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{tmpl.name}</span>
                        <Badge variant="success">APPROVED</Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-mono">{tmpl.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Configure Variables */}
            {wizardStep === 5 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Step 5: Configure Template Variables</h4>
                <Input
                  label="Variable: {{first_name}}"
                  value={varFirstName}
                  onChange={(e) => setVarFirstName(e.target.value)}
                  placeholder="Mapped to Contact First Name"
                />
              </div>
            )}

            {/* Step 6: Review */}
            {wizardStep === 6 && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <h4 className="text-sm font-bold text-slate-900">Step 6: Campaign Summary Review</h4>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Campaign Name:</span>
                    <span className="font-bold text-slate-900">{campaignName || "Untitled Campaign"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Pages:</span>
                    <span className="font-medium text-slate-900">{selectedPageIds.length} Page(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated Audience:</span>
                    <span className="font-bold text-indigo-600">150 Contacts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Queue Throttling:</span>
                    <span className="text-emerald-600 font-semibold">25 msgs/sec (Meta Compliant)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Launch or Schedule */}
            {wizardStep === 7 && (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Ready to Launch Broadcast</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Messages will be dispatched through the asynchronous queue worker with automated retry handling.
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>

              {wizardStep < 7 ? (
                <Button size="sm" onClick={() => setWizardStep((s) => Math.min(7, s + 1))}>
                  Next
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleLaunchCampaign} isLoading={isSubmitting}>
                  Launch Broadcast Now
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
