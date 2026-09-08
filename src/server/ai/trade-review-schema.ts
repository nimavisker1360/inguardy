import { z } from "zod";

const boundedText = z.string().trim().min(1).max(3000);
const shortLabel = z.string().trim().min(1).max(48);

export const tradeAIReviewResponseSchema = z.object({
  score: z.coerce.number().int().min(0).max(100),
  summary: boundedText,
  strengths: z.array(boundedText).max(8).default([]),
  weaknesses: z.array(boundedText).max(8).default([]),
  mistakes: z.array(boundedText).max(8).default([]),
  riskReview: boundedText,
  psychologyReview: boundedText,
  playbookReview: boundedText,
  improvementPlan: z.array(boundedText).min(3).max(5),
  tags: z.array(shortLabel).max(12).default([]),
  confidence: z.coerce.number().min(0).max(1),
});

export type TradeAIReviewResponse = z.infer<typeof tradeAIReviewResponseSchema>;

export function parseTradeAIReviewResponse(value: unknown) {
  return tradeAIReviewResponseSchema.parse(value);
}

export function parseTradeAIReviewJson(text: string) {
  try {
    return parseTradeAIReviewResponse(JSON.parse(text));
  } catch {
    const repaired = extractJsonObject(text);

    if (!repaired) {
      throw new Error("AI response was not valid JSON");
    }

    return parseTradeAIReviewResponse(JSON.parse(repaired));
  }
}

function extractJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return cleaned.slice(start, end + 1);
}
