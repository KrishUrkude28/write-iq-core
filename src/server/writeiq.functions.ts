import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkCredits, trackUsage } from "./usage.functions";

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
  workspaceId: z.string().uuid().nullable().optional(),
});

const ExtractInput = z.object({
  samples: z.string().min(20).max(15000),
  workspaceId: z.string().uuid().nullable().optional(),
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

export async function callGateway(body: Record<string, unknown>) {
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

// Strict response schema for runtime validation
const ResponseSchema = z.object({
  score: z.number().min(0).max(100),
  suggestions: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      original: z.string(),
      replacement: z.string(),
    }),
  ),
  socratic_questions: z.array(z.string()),
  accessibility: z.object({
    readability_score: z.string(),
    issues: z.array(z.string()),
  }),
});

const RECOVERY_PROMPT = `Your previous response was invalid.

Fix the output:
- Return ONLY valid JSON matching the required schema exactly
- Do NOT change content meaning
- Ensure all required fields exist (score, suggestions, socratic_questions, accessibility)
- Ensure no trailing commas and all strings are properly escaped

Reformat the response properly using the writeiq_result tool.`;

// --- Edge-case detection on the input itself ---
function detectEdgeCases(text: string): {
  empty: boolean;
  tooShort: boolean;
  repetitive: boolean;
  overlyComplex: boolean;
  topRepeatedToken?: string;
  longestSentenceWords?: number;
} {
  const trimmed = text.trim();
  if (!trimmed) return { empty: true, tooShort: true, repetitive: false, overlyComplex: false };

  const tokens = trimmed.toLowerCase().match(/\b[\p{L}\p{N}']+\b/gu) ?? [];
  const tooShort = tokens.length < 5;

  // Repetition: any non-stopword token appearing > 25% of the time, or unique-ratio < 0.4
  const stop = new Set(["the","a","an","of","to","in","is","it","and","or","for","on","with","that","this","be","are","as","at","by","i","you","we","they","but","not","so"]);
  const counts = new Map<string, number>();
  for (const t of tokens) if (!stop.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
  const total = tokens.length || 1;
  let topToken: string | undefined;
  let topCount = 0;
  for (const [k, v] of counts) if (v > topCount) { topCount = v; topToken = k; }
  const uniqueRatio = new Set(tokens).size / total;
  const repetitive = !tooShort && (topCount / total > 0.25 || uniqueRatio < 0.4);

  // Complexity: longest sentence > 35 words, or avg > 25
  const sentences = trimmed.split(/[.!?]+\s+/).filter(Boolean);
  const lengths = sentences.map((s) => (s.match(/\b[\p{L}\p{N}']+\b/gu) ?? []).length);
  const longest = lengths.length ? Math.max(...lengths) : 0;
  const avg = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const overlyComplex = longest > 35 || avg > 25;

  return {
    empty: false,
    tooShort,
    repetitive,
    overlyComplex,
    topRepeatedToken: repetitive ? topToken : undefined,
    longestSentenceWords: overlyComplex ? longest : undefined,
  };
}

function buildEdgeCaseFallback(
  text: string,
  mode: "coach" | "socratic",
  edge: ReturnType<typeof detectEdgeCases>,
): z.infer<typeof ResponseSchema> | null {
  if (edge.empty) {
    return {
      score: 0,
      suggestions: [],
      socratic_questions:
        mode === "socratic"
          ? [
              "What is the single most important idea you want the reader to take away?",
              "Who is the audience, and what do they already know?",
              "What outcome do you want from this writing?",
            ]
          : [],
      accessibility: { readability_score: "n/a", issues: ["Input is empty."] },
    };
  }

  if (mode === "coach" && edge.repetitive && edge.topRepeatedToken) {
    // Build a concrete conciseness suggestion targeting the repeated token
    const original = text.trim().slice(0, 240);
    const replacement = original.replace(
      new RegExp(`\\b${edge.topRepeatedToken}\\b`, "gi"),
      (m, i) => (i === 0 ? m : "[…]"),
    );
    return {
      score: 35,
      suggestions: [
        {
          title: `Reduce repetition of "${edge.topRepeatedToken}"`,
          description: `The word "${edge.topRepeatedToken}" appears repeatedly. Vary phrasing or condense.`,
          original,
          replacement,
        },
      ],
      socratic_questions: [],
      accessibility: {
        readability_score: "low (repetitive)",
        issues: [`Repeated token "${edge.topRepeatedToken}" dominates the text.`],
      },
    };
  }
  return null;
}

async function runAnalysis(
  data: z.infer<typeof AnalyzeInput>,
  recovery = false,
): Promise<unknown> {
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

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: developer },
    { role: "user", content: userPrompt },
  ];
  if (recovery) messages.push({ role: "system", content: RECOVERY_PROMPT });

  const json = await callGateway({
    model: "google/gemini-3-flash-preview",
    messages,
    tools: [tool],
    tool_choice: { type: "function", function: { name: "writeiq_result" } },
  });

  return extractToolArgs(json);
}

export const analyzeWriting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const edge = detectEdgeCases(data.text);
    const synthetic = buildEdgeCaseFallback(data.text, data.mode, edge);
    if (synthetic) return synthetic;

    // 1b. Check Credits
    if (data.workspaceId) {
      await checkCredits(data.workspaceId, 5);
    }

    // 2. Inject edge-case nudges into the prompt
    if (edge.repetitive || edge.overlyComplex || edge.tooShort) {
      const notes: string[] = [];
      if (edge.tooShort) notes.push("Input is very short — keep suggestions minimal but concrete.");
      if (edge.repetitive) notes.push(`Detected repetition of "${edge.topRepeatedToken}" — prioritize conciseness suggestions.`);
      if (edge.overlyComplex) notes.push(`Detected overly long sentences (longest: ${edge.longestSentenceWords} words) — prioritize simplification suggestions.`);
      data = { ...data, context: `${data.context ?? ""}\n[ENGINE_NOTES] ${notes.join(" ")}`.trim() };
    }

    // 3. Try → validate → retry once with recovery prompt → fallback
    let raw = await runAnalysis(data, false);
    let validated = ResponseSchema.safeParse(raw);

    if (!validated.success) {
      console.warn("WriteIQ JSON invalid, retrying with recovery prompt:", validated.error.issues);
      raw = await runAnalysis(data, true);
      validated = ResponseSchema.safeParse(raw);
    }

    // 3b. Substring validation: each suggestion.original MUST appear in input.
    // Regenerate ONLY the broken suggestions (single retry), then drop any leftovers.
    if (validated.success && data.mode === "coach" && validated.data.suggestions.length > 0) {
      const sourceText = data.text;
      const good = validated.data.suggestions.filter((s) => isValidSuggestion(s, sourceText));
      const bad = validated.data.suggestions.filter((s) => !isValidSuggestion(s, sourceText));
      if (bad.length > 0) {
        console.warn("WriteIQ regenerating broken suggestions:", bad.map((b) => b.original));
        const correction: typeof data = {
          ...data,
          context: `${data.context ?? ""}\n[ENGINE_NOTES] CRITICAL: Every suggestion.original MUST be an EXACT verbatim substring of the user's input text (case and punctuation must match). Do not paraphrase. Replacement must differ from original. Return ${bad.length} replacement suggestion(s) for the broken originals: ${JSON.stringify(bad.map((b) => b.original))}.`.trim(),
        };
        const raw2 = await runAnalysis(correction, false);
        const validated2 = ResponseSchema.safeParse(raw2);
        const replacements = validated2.success
          ? validated2.data.suggestions.filter((s) => isValidSuggestion(s, sourceText))
          : [];
        validated = {
          success: true,
          data: { ...validated.data, suggestions: [...good, ...replacements] },
        } as typeof validated;
      }
    }

    if (!validated.success) {
      return enforceModeConstraints(safeDefaultResponse(), data.mode);
    }

    // 4. Enforce mode invariants
    const finalResult = enforceModeConstraints(validated.data, data.mode);

    // 5. Track Usage
    if (data.workspaceId) {
      await trackUsage(data.workspaceId, 5, "analysis");
    }

    return finalResult;
  });

// --- Pure helpers (exported for tests) ---
export function isValidSuggestion(
  s: { original: string; replacement: string },
  sourceText: string,
): boolean {
  return s.original.length > 0 && sourceText.includes(s.original) && s.replacement !== s.original;
}

export function safeDefaultResponse(): z.infer<typeof ResponseSchema> {
  return {
    score: 0,
    suggestions: [],
    socratic_questions: [],
    accessibility: {
      readability_score: "unknown",
      issues: ["Model returned invalid output after retry. Please try again."],
    },
  };
}

export function enforceModeConstraints(
  result: z.infer<typeof ResponseSchema>,
  mode: "coach" | "socratic",
): z.infer<typeof ResponseSchema> {
  const out = {
    ...result,
    suggestions: [...result.suggestions],
    socratic_questions: [...result.socratic_questions],
  };
  if (mode === "socratic") {
    out.suggestions = [];
    if (out.socratic_questions.length === 0) {
      out.socratic_questions = ["What single change would most strengthen this draft?"];
    } else if (out.socratic_questions.length > 5) {
      out.socratic_questions = out.socratic_questions.slice(0, 5);
    }
  } else {
    if (out.socratic_questions.length > 1) {
      out.socratic_questions = out.socratic_questions.slice(0, 1);
    }
  }
  return out;
}

export { ResponseSchema, detectEdgeCases, buildEdgeCaseFallback };


const RewriteInput = z.object({
  text: z.string().min(1).max(2000),
  intent: z.string(),
  context: z.string().optional().default(""),
  workspaceId: z.string().uuid().nullable().optional(),
});

export const extractVoice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data }) => {
    if (data.workspaceId) {
      await checkCredits(data.workspaceId, 50);
    }

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

    if (data.workspaceId) {
      await trackUsage(data.workspaceId, 50, "voice_extraction");
    }

    return parsed as {
      tone: string;
      sentence_style: string;
      vocabulary_level: string;
      patterns: string[];
      distinct_traits: string[];
    };
  });

export const rewriteSelection = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RewriteInput.parse(input))
  .handler(async ({ data }) => {
    if (data.workspaceId) {
      await checkCredits(data.workspaceId, 1);
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

    const json = await callGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a professional editor. Rewrite text based on user intent. Return ONLY the rewritten content." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Failed to generate rewrite");

    if (data.workspaceId) {
      await trackUsage(data.workspaceId, 1, "rewrite");
    }

    return content.trim().replace(/^["']|["']$/g, ""); // strip accidental quotes
  });
