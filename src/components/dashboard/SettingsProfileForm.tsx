"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Mail,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type SettingsProfileFormProps = {
  user: {
    name: string | null | undefined;
    email: string | null | undefined;
    image: string | null | undefined;
  };
};

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600";

const labelClass =
  "text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400";

function splitName(name: string | null | undefined) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function initials(firstName: string, lastName: string, email: string) {
  const source = [firstName, lastName].filter(Boolean).join(" ") || email || "Trader";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

export function SettingsProfileForm({ user }: SettingsProfileFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialName = useMemo(() => splitName(user.name), [user.name]);
  const [firstName, setFirstName] = useState(initialName.firstName || "Trader");
  const [lastName, setLastName] = useState(initialName.lastName);
  const [image, setImage] = useState(user.image || "");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const email = user.email || "";
  const avatarInitials = initials(firstName, lastName, email);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setStatus("error");
      setMessage(t("dashboard.settings.imageTypeError"));
      return;
    }

    if (file.size > 650 * 1024) {
      setStatus("error");
      setMessage(t("dashboard.settings.imageSizeError"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(typeof reader.result === "string" ? reader.result : "");
      setStatus("idle");
      setMessage("");
    };
    reader.onerror = () => {
      setStatus("error");
      setMessage(t("dashboard.settings.imageReadError"));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          image,
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || t("dashboard.settings.profileUpdateFailed"));
      }

      setStatus("success");
      setMessage(t("dashboard.settings.profileSaved"));
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : t("dashboard.settings.profileUpdateFailed"));
    }
  }

  function resetForm() {
    setFirstName(initialName.firstName || "Trader");
    setLastName(initialName.lastName);
    setImage(user.image || "");
    setStatus("idle");
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
              {t("dashboard.settings.profilePhoto")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("dashboard.settings.profilePhotoHint")}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-4xl font-semibold text-slate-500 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={t("dashboard.settings.profilePreview")} className="h-full w-full object-cover" />
            ) : (
              <span>{avatarInitials}</span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="mt-5 flex w-full gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Upload className="h-4 w-4" />
              {t("dashboard.settings.upload")}
            </button>
            <button
              type="button"
              onClick={() => setImage("")}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label={t("dashboard.settings.removeProfilePhoto")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
              {t("dashboard.settings.accountDetails")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("dashboard.settings.accountDetailsHint")}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>{t("dashboard.settings.firstName")}</span>
            <input
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={inputClass}
              placeholder={t("dashboard.settings.firstName")}
            />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>{t("dashboard.settings.lastName")}</span>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={inputClass}
              placeholder={t("dashboard.settings.lastName")}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className={labelClass}>{t("dashboard.settings.email")}</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={email}
                readOnly
                className={cn(inputClass, "cursor-not-allowed pl-10 text-slate-500 dark:text-slate-400")}
              />
            </div>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={cn(
              "min-h-5 text-sm font-medium",
              status === "success" && "text-emerald-600 dark:text-emerald-300",
              status === "error" && "text-red-600 dark:text-red-300",
              status === "idle" && "text-slate-500 dark:text-slate-400",
              status === "saving" && "text-blue-600 dark:text-blue-300"
            )}
          >
            {status === "saving" ? t("dashboard.settings.savingProfile") : message}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              {t("dashboard.actions.reset")}
            </button>
            <button
              type="submit"
              disabled={status === "saving"}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {t("dashboard.settings.saveChanges")}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
