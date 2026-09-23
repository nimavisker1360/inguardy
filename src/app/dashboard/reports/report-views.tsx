"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { JournalReport } from "@/lib/reports/journal-report";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export type ReportView = "performance" | "overview" | "symbols" | "time" | "strategies" | "compare" | "calendar" | "details";

const formatMoney = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
    <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>{children}
  </section>;
}

function Empty({ isFa }: { isFa: boolean }) {
  return <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">{isFa ? "برای این بازه داده‌ای وجود ندارد" : "No data for this period"}</div>;
}

function ChartCard({ title, rows, dataKey, labelKey, type = "area", isFa }: {
  title: string;
  rows: Array<Record<string, number | string>>;
  dataKey: string;
  labelKey: string;
  type?: "area" | "bar";
  isFa: boolean;
}) {
  return <Card title={title}>
    {rows.length === 0 ? <Empty isFa={isFa} /> : <div className="h-64 min-w-0" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        {type === "area" ? <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs><linearGradient id="reportAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.55} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.03} /></linearGradient></defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={50} />
          <Tooltip formatter={(value) => formatMoney(Number(value || 0))} />
          <Area type="monotone" dataKey={dataKey} stroke="#10b981" fill="url(#reportAreaGradient)" strokeWidth={2} />
        </AreaChart> : <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={50} />
          <Tooltip formatter={(value) => formatMoney(Number(value || 0))} />
          <Bar dataKey={dataKey} fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>}
      </ResponsiveContainer>
    </div>}
  </Card>;
}

