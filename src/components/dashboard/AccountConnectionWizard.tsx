"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileUp,
  KeyRound,
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
type ImportMethod = "auto" | "key" | "file" | "manual";

type PlatformOption = {
  id: string;
  name: string;
  searchTerms: string;
  logo?: string;
  tileClassName?: string;
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
  code?: string;
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
    tileClassName: "border-lime-100 bg-[#f7f9f3]",
    supportsAutoSync: true,
  },
  {
    id: "mt4",
    name: "MetaTrader 4",
    searchTerms: "metatrader 4 mt4 metaquotes",
    logo: "/images/meta04.png",
    tileClassName: "border-orange-100 bg-[#fff8f1]",
    supportsAutoSync: false,
  },
  {
    id: "ctrader",
    name: "cTrader",
    searchTerms: "ctrader spotware broker",
    logo: "/images/ctrader.svg",
    tileClassName: "border-rose-100 bg-rose-50",
    supportsAutoSync: true,
  },
  {
    id: "tradelocker",
    name: "TradeLocker",
    searchTerms: "tradelocker prop firm broker",
    logo: "/images/tradelocker.png",
    tileClassName: "border-slate-800 bg-slate-950",
    supportsAutoSync: true,
  },
  {
    id: "tradingview",
    name: "TradingView",
    searchTerms: "tradingview broker charts",
    logo: "/images/tradingview.svg",
    tileClassName: "border-blue-100 bg-blue-50",
    supportsAutoSync: false,
  },
  {
    id: "other",
    name: "Other broker",
    searchTerms: "other broker prop firm platform",
    icon: Landmark,
    tileClassName: "border-emerald-100 bg-emerald-50 text-emerald-700",
    supportsAutoSync: false,
  },
];

const englishText = {
  eyebrow: "Add trading account",
  chooseTitle: "Choose broker or trading platform",
  chooseSubtitle: "Select the platform that holds your trading history.",
  searchPlaceholder: "Search broker, prop firm or trading platform",
  popular: "Popular platforms",
  noPlatforms: "No platforms found. Try a different search.",
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
  keyTitle: "Key generator",
  keyDetailMt5: "Generate a key and connect MT5 with the Expert Advisor",
  keyDetailMt4: "Generate a key and connect MT4 with the Expert Advisor",
  journalRequired: "Requires access to automatic journal sync",
  downloadExpert: "Download Expert Advisor",
  downloadExpertHint: "The download contains the EA and setup guide. A browser cannot install files into MetaTrader automatically.",
  setupKey: "Generate and copy the connection key above.",
  setupDownload: "Download the EA and copy it into MetaTrader's data folder under MQL5/Experts or MQL4/Experts.",
  setupAllow: "In MetaTrader, allow WebRequest for the journal API address shown above.",
  setupAttach: "Attach the EA to one chart and paste the key into JOURNAL_UPLOAD_SECRET. Keep MetaTrader running to sync trades.",
  mt4CompileHint: "The MT4 download includes a ready-to-use .ex4 file and editable .mq4 source. Copy the .ex4 file into MQL4/Experts.",
  manualTitle: "Add manually",
  manualDetail: "Create an account and enter trades yourself",
  mt5Only: "Available for MetaTrader 5, cTrader and TradeLocker",
  connectTitle: "Connect MetaTrader 5",
  mt4ConnectTitle: "Connect MetaTrader 4",
  ctraderConnectTitle: "Connect cTrader",
  tradeLockerConnectTitle: "Connect TradeLocker",
  manualConnectTitle: "Add account details",
  fileRedirect: "Open trade importer",
  supported: "Supported workflow",
  encrypted: "Secure connection key",
  journalReady: "Automatic journal updates",
  noPassword: "Your cTrader password stays on cTrader and is never shared with us",
  connectionSetup: "Connection setup",
  history: "Trade history",
  allRecords: "Import all available records",
  fromNow: "Sync new trades from now",
  generate: "Generate connection key",
  generating: "Generating secure key...",
  generated: "Your connection key is ready.",
  generateFailed: "Could not generate the connection key.",
  apiUrl: "Journal API address",
  secret: "Connection key",
  reveal: "Reveal key",
  hide: "Hide key",
  copy: "Copy",
  done: "Done",
  server: "Broker server",
  serverPlaceholder: "Example: ICMarketsSC-MT5-2",
  login: "MT5 login",
  loginPlaceholder: "Trading account number",
  investorPassword: "MT5 password",
  investorPasswordHint: "Enter the read-only investor password when available; otherwise use the account password.",
  showPassword: "Show password",
  hidePassword: "Hide password",
  connectAccount: "Connect account",
  connectingAccount: "Checking MT5 credentials...",
  connectedAccount: "Account connected. Initial synchronization has started.",
  connectionFailed: "Could not connect to the MT5 account.",
  mt5AuthFailed: "MT5 rejected the credentials. Verify the numeric login, password, and exact broker server.",
  mt5NotConnected: "MT5 could not connect to the broker. Verify the server name and that the account is active.",
  mt5ServiceUnavailable: "The MT5 connection service is temporarily unavailable. Please try again shortly.",
  mt5Timeout: "The MT5 broker connection timed out. Please try again.",
  ctraderAuthorize: "Continue to cTrader and enter password",
  ctraderOAuthDetail: "You will enter your cTrader email and password on cTrader's secure page, then grant read-only account access. We never receive or store that password.",
  ctraderTokenSafe: "OAuth tokens are encrypted at rest",
  environment: "Environment",
  live: "Live",
  demo: "Demo",
  tradeLockerEmail: "TradeLocker email",
  tradeLockerPassword: "TradeLocker password",
  tradeLockerServerPlaceholder: "Server from your broker welcome email",
  tradeLockerServerHint: "Copy the Server exactly as shown in the broker or prop-firm welcome email. Also select the matching LIVE or DEMO environment.",
  tradeLockerConnecting: "Connecting to TradeLocker...",
  tradeLockerConnect: "Connect TradeLocker",
  chooseTradeLockerAccount: "Choose TradeLocker Account",
  tradeLockerPasswordSafe: "Your password is used only to authenticate and is never stored.",
  selectAccount: "Connect",
  tradeLockerConnected: "TradeLocker account connected and initial synchronization started.",
  tradeLockerFailed: "Unable to connect to TradeLocker.",
  tradeLockerInvalidCredentials: "The TradeLocker email or password is incorrect.",
  tradeLockerServerNotFound: "Server not found. Copy the exact Server from your broker email and verify LIVE or DEMO.",
  tradeLockerAuthFailed: "Login was rejected. Verify the email, password, exact Server, and LIVE or DEMO.",
  tradeLockerRateLimited: "TradeLocker is receiving too many requests. Please try again shortly.",
};

