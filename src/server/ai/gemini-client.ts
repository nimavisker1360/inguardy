import { TRADE_REVIEW_SYSTEM_INSTRUCTION } from "@/server/ai/trade-review-prompt";

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export class GeminiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiClientError";
  }
}

export async function generateGeminiJson(
  prompt: string,
  options: { systemInstruction?: string; timeoutMs?: number } = {}
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiClientError("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: options.systemInstruction ?? TRADE_REVIEW_SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GeminiClientError("Gemini request timed out");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new GeminiClientError(
      `Gemini request failed with ${response.status}${body ? `: ${body.slice(0, 500)}` : ""}`
    );
  }

  const data = (await response.json()) as GeminiGenerateResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiClientError("Gemini returned an empty response");
  }

  return text;
}
