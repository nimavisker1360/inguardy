"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileUp,
  Landmark,
  PenLine,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TradingAccountForm } from "@/components/dashboard/TradingAccountForm";
import { PRODUCTION_SITE_URL } from "@/lib/deployment-url";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type WizardStep = "platform" | "method" | "connect";
type ImportMethod = "auto" | "file" | "manual";

type PlatformOption = {
  id: string;
  name: string;
  searchTerms: string;
  logo?: string;
  mark?: string;
  markClassName?: string;
  icon?: LucideIcon;
  supportsAutoSync: boolean;
};

type QuickConnectResponse = {
  ok: boolean;
  error?: string;
  secret?: string;
  apiUrl?: string;
};

type DirectConnectResponse = {
  success: boolean;
  message?: string;
};

type TradeLockerCandidate = {
  accountId: string;
  accNum: string;
  name: string;
  currency: string;
  status: string | null;
  environment: "LIVE" | "DEMO";
  balance: number | null;
};

type TradeLockerConnectResponse = DirectConnectResponse & {
  data?: { sessionId: string; accounts: TradeLockerCandidate[] };
};

const platforms: PlatformOption[] = [
  {
    id: "mt5",
    name: "MetaTrader 5",
    searchTerms: "metatrader 5 mt5 metaquotes",
    logo: "/images/meta5.png",
    supportsAutoSync: true,
  },
  {
    id: "mt4",
    name: "MetaTrader 4",
    searchTerms: "metatrader 4 mt4 metaquotes",
    logo: "/images/meta04.png",
    supportsAutoSync: false,
  },
  {
    id: "ctrader",
    name: "cTrader",
    searchTerms: "ctrader spotware broker",
    mark: "c",
    markClassName: "bg-[#e31b36] text-white",
    supportsAutoSync: true,
  },
  {
    id: "tradelocker",
    name: "TradeLocker",
    searchTerms: "tradelocker prop firm broker",
    mark: "TL",
    markClassName: "bg-slate-950 text-white",
    supportsAutoSync: true,
  },
  {
    id: "tradingview",
    name: "TradingView",
    searchTerms: "tradingview broker charts",
    mark: "TV",
    markClassName: "bg-[#2563eb] text-white",
    supportsAutoSync: false,
  },
  {
    id: "other",
    name: "Other broker",
    searchTerms: "other broker prop firm platform",
    icon: Landmark,
    markClassName: "bg-emerald-50 text-emerald-700",
    supportsAutoSync: false,
  },
];

const englishText = {
  eyebrow: "Add trading account",
  chooseTitle: "Choose broker or trading platform",
  chooseSubtitle: "Select the platform that holds your trading history.",
  searchPlaceholder: "Search broker, prop firm or trading platform",
  popular: "Popular platforms",
  continue: "Continue",
  back: "Back",
  close: "Close",
  methodTitle: "Select import method",
  linking: "You're linking",
  changePlatform: "Change platform",
  recommended: "Recommended",
  autoTitle: "Live sync",
  autoDetail: "Keep MT5 trades updated automatically",
  ctraderAutoDetail: "Keep cTrader trades updated automatically",
  tradeLockerAutoDetail: "Keep TradeLocker trades updated automatically",
  fileTitle: "File upload",
  fileDetail: "Import an MT5 report or journal file",
  manualTitle: "Add manually",
  manualDetail: "Create an account and enter trades yourself",
  mt5Only: "Available for MetaTrader 5, cTrader and TradeLocker",
  connectTitle: "Connect MetaTrader 5",
  ctraderConnectTitle: "Connect cTrader",
  tradeLockerConnectTitle: "Connect TradeLocker",
  manualConnectTitle: "Add account details",
  fileRedirect: "Open trade importer",
  supported: "Supported workflow",
  encrypted: "Secure connection key",
  journalReady: "Automatic journal updates",
  noPassword: "No broker password is stored",
  connectionSetup: "Connection setup",
  history: "Trade history",
  allRecords: "Import all available records",
  fromNow: "Sync new trades from now",
  generate: "Generate connection key",
  generating: "Generating secure key...",
  generated: "Your connection key is ready.",
  generateFailed: "Could not generate the MT5 connection key.",
  apiUrl: "Journal API address",
  secret: "MT5 connection key",
  reveal: "Reveal key",
  hide: "Hide key",
  copy: "Copy",
  done: "Done",
  server: "Broker server",
  serverPlaceholder: "Example: ICMarketsSC-MT5-2",
  login: "MT5 login",
  loginPlaceholder: "Trading account number",
  investorPassword: "Investor password",
  investorPasswordHint: "Use the read-only investor password when your broker provides one.",
  showPassword: "Show password",
  hidePassword: "Hide password",
  connectAccount: "Connect account",
  connectingAccount: "Checking MT5 credentials...",
  connectedAccount: "Account connected. Initial synchronization has started.",
  connectionFailed: "Could not connect to the MT5 account.",
  ctraderAuthorize: "Authorize with cTrader",
  ctraderOAuthDetail: "You will be redirected to cTrader to grant read-only account access.",
  ctraderTokenSafe: "OAuth tokens are encrypted at rest",
  environment: "Environment",
  live: "Live",
  demo: "Demo",
  tradeLockerEmail: "TradeLocker email",
  tradeLockerPassword: "TradeLocker password",
  tradeLockerServerPlaceholder: "Server name used in TradeLocker",
  tradeLockerConnecting: "Connecting to TradeLocker...",
  tradeLockerConnect: "Connect TradeLocker",
  chooseTradeLockerAccount: "Choose TradeLocker Account",
  tradeLockerPasswordSafe: "Your password is used only to authenticate and is never stored.",
  selectAccount: "Connect",
  tradeLockerConnected: "TradeLocker account connected and initial synchronization started.",
  tradeLockerFailed: "Unable to connect to TradeLocker.",
};