const persianText: typeof englishText = {
  eyebrow: "افزودن حساب معاملاتی",
  chooseTitle: "کارگزار یا پلتفرم معاملاتی را انتخاب کنید",
  chooseSubtitle: "پلتفرمی را انتخاب کنید که تاریخچه معاملات شما در آن قرار دارد.",
  searchPlaceholder: "جستجوی کارگزار، پراپ فرم یا پلتفرم",
  popular: "پلتفرم‌های محبوب",
  noPlatforms: "پلتفرمی پیدا نشد. عبارت دیگری جستجو کنید.",
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
  keyTitle: "ساخت کلید اتصال",
  keyDetailMt5: "با ساخت کلید و نصب اکسپرت، MT5 را متصل کنید",
  keyDetailMt4: "با ساخت کلید و نصب اکسپرت، MT4 را متصل کنید",
  journalRequired: "به دسترسی همگام‌سازی خودکار ژورنال نیاز دارد",
  downloadExpert: "دانلود اکسپرت",
  downloadExpertHint: "فایل دانلودی شامل اکسپرت و راهنمای نصب است. مرورگر نمی‌تواند فایل را خودکار داخل متاتریدر نصب کند.",
  setupKey: "کلید اتصال را با دکمهٔ بالا بسازید و کپی کنید.",
  setupDownload: "اکسپرت را دانلود کنید و در پوشهٔ MQL5/Experts یا MQL4/Experts داخل Data Folder متاتریدر کپی کنید.",
  setupAllow: "در تنظیمات متاتریدر، WebRequest را برای آدرس API نمایش‌داده‌شده در بالا مجاز کنید.",
  setupAttach: "اکسپرت را روی یک چارت اجرا کنید و کلید را در JOURNAL_UPLOAD_SECRET وارد کنید. برای همگام‌سازی، متاتریدر باید باز بماند.",
  mt4CompileHint: "بستهٔ MT4 شامل فایل آمادهٔ .ex4 و سورس .mq4 است. فایل .ex4 را داخل MQL4/Experts کپی کنید.",
  manualTitle: "ثبت دستی",
  manualDetail: "حساب را بسازید و معاملات را دستی ثبت کنید",
  mt5Only: "برای MetaTrader 5، cTrader و TradeLocker در دسترس است",
  connectTitle: "اتصال MetaTrader 5",
  mt4ConnectTitle: "اتصال MetaTrader 4",
  ctraderConnectTitle: "اتصال cTrader",
  tradeLockerConnectTitle: "اتصال TradeLocker",
  manualConnectTitle: "اطلاعات حساب را وارد کنید",
  fileRedirect: "باز کردن بخش ورود فایل",
  supported: "قابلیت‌های اتصال",
  encrypted: "کلید اتصال امن",
  journalReady: "به‌روزرسانی خودکار ژورنال",
  noPassword: "رمز cTrader فقط در سایت cTrader وارد می‌شود و با ما به‌اشتراک گذاشته نمی‌شود",
  connectionSetup: "تنظیم اتصال",
  history: "تاریخچه معاملات",
  allRecords: "ورود همه سوابق موجود",
  fromNow: "همگام‌سازی معاملات جدید از این لحظه",
  generate: "ساخت کلید اتصال",
  generating: "در حال ساخت کلید امن...",
  generated: "کلید اتصال شما آماده است.",
  generateFailed: "ساخت کلید اتصال ناموفق بود.",
  apiUrl: "آدرس API ژورنال",
  secret: "کلید اتصال",
  reveal: "نمایش کلید",
  hide: "پنهان کردن کلید",
  copy: "کپی",
  done: "تمام",
  server: "سرور بروکر",
  serverPlaceholder: "مثال: ICMarketsSC-MT5-2",
  login: "شماره ورود MT5",
  loginPlaceholder: "شماره حساب معاملاتی",
  investorPassword: "رمز حساب MT5",
  investorPasswordHint: "اگر رمز فقط‌خواندنی Investor دارید آن را وارد کنید؛ در غیر این صورت رمز حساب را وارد کنید.",
  showPassword: "نمایش رمز",
  hidePassword: "پنهان کردن رمز",
  connectAccount: "اتصال حساب",
  connectingAccount: "در حال بررسی اطلاعات MT5...",
  connectedAccount: "حساب متصل شد و همگام‌سازی اولیه آغاز شد.",
  connectionFailed: "اتصال به حساب MT5 انجام نشد.",
  mt5AuthFailed: "MT5 اطلاعات ورود را رد کرد. شماره حساب، رمز و نام دقیق سرور بروکر را بررسی کنید.",
  mt5NotConnected: "MT5 نتوانست به بروکر متصل شود. نام Server و فعال بودن حساب را بررسی کنید.",
  mt5ServiceUnavailable: "سرویس اتصال MT5 موقتاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید.",
  mt5Timeout: "زمان اتصال به بروکر MT5 تمام شد؛ دوباره تلاش کنید.",
  ctraderAuthorize: "ادامه در cTrader و وارد کردن رمز",
  ctraderOAuthDetail: "ایمیل و رمز cTrader را در صفحه امن خود cTrader وارد می‌کنید و سپس دسترسی فقط‌خواندنی می‌دهید. رمز شما به سایت ما ارسال یا در آن ذخیره نمی‌شود.",
  ctraderTokenSafe: "توکن‌های OAuth به‌صورت رمزنگاری‌شده ذخیره می‌شوند",
  environment: "محیط",
  live: "واقعی",
  demo: "آزمایشی",
  tradeLockerEmail: "ایمیل TradeLocker",
  tradeLockerPassword: "رمز عبور TradeLocker",
  tradeLockerServerPlaceholder: "Server درج‌شده در ایمیل بروکر",
  tradeLockerServerHint: "مقدار Server را دقیقاً از ایمیل خوش‌آمدگویی بروکر یا پراپ‌فرم کپی کنید و محیط درست واقعی یا آزمایشی را انتخاب کنید.",
  tradeLockerConnecting: "در حال اتصال به TradeLocker...",
  tradeLockerConnect: "اتصال TradeLocker",
  chooseTradeLockerAccount: "انتخاب حساب TradeLocker",
  tradeLockerPasswordSafe: "رمز عبور فقط برای احراز هویت استفاده می‌شود و هرگز ذخیره نمی‌شود.",
  selectAccount: "اتصال",
  tradeLockerConnected: "حساب TradeLocker متصل شد و همگام‌سازی اولیه آغاز شد.",
  tradeLockerFailed: "اتصال به TradeLocker انجام نشد.",
  tradeLockerInvalidCredentials: "ایمیل یا رمز عبور TradeLocker صحیح نیست.",
  tradeLockerServerNotFound: "سرور پیدا نشد. مقدار Server را دقیقاً از ایمیل بروکر کپی کنید و واقعی یا آزمایشی بودن حساب را بررسی کنید.",
  tradeLockerAuthFailed: "ورود رد شد. ایمیل، رمز، Server دقیق و محیط واقعی یا آزمایشی را بررسی کنید.",
  tradeLockerRateLimited: "درخواست‌ها به TradeLocker بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید.",
};

