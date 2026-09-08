"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export function DashboardSignOutButton({ className }: { className?: string }) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const { t, setLanguage } = useLanguage();

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setLanguage("en");
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={handleSignOut}
      className={cn(
        "inline-flex h-12 w-full items-center justify-start gap-3 border-0 bg-transparent px-4 text-sm font-semibold text-red-600 shadow-none transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      <LogOut className="h-4 w-4 text-red-600" />
      {isSigningOut ? t("dashboard.auth.signingOut") : t("dashboard.auth.signOut")}
    </button>
  );
}