const persianText: typeof englishText = {
  eyebrow: "افزودن حساب معاملاتی",
  chooseTitle: "کارگزار یا پلتفرم معاملاتی را انتخاب کنید",
  chooseSubtitle: "پلتفرمی را انتخاب کنید که تاریخچه معاملات شما در آن قرار دارد.",
  searchPlaceholder: "جستجوی کارگزار، پراپ فرم یا پلتفرم",
  popular: "پلتفرم‌های محبوب",
  continue: "ادامه",
  back: "بازگشت",
  close: "بستن",
  methodTitle: "روش ورود معاملات را انتخاب کنید",
  linking: "در حال اتصال به",
  changePlatform: "تغییر پلتفرم",
  recommended: "پیشنهاد ما",
  autoTitle: "همگام‌سازی زنده",
  autoDetail: "معاملات MT5 را خودکار به‌روز نگه دارید",
  ctraderAutoDetail: "معاملات cTrader را خودکار به‌روز نگه دارید",
  tradeLockerAutoDetail: "معاملات TradeLocker را خودکار به‌روز نگه دارید",
  fileTitle: "بارگذاری فایل",
  fileDetail: "گزارش MT5 یا فایل ژورنال را وارد کنید",
  manualTitle: "ثبت دستی",
  manualDetail: "حساب را بسازید و معاملات را دستی ثبت کنید",
  mt5Only: "برای MetaTrader 5، cTrader و TradeLocker در دسترس است",
  connectTitle: "اتصال MetaTrader 5",
  ctraderConnectTitle: "اتصال cTrader",
  tradeLockerConnectTitle: "اتصال TradeLocker",
  manualConnectTitle: "اطلاعات حساب را وارد کنید",
  fileRedirect: "باز کردن بخش ورود فایل",
  supported: "قابلیت‌های اتصال",
  encrypted: "کلید اتصال امن",
  journalReady: "به‌روزرسانی خودکار ژورنال",
  noPassword: "رمز کارگزاری ذخیره نمی‌شود",
  connectionSetup: "تنظیم اتصال",
  history: "تاریخچه معاملات",
  allRecords: "ورود همه سوابق موجود",
  fromNow: "همگام‌سازی معاملات جدید از این لحظه",
  generate: "ساخت کلید اتصال",
  generating: "در حال ساخت کلید امن...",
  generated: "کلید اتصال شما آماده است.",
  generateFailed: "ساخت کلید اتصال MT5 ناموفق بود.",
  apiUrl: "آدرس API ژورنال",
  secret: "کلید اتصال MT5",
  reveal: "نمایش کلید",
  hide: "پنهان کردن کلید",
  copy: "کپی",
  done: "تمام",
  server: "سرور بروکر",
  serverPlaceholder: "مثال: ICMarketsSC-MT5-2",
  login: "شماره ورود MT5",
  loginPlaceholder: "شماره حساب معاملاتی",
  investorPassword: "رمز Investor",
  investorPasswordHint: "در صورت وجود، رمز فقط‌خواندنی Investor را وارد کنید.",
  showPassword: "نمایش رمز",
  hidePassword: "پنهان کردن رمز",
  connectAccount: "اتصال حساب",
  connectingAccount: "در حال بررسی اطلاعات MT5...",
  connectedAccount: "حساب متصل شد و همگام‌سازی اولیه آغاز شد.",
  connectionFailed: "اتصال به حساب MT5 انجام نشد.",
  ctraderAuthorize: "تأیید دسترسی در cTrader",
  ctraderOAuthDetail: "برای دادن دسترسی فقط‌خواندنی حساب، به cTrader هدایت می‌شوید.",
  ctraderTokenSafe: "توکن‌های OAuth به‌صورت رمزنگاری‌شده ذخیره می‌شوند",
  environment: "محیط",
  live: "واقعی",
  demo: "آزمایشی",
  tradeLockerEmail: "ایمیل TradeLocker",
  tradeLockerPassword: "رمز عبور TradeLocker",
  tradeLockerServerPlaceholder: "نام سرور مورد استفاده در TradeLocker",
  tradeLockerConnecting: "در حال اتصال به TradeLocker...",
  tradeLockerConnect: "اتصال TradeLocker",
  chooseTradeLockerAccount: "انتخاب حساب TradeLocker",
  tradeLockerPasswordSafe: "رمز عبور فقط برای احراز هویت استفاده می‌شود و هرگز ذخیره نمی‌شود.",
  selectAccount: "اتصال",
  tradeLockerConnected: "حساب TradeLocker متصل شد و همگام‌سازی اولیه آغاز شد.",
  tradeLockerFailed: "اتصال به TradeLocker انجام نشد.",
};

