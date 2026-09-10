"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Crosshair,
  Database,
  Download,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  calculatePositionSize,
  type PositionSizingDirection,
  type PositionSizingIssueCode,
  type PositionSizingRiskMode,
  type PositionSizingWarningCode,
} from "@/lib/position-sizing";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type SymbolOption = {
  symbol: string;
  contractSize: string | null;
  tickSize: string | null;
  tickValue: string | null;
  volumeMin: string | null;
  volumeMax: string | null;
  volumeStep: string | null;
  digits: number | null;
  baseCurrency: string | null;
  quoteCurrency: string | null;
};

type AccountOption = {
  id: string;
  name: string;
  broker: string | null;
  platform: string | null;
  currency: string;
  balance: string | null;
  symbols: SymbolOption[];
};

const MANUAL_ACCOUNT = "__manual_account__";
const PRESET_PREFIX = "__preset__:";

type PresetSymbol = SymbolOption & {
  category: "Forex" | "Metals" | "Indices" | "Crypto";
};

function presetSymbol(
  symbol: string,
  category: PresetSymbol["category"],
  tickSize: string,
  tickValue: string,
  contractSize: string,
  digits: number,
  baseCurrency: string | null,
  quoteCurrency: string | null
): PresetSymbol {
  return {
    symbol,
    category,
    tickSize,
    tickValue,
    contractSize,
    digits,
    baseCurrency,
    quoteCurrency,
    volumeMin: "0.01",
    volumeMax: "100",
    volumeStep: "0.01",
  };
}

const POPULAR_SYMBOLS: PresetSymbol[] = [
  presetSymbol("EURUSD", "Forex", "0.00001", "1", "100000", 5, "EUR", "USD"),
  presetSymbol("GBPUSD", "Forex", "0.00001", "1", "100000", 5, "GBP", "USD"),
  presetSymbol("USDJPY", "Forex", "0.001", "0.67", "100000", 3, "USD", "JPY"),
  presetSymbol("USDCHF", "Forex", "0.00001", "1.2", "100000", 5, "USD", "CHF"),
  presetSymbol("AUDUSD", "Forex", "0.00001", "1", "100000", 5, "AUD", "USD"),
  presetSymbol("USDCAD", "Forex", "0.00001", "0.74", "100000", 5, "USD", "CAD"),
  presetSymbol("NZDUSD", "Forex", "0.00001", "1", "100000", 5, "NZD", "USD"),
  presetSymbol("EURJPY", "Forex", "0.001", "0.67", "100000", 3, "EUR", "JPY"),
  presetSymbol("GBPJPY", "Forex", "0.001", "0.67", "100000", 3, "GBP", "JPY"),
  presetSymbol("EURGBP", "Forex", "0.00001", "1.25", "100000", 5, "EUR", "GBP"),
  presetSymbol("XAUUSD", "Metals", "0.01", "1", "100", 2, "XAU", "USD"),
  presetSymbol("XAGUSD", "Metals", "0.001", "5", "5000", 3, "XAG", "USD"),
  presetSymbol("US30", "Indices", "1", "1", "1", 0, null, "USD"),
  presetSymbol("NAS100", "Indices", "0.1", "0.1", "1", 1, null, "USD"),
  presetSymbol("SPX500", "Indices", "0.1", "0.1", "1", 1, null, "USD"),
  presetSymbol("BTCUSD", "Crypto", "0.01", "0.01", "1", 2, "BTC", "USD"),
  presetSymbol("ETHUSD", "Crypto", "0.01", "0.01", "1", 2, "ETH", "USD"),
];

const DEFAULT_PRESET = POPULAR_SYMBOLS[0];

function presetKey(symbol: string) {
  return `${PRESET_PREFIX}${symbol}`;
}