export function ReportVisualView({ report, view }: { report: JournalReport; view: ReportView }) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const summary = report.summary;
  const equity = report.analytics.equityCurve.map((point) => ({ label: point.label, value: point.equity }));
  const dailyMap = new Map<string, number>();
  for (const point of report.analytics.equityCurve) dailyMap.set(point.date, (dailyMap.get(point.date) || 0) + point.pnl);
  const daily = [...dailyMap].map(([label, value]) => ({ label, value }));
  const symbols = report.analytics.bySymbol.map((row) => ({ label: row.symbol, value: row.netPnl }));
  const sessions = report.analytics.bySession.map((row) => ({ label: row.session, value: row.netPnl }));
  const hours = report.analytics.byHour.filter((row) => row.totalTrades > 0).map((row) => ({ label: row.label, value: row.netPnl }));
  const strategies = report.analytics.byStrategy.map((row) => ({ label: row.strategy, value: row.netPnl }));

  if (view === "performance") return <div className="grid gap-4 lg:grid-cols-2">
    <ChartCard title={isFa ? "سود و زیان تجمعی" : "Cumulative net P&L"} rows={equity} dataKey="value" labelKey="label" isFa={isFa} />
    <ChartCard title={isFa ? "سود و زیان روزانه" : "Daily net P&L"} rows={daily} dataKey="value" labelKey="label" type="bar" isFa={isFa} />
    <Card title={isFa ? "خلاصه عملکرد" : "Performance summary"}><div className="grid grid-cols-2 gap-4 text-sm">
      {[
        [isFa ? "سود و زیان خالص" : "Net P&L", formatMoney(summary.totalPnl)],
        [isFa ? "درصد برد" : "Win rate", `${summary.winRate}%`],
        [isFa ? "ضریب سود" : "Profit factor", summary.profitFactor?.toFixed(2) || "—"],
        [isFa ? "امید ریاضی" : "Expectancy", summary.expectancy == null ? "—" : formatMoney(summary.expectancy)],
        [isFa ? "معاملات" : "Trades", String(summary.totalTrades)],
        [isFa ? "برد / باخت" : "Wins / losses", `${summary.winningTrades} / ${summary.losingTrades}`],
      ].map(([label, value]) => <div key={label} className="border-b border-slate-100 pb-2 dark:border-slate-800"><div className="text-xs text-slate-500 dark:text-slate-400">{label}</div><strong className="text-slate-900 dark:text-white">{value}</strong></div>)}
    </div></Card>
    <ChartCard title={isFa ? "عملکرد نمادها" : "Symbol performance"} rows={symbols.slice(0, 8)} dataKey="value" labelKey="label" type="bar" isFa={isFa} />
  </div>;

  if (view === "overview") return <div className="grid gap-4 lg:grid-cols-2">
    <Card title={isFa ? "آمار کلیدی" : "Key statistics"}><div className="grid grid-cols-2 gap-3">
      {[
        [isFa ? "کل معاملات" : "Total trades", summary.totalTrades],
        [isFa ? "معاملات بسته" : "Closed trades", summary.closedTrades],
        [isFa ? "معاملات باز" : "Open trades", summary.openTrades],
        [isFa ? "میانگین برد" : "Average win", formatMoney(summary.averageWin)],
        [isFa ? "میانگین باخت" : "Average loss", formatMoney(summary.averageLoss)],
        [isFa ? "بیشترین افت" : "Max drawdown", formatMoney(report.analytics.overview.maxDrawdown)],
      ].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><div className="text-xs text-slate-500 dark:text-slate-400">{label}</div><strong className="text-slate-950 dark:text-white">{value}</strong></div>)}
    </div></Card>
    <ChartCard title={isFa ? "روند حساب" : "Equity curve"} rows={equity} dataKey="value" labelKey="label" isFa={isFa} />
  </div>;

  if (view === "symbols") return <div className="grid gap-4 lg:grid-cols-2">
    <ChartCard title={isFa ? "سود و زیان بر اساس نماد" : "P&L by symbol"} rows={symbols} dataKey="value" labelKey="label" type="bar" isFa={isFa} />
    <Card title={isFa ? "جدول نمادها" : "Symbols table"}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-slate-500 dark:border-slate-700"><th className="py-2 text-start">{isFa ? "نماد" : "Symbol"}</th><th className="text-end">{isFa ? "معامله" : "Trades"}</th><th className="text-end">{isFa ? "برد" : "Win %"}</th><th className="text-end">P&L</th></tr></thead><tbody>{report.analytics.bySymbol.map((row) => <tr key={row.symbol} className="border-b dark:border-slate-800"><td className="py-3 font-semibold">{row.symbol}</td><td className="text-end">{row.totalTrades}</td><td className="text-end">{row.winRate}%</td><td className={cn("text-end font-semibold", row.netPnl >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatMoney(row.netPnl)}</td></tr>)}</tbody></table></div></Card>
  </div>;

  if (view === "time") return <div className="grid gap-4 lg:grid-cols-2">
    <ChartCard title={isFa ? "عملکرد روزانه" : "Daily performance"} rows={daily} dataKey="value" labelKey="label" type="bar" isFa={isFa} />
    <ChartCard title={isFa ? "عملکرد سشن‌ها" : "Session performance"} rows={sessions} dataKey="value" labelKey="label" type="bar" isFa={isFa} />
    <ChartCard title={isFa ? "عملکرد ساعتی" : "Hourly performance"} rows={hours} dataKey="value" labelKey="label" type="bar" isFa={isFa} />
  </div>;

  if (view === "strategies") return <div className="grid gap-4 lg:grid-cols-2">
    <ChartCard title={isFa ? "عملکرد استراتژی‌ها" : "Strategy performance"} rows={strategies} dataKey="value" labelKey="label" type="bar" isFa={isFa} />
    <Card title={isFa ? "استراتژی‌ها و پلی‌بوک‌ها" : "Strategies and playbooks"}><div className="space-y-2">{report.analytics.byStrategy.length === 0 ? <Empty isFa={isFa} /> : report.analytics.byStrategy.map((row) => <div key={row.strategy} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm dark:border-slate-800"><span>{row.strategy}</span><span>{row.totalTrades} {isFa ? "معامله" : "trades"} · {formatMoney(row.netPnl)}</span></div>)}</div></Card>
  </div>;

  if (view === "compare") return <div className="grid gap-4 lg:grid-cols-2">
    <ChartCard title={isFa ? "مقایسه خرید و فروش" : "Long vs short"} rows={[
      { label: isFa ? "خرید" : "Buy", value: report.analytics.longShort.buy.netPnl },
      { label: isFa ? "فروش" : "Sell", value: report.analytics.longShort.sell.netPnl },
    ]} dataKey="value" labelKey="label" type="bar" isFa={isFa} />
    <Card title={isFa ? "جزئیات مقایسه" : "Comparison details"}><div className="space-y-3">{[report.analytics.longShort.buy, report.analytics.longShort.sell].map((row) => <div key={row.direction} className="grid grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900"><strong>{row.direction}</strong><span>{row.totalTrades} {isFa ? "معامله" : "trades"}</span><span>{row.winRate}%</span><strong className={row.netPnl >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatMoney(row.netPnl)}</strong></div>)}</div></Card>
  </div>;

  if (view === "calendar") return <div className="grid gap-4 lg:grid-cols-2">
    <ChartCard title={isFa ? "عملکرد روزها" : "Daily results"} rows={daily} dataKey="value" labelKey="label" type="bar" isFa={isFa} />
    <Card title={isFa ? "روزهای معاملاتی" : "Trading days"}><div className="max-h-72 space-y-2 overflow-y-auto">{daily.length === 0 ? <Empty isFa={isFa} /> : daily.map((row) => <div key={row.label} className="flex justify-between border-b border-slate-100 py-2 text-sm dark:border-slate-800"><span>{row.label}</span><strong className={row.value >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatMoney(row.value)}</strong></div>)}</div></Card>
  </div>;

  return null;
}
