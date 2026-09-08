import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { DashboardText } from "@/components/dashboard/DashboardText";
import { SettingsProfileForm } from "@/components/dashboard/SettingsProfileForm";
import { getSession } from "@/lib/server-auth";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">
          <DashboardText k="dashboard.settings.title" />
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          <DashboardText k="dashboard.settings.subtitle" />
        </p>
      </div>

      <SettingsProfileForm
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
              <DashboardText k="dashboard.settings.lockedAccountField" />
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              <DashboardText k="dashboard.settings.lockedAccountHint" />
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
