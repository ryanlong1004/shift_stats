"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
