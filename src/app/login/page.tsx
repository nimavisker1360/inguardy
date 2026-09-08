import { redirect } from "next/navigation";
import { getSession } from "@/lib/server-auth";
import LoginPageClient from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getSafeRedirectPath(value: string | undefined) {
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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([
    getSession(),
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);

  if (session) {
    const redirectPath = getSafeRedirectPath(
      getSingleParam(params.redirect) || getSingleParam(params.callbackURL)
    );

    redirect(redirectPath);
  }

  return <LoginPageClient />;
}