function PlatformMark({ platform, large = false }: { platform: PlatformOption; large?: boolean }) {
  const Icon = platform.icon;
  const sizeClass = large ? "h-14 w-14" : "h-9 w-9";

  if (platform.logo) {
    return (
      <div className={cn("relative shrink-0", sizeClass)}>
        <Image src={platform.logo} alt="" fill sizes={large ? "56px" : "40px"} className="object-contain" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg text-sm font-black",
        sizeClass,
        platform.markClassName
      )}
      aria-hidden="true"
    >
      {Icon ? <Icon className={large ? "h-6 w-6" : "h-5 w-5"} /> : platform.mark}
    </div>
  );
}

function ProgressBar({ step }: { step: WizardStep }) {
  const width = step === "platform" ? "34%" : step === "method" ? "67%" : "100%";

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
      <div className="h-full rounded-full bg-[#6547b7] transition-[width] duration-300" style={{ width }} />
    </div>
  );
}

function MethodCard({
  active,
  disabled,
  recommended,
  icon: Icon,
  title,
  detail,
  onClick,
  recommendedLabel,
}: {
  active: boolean;
  disabled?: boolean;
  recommended?: boolean;
  icon: LucideIcon;
  title: string;
  detail: string;
  onClick: () => void;
  recommendedLabel: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex min-h-40 flex-col items-center justify-center border bg-white px-5 py-6 text-center shadow-sm transition",
        "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6547b7] focus-visible:ring-offset-2",
        active ? "border-[#6547b7] ring-1 ring-[#6547b7]" : "border-slate-200 hover:border-slate-300 hover:shadow-md",
        disabled && "cursor-not-allowed opacity-45 hover:border-slate-200 hover:shadow-sm"
      )}
    >
      {recommended ? (
        <span className="absolute start-2 top-2 rounded bg-[#6547b7] px-2 py-1 text-[10px] font-bold text-white">
          {recommendedLabel}
        </span>
      ) : null}
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f1fb] text-[#6547b7]">
        <Icon className="h-6 w-6" />
      </span>
      <strong className="mt-4 text-sm font-bold text-slate-950">{title}</strong>
      <span className="mt-1 text-xs leading-5 text-slate-500">{detail}</span>
    </button>
  );
}

