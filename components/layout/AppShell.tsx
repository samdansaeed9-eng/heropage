"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  Users,
  FileText,
  Flag,
  BarChart2,
  Users2,
  CreditCard,
  Settings,
  ShieldAlert,
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
  Building2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  adminOnly?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inbox", href: "/inbox", icon: MessageSquare, badge: 3 },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "Pages", href: "/pages", icon: Flag },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Team", href: "/team", icon: Users2 },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Admin Console", href: "/admin", icon: ShieldAlert, adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [organizations, setOrganizations] = React.useState<any[]>([]);
  const [activeOrg, setActiveOrg] = React.useState<any>(null);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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
          setOrganizations(data.data.organizations || []);
          if (data.data.organizations?.length > 0) {
            setActiveOrg(data.data.organizations[0]);
          }
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-900/40">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">HeroPage</span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-indigo-400">
                Messenger SaaS
              </span>
            </div>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Organization Switcher Dropdown */}
        <div className="px-3 py-3 border-b border-slate-800 relative">
          <button
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {activeOrg ? activeOrg.name : "Select Workspace"}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {activeOrg ? `${activeOrg.plan} plan` : "Loading..."}
                </p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          </button>

          {isOrgDropdownOpen && (
            <div className="absolute left-3 right-3 top-16 z-50 rounded-xl bg-slate-800 border border-slate-700 shadow-xl p-1 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                Organizations
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setActiveOrg(org);
                    setIsOrgDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-700/70 text-slate-200 transition-colors text-left"
                >
                  <span className="truncate">{org.name}</span>
                  {activeOrg?.id === org.id && (
                    <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </div>
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-bold rounded-full",
                      isActive
                        ? "bg-white text-indigo-700"
                        : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Admin Navigation */}
          <div className="pt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administration
          </div>
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-amber-600 text-white"
                    : "text-amber-400 hover:bg-slate-800 hover:text-amber-300"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Admin
                </span>
              </Link>
            );
          })}
        </div>

        {/* User Footer Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
            <Link href="/profile" className="flex items-center gap-2.5 overflow-hidden group">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/30 text-indigo-300 font-bold text-xs border border-indigo-500/40">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "US"}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                  {user ? user.name : "Loading..."}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user ? user.email : "agent@heropage.com"}
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{activeOrg?.name || "Workspace"}</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold capitalize">
                {pathname.replace("/", "") || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="success" className="hidden sm:inline-flex">
              Meta Webhook Live
            </Badge>
            <Link href="/inbox">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Open Inbox</span>
              </button>
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
