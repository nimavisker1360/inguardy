"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, signOut, signUp } from "@/lib/auth-client";
import { getSignUpAuthErrorFallbackMessage, getSignUpAuthErrorMessage } from "@/lib/auth-errors";
import { useLanguage } from "@/lib/language-context";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getRedirectParam(searchParams: URLSearchParams) {
  return searchParams.get("redirect") || searchParams.get("callbackURL");
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
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

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const { setLanguage } = useLanguage();
  const searchParams = useSearchParams();
  const redirectPath = useMemo(
    () => getSafeRedirectPath(getRedirectParam(searchParams)),
    [searchParams]
  );
  const loginHref = `/login?redirect=${encodeURIComponent(redirectPath)}`;
  const loginAfterSignUpHref = `/login?redirect=${encodeURIComponent(redirectPath)}&registered=1`;
  const authError = searchParams.get("error");
  const errorCallbackURL = `/sign-up?redirect=${encodeURIComponent(redirectPath)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const trimmedEmail = email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  useEffect(() => {
    const authErrorMessage = authError ? getSignUpAuthErrorFallbackMessage(authError) : "";

    if (authErrorMessage) {
      setError(authErrorMessage);
    }
  }, [authError]);

  async function handleEmailSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isEmailValid || password.length < 8) {
      setError("Please complete all required fields");
      return;
    }

    setLoading(true);

    try {
      const generatedName = trimmedEmail.split("@")[0] || "Tradivix Trader";
      const res = await signUp.email({
        name: generatedName,
        email: trimmedEmail,
        password,
        callbackURL: redirectPath,
      });

      if (res.error) {
        setError(getSignUpAuthErrorMessage(res.error.code) || res.error.message || "Sign up failed");
        return;
      }

      await signOut();
      setLanguage("en");
      router.replace(loginAfterSignUpHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError("");
    setLoading(true);

    try {
      const res = await signIn.social({
        provider: "google",
        callbackURL: redirectPath,
        errorCallbackURL,
        disableRedirect: true,
      });

      if (res.error) {
        setError(getSignUpAuthErrorMessage(res.error.code) || res.error.message || "Google sign up failed");
        setLoading(false);
        return;
      }

      if (res.data?.url) {
        window.location.assign(res.data.url);
        return;
      }

      setError("Google sign up failed");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign up failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfc] px-4 py-10 text-left text-slate-950" dir="ltr">
      <div className="w-full max-w-[532px] rounded-[20px] border border-[#dedee5] bg-white px-6 py-8 shadow-none sm:px-12 sm:py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#6f55bf]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-9 text-center">
          <Link href="/" aria-label="Tradivix home" className="mx-auto mb-5 block w-fit">
            <Image
              src="/images/tradivix_logo_dark.png"
              alt="Tradivix"
              width={160}
              height={54}
              className="h-[54px] w-auto object-contain"
              priority
            />
          </Link>
          <h1 className="mb-4 text-[30px] font-bold leading-tight text-black sm:text-[38px]">
            Welcome to Tradivix
          </h1>
          <p className="text-base leading-7 text-black sm:text-xl">
            We help traders become profitable!
          </p>
        </div>

        <div className="space-y-6">
          <Button
            type="button"
            variant="outline"
            className="flex h-[52px] w-full items-center justify-center gap-3 rounded-lg border border-[#c8c9db] bg-white text-base font-semibold text-[#07111f] shadow-none duration-200 hover:-translate-y-0.5 hover:border-[#6f55bf] hover:bg-[#fbfaff] hover:text-[#07111f] hover:shadow-[0_14px_30px_rgba(111,85,191,0.18)] hover:ring-4 hover:ring-[#6f55bf]/10 sm:text-lg"
            disabled={loading}
            onClick={handleGoogleSignUp}
          >
            {!loading && <GoogleIcon />}
            {loading ? "Connecting..." : "Sign up with Google"}
          </Button>

          <div className="flex items-center gap-3 px-2 text-base text-black sm:px-9">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d8d5ff] to-[#5f47ff]" />
            <span>or</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#5f47ff] via-[#d8d5ff] to-transparent" />
          </div>
        </div>

        <form className="mt-6 space-y-[26px]" onSubmit={handleEmailSignUp}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-[50px] w-full rounded-lg border border-[#d1d1d1] bg-white px-[18px] text-base text-slate-950 outline-none transition placeholder:text-[#4b5568] focus:border-[#6f55bf] focus:ring-4 focus:ring-[#6f55bf]/15 sm:text-lg"
              placeholder="Email"
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Create password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-[50px] w-full rounded-lg border border-[#d1d1d1] bg-white px-[18px] text-base text-slate-950 outline-none transition placeholder:text-[#4b5568] focus:border-[#6f55bf] focus:ring-4 focus:ring-[#6f55bf]/15 sm:text-lg"
              placeholder="Create password"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            className="h-[50px] w-full rounded-lg bg-[#6f55bf] text-base font-bold text-white shadow-none hover:-translate-y-0 hover:bg-[#6049ad] disabled:cursor-not-allowed disabled:bg-[#a99bd4]"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign up"}
          </Button>

          <p className="px-0 text-center text-sm leading-7 text-black sm:px-2 sm:text-lg">
            By creating an account you agree to our{" "}
            <Link href="#" className="text-[#2f2fff] hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-[#2f2fff] hover:underline">
              Privacy Policy
            </Link>
          </p>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">
            Already have an account?
          </span>
          <Link href={loginHref} className="ml-1 font-semibold text-[#6f55bf] hover:text-[#6049ad] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
