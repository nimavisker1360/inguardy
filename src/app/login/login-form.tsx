"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Lock, LogIn, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { signIn, useSession } from "@/lib/auth-client";
import { getSignInAuthErrorFallbackMessage, getSignInAuthErrorMessage } from "@/lib/auth-errors";

function getSafeRedirectPath(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value === "/login" ||
    value.startsWith("/login?") ||
    value === "/sign-in" ||
    value.startsWith("/sign-in?")
  ) {
    return "/dashboard";
  }

  return value;
}

function getRedirectParam(searchParams: URLSearchParams) {
  return searchParams.get("redirect") || searchParams.get("callbackURL");
}

function getPostSignInRedirectPath(redirectPath: string) {
  const url = new URL(redirectPath, "https://tradivix.local");

  if (url.pathname === "/dashboard") {
    url.searchParams.set("addAccount", "1");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const redirectPath = useMemo(
    () => getSafeRedirectPath(getRedirectParam(searchParams)),
    [searchParams]
  );
  const postSignInRedirectPath = useMemo(
    () => getPostSignInRedirectPath(redirectPath),
    [redirectPath]
  );
  const signUpHref = `/sign-up?redirect=${encodeURIComponent(redirectPath)}`;
  const forgotPasswordHref = `/forgot-password?redirect=${encodeURIComponent(redirectPath)}`;
  const authError = searchParams.get("error");
  const registered = searchParams.get("registered") === "1";
  const errorCallbackURL = `/login?redirect=${encodeURIComponent(redirectPath)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace(postSignInRedirectPath);
    }
  }, [postSignInRedirectPath, router, session]);

  useEffect(() => {
    const authErrorMessage = authError ? getSignInAuthErrorFallbackMessage(authError) : "";

    if (authErrorMessage) {
      setError(authErrorMessage);
    }
  }, [authError]);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn.email({
        email,
        password,
        callbackURL: postSignInRedirectPath,
      });

      if (res.error) {
        setError(getSignInAuthErrorMessage(res.error.code) || res.error.message || "Login failed");
        return;
      }

      router.replace(postSignInRedirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      const res = await signIn.social({
        provider: "google",
        callbackURL: postSignInRedirectPath,
        errorCallbackURL,
        disableRedirect: true,
      });

      if (res.error) {
        setError(getSignInAuthErrorMessage(res.error.code) || res.error.message || "Google login failed");
        setLoading(false);
        return;
      }

      if (res.data?.url) {
        window.location.assign(res.data.url);
        return;
      }

      setError("Google login failed");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
      setLoading(false);
    }
  }

  if (isPending || session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-left text-slate-950" dir="ltr">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-8 text-center">
          <Link href="/" aria-label="Tradivix home" className="mx-auto mb-6 block w-fit">
            <Image
              src="/images/tradivix_logo_dark.png"
              alt="Tradivix"
              width={180}
              height={48}
              className="h-12 w-auto"
              priority
            />
          </Link>
          <h1 className="mb-2 text-3xl font-bold text-slate-950">Sign In</h1>
          <p className="text-sm text-slate-500">
            Sign in to your account to access your journal
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleEmailLogin}>
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

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <Link href={forgotPasswordHref} className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 pl-10 pr-11 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="********"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="remember"
              className="ml-2 block text-sm text-slate-600"
            >
              Remember me
            </label>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {registered && !error && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Account created. Please sign in with your email and password.
            </p>
          )}

          <Button
            className="flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
            disabled={loading}
          >
            <LogIn className="mr-2 h-5 w-5" />
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 font-semibold text-slate-400">
                Or sign in with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
              disabled={loading}
              onClick={handleGoogleLogin}
            >
              {!loading && <GoogleIcon />}
              {loading ? "Connecting..." : "Sign in with Google"}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">Don't have an account?</span>
          <Link href={signUpHref} className="ml-1 inline-flex items-center font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Sign Up
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
