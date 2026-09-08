"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, CreditCard, LayoutDashboard, LogOut } from "lucide-react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  description?: string | null;
  priceUSDT: string;
  durationDays: number;
  isFree?: boolean;
  isTrial?: boolean;
};

type Payment = {
  id: string;
  amount: string;
  currency: string;
  network: string;
  walletAddress: string;
  txid?: string | null;
  status: string;
  plan?: Plan | null;
  subscription?: unknown;
};

const networks = ["TRC20", "ERC20", "BEP20"] as const;

const localizedCopy = {
  en: {
    headerTitle: "Tradivix",
    headerSubtitle: "Subscription renewal",
    signOut: "Sign out",
    signingOut: "Signing out...",
    title: "Renew your subscription",
    subtitle:
      "Choose one paid plan, send USDT to the wallet address, then submit the transaction ID for admin confirmation.",
    benefitsTitle: "What your subscription unlocks",
    benefitsSubtitle: "Access is restored after admin confirmation.",
    benefits: [
      "Full dashboard access",
      "MT5 key generation and journal sync",
      "Trading accounts, trades, screenshots, and reports",
      "Playbooks, checklists, analytics, and daily journal tools",
      "AI review and advanced analytics on supported plans",
    ],
    formTitle: "Payment form",
    formSubtitle: "One request is enough; admin will activate access after review.",
    plan: "Plan",
    network: "Network",
    loadingPlans: "Loading plans...",
    amount: "Amount:",
    duration: "Duration:",
    days: "days",
    createNew: "Create new payment request",
    create: "Create payment request",
    creating: "Creating payment...",
    sendPayment: "Send payment",
    sendPaymentText: "Send exactly {amount} {currency} on {network}, then paste the TXID below.",
    walletAddress: "Wallet address",
    txid: "Transaction ID",
    txidPlaceholder: "Paste TXID after payment",
    submitted: "Submitted for review",
    submitting: "Submitting...",
    submit: "Submit TXID",
  },
  fa: {
    headerTitle: "سیگنال مکس",
    headerSubtitle: "تمدید اشتراک",
    signOut: "خروج",
    signingOut: "در حال خروج...",
    title: "تمدید اشتراک",
    subtitle:
      "یک پلن پولی انتخاب کنید، مبلغ USDT را به آدرس کیف پول ارسال کنید و سپس TXID را برای تایید ادمین ثبت کنید.",
    benefitsTitle: "با خرید اشتراک چه قابلیت‌هایی فعال می‌شود",
    benefitsSubtitle: "بعد از تایید ادمین، دسترسی شما دوباره فعال می‌شود.",
    benefits: [
      "دسترسی کامل به داشبورد",
      "ساخت کلید MT5 و همگام‌سازی ژورنال",
      "مدیریت اکانت‌های ترید، معاملات، اسکرین‌شات‌ها و گزارش‌ها",
      "پلی‌بوک‌ها، چک‌لیست‌ها، آنالیتیکس و ابزار ژورنال روزانه",
      "بررسی هوش مصنوعی و آنالیتیکس پیشرفته در پلن‌های پشتیبانی‌شده",
    ],
    formTitle: "فرم پرداخت",
    formSubtitle: "یک درخواست کافی است؛ ادمین بعد از بررسی دسترسی را فعال می‌کند.",
    plan: "پلن",
    network: "شبکه",
    loadingPlans: "در حال بارگذاری پلن‌ها...",
    amount: "مبلغ:",
    duration: "مدت:",
    days: "روز",
    createNew: "ساخت درخواست پرداخت جدید",
    create: "ساخت درخواست پرداخت",
    creating: "در حال ساخت درخواست...",
    sendPayment: "ارسال پرداخت",
    sendPaymentText: "دقیقا {amount} {currency} روی شبکه {network} ارسال کنید و سپس TXID را پایین وارد کنید.",
    walletAddress: "آدرس کیف پول",
    txid: "شناسه تراکنش",
    txidPlaceholder: "TXID را بعد از پرداخت وارد کنید",
    submitted: "برای بررسی ارسال شد",
    submitting: "در حال ارسال...",
    submit: "ثبت TXID",
  },
} as const;

