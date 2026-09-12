import Link from "next/link";
import { MessageSquare, ShieldCheck, Zap, Layers, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">HeroPage</span>
            <Badge variant="default" className="ml-2">Phase 1 Foundation</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/health">
              <Button variant="ghost" size="sm">System Health</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            Official Meta Graph API Integration
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Unified Messenger Inbox for <span className="text-indigo-600">Multi-Page</span> Businesses
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">
            Connect unlimited Facebook Pages, streamline customer conversations into a unified inbox, segment leads, and orchestrate compliant message campaigns from a single multi-tenant workspace.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Start Free Trial</Button>
            </Link>
            <Link href="/health">
              <Button variant="outline" size="lg">Verify Health Status</Button>
            </Link>
          </div>
        </section>

        {/* Core Architecture Highlights */}
        <section className="py-12 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center mb-8">
              Enterprise-Grade Foundation Built From Day 1
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-2">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <CardTitle>Strict Multi-Tenancy</CardTitle>
                  <CardDescription>
                    Complete tenant isolation across organizations, memberships, and role-based permissions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  Data boundaries enforced server-side. Zero leakage across Pages, contacts, or messages.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-2">
                    <Zap className="h-5 w-5" />
                  </div>
                  <CardTitle>Official Meta APIs Only</CardTitle>
                  <CardDescription>
                    Strict adherence to Meta Graph API v19+ guidelines, webhooks, and rate-limiting limits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  Tokens encrypted at rest via AES-256-GCM. No scraping or unofficial automations.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-2">
                    <Layers className="h-5 w-5" />
                  </div>
                  <CardTitle>Asynchronous Queueing</CardTitle>
                  <CardDescription>
                    Controlled rate-limited worker dispatch for message broadcasts and webhook idempotency.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  State transitions from queued to sent, delivered, and read with automatic backoff.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        HeroPage &bull; Multi-Page Messenger SaaS &bull; Phase 1 Foundation Verified
      </footer>
    </div>
  );
}
