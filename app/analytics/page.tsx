"use client";

import * as React from "react";
import { BarChart2, TrendingUp, Users, MessageSquare, Clock, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = React.useState<"today" | "7d" | "30d" | "90d">("7d");

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header with time range selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Performance Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Aggregated delivery metrics, inbound conversation volume, and agent responsiveness.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            {(["today", "7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-semibold uppercase rounded-lg transition-colors ${
                  timeRange === range
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Messages</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">1,428</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-emerald-600 font-medium flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+18.4% vs last period</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Avg Response Time</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">2m 45s</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-emerald-600 font-medium flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>32% faster resolution</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Delivery Success</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">98.6%</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              0.4% Meta policy rate limits
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">New Leads Captured</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">84</div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-indigo-600 font-medium flex items-center gap-1">
              <span>Automated PSID sync</span>
            </CardContent>
          </Card>
        </div>

        {/* Visual Charts Simulation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inbound vs Outbound Messages</CardTitle>
              <CardDescription>Daily volume breakdown across all connected Facebook Pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-2 pt-8 px-2 border-b border-slate-100">
                {[45, 62, 80, 54, 92, 110, 85].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div
                      className="w-full bg-indigo-600 rounded-t-md transition-all hover:bg-indigo-700"
                      style={{ height: `${val}%` }}
                    />
                    <span className="text-[10px] text-slate-400 font-medium">Day {idx + 1}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Activity & Resolution Rate</CardTitle>
              <CardDescription>Messages processed per active support operator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">Demo Founder (You)</span>
                  <span className="text-slate-500">340 responses (99% on-time)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full w-[85%]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">Clara Davis (Support Agent)</span>
                  <span className="text-slate-500">280 responses (97% on-time)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full w-[70%]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
