import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export class ApiAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

export const getSession = cache(async () => {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      error.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }

    return null;
  }
});

export const getCurrentUserId = cache(async () => {
  const session = await getSession();
  return session?.user.id ?? null;
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();

  if (!session?.user.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new ApiAuthError(401, "Unauthorized");
  }

  return user;
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: { role?: string | null; email?: string | null } | null | undefined) {
  if (!user) {
    return false;
  }

  if (user.role === "ADMIN") {
    return true;
  }

  const email = user.email?.trim().toLowerCase();
  return Boolean(email && getAdminEmails().includes(email));
}

const ADMIN_PANEL_ONLY_EMAILS = new Set(["nimavisker@gmail.com"]);

export function isAdminPanelOnlyUser(user: { email?: string | null } | null | undefined) {
  const email = user?.email?.trim().toLowerCase();
  return Boolean(email && ADMIN_PANEL_ONLY_EMAILS.has(email));
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!isAdminUser(user)) {
    throw new ApiAuthError(403, "Forbidden");
  }

  return user;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 401 }
  );
}

export function authErrorResponse(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status }
    );
  }

  return null;
}
