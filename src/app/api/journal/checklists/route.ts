import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checklistTemplateInclude,
  normalizeTemplatePayload,
  serializeChecklistTemplate,
} from "@/lib/checklists/api";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const DEFAULT_TEMPLATES = [
  {
    title: "چک‌لیست قبل از معامله",
    description: "بررسی‌های اصلی قبل از ورود به معامله",
    category: "Pre Trade",
    isDefault: true,
    items: [
      { title: "جهت روند مشخص است", section: "Market Context" },
      { title: "ستاپ با استراتژی من هماهنگ است", section: "Setup" },
      { title: "سطح ورود معتبر است", section: "Entry" },
      { title: "حد ضرر مشخص است", section: "Risk" },
      { title: "حد سود مشخص است", section: "Risk" },
      { title: "ریسک به ریوارد حداقل ۱:۲ است", section: "Risk" },
      { title: "حجم معامله درست محاسبه شده است", section: "Risk" },
      { title: "خبر مهم نزدیک معامله وجود ندارد", section: "News" },
      { title: "به خاطر ترس از جا ماندن وارد نمی‌شوم", section: "Psychology" },
      { title: "قبل از ورود، ریسک معامله را پذیرفته‌ام", section: "Psychology" },
    ],
  },
  {
    title: "چک‌لیست مدیریت ریسک",
    description: "بررسی حجم پوزیشن و محافظت از حساب",
    category: "Risk Management",
    isDefault: false,
    items: [
      { title: "ریسک هر معامله داخل حد مجاز من است", section: "Risk" },
      { title: "حد ضرر روزانه پر نشده است", section: "Risk" },
      { title: "اهرم بیش از حد استفاده نشده است", section: "Risk" },
      { title: "حد ضرر قبل از ورود ثبت شده است", section: "Entry" },
      { title: "معامله خلاف پلن من نیست", section: "Setup" },
    ],
  },
  {
    title: "چک‌لیست روانشناسی",
    description: "بررسی وضعیت ذهنی قبل و حین اجرا",
    category: "Psychology",
    isDefault: false,
    items: [
      { title: "آرام هستم", section: "Psychology" },
      { title: "در حال معامله انتقامی نیستم", section: "Psychology" },
      { title: "بازار را تعقیب نمی‌کنم", section: "Psychology" },
      { title: "می‌توانم ضرر این معامله را بپذیرم", section: "Psychology" },
      { title: "این معامله مطابق پلن من است", section: "Setup" },
    ],
  },
];

function validationResponse(errors: string[]) {
  return NextResponse.json(
    { success: false, message: "Validation failed", errors },
    { status: 400 }
  );
}

async function seedDefaultTemplatesIfEmpty() {
  const count = await prisma.checklistTemplate.count();

  if (count > 0) {
    return;
  }

  await prisma.$transaction(
    DEFAULT_TEMPLATES.map((template) =>
      prisma.checklistTemplate.create({
        data: {
          title: template.title,
          description: template.description,
          category: template.category,
          isDefault: template.isDefault,
          items: {
            create: template.items.map((item, index) => ({
              title: item.title,
              section: item.section,
              isRequired: index < 5,
              isCritical: false,
              sortOrder: index,
            })),
          },
        },
      })
    )
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    await seedDefaultTemplatesIfEmpty();

    const templates = await prisma.checklistTemplate.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: checklistTemplateInclude,
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      checklists: templates.map(serializeChecklistTemplate),
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load checklist templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "checklists");

    const body = (await request.json()) as Record<string, unknown>;
    const normalized = normalizeTemplatePayload(body);
    const title = normalized.data.title;

    if (normalized.errors.length > 0 || !title) {
      return validationResponse(normalized.errors);
    }

    const template = await prisma.$transaction(async (tx) => {
      if (normalized.data.isDefault) {
        await tx.checklistTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.checklistTemplate.create({
        data: {
          title,
          description: normalized.data.description,
          category: normalized.data.category,
          isActive: normalized.data.isActive,
          isDefault: normalized.data.isDefault,
          items: {
            create: normalized.data.items.map((item, index) => ({
              title: item.title,
              description: item.description,
              section: item.section,
              isRequired: item.isRequired,
              isCritical: item.isCritical,
              sortOrder: item.sortOrder ?? index,
            })),
          },
        },
        include: checklistTemplateInclude,
      });
    });

    return NextResponse.json(
      {
        success: true,
        checklist: serializeChecklistTemplate(template),
      },
      { status: 201 }
    );
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return validationResponse(["Checklist relation is invalid"]);
    }

    return NextResponse.json(
      { success: false, message: "Failed to create checklist template" },
      { status: 500 }
    );
  }
}
