"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit,
  ListChecks,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Wifi,
  WifiOff,
  LockKeyhole,
  UnlockKeyhole,
} from "lucide-react";
import {
  formatDate,
  formatMoney,
  formatNumber,
  toNumber,
  type ApiResult,
  type PropFirmChallengeDto,
  type TradingAccountDto,
} from "@/components/dashboard/types";
import { useLanguage } from "@/lib/language-context";
import { PROP_FIRM_RULE_PROFILES, PROP_FIRM_TIME_ZONES } from "@/lib/prop-firm-rule-sync";
import { cn } from "@/lib/utils";

type PropFirmsData = {
  accounts: TradingAccountDto[];
  challenges: PropFirmChallengeDto[];
};

type ChallengePayload = {
  name: string;
  accountId: string;
  ruleProfile: string;
  dailyResetTimeZone: string;
  warningThreshold: number;
  startingBalance: string;
  profitTarget: string;
  maxDailyLoss: string;
  maxTotalLoss: string;
  startedAt: string;
  endedAt: string | null;
};

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function todayInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function accountLabel(account: TradingAccountDto | null | undefined) {
  if (!account) {
    return null;
  }

  return account.mt5AccountNumber || account.name;
}

function amountFromPercent(percentValue: string, startingBalanceValue: string) {
  const percent = Number(percentValue);
  const startingBalance = Number(startingBalanceValue);

  if (!Number.isFinite(percent) || !Number.isFinite(startingBalance) || startingBalance <= 0) {
    return "";
  }

  return ((startingBalance * percent) / 100).toFixed(2);
}

function percentOfBalance(
  value: string | number | null | undefined,
  startingBalance: string | number | null | undefined
) {
  const amount = toNumber(value);
  const balance = toNumber(startingBalance);

  if (amount === null || balance === null || balance <= 0) {
    return null;
  }

  return (amount / balance) * 100;
}

function percentInputValue(
  value: string | number | null | undefined,
  startingBalance: string | number | null | undefined
) {
  const percent = percentOfBalance(value, startingBalance);

  if (percent === null) {
    return "";
  }

  return String(Number(percent.toFixed(2)));
}

function formatPercentValue(value: number | null) {
  return value === null ? "-" : `${formatNumber(value, 2)}%`;
}

function formatMoneyWithPercent(
  value: string | number | null | undefined,
  startingBalance: string | number | null | undefined,
  currency: string
) {
  const money = formatMoney(value, currency);
  const percent = percentOfBalance(value, startingBalance);

  return percent === null ? money : `${money} (${formatPercentValue(percent)})`;
}

