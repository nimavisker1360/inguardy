"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/auth-client";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const redirectPath = useMemo(
    () => getSafeRedirectPath(searchParams.get("redirect")),
    [searchParams]
  );
  const loginHref = `/login?redirect=${encodeURIComponent(redirectPath)}`;
  const resetRedirectTo = `/reset-password?redirect=${encodeURIComponent(redirectPath)}`;
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const trimmedEmail = email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!isEmailValid) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const res = await requestPasswordReset({
        email: trimmedEmail,
        redirectTo: resetRedirectTo,
      });

      if (res.error) {
        setError(res.error.message || "Could not send password reset email");
        return;
      }

      setSuccessMessage(
        res.data?.message ||
          "If this email exists in our system, check your email for the reset link"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send password reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-slate-950">Forgot Password</h1>
          <p className="text-sm leading-6 text-slate-500">
            Enter your email and we will send you a secure link to reset your password.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 pl-10 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              <span>{successMessage}</span>
            </p>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-lg bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={loading || !isEmailValid}
          >
            {loading ? "Sending reset link..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href={loginHref} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            <ArrowLeft className="mr-1 inline h-3 w-3" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
