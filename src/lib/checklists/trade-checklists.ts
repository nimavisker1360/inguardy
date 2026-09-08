import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  inferChecklistItemSection,
  progressFromAnswers,
  tradeChecklistInclude,
} from "@/lib/checklists/api";

type ChecklistDb = Prisma.TransactionClient | typeof prisma;

export async function attachChecklistTemplateToTrade(
  db: ChecklistDb,
  input: {
    tradeId: string;
    checklistTemplateId: string;
  }
) {
  const [trade, template, existing] = await Promise.all([
    db.trade.findUnique({
      where: { id: input.tradeId },
      select: { id: true },
    }),
    db.checklistTemplate.findFirst({
      where: {
        id: input.checklistTemplateId,
      },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    db.tradeChecklist.findFirst({
      where: {
        tradeId: input.tradeId,
        checklistTemplateId: input.checklistTemplateId,
      },
      select: { id: true },
    }),
  ]);

  if (!trade) {
    throw new Error("Journal trade not found");
  }

  if (!template) {
    throw new Error("Checklist template not found");
  }

  if (existing) {
    throw new Error("Checklist template is already attached to this trade");
  }

  if (template.items.length === 0) {
    throw new Error("Checklist template has no items");
  }

  const progress = progressFromAnswers(
    template.items.map((item) => ({
      checked: false,
      isRequiredSnapshot: item.isRequired,
    }))
  );

  return db.tradeChecklist.create({
    data: {
      tradeId: input.tradeId,
      checklistTemplateId: template.id,
      titleSnapshot: template.title,
      categorySnapshot: template.category,
      ...progress,
      answers: {
        create: template.items.map((item) => ({
          checklistItemId: item.id,
          titleSnapshot: item.title,
          descriptionSnapshot: item.description,
          sectionSnapshot:
            item.section || inferChecklistItemSection(item.title, template.category),
          isRequiredSnapshot: item.isRequired,
          isCriticalSnapshot: item.isCritical,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: tradeChecklistInclude,
  });
}

export async function attachDefaultChecklistsToTrade(
  db: ChecklistDb,
  tradeId: string
) {
  const templates = await db.checklistTemplate.findMany({
    where: {
      isActive: true,
      isDefault: true,
    },
    select: { id: true },
  });

  const attached = [];

  for (const template of templates) {
    attached.push(
      await attachChecklistTemplateToTrade(db, {
        tradeId,
        checklistTemplateId: template.id,
      })
    );
  }

  return attached;
}

export async function recalculateTradeChecklist(
  db: ChecklistDb,
  tradeChecklistId: string
) {
  const answers = await db.tradeChecklistAnswer.findMany({
    where: { tradeChecklistId },
    select: {
      checked: true,
      isRequiredSnapshot: true,
      isCriticalSnapshot: true,
    },
  });
  const progress = progressFromAnswers(answers);

  return db.tradeChecklist.update({
    where: { id: tradeChecklistId },
    data: progress,
    include: tradeChecklistInclude,
  });
}