function PlatformMark({ platform, large = false }: { platform: PlatformOption; large?: boolean }) {
  const Icon = platform.icon;
  const sizeClass = large ? "h-16 w-16" : "h-12 w-12";

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border",
        sizeClass,
        platform.tileClassName
      )}
      aria-hidden="true"
    >
      {platform.id === "mt5" ? (
        <Image src={platform.logo!} alt="" width={large ? 92 : 68} height={large ? 70 : 52} className={cn("absolute max-w-none", large ? "top-[5px]" : "top-[3px]")} style={{ clipPath: "inset(0 0 22% 0)" }} />
      ) : platform.id === "mt4" ? (
        <Image src={platform.logo!} alt="" width={large ? 246 : 182} height={large ? 63 : 47} className={cn("absolute left-[1px] max-w-none", large ? "top-[1px]" : "top-[2px]")} />
      ) : platform.logo ? (
        <Image src={platform.logo} alt="" width={large ? 42 : 32} height={large ? 42 : 32} className="object-contain" />
      ) : Icon ? (
        <Icon className={large ? "h-7 w-7" : "h-6 w-6"} strokeWidth={1.8} />
      ) : null}
    </span>
  );
}

function ProgressBar({ step }: { step: WizardStep }) {
  const width = step === "platform" ? "34%" : step === "method" ? "67%" : "100%";

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-100" aria-hidden="true">
      <div className="h-full rounded-full bg-violet-700 transition-[width] duration-300" style={{ width }} />
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
        "relative flex min-h-[186px] flex-col items-start rounded-2xl border px-5 py-5 text-start transition duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2",
        active ? "border-violet-600 bg-violet-50/60 shadow-[0_10px_28px_-18px_rgba(91,61,175,0.65)] ring-1 ring-violet-600" : "border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md",
        disabled && "cursor-not-allowed opacity-50 hover:translate-y-0 hover:border-slate-200 hover:shadow-sm"
      )}
      aria-pressed={active}
    >
      {recommended ? (
        <span className="absolute end-4 top-5 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-800">
          {recommendedLabel}
        </span>
      ) : null}
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl", active ? "bg-violet-700 text-white" : "bg-violet-50 text-violet-700")}>
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <strong className="mt-5 text-sm font-bold text-slate-950">{title}</strong>
      <span className="mt-1.5 text-xs leading-5 text-slate-600">{detail}</span>
    </button>
  );
}

