import { Suspense } from "react";
import { DailyJournalClient } from "@/app/dashboard/daily-journal/daily-journal-client";

export const dynamic = "force-dynamic";

export default function DailyJournalPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 text-sm text-slate-300">
          Loading daily journal...
        </div>
      }
    >
      <DailyJournalClient />
    </Suspense>
  );
}
