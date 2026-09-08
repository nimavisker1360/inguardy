import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const mindsetKeys = ["calm", "noRevenge", "focused", "riskAccepted"] as const;
const checklistKeys = ["direction", "entry", "stopLoss", "takeProfit", "rr", "newsChecked"] as const;
const allowedScenarios = ["trend", "range", "news", "wait"] as const;
const allowedDecisions = ["ready", "caution", "wait"] as const;

type BooleanMap = Record<string, boolean>;

function parseDateKey(value: unknown) {
  const text = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function textValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function integerValue(value: unknown, fallback: number, min = 0, max = 100) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function normalizeBooleanMap(
  value: unknown,
  keys: readonly string[]
): BooleanMap {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return Object.fromEntries(keys.map((key) => [key, Boolean(source[key])]));
}

function countComplete(values: BooleanMap) {
  return Object.values(values).filter(Boolean).length;
}

function normalizeOption<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  const text = String(value || "").trim();
  return allowed.includes(text) ? text : fallback;
}

function serializePreTradeCheck<T extends { date: Date; createdAt: Date; updatedAt: Date } | null>(
  check: T
) {
  if (!check) {
    return null;
  }

  return {
    ...check,
    date: dateKey(check.date),
    createdAt: check.createdAt.toISOString(),
    updatedAt: check.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const date = parseDateKey(searchParams.get("date") || new Date().toISOString().slice(0, 10));

  if (!date) {
    return NextResponse.json(
      { success: false, message: "Invalid date" },
      { status: 400 }
    );
  }

  const check = await prisma.preTradeCheck.findUnique({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
  });

  return NextResponse.json({ success: true, check: serializePreTradeCheck(check) });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const date = parseDateKey(body.date);

    if (!date) {
      return NextResponse.json(
        { success: false, message: "Invalid date" },
        { status: 400 }
      );
    }

    const mindset = normalizeBooleanMap(body.mindset, mindsetKeys);
    const checklist = normalizeBooleanMap(body.checklist, checklistKeys);
    const mindsetCompleted = countComplete(mindset);
    const checklistCompleted = countComplete(checklist);

    const data = {
      scenario: normalizeOption(body.scenario, allowedScenarios, "trend"),
      decision: normalizeOption(body.decision, allowedDecisions, "wait"),
      decisionLabel: textValue(body.decisionLabel),
      readinessScore: integerValue(body.readinessScore, 0),
      mindsetCompleted,
      mindsetTotal: mindsetKeys.length,
      checklistCompleted,
      checklistTotal: checklistKeys.length,
      selectedPlaybook: textValue(body.selectedPlaybook),
      selectedPlaybookDescription: textValue(body.selectedPlaybookDescription),
      mainReason: textValue(body.mainReason),
      highImpactEventCount: integerValue(body.highImpactEventCount, 0, 0, 1000),
      mindset: mindset as Prisma.InputJsonValue,
      checklist: checklist as Prisma.InputJsonValue,
    };

    const check = await prisma.preTradeCheck.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      create: {
        userId,
        date,
        ...data,
      },
      update: data,
    });

    return NextResponse.json({ success: true, check: serializePreTradeCheck(check) });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to save pre-trade check" },
      { status: 500 }
    );
  }
}
