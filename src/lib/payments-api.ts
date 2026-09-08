import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/server-auth";

export const PAYMENT_NETWORKS = ["TRC20", "ERC20", "BEP20"] as const;
export const ACTIVE_SUBSCRIPTION_STATUSES = ["ACTIVE", "TRIAL", "MANUAL"] as const;
export const PAID_SUBSCRIPTION_STATUSES = ["ACTIVE", "MANUAL"] as const;

export type PaymentNetworkValue = (typeof PAYMENT_NETWORKS)[number];

export function apiJson(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status });
}

export function apiError(message: string, status = 400) {
  return apiJson({ success: false, message }, status);
}

export function handleApiError(error: unknown, fallbackMessage: string) {
  const authResponse = authErrorResponse(error);

  if (authResponse) {
    return authResponse;
  }

  return apiError(fallbackMessage, 500);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parsePageLimit(searchParams: URLSearchParams) {
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const rawLimit = Math.max(Number(searchParams.get("limit")) || 20, 1);
  const limit = Math.min(rawLimit, 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function parsePaymentNetwork(value: unknown): PaymentNetworkValue | null {
  const network = String(value || "TRC20").trim().toUpperCase();
  return PAYMENT_NETWORKS.includes(network as PaymentNetworkValue)
    ? (network as PaymentNetworkValue)
    : null;
}

export function walletAddressForNetwork(network: PaymentNetworkValue) {
  const key = `USDT_WALLET_${network}`;
  return process.env[key]?.trim() || "";
}

function decimalToString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "object" && "toString" in value
    ? String(value)
    : String(value);
}

export function serializePlan(plan: any) {
  if (!plan) {
    return null;
  }

  return {
    ...plan,
    priceUSDT: decimalToString(plan.priceUSDT),
  };
}

export function serializeSubscription(subscription: any) {
  if (!subscription) {
    return null;
  }

  return {
    ...subscription,
    plan: serializePlan(subscription.plan),
  };
}

export function serializePayment(payment: any) {
  if (!payment) {
    return null;
  }

  return {
    ...payment,
    amount: decimalToString(payment.amount),
    plan: serializePlan(payment.plan),
    subscription: serializeSubscription(payment.subscription),
  };
}

export function normalizeTxid(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidRole(value: string | null) {
  return value === "USER" || value === "ADMIN";
}