function Mt5ConnectStep({
  labels,
  onCreated,
  onDone,
}: {
  labels: typeof englishText;
  onCreated: () => Promise<void>;
  onDone: () => void;
}) {
  const [historyMode, setHistoryMode] = useState("all");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [apiUrl, setApiUrl] = useState(
    typeof window === "undefined" ? PRODUCTION_SITE_URL : window.location.origin
  );
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<"api" | "secret" | null>(null);

  useEffect(() => {
    if (!revealed) return;
    const timeout = window.setTimeout(() => setRevealed(false), 15000);
    return () => window.clearTimeout(timeout);
  }, [revealed, secret]);

  async function generateConnection() {
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/trading-accounts/mt5-quick-connect", { method: "POST" });
      const data = (await response.json()) as QuickConnectResponse;

      if (!response.ok || !data.ok || !data.secret) {
        throw new Error(data.error || labels.generateFailed);
      }

      setSecret(data.secret);
      setApiUrl((data.apiUrl || apiUrl).replace(/\/api\/mt5\/journal$/, ""));
      setStatus("success");
      setMessage(labels.generated);
      await onCreated();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : labels.generateFailed);
    }
  }

  async function copyValue(value: string, type: "api" | "secret") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] md:gap-10">
      <div className="space-y-4">
        <label className="block text-xs font-semibold text-slate-600">
          {labels.history}
          <select
            value={historyMode}
            onChange={(event) => setHistoryMode(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15"
          >
            <option value="all">{labels.allRecords}</option>
            <option value="new">{labels.fromNow}</option>
          </select>
        </label>

        {status === "success" ? (
          <div className="space-y-3">
            <ConnectionValue
              label={labels.apiUrl}
              value={apiUrl}
              visible
              copied={copied === "api"}
              copyLabel={labels.copy}
              onCopy={() => copyValue(apiUrl, "api")}
            />
            <ConnectionValue
              label={labels.secret}
              value={secret}
              visible={revealed}
              copied={copied === "secret"}
              copyLabel={labels.copy}
              revealLabel={revealed ? labels.hide : labels.reveal}
              onReveal={() => setRevealed((value) => !value)}
              onCopy={() => copyValue(secret, "secret")}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={status === "success" ? onDone : generateConnection}
          disabled={status === "saving"}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5b3daf] px-4 text-sm font-bold text-white transition hover:bg-[#4e329b] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {status === "saving" ? <RefreshCw className="h-4 w-4 animate-spin" /> : status === "success" ? <Check className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {status === "saving" ? labels.generating : status === "success" ? labels.done : labels.generate}
        </button>

        <p
          className={cn(
            "min-h-5 text-xs font-semibold",
            status === "success" && "text-emerald-700",
            status === "error" && "text-red-600",
            status !== "success" && status !== "error" && "text-slate-500"
          )}
        >
          {message}
        </p>
      </div>

      <div className="border-t border-slate-200 pt-6 md:border-s md:border-t-0 md:ps-8 md:pt-0">
        <div className="flex items-center gap-3">
          <PlatformMark platform={platforms[0]} />
          <div>
            <strong className="block text-base text-slate-950">MetaTrader 5</strong>
            <span className="text-xs text-slate-500">{labels.supported}</span>
          </div>
        </div>
        <ul className="mt-5 grid gap-3 text-sm text-slate-600">
          {[labels.encrypted, labels.journalReady, labels.noPassword].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-[#6547b7]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ConnectionValue({
  label,
  value,
  visible,
  copied,
  copyLabel,
  revealLabel,
  onReveal,
  onCopy,
}: {
  label: string;
  value: string;
  visible: boolean;
  copied: boolean;
  copyLabel: string;
  revealLabel?: string;
  onReveal?: () => void;
  onCopy: () => void;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      <div className="mt-1.5 flex gap-2">
        <input
          readOnly
          value={visible ? value : "••••••••••••••••••••••••"}
          className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
        />
        {onReveal ? (
          <button
            type="button"
            onClick={onReveal}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label={revealLabel}
            title={revealLabel}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCopy}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          aria-label={copyLabel}
          title={copyLabel}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function Mt5DirectConnectStep({
  labels,
  onCreated,
  onDone,
}: {
  labels: typeof englishText;
  onCreated: () => Promise<void>;
  onDone: () => void;
}) {
  const [server, setServer] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [historyMode, setHistoryMode] = useState<"all" | "new">("all");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function connectAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/trading-accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server, login, password, historyMode }),
      });
      const data = (await response.json()) as DirectConnectResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.message || labels.connectionFailed);
      }

      setPassword("");
      setStatus("success");
      setMessage(labels.connectedAccount);
      await onCreated();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : labels.connectionFailed);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] md:gap-10">
      <form className="space-y-4" onSubmit={connectAccount}>
        <label className="block text-xs font-semibold text-slate-600">
          {labels.server}
          <input
            required
            autoComplete="off"
            value={server}
            onChange={(event) => setServer(event.target.value)}
            placeholder={labels.serverPlaceholder}
            dir="ltr"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15"
          />
        </label>

        <label className="block text-xs font-semibold text-slate-600">
          {labels.login}
          <input
            required
            inputMode="numeric"
            autoComplete="username"
            value={login}
            onChange={(event) => setLogin(event.target.value.replace(/\D/g, ""))}
            placeholder={labels.loginPlaceholder}
            dir="ltr"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15"
          />
        </label>

        <label className="block text-xs font-semibold text-slate-600">
          {labels.investorPassword}
          <span className="relative mt-1.5 block">
            <input
              required
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              dir="ltr"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 pe-11 text-left text-sm text-slate-900 outline-none focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute end-1 top-1 flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label={showPassword ? labels.hidePassword : labels.showPassword}
              title={showPassword ? labels.hidePassword : labels.showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
          <span className="mt-1 block text-[11px] font-normal leading-5 text-slate-500">
            {labels.investorPasswordHint}
          </span>
        </label>

        <label className="block text-xs font-semibold text-slate-600">
          {labels.history}
          <select
            value={historyMode}
            onChange={(event) => setHistoryMode(event.target.value as "all" | "new")}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15"
          >
            <option value="all">{labels.allRecords}</option>
            <option value="new">{labels.fromNow}</option>
          </select>
        </label>

        <button
          type={status === "success" ? "button" : "submit"}
          onClick={status === "success" ? onDone : undefined}
          disabled={status === "saving"}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5b3daf] px-4 text-sm font-bold text-white transition hover:bg-[#4e329b] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {status === "saving" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : status === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {status === "saving"
            ? labels.connectingAccount
            : status === "success"
              ? labels.done
              : labels.connectAccount}
        </button>

        <p
          className={cn(
            "min-h-5 text-xs font-semibold",
            status === "success" && "text-emerald-700",
            status === "error" && "text-red-600",
            status !== "success" && status !== "error" && "text-slate-500"
          )}
        >
          {message}
        </p>
      </form>

      <div className="border-t border-slate-200 pt-6 md:border-s md:border-t-0 md:ps-8 md:pt-0">
        <div className="flex items-center gap-3">
          <PlatformMark platform={platforms[0]} />
          <div>
            <strong className="block text-base text-slate-950">MetaTrader 5</strong>
            <span className="text-xs text-slate-500">{labels.supported}</span>
          </div>
        </div>
        <ul className="mt-5 grid gap-3 text-sm text-slate-600">
          {[labels.encrypted, labels.journalReady, labels.investorPasswordHint].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6547b7]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CtraderConnectStep({
  labels,
}: {
  labels: typeof englishText;
}) {
  const [historyMode, setHistoryMode] = useState<"all" | "new">("all");

  function authorize() {
    window.location.assign(
      `/api/integrations/ctrader/start?historyMode=${encodeURIComponent(historyMode)}`
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] md:gap-10">
      <div className="space-y-4">
        <label className="block text-xs font-semibold text-slate-600">
          {labels.history}
          <select
            value={historyMode}
            onChange={(event) => setHistoryMode(event.target.value as "all" | "new")}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15"
          >
            <option value="all">{labels.allRecords}</option>
            <option value="new">{labels.fromNow}</option>
          </select>
        </label>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
          {labels.ctraderOAuthDetail}
        </p>
        <button
          type="button"
          onClick={authorize}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#e31b36] px-4 text-sm font-bold text-white transition hover:bg-[#c8172f]"
        >
          <ShieldCheck className="h-4 w-4" />
          {labels.ctraderAuthorize}
        </button>
      </div>
      <div className="border-t border-slate-200 pt-6 md:border-s md:border-t-0 md:ps-8 md:pt-0">
        <div className="flex items-center gap-3">
          <PlatformMark platform={platforms[2]} />
          <div>
            <strong className="block text-base text-slate-950">cTrader</strong>
            <span className="text-xs text-slate-500">{labels.supported}</span>
          </div>
        </div>
        <ul className="mt-5 grid gap-3 text-sm text-slate-600">
          {[labels.ctraderTokenSafe, labels.journalReady, labels.noPassword].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6547b7]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TradeLockerConnectStep({
  labels,
  onCreated,
  onDone,
}: {
  labels: typeof englishText;
  onCreated: () => Promise<void>;
  onDone: () => void;
}) {
  const [environment, setEnvironment] = useState<"LIVE" | "DEMO">("LIVE");
  const [server, setServer] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [accounts, setAccounts] = useState<TradeLockerCandidate[]>([]);
  const [busy, setBusy] = useState<"authenticate" | string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("authenticate");
    setStatus("idle");
    setMessage("");
    try {
      const response = await fetch("/api/integrations/tradelocker/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment, server, email, password }),
      });
      const result = (await response.json()) as TradeLockerConnectResponse;
      setPassword("");
      if (!response.ok || !result.success || !result.data?.sessionId || !result.data.accounts.length) {
        throw new Error(result.message || labels.tradeLockerFailed);
      }
      setSessionId(result.data.sessionId);
      setAccounts(result.data.accounts);
    } catch (error) {
      setPassword("");
      setStatus("error");
      setMessage(error instanceof Error ? error.message : labels.tradeLockerFailed);
    } finally {
      setBusy(null);
    }
  }

  async function selectAccount(account: TradeLockerCandidate) {
    setBusy(account.accountId);
    setStatus("idle");
    setMessage("");
    try {
      const response = await fetch("/api/integrations/tradelocker/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, accountId: account.accountId }),
      });
      const result = (await response.json()) as DirectConnectResponse;
      if (!response.ok || !result.success) throw new Error(result.message || labels.tradeLockerFailed);
      setStatus("success");
      setMessage(result.message || labels.tradeLockerConnected);
      await onCreated();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : labels.tradeLockerFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] md:gap-10">
      <div>
        {accounts.length ? (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{labels.chooseTradeLockerAccount}</h3>
            {accounts.map((account) => (
              <div key={`${account.accountId}:${account.accNum}`} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-slate-950">{account.name || `Account #${account.accountId}`}</p>
                  <p className="mt-1 text-xs text-slate-500" dir="ltr">#{account.accountId} · {account.environment === "LIVE" ? labels.live : labels.demo} · {account.currency}</p>
                </div>
                <button type="button" onClick={() => selectAccount(account)} disabled={busy !== null || status === "success"} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#5b3daf] px-4 text-sm font-bold text-white hover:bg-[#4e329b] disabled:opacity-50">
                  {busy === account.accountId ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {labels.selectAccount}
                </button>
              </div>
            ))}
            {status === "success" ? (
              <button type="button" onClick={onDone} className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#5b3daf] px-4 text-sm font-bold text-white">{labels.done}</button>
            ) : null}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={authenticate}>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-600">{labels.environment}</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["LIVE", "DEMO"] as const).map((value) => (
                  <button key={value} type="button" onClick={() => setEnvironment(value)} className={cn("h-10 rounded-lg border text-sm font-bold", environment === value ? "border-[#6547b7] bg-[#f4f1fb] text-[#4f3596] ring-1 ring-[#6547b7]" : "border-slate-200 bg-white text-slate-600")}>
                    {value === "LIVE" ? labels.live : labels.demo}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-xs font-semibold text-slate-600">{labels.server}
              <input required autoComplete="off" value={server} onChange={(event) => setServer(event.target.value)} placeholder={labels.tradeLockerServerPlaceholder} dir="ltr" className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 outline-none focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15" />
            </label>
            <label className="block text-xs font-semibold text-slate-600">{labels.tradeLockerEmail}
              <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} dir="ltr" className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 outline-none focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15" />
            </label>
            <label className="block text-xs font-semibold text-slate-600">{labels.tradeLockerPassword}
              <span className="relative mt-1.5 block">
                <input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 pe-11 text-left text-sm text-slate-900 outline-none focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute end-1 top-1 flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-100" aria-label={showPassword ? labels.hidePassword : labels.showPassword}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
              <span className="mt-1 block text-[11px] font-normal leading-5 text-slate-500">{labels.tradeLockerPasswordSafe}</span>
            </label>
            <button type="submit" disabled={busy !== null} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5b3daf] px-4 text-sm font-bold text-white hover:bg-[#4e329b] disabled:opacity-55">
              {busy === "authenticate" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {busy === "authenticate" ? labels.tradeLockerConnecting : labels.tradeLockerConnect}
            </button>
          </form>
        )}
        <p className={cn("mt-3 min-h-5 text-xs font-semibold", status === "success" ? "text-emerald-700" : status === "error" ? "text-red-600" : "text-slate-500")}>{message}</p>
      </div>
      <div className="border-t border-slate-200 pt-6 md:border-s md:border-t-0 md:ps-8 md:pt-0">
        <div className="flex items-center gap-3"><PlatformMark platform={platforms[3]} /><div><strong className="block text-base text-slate-950">TradeLocker</strong><span className="text-xs text-slate-500">{labels.supported}</span></div></div>
        <ul className="mt-5 grid gap-3 text-sm text-slate-600">
          {[labels.ctraderTokenSafe, labels.journalReady, labels.tradeLockerPasswordSafe].map((item) => <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6547b7]" /><span>{item}</span></li>)}
        </ul>
      </div>
    </div>
  );
}

export function AccountConnectionWizard({
  open,
  initialPlatformId,
  canUseAutoSync,
  errorMessage,
  onClose,
  onSaveManual,
  onAccountsChanged,
}: {
  open: boolean;
  initialPlatformId?: string;
  canUseAutoSync: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSaveManual: (payload: Record<string, string | undefined>) => Promise<void>;
  onAccountsChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const labels = language === "fa" ? persianText : englishText;
  const isRtl = language === "fa";
  const [step, setStep] = useState<WizardStep>("platform");
  const [selectedPlatformId, setSelectedPlatformId] = useState("");
  const [method, setMethod] = useState<ImportMethod>("auto");
  const [query, setQuery] = useState("");
  const selectedPlatform = platforms.find((platform) => platform.id === selectedPlatformId) || null;
  const filteredPlatforms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return platforms;
    return platforms.filter((platform) => `${platform.name} ${platform.searchTerms}`.toLowerCase().includes(normalizedQuery));
  }, [query]);

  const closeWizard = useCallback(() => {
    setStep("platform");
    setSelectedPlatformId("");
    setMethod("auto");
    setQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (initialPlatformId) {
      setSelectedPlatformId(initialPlatformId);
      setMethod("auto");
      setStep("connect");
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWizard();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeWizard, initialPlatformId, open]);

  if (!open) return null;

  function goBack() {
    if (step === "connect") {
      setStep("method");
    } else if (step === "method") {
      setStep("platform");
    }
  }

  function continueFromMethod() {
    if (method === "file") {
      closeWizard();
      router.push("/journal#import-trades");
      return;
    }
    setStep("connect");
  }

  const autoSyncAvailable = Boolean(selectedPlatform?.supportsAutoSync && canUseAutoSync);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[linear-gradient(90deg,#f7f2ff_0%,#ffffff_22%,#ffffff_78%,#f5f0ff_100%)] text-slate-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-wizard-title"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={closeWizard}
        className="fixed end-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm sm:end-8 sm:top-7"
        aria-label={labels.close}
        title={labels.close}
      >
        <X className="h-6 w-6" />
      </button>

      {step !== "platform" ? (
        <button
          type="button"
          onClick={goBack}
          className="fixed start-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm sm:start-8 sm:top-7"
          aria-label={labels.back}
          title={labels.back}
        >
          <ArrowLeft className={cn("h-6 w-6", isRtl && "rotate-180")} />
        </button>
      ) : null}

      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 pb-4 pt-4 sm:px-10">
        <div className="mx-auto w-[min(100%,330px)]">
          <ProgressBar step={step} />
        </div>

        <main className="mx-auto flex w-full flex-1 flex-col justify-center py-5 sm:py-6">
          <div className="mx-auto w-full max-w-3xl">
            <header className="mb-5 text-center">
              <p className="text-xs font-medium text-slate-500">{labels.eyebrow}</p>
              <h2 id="account-wizard-title" className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
                {step === "platform"
                  ? labels.chooseTitle
                  : step === "method"
                    ? labels.methodTitle
                    : method === "auto"
                      ? selectedPlatformId === "ctrader"
                        ? labels.ctraderConnectTitle
                        : selectedPlatformId === "tradelocker"
                          ? labels.tradeLockerConnectTitle
                        : labels.connectTitle
                      : labels.manualConnectTitle}
              </h2>
              {step === "platform" ? <p className="mt-1 text-sm text-slate-500">{labels.chooseSubtitle}</p> : null}
            </header>

            {step === "platform" ? (
              <div className="mx-auto max-w-xl">
                <label className="relative block">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={labels.searchPlaceholder}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pe-4 ps-10 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15"
                  />
                </label>
                <p className="mb-2 mt-4 text-xs font-bold text-slate-700">{labels.popular}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {filteredPlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setSelectedPlatformId(platform.id)}
                      className={cn(
                        "flex h-12 items-center gap-3 rounded-lg border bg-white px-3 text-start text-sm font-semibold shadow-sm transition",
                        selectedPlatformId === platform.id
                          ? "border-[#6547b7] text-[#4f3596] ring-1 ring-[#6547b7]"
                          : "border-transparent text-slate-800 hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <PlatformMark platform={platform} />
                      <span className="truncate">{platform.name}</span>
                      {selectedPlatformId === platform.id ? <Check className="ms-auto h-4 w-4 shrink-0 text-[#6547b7]" /> : null}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!selectedPlatform}
                  onClick={() => {
                    setMethod(selectedPlatform?.supportsAutoSync && canUseAutoSync ? "auto" : "manual");
                    setStep("method");
                  }}
                  className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#5b3daf] px-4 text-sm font-bold text-white transition hover:bg-[#4e329b] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {labels.continue}
                </button>
              </div>
            ) : null}

            {step === "method" && selectedPlatform ? (
              <div className="mx-auto max-w-2xl">
                <div className="mb-7 flex flex-col items-center text-center">
                  <PlatformMark platform={selectedPlatform} large />
                  <p className="mt-3 text-xs text-slate-500">
                    {labels.linking} <strong className="text-slate-800">{selectedPlatform.name}</strong>{" "}
                    <button type="button" onClick={() => setStep("platform")} className="font-semibold text-[#5b3daf] underline underline-offset-2">
                      {labels.changePlatform}
                    </button>
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MethodCard
                    active={method === "auto"}
                    disabled={!autoSyncAvailable}
                    recommended={autoSyncAvailable}
                    icon={RefreshCw}
                    title={labels.autoTitle}
                    detail={autoSyncAvailable
                      ? selectedPlatform.id === "ctrader"
                        ? labels.ctraderAutoDetail
                        : selectedPlatform.id === "tradelocker"
                          ? labels.tradeLockerAutoDetail
                        : labels.autoDetail
                      : labels.mt5Only}
                    onClick={() => setMethod("auto")}
                    recommendedLabel={labels.recommended}
                  />
                  <MethodCard
                    active={method === "file"}
                    icon={FileUp}
                    title={labels.fileTitle}
                    detail={labels.fileDetail}
                    onClick={() => setMethod("file")}
                    recommendedLabel={labels.recommended}
                  />
                  <MethodCard
                    active={method === "manual"}
                    icon={PenLine}
                    title={labels.manualTitle}
                    detail={labels.manualDetail}
                    onClick={() => setMethod("manual")}
                    recommendedLabel={labels.recommended}
                  />
                </div>
                <button
                  type="button"
                  onClick={continueFromMethod}
                  className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#5b3daf] px-4 text-sm font-bold text-white transition hover:bg-[#4e329b]"
                >
                  {method === "file" ? labels.fileRedirect : labels.continue}
                </button>
              </div>
            ) : null}

            {step === "connect" && selectedPlatform ? (
              <div className="mx-auto max-w-3xl">
                {errorMessage ? (
                  <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                ) : null}
                {method === "auto" ? (
                  selectedPlatform.id === "ctrader" ? (
                    <CtraderConnectStep labels={labels} />
                  ) : selectedPlatform.id === "tradelocker" ? (
                    <TradeLockerConnectStep labels={labels} onCreated={onAccountsChanged} onDone={closeWizard} />
                  ) : (
                    <Mt5DirectConnectStep labels={labels} onCreated={onAccountsChanged} onDone={closeWizard} />
                  )
                ) : (
                  <div className="mx-auto max-w-xl">
                    <TradingAccountForm
                      variant="wizard"
                      defaults={{
                        name: selectedPlatform.name,
                        platform: selectedPlatform.id === "other" ? "" : selectedPlatform.name,
                        broker: selectedPlatform.id === "other" ? "" : selectedPlatform.name,
                        currency: "USD",
                      }}
                      onSubmit={onSaveManual}
                      onCancel={goBack}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
