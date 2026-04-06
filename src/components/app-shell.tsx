"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Settings,
  TableProperties,
  Target,
} from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    mobileLabel: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/shifts",
    label: "Shifts",
    mobileLabel: "Shifts",
    icon: TableProperties,
  },
  {
    href: "/shifts/new",
    label: "Add Shift",
    mobileLabel: "New",
    icon: PlusCircle,
  },
  {
    href: "/analytics",
    label: "Analytics",
    mobileLabel: "Analytics",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/calendar",
    label: "Calendar",
    mobileLabel: "Calendar",
    icon: CalendarDays,
  },
  {
    href: "/schedule",
    label: "Schedule",
    mobileLabel: "Schedule",
    icon: CalendarRange,
  },
  { href: "/goals", label: "Goals", mobileLabel: "Goals", icon: Target },
  {
    href: "/contact",
    label: "Contact",
    mobileLabel: "Contact",
    icon: MessageSquare,
  },
  {
    href: "/settings",
    label: "Settings",
    mobileLabel: "Settings",
    icon: Settings,
  },
];

export function AppShell({
  children,
  currentUserEmail,
}: {
  children: React.ReactNode;
  currentUserEmail?: string | null;
}) {
  const pathname = usePathname();

  const activeHref = navItems
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7f0e7_0%,_#eff4f8_100%)] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-slate-900/10 bg-white/70 px-6 py-8 backdrop-blur lg:block">
          <Link href="/dashboard" className="block">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-slate-950 px-5 py-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                Shiftstats
              </p>
              <h1 className="mt-2 text-2xl font-semibold">
                Earnings at a glance
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                View shifts, track trends, and keep compensation records in one
                place.
              </p>
            </div>
          </Link>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]"
                      : "text-slate-700 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-900/10 bg-white/75 px-5 py-3 backdrop-blur lg:px-8 lg:py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Shiftstats
                </p>
                <p className="mt-1 hidden text-sm text-slate-600 lg:block">
                  Signed in as {currentUserEmail ?? "unknown user"}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/shifts/new"
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:px-4"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Shift</span>
                </Link>
                <SignOutButton />
              </div>
            </div>
          </header>

          <div className="flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</div>

          <footer className="hidden border-t border-slate-900/10 px-8 py-4 text-xs text-slate-400 lg:block">
            &copy; {new Date().getFullYear()} Ryan Long &mdash; ShiftStats.{" "}
            <span>For personal, noncommercial use only.</span>
          </footer>

          <nav className="sticky bottom-0 z-20 flex border-t border-slate-900/10 bg-white/90 px-1 py-1 backdrop-blur lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium ${
                    isActive ? "bg-slate-950 text-white" : "text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.mobileLabel}
                </Link>
              );
            })}
          </nav>
          <p className="border-t border-slate-900/10 px-4 py-2 text-center text-[10px] text-slate-400 lg:hidden">
            &copy; {new Date().getFullYear()} Ryan Long &mdash; Personal use
            only
          </p>
        </div>
      </div>
    </div>
  );
}