export function PremiumPaymentForm() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const text = localizedCopy[language];
  const backToDashboardLabel = language === "fa" ? "بازگشت به داشبورد" : "Back to dashboard";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [network, setNetwork] = useState<(typeof networks)[number]>("TRC20");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [txid, setTxid] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [submittingTxid, setSubmittingTxid] = useState(false);
  const [redirectingToDashboard, setRedirectingToDashboard] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    fetch("/api/plans", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "Failed to load plans.");
        }

        return payload;
      })
      .then((payload) => {
        if (!mounted) return;

        const paidPlans = (payload.plans || []).filter(
          (plan: Plan) => !plan.isFree && !plan.isTrial
        );

        setPlans(paidPlans);
        setPlanId(paidPlans[0]?.id || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load plans."))
      .finally(() => {
        if (mounted) setLoadingPlans(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!payment || redirectingToDashboard) {
      return;
    }

    const currentPayment = payment;

    if (currentPayment.status === "CONFIRMED" || currentPayment.subscription) {
      setRedirectingToDashboard(true);
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    if (!["UNDER_REVIEW", "WAITING_TXID"].includes(currentPayment.status)) {
      return;
    }

    let active = true;

    async function checkPaymentStatus() {
      try {
        const response = await fetch("/api/payments/my", { cache: "no-store" });
        const payload = await response.json();

        if (!active || !response.ok) {
          return;
        }

        const updatedPayment = (payload.payments || []).find(
          (item: Payment) => item.id === currentPayment.id
        ) as Payment | undefined;

        if (!updatedPayment) {
          return;
        }

        if (updatedPayment.status === "CONFIRMED" || updatedPayment.subscription) {
          setPayment(updatedPayment);
          setRedirectingToDashboard(true);
          toast.success("Payment confirmed. Opening dashboard...");
          router.replace("/dashboard");
          router.refresh();
          return;
        }

        if (
          updatedPayment.status !== currentPayment.status ||
          updatedPayment.txid !== currentPayment.txid
        ) {
          setPayment(updatedPayment);
        }
      } catch {
        // Keep polling; a transient network error should not block automatic access.
      }
    }

    const interval = window.setInterval(checkPaymentStatus, 2000);
    void checkPaymentStatus();

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [payment, redirectingToDashboard, router]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === planId) || null,
    [planId, plans]
  );

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
      setLanguage("en");
      const redirectPath = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    } catch {
      setSigningOut(false);
      toast.error("Failed to sign out.");
    }
  }

  async function createPayment() {
    if (!planId) {
      toast.error("Select a plan first.");
      return;
    }

    setError("");
    setCreatingPayment(true);

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, network }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to create payment.");
      }

      setPayment(payload.payment);
      setTxid("");
      toast.success("Payment request created.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create payment.";
      setError(message);
      toast.error(message);
    } finally {
      setCreatingPayment(false);
    }
  }

  async function submitTxid() {
    if (!payment) return;

    if (!txid.trim()) {
      toast.error("Enter the transaction ID.");
      return;
    }

    setError("");
    setSubmittingTxid(true);

    try {
      const response = await fetch(`/api/payments/${payment.id}/submit-txid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txid }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to submit TXID.");
      }

      setPayment(payload.payment);
      toast.success("TXID submitted for admin review.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit TXID.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmittingTxid(false);
    }
  }

  function copyToClipboard(value: string, label: string) {
    navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied.`));
  }

  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-black dark:text-white">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-black">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{text.headerTitle}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{text.headerSubtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              asChild
              type="button"
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20 dark:hover:text-blue-100"
            >
              <Link href="/dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>{backToDashboardLabel}</span>
              </Link>
            </Button>
            <LanguageSwitcher />
            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              disabled={signingOut}
              className="border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-500/40 dark:bg-black dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? text.signingOut : text.signOut}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
            {text.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            {text.subtitle}
          </p>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#050505] sm:p-6">
          <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/25 dark:bg-blue-500/10">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{text.benefitsTitle}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text.benefitsSubtitle}</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {text.benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">{text.formTitle}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{text.formSubtitle}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{text.plan}</span>
              <select
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
                disabled={loadingPlans || creatingPayment}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-black dark:text-white dark:focus:ring-blue-500/20"
              >
                {loadingPlans ? (
                  <option>{text.loadingPlans}</option>
                ) : !plans.length ? (
                  <option>No paid plans are available.</option>
                ) : (
                  plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.priceUSDT} USDT - {plan.durationDays} days
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{text.network}</span>
              <select
                value={network}
                onChange={(event) => setNetwork(event.target.value as (typeof networks)[number])}
                disabled={creatingPayment}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-black dark:text-white dark:focus:ring-blue-500/20"
              >
                {networks.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedPlan && (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-black dark:text-slate-300">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span>
                  <strong className="text-slate-950 dark:text-white">{text.amount}</strong> {selectedPlan.priceUSDT} USDT
                </span>
                <span>
                  <strong className="text-slate-950 dark:text-white">{text.duration}</strong> {selectedPlan.durationDays} {text.days}
                </span>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={createPayment}
            disabled={creatingPayment || loadingPlans || !plans.length}
            className="mt-5 w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {creatingPayment ? text.creating : payment ? text.createNew : text.create}
          </Button>

          {payment && (
            <div className="mt-6 space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/25 dark:bg-blue-500/10">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-700 dark:text-blue-300" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{text.sendPayment}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {text.sendPaymentText
                      .replace("{amount}", payment.amount)
                      .replace("{currency}", payment.currency)
                      .replace("{network}", payment.network)}
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{text.walletAddress}</span>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={payment.walletAddress}
                    className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-black dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(payment.walletAddress, "Wallet")}
                    className="border-slate-300 bg-white dark:border-slate-700 dark:bg-black dark:text-white dark:hover:bg-slate-900"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{text.txid}</span>
                <input
                  value={txid}
                  onChange={(event) => setTxid(event.target.value)}
                  placeholder={text.txidPlaceholder}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
                />
              </label>

              <Button
                type="button"
                onClick={submitTxid}
                disabled={
                  submittingTxid ||
                  redirectingToDashboard ||
                  payment.status === "UNDER_REVIEW"
                }
                className={cn(
                  "w-full",
                  payment.status === "UNDER_REVIEW" || redirectingToDashboard
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-950 text-white hover:bg-slate-800"
                )}
              >
                {redirectingToDashboard
                  ? "Payment confirmed. Opening dashboard..."
                  : payment.status === "UNDER_REVIEW"
                  ? text.submitted
                  : submittingTxid
                    ? text.submitting
                    : text.submit}
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
