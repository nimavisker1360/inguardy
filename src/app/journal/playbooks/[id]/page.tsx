import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { fetchJournalApi, JournalApiError } from "@/app/journal/_lib/journal-api";
import { DashboardText } from "@/components/dashboard/DashboardText";
import { PlaybookStatusToggle } from "@/components/journal/PlaybookStatusToggle";
import { StrategyPerformanceSummary } from "@/components/journal/StrategyPerformanceSummary";
import { cn } from "@/lib/utils";
import type {
  PlaybookStrategyDto,
  StrategyGroupStats,
  StrategyTradeSummary,
} from "@/types/playbooks";

export const dynamic = "force-dynamic";

type PlaybookDetailPageProps = {
  params: Promise<{ id: string }>;
};

type PlaybookResponse = {
  success: boolean;
  playbook?: PlaybookStrategyDto;
};

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function valueTone(value: number | null | undefined) {
  const number = Number(value || 0);
  return cn(number > 0 && "text-emerald-300", number < 0 && "text-red-300");
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "blue";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : tone === "blue"
          ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
          : "border-slate-700 bg-slate-900 text-slate-300";

  return (
    <span className={cn("inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold", toneClass)}>
      {children}
    </span>
  );
}

function GroupStatCard({ label, stats }: { label: React.ReactNode; stats: StrategyGroupStats }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs uppercase text-slate-500"><DashboardText k="journal.analytics.trades" /></div>
          <div className="mt-1 font-semibold text-slate-200">{formatNumber(stats.totalTrades, 0)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500"><DashboardText k="journal.analytics.winRate" /></div>
          <div className="mt-1 font-semibold text-slate-200">{formatNumber(stats.winRate, 1)}%</div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500"><DashboardText k="journal.analytics.netPnl" /></div>
          <div className={cn("mt-1 font-semibold", valueTone(stats.netPnl))}>{formatMoney(stats.netPnl)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500"><DashboardText k="journal.analytics.average" /></div>
          <div className={cn("mt-1 font-semibold", valueTone(stats.averagePnl))}>{formatMoney(stats.averagePnl)}</div>
        </div>
      </div>
    </div>
  );
}

function TradeMiniTable({
  title,
  trades,
}: {
  title: React.ReactNode;
  trades: StrategyTradeSummary[];
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[460px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3"><DashboardText k="dashboard.table.symbol" /></th>
              <th className="py-2 pr-3"><DashboardText k="journal.analytics.netPnl" /></th>
              <th className="py-2 pr-3"><DashboardText k="dashboard.table.rr" /></th>
              <th className="py-2"><DashboardText k="dashboard.table.openTime" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {trades.map((trade) => (
              <tr key={trade.id} className="text-slate-300">
                <td className="py-3 pr-3 font-semibold text-white">
                  <Link href={`/journal/${trade.id}`} className="hover:text-blue-200">
                    {trade.symbol}
                  </Link>
                </td>
                <td className={cn("py-3 pr-3 font-semibold", valueTone(trade.pnl))}>
                  {formatMoney(trade.pnl)}
                </td>
                <td className="py-3 pr-3">{formatNumber(trade.rr, 2)}</td>
                <td className="py-3">{trade.openedAt ? new Date(trade.openedAt).toLocaleString("en-GB") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {trades.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 bg-[#111827] px-4 py-8 text-center text-sm text-slate-400">
            <DashboardText k="journal.playbooks.noTradesYet" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default async function PlaybookDetailPage({ params }: PlaybookDetailPageProps) {
  const { id } = await params;
  const response = await fetchJournalApi<PlaybookResponse>(
    `/api/journal/playbooks/${id}`
  ).catch((error: unknown) => {
    if (error instanceof JournalApiError && error.status === 404) {
      notFound();
    }

    throw error;
  });
  const playbook = response.playbook;

  if (!playbook) {
    notFound();
  }

  const analytics = playbook.analytics;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Link
          href="/journal/playbooks"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <DashboardText k="journal.playbooks.back" />
        </Link>
        <div className="flex flex-wrap gap-2">
          <PlaybookStatusToggle playbookId={playbook.id} isActive={playbook.isActive} />
          <Link
            href={`/journal/playbooks/${playbook.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <Pencil className="h-4 w-4" />
            <DashboardText k="journal.playbooks.editTitle" />
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-slate-800 bg-[#0F172A] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">{playbook.name}</h1>
              <Badge tone={playbook.isActive ? "green" : "amber"}>
                {playbook.isActive ? <DashboardText k="journal.common.active" /> : <DashboardText k="journal.common.inactive" />}
              </Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              {playbook.description || <DashboardText k="journal.common.noDescription" />}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{playbook.marketType || <DashboardText k="journal.playbooks.customMarket" />}</Badge>
            <Badge>{playbook.symbols || <DashboardText k="journal.playbooks.allSymbols" />}</Badge>
            <Badge>{playbook.timeframes || <DashboardText k="journal.playbooks.allTimeframes" />}</Badge>
            <Badge tone="blue"><DashboardText k="journal.playbooks.checklistItemsCount" values={{ count: String(playbook.checklistItems.length) }} /></Badge>
          </div>
        </div>
      </section>

      <StrategyPerformanceSummary analytics={analytics} />

      {analytics ? (
        <section className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-white"><DashboardText k="journal.playbooks.planFollowedComparison" /></h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <GroupStatCard label={<DashboardText k="journal.playbooks.followedPlan" />} stats={analytics.followedPlanStats} />
            <GroupStatCard label={<DashboardText k="journal.playbooks.partiallyFollowed" />} stats={analytics.partialFollowedPlanStats} />
            <GroupStatCard label={<DashboardText k="journal.playbooks.didNotFollow" />} stats={analytics.notFollowedPlanStats} />
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-slate-800 bg-[#0F172A] p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-white"><DashboardText k="journal.playbooks.tradingPlan" /></h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { id: "entry", labelKey: "journal.playbooks.entryRules", value: playbook.entryRules },
              { id: "exit", labelKey: "journal.playbooks.exitRules", value: playbook.exitRules },
              { id: "risk", labelKey: "journal.playbooks.riskRules", value: playbook.riskRules },
            ].map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                <h3 className="text-sm font-semibold text-white"><DashboardText k={item.labelKey} /></h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-400">{item.value || "-"}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-[#0F172A] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-white"><DashboardText k="journal.playbooks.checklistItems" /></h2>
          <div className="mt-4 space-y-3">
            {playbook.checklistItems.map((item) => (
              <div key={item.id || item.title} className="rounded-lg border border-slate-800 bg-[#111827] p-3">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                {item.description ? <div className="mt-1 text-xs text-slate-400">{item.description}</div> : null}
              </div>
            ))}
            {playbook.checklistItems.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-[#111827] p-4 text-sm text-slate-400">
                <DashboardText k="journal.playbooks.noChecklistItemsYet" />
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {analytics ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <TradeMiniTable title={<DashboardText k="journal.playbooks.exampleWinningTrades" />} trades={analytics.exampleWinningTrades} />
          <TradeMiniTable title={<DashboardText k="journal.playbooks.exampleLosingTrades" />} trades={analytics.exampleLosingTrades} />
          <TradeMiniTable title={<DashboardText k="journal.playbooks.recentTrades" />} trades={analytics.recentTrades} />
        </div>
      ) : null}
    </div>
  );
}
