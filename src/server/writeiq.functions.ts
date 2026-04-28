import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const VoiceSchema = z.object({
  tone: z.string().optional().default(""),
  vocab: z.string().optional().default(""),
  traits: z.string().optional().default(""),
});

const AnalyzeInput = z.object({
  text: z.string().min(1).max(10000),
  mode: z.enum(["coach", "socratic"]),
  context: z.string().max(500).optional().default(""),
  voice: VoiceSchema.optional().default({ tone: "", vocab: "", traits: "" }),
});

const ExtractInput = z.object({
  samples: z.string().min(20).max(15000),
});

const SYSTEM_PROMPT = `You are WriteIQ, a deterministic AI Writing Intelligence Engine.

Your purpose is to analyze and improve user writing with precision, structure, and contextual awareness.

CRITICAL RULES:
- You MUST return ONLY valid JSON.
- Do NOT include explanations, markdown, or extra text.
- Do NOT break schema under any circumstance.
- If uncertain, return best possible structured output instead of failing.

WRITING OBJECTIVES:
- Improve clarity, coherence, and tone
- Preserve original meaning
- Adapt to audience and context
- Avoid unnecessary complexity

BEHAVIOR MODES:
- Coach Mode → Provide direct fixes
- Socratic Mode → Ask guiding questions ONLY (no direct fixes)

You must strictly follow all schema and instructions provided in the developer message.

Before responding:
1. Ensure JSON is syntactically correct
2. Ensure all fields exist
3. Ensure no trailing commas
4. Ensure all strings are properly escaped`;

function buildDeveloperPrompt(opts: {
  mode: "coach" | "socratic";
  tone: string;
  vocab: string;
  traits: string;
  context: string;
}) {
  return `OUTPUT FORMAT (STRICT JSON):

{
  "score": number (0-100),
  "suggestions": [
    {
      "title": string,
      "description": string,
      "original": string,
      "replacement": string
    }
  ],
  "socratic_questions": [string],
  "accessibility": {
    "readability_score": string,
    "issues": [string]
  }
}

CONSTRAINTS:
- Suggestions must target exact phrases from input
- No vague suggestions
- Each suggestion improves ONE dimension only
- Keep replacements concise and realistic
- Maintain user's intent

MODE: ${opts.mode}

MODE RULES:
- If mode = "coach":
  - Fill "suggestions" with actionable fixes
  - "socratic_questions" can be empty or minimal
- If mode = "socratic":
  - "suggestions" must be EMPTY
  - Only populate "socratic_questions"
  - Questions must provoke thinking, not give answers

VOICE MATCHING:
- Tone: ${opts.tone || "(unspecified)"}
- Vocabulary: ${opts.vocab || "(unspecified)"}
- Style Traits: ${opts.traits || "(unspecified)"}

Ensure all outputs align with this voice.

CONTEXT: ${opts.context || "(none)"}

Adapt tone and suggestions accordingly.

EDGE CASE RULES:
- If input is empty → return score = 0
- If input is repetitive → suggest conciseness improvements
- If input is overly complex → suggest simplification
- Never hallucinate missing context

SCORING GUIDE:
- 90–100 → Exceptional clarity, strong tone
- 70–89 → Good but improvable
- 40–69 → Average, noticeable issues
- 0–39 → Poor clarity, major fixes needed`;
}

async function callGateway(body: Record<string, unknown>) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error: ${res.status} ${t}`);
  }
  return res.json();
}

function extractToolArgs(json: any): any {
  const choice = json?.choices?.[0]?.message;
  const call = choice?.tool_calls?.[0];
  if (call?.function?.arguments) {
    try {
      return JSON.parse(call.function.arguments);
    } catch {
      return null;
    }
  }
  // fallback: try parsing content
  if (typeof choice?.content === "string") {
    try {
      return JSON.parse(choice.content);
    } catch {
      return null;
    }
  }
  return null;
}

export const analyzeWriting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const developer = buildDeveloperPrompt({
      mode: data.mode,
      tone: data.voice?.tone ?? "",
      vocab: data.voice?.vocab ?? "",
      traits: data.voice?.traits ?? "",
      context: data.context ?? "",
    });

    const userPrompt = `Analyze the following text:\n\n"""\n${data.text}\n"""`;

    const tool = {
      type: "function",
      function: {
        name: "writeiq_result",
        description: "Return WriteIQ analysis JSON.",
        parameters: {
          type: "object",
          properties: {
            score: { type: "number" },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  original: { type: "string" },
                  replacement: { type: "string" },
                },
                required: ["title", "description", "original", "replacement"],
                additionalProperties: false,
              },
            },
            socratic_questions: { type: "array", items: { type: "string" } },
            accessibility: {
              type: "object",
              properties: {
                readability_score: { type: "string" },
                issues: { type: "array", items: { type: "string" } },
              },
              required: ["readability_score", "issues"],
              additionalProperties: false,
            },
          },
          required: ["score", "suggestions", "socratic_questions", "accessibility"],
          additionalProperties: false,
        },
      },
    };

    const json = await callGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: developer },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "writeiq_result" } },
    });

    const parsed = extractToolArgs(json);
    if (!parsed) {
      return {
        score: 0,
        suggestions: [],
        socratic_questions: [],
        accessibility: { readability_score: "unknown", issues: ["Model returned invalid output"] },
      };
    }

    // Enforce mode invariants
    if (data.mode === "socratic") parsed.suggestions = [];
    return parsed;
  });

export const extractVoice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "voice_signature",
        description: "Return a structured writing style signature.",
        parameters: {
          type: "object",
          properties: {
            tone: { type: "string" },
            sentence_style: { type: "string" },
            vocabulary_level: { type: "string" },
            patterns: { type: "array", items: { type: "string" } },
            distinct_traits: { type: "array", items: { type: "string" } },
          },
          required: ["tone", "sentence_style", "vocabulary_level", "patterns", "distinct_traits"],
          additionalProperties: false,
        },
      },
    };

    const json = await callGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a linguistic analysis engine. Extract a structured writing style signature from given samples. Return ONLY valid JSON. Be precise, not generic. Patterns must be observable. Traits must be distinctive.",
        },
        { role: "user", content: `Analyze the following writing samples:\n\n${data.samples}` },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "voice_signature" } },
    });

    const parsed = extractToolArgs(json);
    if (!parsed) {
      throw new Error("Failed to extract voice signature");
    }
    return parsed as {
      tone: string;
      sentence_style: string;
      vocabulary_level: string;
      patterns: string[];
      distinct_traits: string[];
    };
  });
