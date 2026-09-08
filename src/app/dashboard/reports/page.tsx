import { redirect } from "next/navigation";
import { ReportsContent, ReportsIntentSelection, ReportsSetupContent } from "@/app/dashboard/reports/reports-content";
import {
  buildJournalReport,
  getJournalReportFilterOptions,
  normalizeJournalReportFilters,
  type JournalReport,
  ReportValidationError,
} from "@/lib/reports/journal-report";
import { getCurrentUserId } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ReportType =
  | "monthly-performance"
  | "mistake-psychology"
  | "playbook-performance"
  | "prop-firm-summary"
  | "raw-trade-export"
  | "custom";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function appendParam(params: URLSearchParams, name: string, value: string | undefined) {
  if (value && value.trim()) {
    params.set(name, value.trim());
  }
}

function reportQuery(filters: JournalReport["filters"], format?: string, reportType?: string) {
  const params = new URLSearchParams();
  appendParam(params, "reportType", reportType);
  params.set("dateRange", filters.dateRange);
  appendParam(params, "dateFrom", filters.dateFrom);
  appendParam(params, "dateTo", filters.dateTo);
  appendParam(params, "accountId", filters.accountId);
  appendParam(params, "symbol", filters.symbol);
  appendParam(params, "direction", filters.direction);
  appendParam(params, "playbookId", filters.playbookId);
  appendParam(params, "strategy", filters.strategy);
  appendParam(params, "session", filters.session);
  appendParam(params, "result", filters.result);
  appendParam(params, "aiReview", filters.aiReview);
  appendParam(params, "humanReview", filters.humanReview);
  appendParam(params, "screenshots", filters.screenshots);
  appendParam(params, "source", filters.source);
  appendParam(params, "minAiScore", filters.minAiScore);
  appendParam(params, "maxAiScore", filters.maxAiScore);

  if (format) {
    params.set("format", format);
  }

  return params.toString();
}

function normalizeReportType(value: string | undefined): ReportType | "" {
  const allowed: ReportType[] = [
    "monthly-performance",
    "mistake-psychology",
    "playbook-performance",
    "prop-firm-summary",
    "raw-trade-export",
    "custom",
  ];

  return allowed.includes(value as ReportType) ? (value as ReportType) : "";
}

function paramsWithReportDefaults(
  params: Record<string, string | string[] | undefined>,
  reportType: ReportType
) {
  const next = { ...params };

  if (!first(next.dateRange)) {
    next.dateRange = reportType === "raw-trade-export" ? "all" : "thisMonth";
  }

  next.reportType = reportType;
  return next;
}

function hasAppliedFilters(params: Record<string, string | string[] | undefined>) {
  return first(params.applied) === "1";
}

async function loadReport(params: Record<string, string | string[] | undefined>) {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  return buildJournalReport(userId, params);
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = (await searchParams) || {};
  const reportType = normalizeReportType(first(params.reportType));

  if (!reportType) {
    const userId = await getCurrentUserId();

    if (!userId) {
      redirect("/login");
    }

    return <ReportsIntentSelection />;
  }

  if (!hasAppliedFilters(params)) {
    const userId = await getCurrentUserId();

    if (!userId) {
      redirect("/login");
    }

    const { filters } = normalizeJournalReportFilters(paramsWithReportDefaults(params, reportType));
    const filterOptions = await getJournalReportFilterOptions(userId);

    return (
      <ReportsSetupContent
        selectedReportType={reportType}
        filters={filters}
        filterOptions={filterOptions}
      />
    );
  }

  let report: JournalReport;

  try {
    report = await loadReport(paramsWithReportDefaults(params, reportType));
  } catch (error) {
    if (error instanceof ReportValidationError) {
      return (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <h1 className="font-semibold">Report filters are invalid</h1>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {error.errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      );
    }

    throw error;
  }

  return (
    <ReportsContent
      report={report}
      selectedReportType={reportType}
      csvHref={`/api/reports/journal?${reportQuery(report.filters, "csv", reportType)}`}
      rawSymbol={first(params.symbol) || ""}
    />
  );
}
