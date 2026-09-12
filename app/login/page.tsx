"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, ArrowRight, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("from") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Sign in failed");
      }

      router.push(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const handleDemoLogin = () => {
    setEmail("founder@heropage.com");
    setPassword("SuperPassword123!");
    performLogin("founder@heropage.com", "SuperPassword123!");
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
        <h2 className="text-2xl font-extrabold text-slate-900">Sign in to your account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Don&apos;t have an account yet?{" "}
          <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            Create one for free
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="shadow-lg border-slate-200/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your multi-page workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 1-Click Demo Login Box */}
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Instant Demo Access</span>
                </span>
                <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-semibold">
                  Pre-configured
                </span>
              </div>
              <p className="text-[11px] text-indigo-800">
                Log in instantly with seeded multi-page Messenger inbox, campaigns, and contacts.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleDemoLogin}
                isLoading={isLoading}
                className="w-full text-xs"
              >
                1-Click Demo Sign In
              </Button>
            </div>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2 text-[11px] text-slate-400 uppercase font-bold">Or</span>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="founder@heropage.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="pt-2">
                <Button type="submit" className="w-full flex items-center justify-center gap-2" isLoading={isLoading}>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1.5 pt-2 text-xs text-slate-400 justify-center">
                <Lock className="h-3.5 w-3.5" />
                <span>Protected by encrypted session authentication</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<LoadingState message="Loading login..." />}>
      <LoginForm />
    </React.Suspense>
  );
}
