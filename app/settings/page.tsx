"use client";

import * as React from "react";
import { Settings, Shield, Key, Webhook, Copy, Check, Lock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [copied, setCopied] = React.useState(false);
  const webhookUrl = "http://localhost:3000/api/webhooks/facebook";
  const verifyToken = "heropage_webhook_verify_token_123";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="pb-4 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Organization & Meta Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure your official Meta App credentials, webhooks, and security keys.
          </p>
        </div>

        {/* Webhook Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4 text-indigo-600" />
              <span>Official Meta Messenger Webhook Setup</span>
            </CardTitle>
            <CardDescription>
              Configure this Callback URL and Verify Token inside your Meta App Developer Dashboard under Messenger &gt; Webhooks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Webhook Callback URL</label>
              <div className="flex items-center gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs bg-slate-50 text-slate-700" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(webhookUrl)}
                  className="shrink-0 h-9 px-3"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Verify Token</label>
              <div className="flex items-center gap-2">
                <Input readOnly value={verifyToken} className="font-mono text-xs bg-slate-50 text-slate-700" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(verifyToken)}
                  className="shrink-0 h-9 px-3"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>HMAC-SHA256 Signature Verification: Active</span>
              </p>
              <p className="text-emerald-700">
                Every webhook event signature (X-Hub-Signature-256) is checked against your Meta App Secret before processing.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Meta App Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-slate-600" />
              <span>Meta Graph API Credentials</span>
            </CardTitle>
            <CardDescription>
              Official Meta App ID and Secret required for token exchange and OAuth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Meta App ID" defaultValue="1092837465019" />
            <Input label="Meta App Secret" type="password" defaultValue="••••••••••••••••••••••••" />
            <div className="pt-2">
              <Button size="sm">Save Meta Credentials</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security & Token Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-600" />
              <span>Token Encryption at Rest</span>
            </CardTitle>
            <CardDescription>
              AES-256-GCM symmetric encryption for all Page Access Tokens.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-800 block">ENCRYPTION_KEY Status</span>
                <span className="text-slate-500">256-bit cryptographic key loaded from environment</span>
              </div>
              <Badge variant="success">Secured</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
