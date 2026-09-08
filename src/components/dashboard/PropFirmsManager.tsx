"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Edit, ListChecks, Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

type PropFirmsData = {
  accounts: TradingAccountDto[];
  challenges: PropFirmChallengeDto[];
};

type ChallengePayload = {
  name: string;
  accountId: string;
  startingBalance: string;
  profitTarget: string;
  maxDailyLoss: string;
  maxTotalLoss: string;
  startedAt: string;
  endedAt: string;
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
  const { t } = useLanguage();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const startingBalance = String(formData.get("startingBalance") || "");

    await onSubmit({
      name: String(formData.get("name") || ""),
      accountId: String(formData.get("accountId") || ""),
      startingBalance,
      profitTarget: amountFromPercent(
        String(formData.get("profitTargetPercent") || ""),
        startingBalance
      ),
      maxDailyLoss: amountFromPercent(
        String(formData.get("maxDailyLossPercent") || ""),
        startingBalance
      ),
      maxTotalLoss: amountFromPercent(
        String(formData.get("maxTotalLossPercent") || ""),
        startingBalance
      ),
      startedAt: String(formData.get("startedAt") || ""),
      endedAt: String(formData.get("endedAt") || ""),
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
            defaultValue={challenge?.accountId || defaultAccountId || accounts[0]?.id || ""}
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
          {t("dashboard.propFirms.startingBalance")}
          <input
            name="startingBalance"
            type="number"
            step="0.01"
            required
            defaultValue={challenge?.startingBalance ? String(challenge.startingBalance) : ""}
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
            defaultValue={percentInputValue(challenge?.profitTarget, challenge?.startingBalance)}
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
            defaultValue={percentInputValue(challenge?.maxDailyLoss, challenge?.startingBalance)}
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
            defaultValue={percentInputValue(challenge?.maxTotalLoss, challenge?.startingBalance)}
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
            required
            defaultValue={toDateInputValue(challenge?.endedAt)}
            className={inputClass}
          />
        </label>
      </div>
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

  const loadData = useCallback(async () => {
    const response = await fetch("/api/prop-firms");
    const json = (await response.json()) as ApiResult<PropFirmsData>;

    if (!json.success || !json.data) {
      setMessage(json.message || t("dashboard.propFirms.loadFailed"));
      return;
    }

    setAccounts(json.data.accounts);
    setChallenges(json.data.challenges);
    setSelectedAccountId((current) =>
      current && json.data?.accounts.some((account) => account.id === current)
        ? current
        : json.data?.accounts[0]?.id || ""
    );
  }, [t]);

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
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || null;
  const accountFilterLabel = language === "fa" ? "حساب فعال" : "Active account";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{t("dashboard.propFirms.title")}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {t("dashboard.propFirms.subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {accountFilterLabel}
            <select
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              disabled={accounts.length === 0}
              className="h-10 min-w-[220px] rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {accounts.length === 0 ? (
                <option value="">{language === "fa" ? "بدون حساب" : "No account"}</option>
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
            disabled={!canCreateChallenge}
            onClick={() => {
              setEditingChallenge(null);
              setShowForm(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
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
          const startingBalance = toNumber(challenge.startingBalance) ?? 0;
          const currentBalance = toNumber(challenge.currentBalance) ?? startingBalance;
          const profitTarget = toNumber(challenge.profitTarget);
          const maxDailyLoss = toNumber(challenge.maxDailyLoss);
          const maxTotalLoss = toNumber(challenge.maxTotalLoss);
          const challengeProfit = currentBalance - startingBalance;
          const targetRemaining =
            profitTarget === null ? null : Math.max(profitTarget - challengeProfit, 0);
          const dailyLossRemaining =
            maxDailyLoss === null ? null : Math.max(maxDailyLoss + challenge.todayPnl, 0);
          const totalLossRemaining =
            maxTotalLoss === null
              ? null
              : Math.max(currentBalance - (startingBalance - maxTotalLoss), 0);
          const daysRemaining = challenge.endedAt
            ? Math.ceil(
                (new Date(challenge.endedAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
            : null;
          const dailyLossUsed =
            maxDailyLoss && maxDailyLoss > 0 && challenge.todayPnl < 0
              ? Math.min((Math.abs(challenge.todayPnl) / maxDailyLoss) * 100, 100)
              : 0;
          const totalLossUsed =
            maxTotalLoss && maxTotalLoss > 0 && currentBalance < startingBalance
              ? Math.min(((startingBalance - currentBalance) / maxTotalLoss) * 100, 100)
              : 0;
          const dailyTone =
            challenge.computedStatus === "Failed - Daily Loss"
              ? "danger"
              : dailyLossUsed >= 80
                ? "warn"
                : "good";
          const totalTone =
            challenge.computedStatus === "Failed - Max Loss"
              ? "danger"
              : totalLossUsed >= 80
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
                      ? "-"
                      : t("dashboard.propFirms.daysLeft").replace(
                          "{count}",
                          String(Math.max(daysRemaining, 0))
                        )
                  }
                  tone={daysRemaining !== null && daysRemaining <= 3 ? "warn" : "good"}
                />
              </div>

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
            ? language === "fa"
              ? "برای این حساب هنوز چالش پراپ ثبت نشده است."
              : "No prop firm challenge is linked to this account yet."
            : t("dashboard.propFirms.empty")}
        </div>
      ) : null}
    </div>
  );
}
