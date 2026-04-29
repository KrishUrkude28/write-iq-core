import { createAPIFileRoute } from "@tanstack/react-start/api";
import { z } from "zod";
import { checkCredits, trackUsage } from "@/server/usage.functions";

const RewriteInput = z.object({
  text: z.string().min(1).max(2000),
  intent: z.string(),
  context: z.string().optional().default(""),
  workspaceId: z.string().uuid().optional(),
});

export const Route = createAPIFileRoute("/api/rewrite")({
  POST: async ({ request }) => {
    try {
      const data = RewriteInput.parse(await request.json());

      // 1. Credit Check
      if (data.workspaceId) {
        await checkCredits(data.workspaceId, 1);
      }

      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const prompt = `Rewrite the following text with the specific intent: "${data.intent}".
      
      TEXT:
      """
      ${data.text}
      """
      
      ${data.context ? `CONTEXT: ${data.context}` : ""}
      
      RULES:
      - Return ONLY the rewritten text.
      - Do NOT include quotes, explanations, or meta-talk.
      - Preserve the core meaning but adapt the structure and tone.
      - If the intent is "formal", use professional, precise language.
      - If the intent is "shorten", remove fluff while keeping facts.
      - If the intent is "expand", add detail and clarity without being wordy.
      - If the intent is "simple", use clear, accessible language (grade 6-8 level).
      `;

      // 2. Call Gateway with stream: true
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a professional editor. Rewrite text based on user intent. Return ONLY the rewritten content.",
            },
            { role: "user", content: prompt },
          ],
          stream: true,
          temperature: 0.7,
        }),
      });

      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        return new Response(JSON.stringify({ error: `AI Gateway error: ${errorText}` }), {
          status: aiRes.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 3. Track Usage (Debit at start for streaming)
      if (data.workspaceId) {
        await trackUsage(data.workspaceId, 1, "rewrite_stream");
      }

      // 4. Proxy the stream
      return new Response(aiRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