const copy = {
  en: {
    eyebrow: "Risk Management Tool",
    title: "Position Size Calculator",
    description: "Calculate volume from your exact account risk and broker symbol specifications. This tool never places or changes an order.",
    calculatorOnly: "Calculation only — no trade execution",
    account: "Trading account",
    manualAccount: "Manual values",
    noAccounts: "No trading account is connected. You can still calculate manually.",
    connectAccount: "Connect an account",
    symbol: "Symbol",
    popularSymbols: "Popular symbols",
    presetData: "Standard preset — verify broker specifications",
    brokerData: "Synced broker data",
    manualData: "Manual specification",
    direction: "Direction",
    balance: "Account balance",
    riskMethod: "Risk method",
    riskPercent: "Risk percent",
    riskAmount: "Risk amount",
    riskValue: "Risk value",
    entry: "Entry price",
    stopLoss: "Stop loss",
    riskReward: "Risk / reward",
    advanced: "Broker specifications",
    tickSize: "Tick size",
    tickValue: "Tick value per lot",
    contractSize: "Contract size",
    minVolume: "Minimum volume",
    maxVolume: "Maximum volume",
    volumeStep: "Volume step",
    recommendedLot: "Recommended lot",
    targetRisk: "Target risk",
    actualRisk: "Actual risk",
    takeProfit: "Take profit",
    stopDistance: "Stop distance",
    potentialReward: "Potential reward",
    riskPerLot: "Risk for 1 lot",
    emptyResult: "Enter valid trade and broker values to calculate the position size.",
    dataNote: "Tick value must be expressed in the account currency for one lot. Synced MT5 specifications use the broker value; manual values remain your responsibility.",
    disclaimer: "Educational risk-management estimate only. Verify the values in your trading terminal before placing an order.",
    accountMarket: "Account & market",
    riskSettings: "Risk settings",
    tradeLevels: "Trade levels",
    calculationSummary: "Position plan",
    lotUnit: "lot",
    fillPrices: "Enter the entry and stop-loss prices to see a safe position size.",
    downloadEa: "Download MT5 EA",
  },
  fa: {
    eyebrow: "ابزار مدیریت ریسک",
    title: "ماشین‌حساب حجم معامله",
    description: "حجم مناسب را براساس ریسک واقعی حساب و مشخصات نماد بروکر محاسبه می‌کند. این ابزار هیچ سفارشی باز یا ویرایش نمی‌کند.",
    calculatorOnly: "فقط محاسبه — بدون اجرای معامله",
    account: "حساب معاملاتی",
    manualAccount: "ورود دستی اطلاعات",
    noAccounts: "هنوز حساب معاملاتی متصل نیست؛ محاسبه دستی همچنان قابل استفاده است.",
    connectAccount: "اتصال حساب",
    symbol: "نماد",
    popularSymbols: "نمادهای پرکاربرد",
    presetData: "مشخصات استاندارد — با بروکر بررسی شود",
    brokerData: "داده همگام‌شده بروکر",
    manualData: "مشخصات دستی",
    direction: "جهت معامله",
    balance: "بالانس حساب",
    riskMethod: "روش تعیین ریسک",
    riskPercent: "درصد ریسک",
    riskAmount: "مبلغ ریسک",
    riskValue: "مقدار ریسک",
    entry: "قیمت ورود",
    stopLoss: "حد ضرر",
    riskReward: "ریسک به ریوارد",
    advanced: "مشخصات نماد بروکر",
    tickSize: "اندازه تیک",
    tickValue: "ارزش هر تیک برای یک لات",
    contractSize: "اندازه قرارداد",
    minVolume: "حداقل حجم",
    maxVolume: "حداکثر حجم",
    volumeStep: "گام تغییر حجم",
    recommendedLot: "حجم پیشنهادی",
    targetRisk: "ریسک هدف",
    actualRisk: "ریسک واقعی",
    takeProfit: "حد سود",
    stopDistance: "فاصله حد ضرر",
    potentialReward: "سود بالقوه",
    riskPerLot: "ریسک یک لات",
    emptyResult: "برای محاسبه حجم، اطلاعات معتبر معامله و نماد را وارد کنید.",
    dataNote: "ارزش تیک باید برای یک لات و به ارز حساب باشد. در MT5 متصل، مقدار بروکر استفاده می‌شود؛ صحت مقادیر دستی برعهده کاربر است.",
    disclaimer: "این خروجی فقط تخمین آموزشی مدیریت ریسک است. پیش از ثبت سفارش، مقادیر را در ترمینال معاملاتی بررسی کنید.",
    accountMarket: "حساب و بازار",
    riskSettings: "تنظیمات ریسک",
    tradeLevels: "سطوح معامله",
    calculationSummary: "برنامه معامله",
    lotUnit: "لات",
    fillPrices: "قیمت ورود و حد ضرر را وارد کنید تا حجم امن معامله محاسبه شود.",
    downloadEa: "دانلود EA متاتریدر ۵",
  },
} as const;

