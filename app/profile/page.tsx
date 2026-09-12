"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Shield, Building2, LogOut, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [organizations, setOrganizations] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.success) {
          setUser(data.data.user);
          setName(data.data.user.name);
          setOrganizations(data.data.organizations || []);
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsUpdating(true);

    try {
      const payload: any = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update profile");
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setUser((prev: any) => ({ ...prev, name }));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Authenticating session..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation bar */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>

        {/* Profile Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User overview */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-2xl font-bold shadow-inner">
                {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
              </div>
              <CardTitle className="mt-3 text-lg">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Account ID:</span>
                  <span className="font-mono text-slate-700">{user.id.slice(0, 12)}...</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Member Since:</span>
                  <span className="text-slate-700">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Multi-Tenant Organizations */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Organizations</span>
                </h4>
                <div className="space-y-2">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <span className="font-medium text-slate-800">{org.name}</span>
                      <Badge variant="default">{org.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit settings */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                <span>Account Settings</span>
              </CardTitle>
              <CardDescription>
                Manage your user details and credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {message && (
                <div
                  className={`mb-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Input
                  label="Email Address"
                  type="email"
                  disabled
                  value={user.email}
                  className="bg-slate-50 text-slate-500"
                />

                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <span>Change Password</span>
                  </h4>

                  <Input
                    label="Current Password"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />

                  <Input
                    label="New Password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" isLoading={isUpdating}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
