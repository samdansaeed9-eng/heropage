"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [organizationName, setOrganizationName] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, organizationName }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Registration failed");
      }

      router.push("/profile");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
            <MessageSquare className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold text-slate-900">HeroPage</span>
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-900">Create your SaaS account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="shadow-lg border-slate-200/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Get started with multi-page messaging</CardTitle>
            <CardDescription>
              Start managing Facebook Messenger conversations across all your pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="Sarah Connor"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label="Business Email"
                type="email"
                placeholder="sarah@agency.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Organization / Agency Name (Optional)"
                type="text"
                placeholder="Acme Digital Agency"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />

              <Input
                label="Password (min 8 characters)"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="pt-2">
                <Button type="submit" className="w-full flex items-center justify-center gap-2" isLoading={isLoading}>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 pt-2 text-xs text-slate-500 justify-center">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Encrypted credentials &bull; Multi-tenant isolated workspace</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