function statusClasses(status: PropFirmChallengeDto["computedStatus"]) {
  if (status === "Passed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (status.startsWith("Failed")) {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-blue-500/30 bg-blue-500/10 text-blue-200";
}

function challengeTradesHref(challenge: PropFirmChallengeDto) {
  return `/dashboard/prop-firms/${challenge.id}`;
}

function formatSyncTime(value: string | null, language: "en" | "fa") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ChallengeForm({
  accounts,
  challenge,
  defaultAccountId,
  onSubmit,
  onCancel,
}: {
  accounts: TradingAccountDto[];
  challenge?: PropFirmChallengeDto | null;
  defaultAccountId?: string;
  onSubmit: (payload: ChallengePayload) => Promise<void>;
  onCancel: () => void;
}) {
  const { language, t } = useLanguage();
  const initialAccountId = challenge?.accountId || defaultAccountId || accounts[0]?.id || "";
  const initialAccount = accounts.find((account) => account.id === initialAccountId) || null;
  const [accountId, setAccountId] = useState(initialAccountId);
  const [ruleProfile, setRuleProfile] = useState(challenge?.ruleProfile || "CUSTOM");
  const [startingBalance, setStartingBalance] = useState(
    challenge?.startingBalance
      ? String(challenge.startingBalance)
      : initialAccount?.balance
        ? String(initialAccount.balance)
        : ""
  );
  const [profitTargetPercent, setProfitTargetPercent] = useState(
    percentInputValue(challenge?.profitTarget, challenge?.startingBalance)
  );
  const [maxDailyLossPercent, setMaxDailyLossPercent] = useState(
    percentInputValue(challenge?.maxDailyLoss, challenge?.startingBalance)
  );
  const [maxTotalLossPercent, setMaxTotalLossPercent] = useState(
    percentInputValue(challenge?.maxTotalLoss, challenge?.startingBalance)
  );
  const [dailyResetTimeZone, setDailyResetTimeZone] = useState(
    challenge?.dailyResetTimeZone || "UTC"
  );
  const [warningThreshold, setWarningThreshold] = useState(
    String(challenge?.warningThreshold ?? 80)
  );

  function selectAccount(nextAccountId: string) {
    setAccountId(nextAccountId);
    if (!challenge) {
      const account = accounts.find((item) => item.id === nextAccountId);
      if (account?.balance !== null && account?.balance !== undefined) {
        setStartingBalance(String(account.balance));
      }
    }
  }

  function selectRuleProfile(nextProfileId: string) {
    setRuleProfile(nextProfileId);
    const profile = PROP_FIRM_RULE_PROFILES.find((item) => item.id === nextProfileId);
    if (!profile || profile.id === "CUSTOM") return;
    setProfitTargetPercent(String(profile.profitTargetPercent));
    setMaxDailyLossPercent(String(profile.maxDailyLossPercent));
    setMaxTotalLossPercent(String(profile.maxTotalLossPercent));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await onSubmit({
      name: String(formData.get("name") || ""),
      accountId,
      ruleProfile,
      dailyResetTimeZone,
      warningThreshold: Number(warningThreshold),
      startingBalance,
      profitTarget: amountFromPercent(
        profitTargetPercent,
        startingBalance
      ),
      maxDailyLoss: amountFromPercent(
        maxDailyLossPercent,
        startingBalance
      ),
      maxTotalLoss: amountFromPercent(
        maxTotalLossPercent,
        startingBalance
      ),
      startedAt: String(formData.get("startedAt") || ""),
      endedAt: String(formData.get("endedAt") || "").trim() || null,
    });
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600";
  const labelClass = "space-y-1 text-xs font-medium uppercase text-slate-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className={labelClass}>
          {t("dashboard.propFirms.challengeName")}
          <input
            name="name"
            required
            defaultValue={challenge?.name || ""}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.account")}
          <select
            name="accountId"
            required
            value={accountId}
            onChange={(event) => selectAccount(event.target.value)}
            className={inputClass}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {accountLabel(account) || t("dashboard.propFirms.unknownAccount")}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.ruleProfile")}
          <select
            name="ruleProfile"
            value={ruleProfile}
            onChange={(event) => selectRuleProfile(event.target.value)}
            className={inputClass}
          >
            {PROP_FIRM_RULE_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {language === "fa" ? profile.labelFa : profile.labelEn}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.startingBalance")}
          <input
            name="startingBalance"
            type="number"
            step="0.01"
            required
            value={startingBalance}
            onChange={(event) => setStartingBalance(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.profitTarget")} (%)
          <input
            name="profitTargetPercent"
            type="number"
            step="0.01"
            min="0"
            required
            value={profitTargetPercent}
            onChange={(event) => setProfitTargetPercent(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.maxDailyLoss")} (%)
          <input
            name="maxDailyLossPercent"
            type="number"
            step="0.01"
            min="0"
            required
            value={maxDailyLossPercent}
            onChange={(event) => setMaxDailyLossPercent(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.maxTotalLoss")} (%)
          <input
            name="maxTotalLossPercent"
            type="number"
            step="0.01"
            min="0"
            required
            value={maxTotalLossPercent}
            onChange={(event) => setMaxTotalLossPercent(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.startDate")}
          <input
            name="startedAt"
            type="date"
            required
            defaultValue={toDateInputValue(challenge?.startedAt) || todayInputValue()}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.endDate")}
          <input
            name="endedAt"
            type="date"
            defaultValue={toDateInputValue(challenge?.endedAt)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.dailyResetTimeZone")}
          <select
            name="dailyResetTimeZone"
            value={dailyResetTimeZone}
            onChange={(event) => setDailyResetTimeZone(event.target.value)}
            className={inputClass}
          >
            {PROP_FIRM_TIME_ZONES.map((timeZone) => (
              <option key={timeZone} value={timeZone}>
                {timeZone}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {t("dashboard.propFirms.warningThreshold")}
          <input
            name="warningThreshold"
            type="number"
            min="50"
            max="100"
            step="1"
            required
            value={warningThreshold}
            onChange={(event) => setWarningThreshold(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <p className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs leading-5 text-blue-100">
        {t("dashboard.propFirms.profileHint")}
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-xl border border-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800"
        >
          {t("dashboard.actions.cancel")}
        </button>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
        >
          {t("dashboard.propFirms.save")}
        </button>
      </div>
    </form>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-3">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className={cn("mt-1 font-semibold text-white", className)}>{value}</div>
    </div>
  );
}

function RuleRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "danger";
}) {
  const Icon = tone === "good" ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm",
        tone === "good" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
        tone === "warn" && "border-amber-500/30 bg-amber-500/10 text-amber-100",
        tone === "danger" && "border-red-500/30 bg-red-500/10 text-red-100"
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-semibold">{value}</span>
    </div>
  );
}

function OvertradeGuardPanel({
  challenge,
  onSave,
}: {
  challenge: PropFirmChallengeDto;
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const { t, language } = useLanguage();
  const [enabled, setEnabled] = useState(challenge.guardEnabled);
  const [maxDailyEntries, setMaxDailyEntries] = useState(String(challenge.maxDailyEntries ?? 3));
  const [maxConsecutiveLosses, setMaxConsecutiveLosses] = useState(
    String(challenge.maxConsecutiveLosses ?? 2)
  );
  const [lossCooldownMinutes, setLossCooldownMinutes] = useState(
    String(challenge.lossCooldownMinutes ?? 30)
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEnabled(challenge.guardEnabled);
    setMaxDailyEntries(String(challenge.maxDailyEntries ?? 3));
    setMaxConsecutiveLosses(String(challenge.maxConsecutiveLosses ?? 2));
    setLossCooldownMinutes(String(challenge.lossCooldownMinutes ?? 30));
  }, [
    challenge.guardEnabled,
    challenge.maxDailyEntries,
    challenge.maxConsecutiveLosses,
    challenge.lossCooldownMinutes,
  ]);

  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      await onSave(payload);
    } finally {
      setBusy(false);
    }
  }

  const statusTone = challenge.guard.status === "LOCKED"
    ? "border-red-500/30 bg-red-500/10 text-red-100"
    : challenge.guard.status === "CAUTION"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : challenge.guard.status === "OPEN"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
        : "border-slate-700 bg-slate-800/50 text-slate-300";
  const activePause = challenge.guard.manualPauseUntil !== null;

  return (
    <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          {challenge.guard.entryAllowed ? (
            <UnlockKeyhole className="h-4 w-4 text-cyan-300" />
          ) : (
            <LockKeyhole className="h-4 w-4 text-red-300" />
          )}
          {t("dashboard.propFirms.guardTitle")}
        </div>
        <span className={cn("rounded-full border px-2 py-1 text-[11px] font-semibold", statusTone)}>
          {t(`dashboard.propFirms.guardStatus${challenge.guard.status}`)}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {t("dashboard.propFirms.guardScopeNote")}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
          <span className="block text-slate-400">{t("dashboard.propFirms.dailyEntries")}</span>
          <strong className="mt-1 block text-white">
            {challenge.guard.dailyEntries} / {challenge.maxDailyEntries ?? "—"}
          </strong>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
          <span className="block text-slate-400">{t("dashboard.propFirms.consecutiveLosses")}</span>
          <strong className="mt-1 block text-white">
            {challenge.guard.consecutiveLosses} / {challenge.maxConsecutiveLosses ?? "—"}
          </strong>
        </div>
        <div className="col-span-2 rounded-lg border border-slate-800 bg-slate-900/70 p-2 sm:col-span-1">
          <span className="block text-slate-400">{t("dashboard.propFirms.cooldownUntil")}</span>
          <strong className="mt-1 block text-white">
            {formatSyncTime(challenge.guard.cooldownUntil, language)}
          </strong>
        </div>
      </div>

      {challenge.guard.reasons.length ? (
        <div className="mt-3 space-y-1.5">
          {challenge.guard.reasons.map((reason) => (
            <div key={reason} className="flex items-start gap-2 text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t(`dashboard.propFirms.guardReason${reason}`)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {activePause ? (
        <p className="mt-3 text-xs text-amber-100">
          {t("dashboard.propFirms.manualPauseUntil")}: {formatSyncTime(challenge.guard.manualPauseUntil, language)}
        </p>
      ) : null}

      <details className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-cyan-100">
          {t("dashboard.propFirms.guardSettings")}
        </summary>
        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
          <label className="sm:col-span-3 flex items-center gap-2 text-slate-200">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4 accent-cyan-500"
            />
            {t("dashboard.propFirms.guardEnabled")}
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{t("dashboard.propFirms.maxDailyEntries")}</span>
            <input
              type="number"
              min="1"
              max="100"
              value={maxDailyEntries}
              onChange={(event) => setMaxDailyEntries(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-white"
            />
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{t("dashboard.propFirms.maxConsecutiveLosses")}</span>
            <input
              type="number"
              min="1"
              max="20"
              value={maxConsecutiveLosses}
              onChange={(event) => setMaxConsecutiveLosses(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-white"
            />
          </label>
          <label className="space-y-1 text-slate-400">
            <span>{t("dashboard.propFirms.lossCooldownMinutes")}</span>
            <input
              type="number"
              min="1"
              max="1440"
              value={lossCooldownMinutes}
              onChange={(event) => setLossCooldownMinutes(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-white"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save({
            guardEnabled: enabled,
            maxDailyEntries: maxDailyEntries.trim() ? Number(maxDailyEntries) : null,
            maxConsecutiveLosses: maxConsecutiveLosses.trim() ? Number(maxConsecutiveLosses) : null,
            lossCooldownMinutes: lossCooldownMinutes.trim() ? Number(lossCooldownMinutes) : null,
          })}
          className="mt-3 h-9 rounded-lg bg-cyan-600 px-3 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {t("dashboard.propFirms.saveGuard")}
        </button>
      </details>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save({
            guardEnabled: true,
            maxDailyEntries: maxDailyEntries.trim() ? Number(maxDailyEntries) : null,
            maxConsecutiveLosses: maxConsecutiveLosses.trim() ? Number(maxConsecutiveLosses) : null,
            lossCooldownMinutes: lossCooldownMinutes.trim() ? Number(lossCooldownMinutes) : null,
            manualPauseUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          })}
          className="h-9 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
        >
          {t("dashboard.propFirms.pauseOneHour")}
        </button>
        {activePause ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void save({ manualPauseUntil: null })}
            className="h-9 rounded-lg border border-slate-700 bg-slate-800/50 px-3 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
          >
            {t("dashboard.propFirms.clearManualPause")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PropFirmsManager({
  initialAccounts,
  initialChallenges,
  initialSelectedAccountId,
}: {
  initialAccounts: TradingAccountDto[];
  initialChallenges: PropFirmChallengeDto[];
  initialSelectedAccountId?: string | null;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [challenges, setChallenges] = useState(initialChallenges);
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialAccounts.some((account) => account.id === initialSelectedAccountId)
      ? initialSelectedAccountId || ""
      : initialAccounts[0]?.id || ""
  );
  const [editingChallenge, setEditingChallenge] = useState<PropFirmChallengeDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const { language, t } = useLanguage();

  useEffect(() => {
    setSelectedAccountId((current) =>
      current && accounts.some((account) => account.id === current)
        ? current
        : accounts[0]?.id || ""
    );
  }, [accounts]);

  function statusLabel(status: PropFirmChallengeDto["computedStatus"]) {
    if (status === "Passed") {
      return t("dashboard.propFirms.statusPassed");
    }

    if (status === "Failed - Daily Loss") {
      return t("dashboard.propFirms.statusFailedDailyLoss");
    }

    if (status === "Failed - Max Loss") {
      return t("dashboard.propFirms.statusFailedMaxLoss");
    }

    return t("dashboard.propFirms.statusActive");
  }

  const loadData = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setIsRefreshing(true);
    try {
      const response = await fetch("/api/prop-firms", { cache: "no-store" });
      const json = (await response.json()) as ApiResult<PropFirmsData>;

      if (!json.success || !json.data) {
        if (!options.silent) setMessage(json.message || t("dashboard.propFirms.loadFailed"));
        return;
      }

      setAccounts(json.data.accounts);
      setChallenges(json.data.challenges);
      setLastRefreshedAt(new Date());
      setSelectedAccountId((current) =>
        current && json.data?.accounts.some((account) => account.id === current)
          ? current
          : json.data?.accounts[0]?.id || ""
      );
      if (!options.silent) setMessage("");
    } catch {
      if (!options.silent) setMessage(t("dashboard.propFirms.loadFailed"));
    } finally {
      if (!options.silent) setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadData({ silent: true });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  async function syncSelectedAccount() {
    const account = accounts.find((item) => item.id === selectedAccountId);
    if (!account) return;
    setIsRefreshing(true);
    setMessage("");
    try {
      const endpoint =
        account.ingestionMode === "DIRECT_MT5"
          ? `/api/trading-accounts/${account.id}/sync`
          : account.ingestionMode === "DIRECT_CTRADER"
            ? `/api/trading-accounts/${account.id}/ctrader-sync`
            : account.ingestionMode === "DIRECT_TRADELOCKER"
              ? `/api/trading-accounts/${account.id}/tradelocker-sync`
              : null;

      if (endpoint) {
        const response = await fetch(endpoint, { method: "POST" });
        const result = (await response.json().catch(() => null)) as ApiResult<unknown> | null;
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || t("dashboard.propFirms.syncFailed"));
        }
      }
      await loadData({ silent: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("dashboard.propFirms.syncFailed"));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function saveChallenge(payload: ChallengePayload) {
    const isEditing = Boolean(editingChallenge);
    const response = await fetch(
      isEditing ? `/api/prop-firms/${editingChallenge?.id}` : "/api/prop-firms",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const json = (await response.json()) as ApiResult<unknown>;

    if (!json.success) {
      setMessage(json.message || t("dashboard.propFirms.saveFailed"));
      return;
    }

    setMessage("");
    setShowForm(false);
    setEditingChallenge(null);
    await loadData();
  }

  async function saveGuardSettings(challengeId: string, payload: Record<string, unknown>) {
    try {
      const response = await fetch(`/api/prop-firms/${challengeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ApiResult<unknown>;
      if (!response.ok || !result.success) {
        setMessage(result.message || t("dashboard.propFirms.guardSaveFailed"));
        return false;
      }
      setMessage("");
      await loadData({ silent: true });
      return true;
    } catch {
      setMessage(t("dashboard.propFirms.guardSaveFailed"));
      return false;
    }
  }

  async function deleteChallenge(challenge: PropFirmChallengeDto) {
    const response = await fetch(`/api/prop-firms/${challenge.id}`, {
      method: "DELETE",
    });
    const json = (await response.json()) as ApiResult<unknown>;

    if (!json.success) {
      setMessage(json.message || t("dashboard.propFirms.deleteFailed"));
      return;
    }

    setMessage("");
    await loadData();
  }

  const canCreateChallenge = accounts.length > 0;
  const visibleChallenges = selectedAccountId
    ? challenges.filter((challenge) => challenge.accountId === selectedAccountId)
    : [];
  const activeChallenges = visibleChallenges.filter(
    (challenge) => challenge.computedStatus === "Active"
  );
  const relevantChallenges = activeChallenges.length
    ? activeChallenges
    : visibleChallenges.slice(0, 1);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || null;
  const accountFilterLabel = t("dashboard.propFirms.activeAccount");
  const selectedWarning = relevantChallenges.find((challenge) => challenge.riskLevel === "BREACHED")
    ?? relevantChallenges.find((challenge) => challenge.riskLevel === "WARNING")
    ?? null;
  const selectedGuardLock = relevantChallenges.find((challenge) => challenge.guard.status === "LOCKED")
    ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 min-[1800px]:flex-row min-[1800px]:items-end min-[1800px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-white">{t("dashboard.propFirms.title")}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {t("dashboard.propFirms.subtitle")}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <label className="block w-full min-w-0 space-y-1 text-xs font-medium uppercase text-slate-400 sm:w-[320px] min-[1800px]:w-[360px]">
            {accountFilterLabel}
            <select
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              disabled={accounts.length === 0}
              className="h-11 w-full min-w-0 rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {accounts.length === 0 ? (
                <option value="">{t("dashboard.propFirms.noAccountOption")}</option>
              ) : (
                accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountLabel(account) || t("dashboard.propFirms.unknownAccount")}
                  </option>
                ))
              )}
            </select>
          </label>
          <button
            type="button"
            disabled={!selectedAccount || isRefreshing}
            onClick={() => void syncSelectedAccount()}
            className="prop-firm-sync-button inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-300 sm:w-auto"
          >
            <RefreshCw className={cn("h-4 w-4 shrink-0", isRefreshing && "animate-spin")} />
            {t("dashboard.propFirms.syncNow")}
          </button>
          <button
            type="button"
            disabled={!canCreateChallenge}
            onClick={() => {
              setEditingChallenge(null);
              setShowForm(true);
            }}
            className="prop-firm-new-button inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 sm:w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {t("dashboard.propFirms.newChallenge")}
          </button>
        </div>
      </div>

      {!canCreateChallenge ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t("dashboard.propFirms.noAccount")}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {message}
        </div>
      ) : null}

      {selectedWarning ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
            selectedWarning.riskLevel === "BREACHED"
              ? "border-red-500/40 bg-red-500/10 text-red-100"
              : "border-amber-500/40 bg-amber-500/10 text-amber-100"
          )}
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">
              {selectedWarning.riskLevel === "BREACHED"
                ? t("dashboard.propFirms.breachAlert")
                : t("dashboard.propFirms.warningAlert")}
            </div>
            <div className="mt-1 opacity-80">{selectedWarning.name}</div>
          </div>
        </div>
      ) : null}

      {selectedGuardLock && selectedGuardLock.riskLevel !== "BREACHED" ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">{t("dashboard.propFirms.guardLockedAlert")}</div>
            <div className="mt-1 opacity-80">{selectedGuardLock.name}</div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>{t("dashboard.propFirms.autoRefresh")}</span>
        <span>
          {t("dashboard.propFirms.lastRefresh")}: {lastRefreshedAt ? formatSyncTime(lastRefreshedAt.toISOString(), language) : t("dashboard.propFirms.initialData")}
        </span>
      </div>

      {showForm && canCreateChallenge ? (
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-white">
            {editingChallenge
              ? t("dashboard.propFirms.editChallenge")
              : t("dashboard.propFirms.createChallenge")}
          </h3>
          <ChallengeForm
            key={editingChallenge?.id || "create"}
            accounts={accounts}
            challenge={editingChallenge}
            defaultAccountId={selectedAccountId}
            onSubmit={saveChallenge}
            onCancel={() => {
              setShowForm(false);
              setEditingChallenge(null);
            }}
          />
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleChallenges.map((challenge) => {
          const currency = challenge.account?.currency || "USD";
          const progress = `${formatNumber(challenge.progress, 2)}%`;
          const targetRemaining = challenge.profitTargetRemaining;
          const dailyLossRemaining = challenge.dailyLossRemaining;
          const totalLossRemaining = challenge.totalLossRemaining;
          const daysRemaining = challenge.endedAt
            ? Math.ceil(
                (new Date(challenge.endedAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
            : null;
          const dailyTone =
            challenge.computedStatus === "Failed - Daily Loss"
              ? "danger"
              : challenge.dailyLossUsedPercent >= challenge.warningThreshold
                ? "warn"
                : "good";
          const totalTone =
            challenge.computedStatus === "Failed - Max Loss"
              ? "danger"
              : challenge.totalLossUsedPercent >= challenge.warningThreshold
                ? "warn"
                : "good";
          const isClosedChallenge = challenge.computedStatus !== "Active";
          const closedNotice = t("dashboard.propFirms.closedNotice").replace(
            "{date}",
            formatDate(challenge.endedAt)
          );

          return (
            <div
              key={challenge.id}
              className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-white">
                    {challenge.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {accountLabel(challenge.account) || t("dashboard.propFirms.unknownAccount")}
                  </p>
                  <div
                    className={cn(
                      "mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold",
                      challenge.syncStatus === "LIVE"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : challenge.syncStatus === "STALE"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                          : "border-slate-700 bg-slate-800/60 text-slate-300"
                    )}
                  >
                    {challenge.syncStatus === "LIVE" ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <WifiOff className="h-3 w-3" />
                    )}
                    {t(`dashboard.propFirms.syncStatus${challenge.syncStatus}`)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingChallenge(challenge);
                      setShowForm(true);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800"
                    aria-label={t("dashboard.propFirms.editChallenge")}
                    title={t("dashboard.propFirms.editChallenge")}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteChallenge(challenge)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/30 text-red-200 hover:bg-red-500/10"
                    aria-label={t("dashboard.propFirms.deleteChallenge")}
                    title={t("dashboard.propFirms.deleteChallenge")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Metric
                  label={t("dashboard.propFirms.startingBalance")}
                  value={formatMoney(challenge.startingBalance, currency)}
                />
                <Metric
                  label={t("dashboard.propFirms.currentBalance")}
                  value={formatMoney(challenge.currentBalance, currency)}
                />
                <Metric
                  label={t("dashboard.propFirms.currentEquity")}
                  value={formatMoney(challenge.currentEquity, currency)}
                />
                <Metric
                  label={t("dashboard.propFirms.floatingPnl")}
                  value={formatMoney(challenge.floatingPnl, currency)}
                  className={challenge.floatingPnl >= 0 ? "text-emerald-200" : "text-red-200"}
                />
                <Metric
                  label={t("dashboard.propFirms.profitTarget")}
                  value={formatMoneyWithPercent(
                    challenge.profitTarget,
                    challenge.startingBalance,
                    currency
                  )}
                />
                <Metric label={t("dashboard.propFirms.progress")} value={progress} />
                <Metric
                  label={t("dashboard.propFirms.todayPnl")}
                  value={formatMoney(challenge.todayPnl, currency)}
                  className={
                    challenge.todayPnl >= 0 ? "text-emerald-200" : "text-red-200"
                  }
                />
                <Metric
                  label={t("dashboard.propFirms.maxDailyLoss")}
                  value={formatMoneyWithPercent(
                    challenge.maxDailyLoss,
                    challenge.startingBalance,
                    currency
                  )}
                />
                <Metric
                  label={t("dashboard.propFirms.maxTotalLoss")}
                  value={formatMoneyWithPercent(
                    challenge.maxTotalLoss,
                    challenge.startingBalance,
                    currency
                  )}
                />
                <div className="rounded-xl border border-slate-800 bg-[#111827] p-3">
                  <div className="text-xs uppercase text-slate-400">
                    {t("dashboard.propFirms.status")}
                  </div>
                  <div
                    className={cn(
                      "mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                      statusClasses(challenge.computedStatus)
                    )}
                  >
                    {statusLabel(challenge.computedStatus)}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-800 bg-[#111827] px-3 py-2 text-xs leading-5 text-slate-400">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>{t("dashboard.propFirms.dailyReset")}: {challenge.dailyResetTimeZone}</span>
                  <span>{t("dashboard.propFirms.dataAsOf")}: {formatSyncTime(challenge.dataAsOf, language)}</span>
                </div>
                <div className="mt-1">
                  {t("dashboard.propFirms.lossUsage")}: {formatNumber(challenge.dailyLossUsedPercent, 1)}% {t("dashboard.propFirms.daily")} / {formatNumber(challenge.totalLossUsedPercent, 1)}% {t("dashboard.propFirms.total")}
                </div>
              </div>

              {isClosedChallenge ? (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-100">
                  {closedNotice}
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                <RuleRow
                  label={t("dashboard.propFirms.profitTargetLeft")}
                  value={targetRemaining === null ? "-" : formatMoney(targetRemaining, currency)}
                  tone={challenge.computedStatus === "Passed" ? "good" : "warn"}
                />
                <RuleRow
                  label={t("dashboard.propFirms.dailyLossRoom")}
                  value={
                    dailyLossRemaining === null ? "-" : formatMoney(dailyLossRemaining, currency)
                  }
                  tone={dailyTone}
                />
                <RuleRow
                  label={t("dashboard.propFirms.totalLossRoom")}
                  value={
                    totalLossRemaining === null ? "-" : formatMoney(totalLossRemaining, currency)
                  }
                  tone={totalTone}
                />
                <RuleRow
                  label={t("dashboard.propFirms.challengeTimeLeft")}
                  value={
                    daysRemaining === null
                      ? t("dashboard.propFirms.noDeadline")
                      : t("dashboard.propFirms.daysLeft").replace(
                          "{count}",
                          String(Math.max(daysRemaining, 0))
                        )
                  }
                  tone={daysRemaining !== null && daysRemaining <= 3 ? "warn" : "good"}
                />
              </div>

              <OvertradeGuardPanel
                challenge={challenge}
                onSave={(payload) => saveGuardSettings(challenge.id, payload)}
              />

              <Link
                href={challengeTradesHref(challenge)}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 text-sm font-semibold text-blue-100 hover:bg-blue-500/20"
              >
                <ListChecks className="h-4 w-4" />
                {t("dashboard.propFirms.viewTrades")}
              </Link>
            </div>
          );
        })}
      </div>

      {visibleChallenges.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] px-4 py-12 text-center text-sm text-slate-400">
          {selectedAccount
            ? t("dashboard.propFirms.emptyForAccount")
            : t("dashboard.propFirms.empty")}
        </div>
      ) : null}
    </div>
  );
}
