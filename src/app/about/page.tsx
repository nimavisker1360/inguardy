"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers,
  PlugZap,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

export default function AboutPage() {
  const { t } = useLanguage();
  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const principles = [
    {
      icon: PlugZap,
      title: translate("aboutPage.missionTitle", "Automatic Journal"),
      text: translate(
        "aboutPage.missionText",
        "Connect MT5, capture trades, organize screenshots, and keep every account history in one clean trading journal."
      ),
      accent: "from-blue-500 to-cyan-400",
    },
    {
      icon: Bot,
      title: translate("aboutPage.analysisMethodTitle", "AI Trade Review"),
      text: translate(
        "aboutPage.analysisMethodText",
        "Turn closed trades into practical feedback on setup quality, discipline, psychology, exits, and repeated mistakes."
      ),
      accent: "from-violet-500 to-fuchsia-500",
    },
    {
      icon: Layers,
      title: translate("aboutPage.riskManagementTitle", "Playbooks & Checklists"),
      text: translate(
        "aboutPage.riskManagementText",
        "Build reusable strategies, execution rules, and pre-trade checklists so every trade can be reviewed against a plan."
      ),
      accent: "from-emerald-400 to-blue-500",
    },
    {
      icon: BarChart3,
      title: translate("aboutPage.transparentTrackingTitle", "Analytics & Reports"),
      text: translate(
        "aboutPage.transparentTrackingText",
        "Review win rate, P&L, drawdown, symbols, sessions, mistakes, prop firm progress, and exportable reports."
      ),
      accent: "from-amber-400 to-rose-400",
    },
  ];

  const highlights = [
    {
      icon: PlugZap,
      label: translate("aboutPage.entryLabel", "MT5 sync"),
      value: "Auto",
    },
    {
      icon: Bot,
      label: translate("aboutPage.riskLabel", "AI review"),
      value: "Feedback",
    },
    {
      icon: TrendingUp,
      label: translate("aboutPage.resultLabel", "Performance"),
      value: "Analytics",
    },
  ];

  const workflow = [
    translate("aboutPage.workflowItem1", "Connect accounts or add manual trades"),
    translate("aboutPage.workflowItem2", "Attach screenshots, tags, checklists, and playbooks"),
    translate("aboutPage.workflowItem3", "Review closed trades with AI and psychology notes"),
    translate("aboutPage.workflowItem4", "Study analytics, calendar, reports, and prop firm rules"),
  ];

  const dashboardTools = [
    { icon: PlugZap, label: translate("aboutPage.toolMt5", "MT5 Sync") },
    { icon: FileText, label: translate("aboutPage.toolJournal", "Trade Journal") },
    { icon: Bot, label: translate("aboutPage.toolAiReview", "AI Review") },
    { icon: ClipboardCheck, label: translate("aboutPage.toolChecklists", "Checklists") },
    { icon: Layers, label: translate("aboutPage.toolPlaybooks", "Playbooks") },
    { icon: CalendarDays, label: translate("aboutPage.toolCalendar", "Calendar") },
    { icon: BarChart3, label: translate("aboutPage.toolAnalytics", "Analytics") },
    { icon: ShieldCheck, label: translate("aboutPage.toolPropFirms", "Prop Firms") },
  ];

  return (
    <main className="relative isolate overflow-hidden bg-white text-slate-950">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_42%,#ffffff_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_88%_70%,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_20%_86%,rgba(244,114,182,0.10),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.24] [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:22px_22px]" />

      <section className="mx-auto grid w-full max-w-[1420px] items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-12 lg:pb-20 lg:pt-[4.5rem]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-[0_12px_30px_rgba(37,99,235,0.09)] backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Tradivix
          </div>

          <h1 className="max-w-4xl text-[2.7rem] font-semibold leading-[1.08] tracking-normal text-[#071034] sm:text-[3.35rem] lg:text-[3.55rem]">
            {translate(
              "aboutPage.heroTitle",
              "Everything a Trader Needs Inside One Smart Dashboard"
            )}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            {translate(
              "aboutPage.heroText",
              "Tradivix brings your trade journal, MT5 sync, AI trade reviews, checklists, playbooks, analytics, reports, prop firm tracking, market tools, and latest signals into one organized workspace."
            )}
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {dashboardTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <span
                  key={tool.label}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 text-xs font-bold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.07)] backdrop-blur"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {tool.label}
                </span>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full bg-[#07134a] px-8 text-base font-bold text-white shadow-[0_18px_35px_rgba(7,19,74,0.25)] hover:-translate-y-0.5 hover:bg-[#102064]"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                {translate("aboutPage.viewSignalsButton", "Open Dashboard")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 rounded-full border-slate-300 bg-white px-8 text-base font-bold text-[#071034] shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
            >
              <Link href="/#pricing">
                {translate("aboutPage.plansButton", "See Plans")}
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-[520px]">
          <div className="relative ml-auto overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_34px_90px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04]">
            <div className="relative aspect-[4/3] bg-slate-100">
              <Image
                src="/images/AboutUs.jpg"
                alt={t("aboutPage.teamImageAlt")}
                fill
                sizes="(min-width: 1024px) 620px, 100vw"
                className="object-cover"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_45%,rgba(7,16,52,0.78)_100%)]" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/12 px-4 py-3 text-white shadow-sm backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                    {translate("aboutPage.imageEyebrow", "Dashboard Workspace")}
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {translate("aboutPage.imageTitle", "Journal, review, improve.")}
                  </p>
                </div>
                <div className="rounded-full border border-white/15 bg-white/12 px-4 py-2 text-sm font-bold text-white backdrop-blur">
                  {translate("aboutPage.imageBadge", "All-in-one")}
                </div>
              </div>
            </div>
          </div>

          <div className="relative -mt-10 ml-5 mr-auto max-w-md rounded-2xl border border-blue-100 bg-white/92 p-5 shadow-[0_24px_70px_rgba(37,99,235,0.16)] backdrop-blur sm:ml-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-[0_12px_24px_rgba(59,130,246,0.24)]">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-normal text-slate-950">
                  {translate("aboutPage.builtForUsersTitle", "Built for Active Traders")}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {translate(
                    "aboutPage.builtForUsersText1",
                    "A useful trading dashboard should make the full routine visible: accounts, trades, screenshots, notes, risk, psychology, strategy rules, analytics, and reports."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f8fbff] py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_55%,#ffffff_100%)]" />
        <div className="relative mx-auto grid w-full max-w-[1320px] gap-8 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 shadow-sm">
              <Users className="h-4 w-4" />
              {translate("aboutPage.workflowEyebrow", "Complete Dashboard")}
            </div>
            <h2 className="mt-5 max-w-xl text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
              {translate("aboutPage.builtForUsersTitle", "Built for Active Traders")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              {translate(
                "aboutPage.builtForUsersText2",
                "The dashboard is designed for repeated daily use: import trades, review behavior, follow prop firm rules, manage strategies, read market context, and keep decisions easy to audit."
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {workflow.map((item, index) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700">
                  0{index + 1}
                </span>
                <div>
                  <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-500" />
                  <p className="text-sm font-bold leading-7 text-slate-700">
                    {item}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.10),transparent_28%),radial-gradient(circle_at_90%_30%,rgba(168,85,247,0.10),transparent_30%)]" />
        <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              <Sparkles className="h-4 w-4" />
              {translate("aboutPage.modulesEyebrow", "Dashboard Modules")}
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
              {translate(
                "aboutPage.modulesTitle",
                "One workspace for tracking, reviewing, and improving."
              )}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {principles.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_22px_65px_rgba(15,23,42,0.09)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_30px_80px_rgba(37,99,235,0.13)]"
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`}
                  />
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-[0_12px_24px_rgba(59,130,246,0.18)]`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-normal text-slate-950">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-500">
                    {item.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
