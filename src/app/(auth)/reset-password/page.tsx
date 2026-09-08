"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/auth-client";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getResetErrorMessage(code: string | undefined, message: string | undefined) {
  if (code === "INVALID_TOKEN") {
    return "This reset link is invalid or expired. Please request a new link.";
  }

  if (code === "PASSWORD_TOO_SHORT") {
    return "Password must be at least 8 characters";
  }

  if (code === "PASSWORD_TOO_LONG") {
    return "Password is too long";
  }

  return message || "Could not reset password";
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const authError = searchParams.get("error");
  const redirectPath = useMemo(
    () => getSafeRedirectPath(searchParams.get("redirect")),
    [searchParams]
  );
  const loginHref = `/login?redirect=${encodeURIComponent(redirectPath)}`;
  const forgotPasswordHref = `/forgot-password?redirect=${encodeURIComponent(redirectPath)}`;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(
    authError === "INVALID_TOKEN"
      ? "This reset link is invalid or expired. Please request a new link."
      : ""
  );
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasUsableToken = Boolean(token) && authError !== "INVALID_TOKEN";
  const isSubmitDisabled =
    loading ||
    success ||
    !hasUsableToken ||
    password.length < 8 ||
    confirmPassword.length < 8 ||
    password !== confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!hasUsableToken) {
      setError("This reset link is invalid or expired. Please request a new link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword({
        newPassword: password,
        token,
      });

      if (res.error) {
        setError(getResetErrorMessage(res.error.code, res.error.message));
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-slate-950">Reset Password</h1>
          <p className="text-sm leading-6 text-slate-500">
            Choose a new password for your Tradivix account.
          </p>
        </div>

        {!hasUsableToken && !success ? (
          <div className="space-y-6">
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error || "This reset link is invalid or expired. Please request a new link."}
            </p>

            <Link
              href={forgotPasswordHref}
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
            >
              Request New Link
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-6">
            <p className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              <span>Your password has been reset. You can now sign in with your new password.</span>
            </p>

            <Link
              href={loginHref}
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 pl-10 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 pl-10 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="h-12 w-full rounded-lg bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isSubmitDisabled}
            >
              {loading ? "Resetting password..." : "Reset Password"}
            </Button>
          </form>
        )}

        {!success && (
          <div className="mt-6 text-center text-sm">
            <Link href={loginHref} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              <ArrowLeft className="mr-1 inline h-3 w-3" />
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