const errorCopy: Record<PositionSizingIssueCode, { en: string; fa: string }> = {
  INVALID_BALANCE: { en: "Account balance must be greater than zero.", fa: "بالانس حساب باید بیشتر از صفر باشد." },
  INVALID_RISK: { en: "Enter a valid risk value. Percentage risk cannot exceed 100%.", fa: "مقدار ریسک معتبر وارد کنید؛ ریسک درصدی نمی‌تواند بیشتر از ۱۰۰٪ باشد." },
  RISK_EXCEEDS_BALANCE: { en: "Risk amount cannot exceed the account balance.", fa: "مبلغ ریسک نمی‌تواند بیشتر از بالانس حساب باشد." },
  INVALID_ENTRY: { en: "Entry price must be greater than zero.", fa: "قیمت ورود باید بیشتر از صفر باشد." },
  INVALID_STOP_LOSS: { en: "Stop loss must be different from entry and greater than zero.", fa: "حد ضرر باید بیشتر از صفر و متفاوت از قیمت ورود باشد." },
  BUY_STOP_MUST_BE_BELOW_ENTRY: { en: "For a BUY, stop loss must be below entry.", fa: "برای معامله خرید، حد ضرر باید پایین‌تر از ورود باشد." },
  SELL_STOP_MUST_BE_ABOVE_ENTRY: { en: "For a SELL, stop loss must be above entry.", fa: "برای معامله فروش، حد ضرر باید بالاتر از ورود باشد." },
  INVALID_RISK_REWARD: { en: "Risk/reward must be greater than zero.", fa: "ریسک به ریوارد باید بیشتر از صفر باشد." },
  INVALID_TICK_SIZE: { en: "Tick size must be greater than zero.", fa: "اندازه تیک باید بیشتر از صفر باشد." },
  INVALID_TICK_VALUE: { en: "Tick value must be greater than zero.", fa: "ارزش تیک باید بیشتر از صفر باشد." },
  INVALID_VOLUME_RULES: { en: "Broker volume limits are not valid.", fa: "محدودیت‌های حجم بروکر معتبر نیستند." },
};

const warningCopy: Record<PositionSizingWarningCode, { en: string; fa: string }> = {
  HIGH_RISK_PERCENT: { en: "Risk above 5% per trade can cause severe drawdown.", fa: "ریسک بیشتر از ۵٪ در هر معامله می‌تواند افت سرمایه شدیدی ایجاد کند." },
  BELOW_MIN_VOLUME: { en: "The safe calculated volume is below the broker minimum. Avoid the trade or reduce the stop distance without breaking your setup.", fa: "حجم امن محاسبه‌شده از حداقل بروکر کمتر است؛ از معامله صرف‌نظر کنید یا فقط در صورت حفظ منطق ستاپ، فاصله حد ضرر را بازبینی کنید." },
  CAPPED_AT_MAX_VOLUME: { en: "The calculated volume exceeded the broker maximum and was capped.", fa: "حجم محاسبه‌شده بیشتر از سقف بروکر بود و به حداکثر مجاز محدود شد." },
};

function numeric(value: string, fallback = Number.NaN) {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textValue(value: string | null | undefined, fallback: string) {
  return value && Number(value) > 0 ? value : fallback;
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
  }
}

function number(value: number, digits = 5) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function initialSymbol(account: AccountOption | undefined) {
  return account?.symbols[0];
}

