import { Prisma } from "@prisma/client";
import { calculateChecklistProgress } from "@/lib/checklists/calculateChecklistProgress";

export const CHECKLIST_CATEGORIES = [
  "Pre Trade",
  "Entry Confirmation",
  "Risk Management",
  "Psychology",
  "Trade Management",
  "Exit Review",
  "Custom",
] as const;

export const CHECKLIST_ITEM_SECTIONS = [
  "Market Context",
  "Setup",
  "Entry",
  "Risk",
  "News",
  "Psychology",
  "Management",
  "Exit",
  "Custom",
] as const;

export const checklistTemplateInclude = {
  items: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.ChecklistTemplateInclude;

export const tradeChecklistInclude = {
  checklistTemplate: {
    select: {
      id: true,
      title: true,
      category: true,
      isActive: true,
      items: {
        select: { id: true },
      },
    },
  },
  answers: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.TradeChecklistInclude;

export type ChecklistTemplatePayload = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  isActive?: unknown;
  isDefault?: unknown;
  items?: unknown;
};

type NormalizedChecklistItem = {
  id?: string;
  title: string;
  description: string | null;
  section: string | null;
  isRequired: boolean;
  isCritical: boolean;
  sortOrder: number;
};

export function optionalString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

export function optionalBoolean(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function inferChecklistItemSection(
  itemTitle: string | null | undefined,
  templateCategory?: string | null
) {
  const title = String(itemTitle || "").toLowerCase();

  if (
    title.includes("trend") ||
    title.includes("bias") ||
    title.includes("direction")
  ) {
    return "Market Context";
  }

  if (
    title.includes("setup") ||
    title.includes("strategy") ||
    title.includes("plan")
  ) {
    return "Setup";
  }

  if (title.includes("entry")) {
    return "Entry";
  }

  if (
    title.includes("risk") ||
    title.includes("stop loss") ||
    title.includes("take profit") ||
    title.includes("reward") ||
    title.includes("lot") ||
    title.includes("loss limit") ||
    title.includes("leverag")
  ) {
    return "Risk";
  }

  if (title.includes("news")) {
    return "News";
  }

  if (
    title.includes("fomo") ||
    title.includes("calm") ||
    title.includes("revenge") ||
    title.includes("chasing") ||
    title.includes("accept a loss")
  ) {
    return "Psychology";
  }

  if (String(templateCategory || "").includes("Risk")) {
    return "Risk";
  }

  if (String(templateCategory || "").includes("Psychology")) {
    return "Psychology";
  }

  return "Custom";
}

export function normalizeTemplatePayload(
  body: ChecklistTemplatePayload,
  options: { partial?: boolean } = {}
) {
  const errors: string[] = [];
  const title = optionalString(body.title);
  const description = optionalString(body.description);
  const category = optionalString(body.category);
  const itemsInput = Array.isArray(body.items) ? body.items : [];

  if (!options.partial || body.title !== undefined) {
    if (!title) {
      errors.push("Checklist title is required");
    }
  }

  if (category && !(CHECKLIST_CATEGORIES as readonly string[]).includes(category)) {
    errors.push("category must be one of the supported checklist categories");
  }

  const items: NormalizedChecklistItem[] = [];

  itemsInput.forEach((rawItem, index) => {
    const item =
      rawItem && typeof rawItem === "object"
        ? (rawItem as Record<string, unknown>)
        : {};
    const itemTitle = optionalString(item.title);

    if (!itemTitle) {
      return;
    }

    const parsedSortOrder = Number(item.sortOrder);
    const id = optionalString(item.id);
    const section = optionalString(item.section ?? item.category);

    if (
      section &&
      !(CHECKLIST_ITEM_SECTIONS as readonly string[]).includes(section)
    ) {
      errors.push(`Item "${itemTitle}" section is not supported`);
    }

    items.push({
      ...(id ? { id } : {}),
      title: itemTitle,
      description: optionalString(item.description),
      section,
      isRequired: optionalBoolean(item.isRequired, false),
      isCritical: optionalBoolean(item.isCritical, false),
      sortOrder: Number.isInteger(parsedSortOrder) ? parsedSortOrder : index,
    });
  });

  if ((!options.partial || body.items !== undefined) && items.length === 0) {
    errors.push("A checklist must have at least one item");
  }

  return {
    errors,
    data: {
      title,
      description,
      category,
      isActive: optionalBoolean(body.isActive, true),
      isDefault: optionalBoolean(body.isDefault, false),
      items,
    },
  };
}

export function serializeChecklistTemplate(
  template: Prisma.ChecklistTemplateGetPayload<{
    include: typeof checklistTemplateInclude;
  }>
) {
  return {
    ...template,
    itemCount: template.items.length,
  };
}

export function serializeTradeChecklist(
  checklist: Prisma.TradeChecklistGetPayload<{
    include: typeof tradeChecklistInclude;
  }>
) {
  const { checklistTemplate, ...payload } = checklist;

  return {
    ...payload,
    checklistTemplate: checklistTemplate
      ? {
          id: checklistTemplate.id,
          title: checklistTemplate.title,
          category: checklistTemplate.category,
          isActive: checklistTemplate.isActive,
          itemCount: checklistTemplate.items.length,
        }
      : null,
    requiredIncompleteCount:
      checklist.requiredTotalCount - checklist.requiredCompletedCount,
  };
}

export function progressFromAnswers(
  answers: Array<{ checked: boolean; isRequiredSnapshot: boolean }>
) {
  return calculateChecklistProgress(answers);
}