function MetatraderKeyConnectStep({
  labels,
  platform,
  onCreated,
  onDone,
}: {
  labels: typeof englishText;
  platform: "MT4" | "MT5";
  onCreated: () => Promise<void>;
  onDone: () => void;
}) {
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
      const response = await fetch("/api/trading-accounts/mt5-quick-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = (await response.json()) as QuickConnectResponse;

      if (!response.ok || !data.ok || !data.secret) {
        throw new Error(data.error || labels.generateFailed);
      }

      setSecret(data.secret);
      setApiUrl((data.apiUrl || apiUrl).replace(/\/api\/mt5\/journal$/, ""));
      setStatus("success");
      setMessage(labels.generated);
      void onCreated().catch(() => {
        // The connection key was created even if the account list refresh fails.
      });
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
        <p className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {platform === "MT4" ? labels.keyDetailMt4 : labels.keyDetailMt5}
        </p>

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

        {status !== "success" && <button
          type="button"
          onClick={generateConnection}
          disabled={status === "saving"}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5b3daf] px-4 text-sm font-bold text-white transition hover:bg-[#4e329b] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {status === "saving" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {status === "saving" ? labels.generating : labels.generate}
        </button>}

        <a
          href={`/api/downloads/trade-journal-recorder?platform=${platform}`}
          download={`Inguardy${platform}Expert.zip`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#5b3daf] bg-white px-4 text-sm font-bold text-[#5b3daf] transition hover:bg-violet-50"
        >
          <Download className="h-4 w-4" />
          {labels.downloadExpert} {platform}
        </a>
        <p className="text-xs leading-5 text-slate-500">{labels.downloadExpertHint}</p>
        {status === "success" && <button type="button" onClick={onDone} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#5b3daf] px-4 text-sm font-bold text-white transition hover:bg-[#4e329b]"><Check className="h-4 w-4" />{labels.done}</button>}

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
          <PlatformMark platform={platform === "MT4" ? platforms[1] : platforms[0]} />
          <div>
            <strong className="block text-base text-slate-950">MetaTrader {platform === "MT4" ? "4" : "5"}</strong>
            <span className="text-xs text-slate-500">{labels.supported}</span>
          </div>
        </div>
        <ol className="mt-5 grid gap-3 text-sm leading-6 text-slate-600">
          {[labels.setupKey, labels.setupDownload, labels.setupAllow, labels.setupAttach].map((item, index) => (
            <li key={item} className="flex items-start gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-100 text-[11px] font-bold text-[#6547b7]">{index + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
        {platform === "MT4" && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{labels.mt4CompileHint}</p>}
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
        const errorByCode: Record<string, string> = {
          MT5_AUTH_FAILED: labels.mt5AuthFailed,
          MT5_NOT_CONNECTED: labels.mt5NotConnected,
          MT5_TERMINAL_CLOSED: labels.mt5ServiceUnavailable,
          MT5_INITIALIZE_FAILED: labels.mt5ServiceUnavailable,
          MT5_TIMEOUT: labels.mt5Timeout,
        };
        throw new Error((data.code && errorByCode[data.code]) || data.message || labels.connectionFailed);
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
        const errorByCode: Record<string, string> = {
          INVALID_CREDENTIALS: labels.tradeLockerInvalidCredentials,
          SERVER_NOT_FOUND: labels.tradeLockerServerNotFound,
          AUTH_FAILED: labels.tradeLockerAuthFailed,
          RATE_LIMITED: labels.tradeLockerRateLimited,
        };
        throw new Error((result.code && errorByCode[result.code]) || result.message || labels.tradeLockerFailed);
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
              <span className="mt-1 block text-[11px] font-normal leading-5 text-slate-500">{labels.tradeLockerServerHint}</span>
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
  presentation = "overlay",
  initialPlatformId,
  canUseAutoSync,
  errorMessage,
  onClose,
  onSaveManual,
  onAccountsChanged,
}: {
  open: boolean;
  presentation?: "overlay" | "page";
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
  const isMetatrader = selectedPlatformId === "mt4" || selectedPlatformId === "mt5";
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
      setMethod(canUseAutoSync ? initialPlatformId === "mt4" ? "key" : "auto" : "manual");
      setStep("connect");
    }
    const previousOverflow = document.body.style.overflow;
    if (presentation === "overlay") document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWizard();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (presentation === "overlay") document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canUseAutoSync, closeWizard, initialPlatformId, open, presentation]);

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
      className={cn(
        "bg-[radial-gradient(circle_at_15%_12%,#f0eaff_0%,transparent_30%),radial-gradient(circle_at_88%_85%,#f2edff_0%,transparent_32%),#fbfaff] text-slate-950",
        presentation === "overlay"
          ? "fixed inset-0 z-[100] overflow-y-auto"
          : "relative min-h-[calc(100dvh-140px)] overflow-hidden rounded-3xl border border-violet-100 shadow-sm"
      )}
      role={presentation === "overlay" ? "dialog" : undefined}
      aria-modal={presentation === "overlay" ? true : undefined}
      aria-labelledby="account-wizard-title"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={closeWizard}
        className={cn("end-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700 sm:end-8 sm:top-7", presentation === "overlay" ? "fixed" : "absolute")}
        aria-label={labels.close}
        title={labels.close}
      >
        <X className="h-6 w-6" />
      </button>

      {step !== "platform" ? (
        <button
          type="button"
          onClick={goBack}
          className={cn("start-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700 sm:start-8 sm:top-7", presentation === "overlay" ? "fixed" : "absolute")}
          aria-label={labels.back}
          title={labels.back}
        >
          <ArrowLeft className={cn("h-6 w-6", isRtl && "rotate-180")} />
        </button>
      ) : null}

      <div className={cn("mx-auto flex w-full max-w-5xl flex-col px-5 pb-8 pt-20 sm:px-10 sm:pt-9", presentation === "overlay" ? "min-h-full" : "min-h-[calc(100dvh-140px)]")}>
        <div className="mx-auto w-[min(100%,280px)]">
          <ProgressBar step={step} />
        </div>

        <main className="mx-auto flex w-full flex-1 flex-col justify-center py-8 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">
            <header className="mb-8 text-center">
              <p className="mx-auto inline-flex items-center rounded-full border border-violet-100 bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">{labels.eyebrow}</p>
              <h2 id="account-wizard-title" className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-[32px]">
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
                       : method === "key"
                         ? selectedPlatformId === "mt4" ? labels.mt4ConnectTitle : labels.connectTitle
                         : labels.manualConnectTitle}
              </h2>
              {step === "platform" ? <p className="mt-2 text-sm text-slate-500 sm:text-base">{labels.chooseSubtitle}</p> : null}
            </header>

            {step === "platform" ? (
              <div className="mx-auto max-w-2xl">
                <label className="relative block">
                  <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={labels.searchPlaceholder}
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-white pe-4 ps-12 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  />
                </label>
                <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-slate-600">{labels.popular}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredPlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setSelectedPlatformId(platform.id)}
                      className={cn(
                        "group flex min-h-[74px] items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-start text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2",
                        selectedPlatformId === platform.id
                          ? "border-violet-600 bg-violet-50/60 text-violet-900 shadow-[0_9px_25px_-16px_rgba(91,61,175,0.7)] ring-1 ring-violet-600"
                          : "border-slate-200 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                      )}
                      aria-pressed={selectedPlatformId === platform.id}
                    >
                      <PlatformMark platform={platform} />
                      <span className="min-w-0 flex-1 truncate">{platform.name}</span>
                      {selectedPlatformId === platform.id ? <span className="ms-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /></span> : null}
                    </button>
                  ))}
                </div>
                {filteredPlatforms.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">{labels.noPlatforms}</p> : null}
                <button
                  type="button"
                  disabled={!selectedPlatform}
                  onClick={() => {
                     setMethod(selectedPlatform?.supportsAutoSync && canUseAutoSync ? "auto" : (selectedPlatform?.id === "mt4" || selectedPlatform?.id === "mt5") && canUseAutoSync ? "key" : "manual");
                    setStep("method");
                  }}
                  className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white shadow-[0_10px_22px_-12px_rgba(91,61,175,0.8)] transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                >
                  {labels.continue}
                  <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
                </button>
              </div>
            ) : null}

            {step === "method" && selectedPlatform ? (
              <div className="mx-auto w-full max-w-3xl">
                <div className="mb-7 flex items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                  <PlatformMark platform={selectedPlatform} large />
                    <div className="min-w-0 text-start">
                      <p className="text-xs text-slate-500">{labels.linking}</p>
                      <strong className="block truncate text-sm font-bold text-slate-900 sm:text-base">{selectedPlatform.name}</strong>
                    </div>
                  </div>
                  <button type="button" onClick={() => setStep("platform")} className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">
                    {labels.changePlatform}
                  </button>
                </div>
                 <div className={cn("grid gap-3", selectedPlatform.id === "mt4" ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
                  {selectedPlatform.id !== "mt4" && (
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
                      : selectedPlatform.supportsAutoSync ? labels.journalRequired : labels.mt5Only}
                    onClick={() => setMethod("auto")}
                   recommendedLabel={labels.recommended}
                   />
                  )}
                   <MethodCard
                     active={method === (isMetatrader ? "key" : "file")}
                     disabled={isMetatrader && !canUseAutoSync}
                     recommended={selectedPlatform.id === "mt4" && canUseAutoSync}
                     icon={isMetatrader ? KeyRound : FileUp}
                     title={isMetatrader ? labels.keyTitle : labels.fileTitle}
                     detail={isMetatrader ? !canUseAutoSync ? labels.journalRequired : selectedPlatform.id === "mt4" ? labels.keyDetailMt4 : labels.keyDetailMt5 : labels.fileDetail}
                     onClick={() => setMethod(isMetatrader ? "key" : "file")}
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
                  className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white shadow-[0_10px_22px_-12px_rgba(91,61,175,0.8)] transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
                >
                  {method === "file" ? labels.fileRedirect : labels.continue}
                  <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
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
                 {method === "key" ? (
                   <MetatraderKeyConnectStep key={selectedPlatform.id} labels={labels} platform={selectedPlatform.id === "mt4" ? "MT4" : "MT5"} onCreated={onAccountsChanged} onDone={closeWizard} />
                 ) : method === "auto" ? (
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
