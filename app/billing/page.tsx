"use client";

import * as React from "react";
import { CreditCard, Check, Zap, Shield, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_LIMITS, SubscriptionPlan } from "@/lib/types";

const PLANS: { id: SubscriptionPlan; name: string; price: string; description: string; popular?: boolean }[] = [
  { id: "free", name: "Free Tier", price: "$0", description: "Best for indie makers starting with 1 Facebook Page." },
  { id: "starter", name: "Starter", price: "$29", description: "For boutique agencies and small stores." },
  { id: "pro", name: "Pro Agency", price: "$79", description: "For high-volume multi-page agencies.", popular: true },
  { id: "business", name: "Enterprise", price: "$199", description: "Dedicated queue priority & unlimited contacts." },
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = React.useState<SubscriptionPlan>("free");

  return (
    <AppShell>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Subscription & Usage Quotas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Transparent multi-tenant quotas and seamless Stripe billing integration.
            </p>
          </div>
          <Badge variant="default" className="text-xs py-1 px-3">
            Current Plan: {currentPlan.toUpperCase()}
          </Badge>
        </div>

        {/* Current Usage Metrics */}
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-600" />
              <span>Current Workspace Usage</span>
            </CardTitle>
            <CardDescription>Server-enforced quota limits for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Facebook Pages</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  2 / {PLAN_LIMITS[currentPlan].maxPages}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Contacts CRM</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  3 / {PLAN_LIMITS[currentPlan].maxContacts}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Monthly Campaigns</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  2 / {PLAN_LIMITS[currentPlan].maxCampaignsPerMonth}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Broadcast Messages</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  138 / {PLAN_LIMITS[currentPlan].maxMessagesPerMonth}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const limits = PLAN_LIMITS[plan.id];
            const isCurrent = currentPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between transition-all ${
                  plan.popular ? "border-indigo-600 shadow-md ring-2 ring-indigo-600/20" : "border-slate-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white shadow-sm">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                    <span className="text-xs text-slate-500">/month</span>
                  </div>
                  <CardDescription className="text-xs mt-2">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{limits.maxPages} Facebook Pages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{limits.maxTeamMembers} Team Members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{limits.maxContacts.toLocaleString()} Contacts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{limits.maxMessagesPerMonth.toLocaleString()} Messages/mo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Unified Inbox & Webhooks</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      variant={isCurrent ? "outline" : plan.popular ? "primary" : "secondary"}
                      className="w-full text-xs"
                      onClick={() => setCurrentPlan(plan.id)}
                    >
                      {isCurrent ? "Current Plan" : "Upgrade Plan"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
