import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGateway } from "./writeiq.functions";
import { checkCredits, trackUsage } from "./usage.functions";

const PredictionInput = z.object({
  contextText: z.string().min(1).max(2000),
  workspaceId: z.string().uuid().nullable().optional(),
  voice: z
    .object({
      tone: z.string().optional(),
      traits: z.string().optional(),
    })
    .optional(),
});

export const predictNextWords = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PredictionInput.parse(input))
  .handler(async ({ data }) => {
    // 1. Gating check
    if (data.workspaceId) {
      await checkCredits(data.workspaceId, 1);
    }

    const prompt = `Continue the following text naturally.
    
    TEXT:
    """
    ${data.contextText}
    """
    
    ${data.voice?.tone ? `TONE: ${data.voice.tone}` : ""}
    ${data.voice?.traits ? `STYLE: ${data.voice.traits}` : ""}
    
    RULES:
    - Return ONLY the next 3-8 words that would naturally follow the text.
    - Do NOT repeat the input text.
    - Do NOT include quotes, metadata, or explanations.
    - Ensure it flows perfectly from the last character of the input.
    - If the text ends mid-word, complete the word first.
    `;

    // 2. Call AI with low token limit for speed
    const json = await callGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You are a ghostwriting assistant. Complete the user's sentence naturally.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 20,
      temperature: 0.5,
    });

    const content = json?.choices?.[0]?.message?.content;
    if (!content) return "";

    // 3. Track Usage
    if (data.workspaceId) {
      await trackUsage(data.workspaceId, 1, "ghostwrite");
    }

    return content.trim().replace(/^["']|["']$/g, "");
  });