export function PositionSizingCalculator({ accounts }: { accounts: AccountOption[] }) {
  const { language } = useLanguage();
  const t = copy[language];
  const firstAccount = accounts[0];
  const firstSymbol = initialSymbol(firstAccount);
  const initialSpecification = firstSymbol || DEFAULT_PRESET;
  const [accountId, setAccountId] = useState(firstAccount?.id || MANUAL_ACCOUNT);
  const [symbolKey, setSymbolKey] = useState(firstSymbol?.symbol || presetKey(DEFAULT_PRESET.symbol));
  const [currency, setCurrency] = useState(firstAccount?.currency || "USD");
  const [balance, setBalance] = useState(firstAccount?.balance || "10000");
  const [direction, setDirection] = useState<PositionSizingDirection>("BUY");
  const [riskMode, setRiskMode] = useState<PositionSizingRiskMode>("PERCENT");
  const [riskValue, setRiskValue] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [riskReward, setRiskReward] = useState("2");
  const [tickSize, setTickSize] = useState(textValue(initialSpecification.tickSize, "0.00001"));
  const [tickValue, setTickValue] = useState(textValue(initialSpecification.tickValue, "1"));
  const [contractSize, setContractSize] = useState(textValue(initialSpecification.contractSize, "100000"));
  const [minVolume, setMinVolume] = useState(textValue(initialSpecification.volumeMin, "0.01"));
  const [maxVolume, setMaxVolume] = useState(textValue(initialSpecification.volumeMax, "100"));
  const [volumeStep, setVolumeStep] = useState(textValue(initialSpecification.volumeStep, "0.01"));
  const [digits, setDigits] = useState(initialSpecification.digits ?? 5);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const selectedBrokerSymbol = selectedAccount?.symbols.find((symbol) => symbol.symbol === symbolKey);
  const selectedPreset = POPULAR_SYMBOLS.find((symbol) => presetKey(symbol.symbol) === symbolKey);
  const selectedSymbol = selectedBrokerSymbol || selectedPreset || DEFAULT_PRESET;
  const usesBrokerData = Boolean(selectedBrokerSymbol?.tickSize && selectedBrokerSymbol?.tickValue);
  const usesPresetData = Boolean(selectedPreset);

  function applySymbol(symbol: SymbolOption, nextKey: string) {
    setSymbolKey(nextKey);
    setTickSize(textValue(symbol.tickSize, "0.00001"));
    setTickValue(textValue(symbol.tickValue, "1"));
    setContractSize(textValue(symbol.contractSize, "100000"));
    setMinVolume(textValue(symbol.volumeMin, "0.01"));
    setMaxVolume(textValue(symbol.volumeMax, "100"));
    setVolumeStep(textValue(symbol.volumeStep, "0.01"));
    setDigits(symbol.digits ?? 5);
    setEntryPrice("");
    setStopLoss("");
  }

  function changeAccount(nextId: string) {
    setAccountId(nextId);
    const account = accounts.find((item) => item.id === nextId);
    if (!account) {
      setCurrency("USD");
      applySymbol(DEFAULT_PRESET, presetKey(DEFAULT_PRESET.symbol));
      return;
    }
    setCurrency(account.currency || "USD");
    if (account.balance) setBalance(account.balance);
    const accountSymbol = initialSymbol(account);
    applySymbol(accountSymbol || DEFAULT_PRESET, accountSymbol?.symbol || presetKey(DEFAULT_PRESET.symbol));
  }

  function changeSymbol(nextSymbol: string) {
    if (nextSymbol.startsWith(PRESET_PREFIX)) {
      const preset = POPULAR_SYMBOLS.find((item) => presetKey(item.symbol) === nextSymbol) || DEFAULT_PRESET;
      applySymbol(preset, presetKey(preset.symbol));
      return;
    }
    const brokerSymbol = selectedAccount?.symbols.find((item) => item.symbol === nextSymbol);
    if (brokerSymbol) applySymbol(brokerSymbol, brokerSymbol.symbol);
  }

  const result = useMemo(
    () => calculatePositionSize({
      balance: numeric(balance),
      riskMode,
      riskValue: numeric(riskValue),
      direction,
      entryPrice: numeric(entryPrice),
      stopLoss: numeric(stopLoss),
      riskReward: numeric(riskReward),
      tickSize: numeric(tickSize),
      tickValue: numeric(tickValue),
      minVolume: numeric(minVolume),
      maxVolume: maxVolume.trim() ? numeric(maxVolume) : null,
      volumeStep: numeric(volumeStep),
    }),
    [balance, direction, entryPrice, maxVolume, minVolume, riskMode, riskReward, riskValue, stopLoss, tickSize, tickValue, volumeStep]
  );

  const currentSymbol = selectedSymbol.symbol;
  const hasTradeInput = Boolean(entryPrice.trim() || stopLoss.trim());

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -top-24 end-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Calculator className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-blue-600 dark:text-blue-300">{t.eyebrow}</div>
              <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-slate-50 sm:text-3xl">{t.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">{t.description}</p>
            </div>
          </div>
          <div className="flex w-fit shrink-0 flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              {t.calculatorOnly}
            </div>
            <Link href="/api/downloads/trade-journal-recorder" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700">
              <Download className="h-4 w-4" />
              {t.downloadEa}
            </Link>
          </div>
        </div>
      </header>

      {!accounts.length ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <span>{t.noAccounts}</span>
          <Link href="/dashboard/accounts" className="font-bold underline underline-offset-4">{t.connectAccount}</Link>
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"><Crosshair className="h-5 w-5" /></div>
              <div>
                <div className="font-black text-slate-950 dark:text-white">{currentSymbol}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{usesBrokerData ? t.brokerData : usesPresetData ? t.presetData : t.manualData}</div>
              </div>
            </div>
            <div className={cn("rounded-full px-3 py-1 text-xs font-black", direction === "BUY" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300")}>{direction}</div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <FormGroup title={t.accountMarket}>
              <div className="grid gap-4 md:grid-cols-2">
            <Field label={t.account}>
              <select value={accountId} onChange={(event) => changeAccount(event.target.value)} className={inputClass}>
                <option value={MANUAL_ACCOUNT}>{t.manualAccount}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name} · {account.broker || account.platform || account.currency}</option>
                ))}
              </select>
            </Field>

            <Field label={t.symbol} badge={usesBrokerData ? t.brokerData : usesPresetData ? t.popularSymbols : undefined}>
              <select value={symbolKey} onChange={(event) => changeSymbol(event.target.value)} className={inputClass}>
                {selectedAccount?.symbols.length ? (
                  <optgroup label={t.brokerData}>
                    {selectedAccount.symbols.map((symbol) => <option key={symbol.symbol} value={symbol.symbol}>{symbol.symbol}</option>)}
                  </optgroup>
                ) : null}
                <optgroup label={t.popularSymbols}>
                  {POPULAR_SYMBOLS.map((symbol) => (
                    <option key={presetKey(symbol.symbol)} value={presetKey(symbol.symbol)}>{symbol.symbol} — {symbol.category}</option>
                  ))}
                </optgroup>
              </select>
            </Field>

              </div>
            </FormGroup>

            <FormGroup title={t.riskSettings}>
              <div className="grid gap-4 md:grid-cols-2">
            <Field label={t.direction}>
              <div className="grid grid-cols-2 gap-2">
                {(["BUY", "SELL"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDirection(item)}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-black transition",
                      direction === item
                        ? item === "BUY"
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                          : "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-200"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                    )}
                  >{item}</button>
                ))}
              </div>
            </Field>

            <Field label={`${t.balance} (${currency})`}>
              <NumberInput value={balance} onChange={setBalance} step="any" />
            </Field>

            <Field label={t.riskMethod}>
              <div className="grid grid-cols-2 gap-2">
                <ModeButton active={riskMode === "PERCENT"} onClick={() => setRiskMode("PERCENT")}>{t.riskPercent}</ModeButton>
                <ModeButton active={riskMode === "AMOUNT"} onClick={() => setRiskMode("AMOUNT")}>{t.riskAmount}</ModeButton>
              </div>
            </Field>

            <Field label={`${t.riskValue}${riskMode === "PERCENT" ? " (%)" : ` (${currency})`}`}>
              <NumberInput value={riskValue} onChange={setRiskValue} step="0.1" />
            </Field>
              </div>
            </FormGroup>

            <FormGroup title={t.tradeLevels}>
              <div className="grid gap-4 md:grid-cols-3">
            <Field label={t.entry}>
              <NumberInput value={entryPrice} onChange={setEntryPrice} step="any" placeholder="1.08500" />
            </Field>
            <Field label={t.stopLoss}>
              <NumberInput value={stopLoss} onChange={setStopLoss} step="any" placeholder="1.08000" />
            </Field>
            <Field label={`${t.riskReward} (1:R)`}>
              <NumberInput value={riskReward} onChange={setRiskReward} step="0.1" />
            </Field>
              </div>
            </FormGroup>

          <button
            type="button"
            onClick={() => setAdvancedOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/5"
          >
            <span className="flex items-center gap-2"><Database className="h-4 w-4 text-blue-500" />{t.advanced}</span>
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {advancedOpen ? (
            <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t.tickSize}><NumberInput value={tickSize} onChange={setTickSize} step="any" /></Field>
              <Field label={t.tickValue}><NumberInput value={tickValue} onChange={setTickValue} step="any" /></Field>
              <Field label={t.contractSize}><NumberInput value={contractSize} onChange={setContractSize} step="any" /></Field>
              <Field label={t.minVolume}><NumberInput value={minVolume} onChange={setMinVolume} step="any" /></Field>
              <Field label={t.maxVolume}><NumberInput value={maxVolume} onChange={setMaxVolume} step="any" /></Field>
              <Field label={t.volumeStep}><NumberInput value={volumeStep} onChange={setVolumeStep} step="any" /></Field>
              <p className="text-xs leading-6 text-slate-500 dark:text-slate-400 sm:col-span-2 lg:col-span-3">{t.dataNote}</p>
            </div>
          ) : null}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-sm dark:border-blue-500/20 dark:bg-slate-950">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 px-5 py-5 text-white sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold text-blue-50">{t.calculationSummary}</div>
                <div className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-black backdrop-blur">{currentSymbol} · {direction}</div>
              </div>
              <div className="mt-5 text-sm font-medium text-blue-50">{t.recommendedLot}</div>
              <div className="mt-1 flex items-baseline gap-2" dir="ltr">
                <span className="text-5xl font-black tabular-nums tracking-tight sm:text-6xl">{result.valid ? result.lotSize.toFixed(result.volumePrecision) : "—"}</span>
                <span className="text-sm font-bold text-blue-100">{t.lotUnit}</span>
              </div>
            </div>

            {!result.valid ? (
              <div className="flex items-start gap-3 px-5 py-5 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:px-6">
                <Target className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                <span>{entryPrice || stopLoss ? t.emptyResult : t.fillPrices}</span>
              </div>
            ) : null}
          </div>

          {result.valid ? (
            <div className="grid grid-cols-2 gap-3">
              <ResultCard icon={Target} label={t.takeProfit} value={number(result.takeProfit, digits)} tone="emerald" />
              <ResultCard icon={ShieldCheck} label={t.actualRisk} value={money(result.actualRiskAmount, currency)} tone="rose" />
              <ResultCard icon={CircleDollarSign} label={t.targetRisk} value={money(result.targetRiskAmount, currency)} tone="blue" />
              <ResultCard icon={Crosshair} label={t.potentialReward} value={money(result.potentialReward, currency)} tone="emerald" />
              <ResultCard icon={Crosshair} label={t.stopDistance} value={number(result.stopDistance, digits)} tone="slate" />
              <ResultCard icon={Calculator} label={t.riskPerLot} value={money(result.riskPerLot, currency)} tone="slate" />
            </div>
          ) : null}

          {hasTradeInput && result.errors.length ? (
            <IssueList tone="error" items={result.errors.map((code) => errorCopy[code][language])} />
          ) : null}
          {result.warnings.length ? (
            <IssueList tone="warning" items={result.warnings.map((code) => warningCopy[code][language])} />
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">{t.disclaimer}</div>
        </aside>
      </div>
    </div>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

function Field({ label, badge, children }: { label: string; badge?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
        {label}
        {badge ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">{badge}</span> : null}
      </span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, step, placeholder }: { value: string; onChange: (value: string) => void; step: string; placeholder?: string }) {
  return <input type="number" min="0" inputMode="decimal" step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={inputClass} />;
}

function FormGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50 sm:p-5">
      <legend className="px-2 text-xs font-black text-slate-700 dark:text-slate-200">{title}</legend>
      {children}
    </fieldset>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("h-11 rounded-xl border px-2 text-xs font-bold transition", active ? "border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-200" : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400")}>{children}</button>
  );
}

function ResultCard({ icon: Icon, label, value, tone }: { icon: typeof Target; label: string; value: string; tone: "blue" | "emerald" | "rose" | "slate" }) {
  const tones = {
    blue: "text-blue-600 dark:text-blue-300",
    emerald: "text-emerald-600 dark:text-emerald-300",
    rose: "text-rose-600 dark:text-rose-300",
    slate: "text-slate-600 dark:text-slate-300",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className={cn("flex items-center gap-2 text-xs font-bold", tones[tone])}><Icon className="h-4 w-4" />{label}</div>
      <div className="mt-2 break-words text-base font-black tabular-nums text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function IssueList({ tone, items }: { tone: "error" | "warning"; items: string[] }) {
  return (
    <div className={cn("rounded-xl border p-4 text-sm", tone === "error" ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100" : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100")}>
      <div className="space-y-2">
        {items.map((item) => <div key={item} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{item}</span></div>)}
      </div>
    </div>
  );
}
