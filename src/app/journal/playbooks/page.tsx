"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Plus, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { PlaybookCard } from "@/components/journal/PlaybookCard";
import { useLanguage } from "@/lib/language-context";
import type { PlaybookStrategyDto } from "@/types/playbooks";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600";

export default function PlaybooksPage() {
  const { t } = useLanguage();
  const loadFailedText = t("journal.playbooks.loadFailed");
  const [playbooks, setPlaybooks] = useState<PlaybookStrategyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const filteredPlaybooks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return playbooks.filter((playbook) => {
      const matchesSearch =
        !query ||
        playbook.name.toLowerCase().includes(query) ||
        playbook.description?.toLowerCase().includes(query) ||
        playbook.symbols?.toLowerCase().includes(query) ||
        playbook.tags?.toLowerCase().includes(query);
      const matchesActive =
        !activeFilter ||
        (activeFilter === "true" ? playbook.isActive : !playbook.isActive);

      return matchesSearch && matchesActive;
    });
  }, [activeFilter, playbooks, search]);

  const loadPlaybooks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/journal/playbooks", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        const message = data.message || loadFailedText;
        setLoadError(message);
        toast.error(message);
        return;
      }

      setPlaybooks(data.playbooks || []);
    } catch {
      setLoadError(loadFailedText);
      toast.error(loadFailedText);
    } finally {
      setLoading(false);
    }
  }, [loadFailedText]);

  useEffect(() => {
    void loadPlaybooks();
  }, [loadPlaybooks]);

  async function deletePlaybook(playbook: PlaybookStrategyDto) {
    const confirmed = window.confirm(
      t("journal.playbooks.confirmDelete").replace("{name}", playbook.name)
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/journal/playbooks/${playbook.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("journal.playbooks.updateFailed"));
        return;
      }

      toast.success(data.message || t("journal.playbooks.updated"));
      await loadPlaybooks();
    } catch {
      toast.error(t("journal.playbooks.updateFailed"));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("journal.playbooks.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {t("journal.playbooks.subtitle")}
          </p>
        </div>
        <Link
          href="/journal/playbooks/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          {t("journal.playbooks.create")}
        </Link>
      </div>

      <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {t("journal.common.search")}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("journal.playbooks.searchPlaceholder")}
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#111827] pl-9 pr-3 text-sm text-[#E5E7EB] outline-none focus:border-blue-600"
              />
            </div>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {t("dashboard.table.status")}
            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">{t("dashboard.common.all")}</option>
              <option value="true">{t("journal.common.active")}</option>
              <option value="false">{t("journal.common.inactive")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveFilter("");
            }}
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg border border-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            {t("dashboard.actions.reset")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-lg border border-slate-800 bg-[#0F172A]" />
          ))}
        </div>
      ) : null}

      {!loading && filteredPlaybooks.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredPlaybooks.map((playbook) => (
            <PlaybookCard key={playbook.id} playbook={playbook} onDelete={deletePlaybook} />
          ))}
        </div>
      ) : null}

      {!loading && filteredPlaybooks.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-[#0F172A] px-4 py-14 text-center">
          <BookOpenCheck className="mx-auto h-8 w-8 text-slate-500" />
          <h2 className="mt-3 text-base font-semibold text-white">
            {loadError ? t("journal.playbooks.couldNotLoad") : t("journal.playbooks.emptyTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {loadError || t("journal.playbooks.emptyDescription")}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {loadError ? (
              <button
                type="button"
                onClick={loadPlaybooks}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                {t("journal.common.retry")}
              </button>
            ) : null}
            <Link
              href="/journal/playbooks/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              {t("journal.playbooks.create")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
