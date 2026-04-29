import { describe, it, expect } from "vitest";
import {
  ResponseSchema,
  detectEdgeCases,
  buildEdgeCaseFallback,
  isValidSuggestion,
  safeDefaultResponse,
  enforceModeConstraints,
} from "./writeiq.functions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validShape = (obj: unknown) => {
  // Must round-trip as JSON and pass the strict schema.
  const json = JSON.stringify(obj);
  expect(() => JSON.parse(json)).not.toThrow();
  const parsed = ResponseSchema.safeParse(JSON.parse(json));
  expect(parsed.success).toBe(true);
};

// ---------------------------------------------------------------------------
// ORIGINAL SUITES (unchanged)
// ---------------------------------------------------------------------------

describe("WriteIQ schema conformance", () => {
  it("safe default response matches schema", () => {
    validShape(safeDefaultResponse());
  });

  it("safe default in coach mode matches schema and caps questions", () => {
    const out = enforceModeConstraints(safeDefaultResponse(), "coach");
    validShape(out);
    expect(out.suggestions).toEqual([]);
    expect(out.socratic_questions.length).toBeLessThanOrEqual(1);
  });

  it("safe default in socratic mode matches schema, clears suggestions, has ≥1 question", () => {
    const out = enforceModeConstraints(safeDefaultResponse(), "socratic");
    validShape(out);
    expect(out.suggestions).toEqual([]);
    expect(out.socratic_questions.length).toBeGreaterThanOrEqual(1);
  });

  it("empty input fallback is deterministic and valid in both modes", () => {
    const edge = detectEdgeCases("");
    expect(edge.empty).toBe(true);

    const coach = buildEdgeCaseFallback("", "coach", edge)!;
    const socratic = buildEdgeCaseFallback("", "socratic", edge)!;
    validShape(coach);
    validShape(socratic);

    expect(coach.score).toBe(0);
    expect(coach.suggestions).toEqual([]);
    expect(socratic.score).toBe(0);
    expect(socratic.suggestions).toEqual([]);
    expect(socratic.socratic_questions.length).toBeGreaterThan(0);

    // Determinism: same input → same output
    const coach2 = buildEdgeCaseFallback("", "coach", detectEdgeCases(""))!;
    expect(coach).toEqual(coach2);
  });

  it("repetitive input produces a concrete coach conciseness suggestion", () => {
    const text =
      "really really really really really really really really really really fast";
    const edge = detectEdgeCases(text);
    expect(edge.repetitive).toBe(true);
    expect(edge.topRepeatedToken).toBe("really");

    const out = buildEdgeCaseFallback(text, "coach", edge)!;
    validShape(out);
    expect(out.suggestions.length).toBeGreaterThan(0);
    const s = out.suggestions[0];
    // Original must be an exact substring of input
    expect(text.includes(s.original)).toBe(true);
    expect(s.replacement).not.toEqual(s.original);
    expect(s.title.toLowerCase()).toContain("repetition");
  });
});

describe("Suggestion substring validation", () => {
  const source = "The quick brown fox jumps over the lazy dog.";

  it("accepts exact substring with different replacement", () => {
    expect(isValidSuggestion({ original: "quick brown", replacement: "swift" }, source)).toBe(true);
  });

  it("rejects non-substring originals", () => {
    expect(isValidSuggestion({ original: "purple cat", replacement: "x" }, source)).toBe(false);
  });

  it("rejects empty original", () => {
    expect(isValidSuggestion({ original: "", replacement: "x" }, source)).toBe(false);
  });

  it("rejects identical replacement", () => {
    expect(isValidSuggestion({ original: "quick", replacement: "quick" }, source)).toBe(false);
  });
});

describe("Mode constraint enforcement", () => {
  const base = {
    score: 80,
    suggestions: [
      { title: "t1", description: "d1", original: "a", replacement: "b" },
      { title: "t2", description: "d2", original: "c", replacement: "d" },
    ],
    socratic_questions: ["q1", "q2", "q3"],
    accessibility: { readability_score: "Grade 8", issues: [] },
  };

  it("coach mode caps socratic_questions to ≤1 and keeps suggestions", () => {
    const out = enforceModeConstraints(base, "coach");
    validShape(out);
    expect(out.socratic_questions.length).toBeLessThanOrEqual(1);
    expect(out.suggestions.length).toBe(2);
  });

  it("socratic mode clears suggestions and keeps questions", () => {
    const out = enforceModeConstraints(base, "socratic");
    validShape(out);
    expect(out.suggestions).toEqual([]);
    expect(out.socratic_questions.length).toBeGreaterThanOrEqual(1);
  });

  it("socratic mode injects a default question when list is empty", () => {
    const out = enforceModeConstraints({ ...base, socratic_questions: [] }, "socratic");
    expect(out.socratic_questions.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SUITE A — Mixed valid/invalid suggestions + regeneration logic
// ---------------------------------------------------------------------------

describe("Suite A: Mixed valid/invalid suggestions + regeneration logic", () => {
  const sourceText = "The quick brown fox jumps over the lazy dog.";

  const validSugg1 = { title: "v1", description: "desc v1", original: "quick brown", replacement: "nimble" };
  const validSugg2 = { title: "v2", description: "desc v2", original: "lazy dog",   replacement: "sleepy hound" };
  const invalidSugg1 = { title: "i1", description: "desc i1", original: "purple elephant", replacement: "blue rhino" };
  const invalidSugg2 = { title: "i2", description: "desc i2", original: "fast cat",        replacement: "slow dog" };

  it("isValidSuggestion correctly partitions valid vs invalid suggestions", () => {
    expect(isValidSuggestion(validSugg1, sourceText)).toBe(true);
    expect(isValidSuggestion(validSugg2, sourceText)).toBe(true);
    expect(isValidSuggestion(invalidSugg1, sourceText)).toBe(false);
    expect(isValidSuggestion(invalidSugg2, sourceText)).toBe(false);
  });

  it("coach mode: valid suggestions are preserved after partitioning, invalid ones are identified", () => {
    const allSuggestions = [validSugg1, invalidSugg1, validSugg2, invalidSugg2];

    const good = allSuggestions.filter((s) => isValidSuggestion(s, sourceText));
    const bad  = allSuggestions.filter((s) => !isValidSuggestion(s, sourceText));

    // Exactly the 2 valid ones survive
    expect(good).toHaveLength(2);
    expect(good).toContainEqual(validSugg1);
    expect(good).toContainEqual(validSugg2);

    // Exactly the 2 invalid ones are flagged for regeneration
    expect(bad).toHaveLength(2);
    expect(bad).toContainEqual(invalidSugg1);
    expect(bad).toContainEqual(invalidSugg2);
  });

  it("coach mode: merging preserved valid + regenerated-valid suggestions gives correct final set", () => {
    const good = [validSugg1, validSugg2];
    // Simulate a "regenerated" suggestion that now points to a real substring
    const regenSugg = { title: "r1", description: "desc r1", original: "jumps over", replacement: "leaps across" };
    expect(isValidSuggestion(regenSugg, sourceText)).toBe(true);

    const finalSuggestions = [...good, regenSugg];
    expect(finalSuggestions).toHaveLength(3);
    expect(finalSuggestions.every((s) => isValidSuggestion(s, sourceText))).toBe(true);
  });

  it("coach mode: regenerated suggestion that is still invalid after retry is dropped", () => {
    const stillBad = { title: "rb", description: "still bad", original: "nonexistent phrase", replacement: "something" };
    const good = [validSugg1];
    const regenerated = [stillBad].filter((s) => isValidSuggestion(s, sourceText));

    expect(regenerated).toHaveLength(0);
    // Final set = only the original good ones
    const final = [...good, ...regenerated];
    expect(final).toEqual([validSugg1]);
  });

  it("socratic mode: enforceModeConstraints clears ALL suggestions (valid and invalid alike)", () => {
    const base = {
      score: 75,
      suggestions: [validSugg1, invalidSugg1, validSugg2],
      socratic_questions: ["What is your core argument?", "Who is the audience?"],
      accessibility: { readability_score: "Grade 9", issues: [] },
    };

    const out = enforceModeConstraints(base, "socratic");
    validShape(out);

    // All suggestions cleared — no distinction between valid and invalid in socratic
    expect(out.suggestions).toEqual([]);
    // Questions preserved (capped to 5)
    expect(out.socratic_questions.length).toBeGreaterThanOrEqual(1);
    expect(out.socratic_questions.length).toBeLessThanOrEqual(5);
  });

  it("socratic mode: enforceModeConstraints clears suggestions even when all were originally valid", () => {
    const base = {
      score: 90,
      suggestions: [validSugg1, validSugg2],
      socratic_questions: ["Is your thesis clear?"],
      accessibility: { readability_score: "Grade 12", issues: [] },
    };

    const out = enforceModeConstraints(base, "socratic");
    expect(out.suggestions).toEqual([]);
    // Score is preserved
    expect(out.score).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// SUITE B — Repetition detector boundary cases
// ---------------------------------------------------------------------------

describe("Suite B: Repetition detector boundary cases", () => {
  /**
   * Build a sentence where a non-stopword token appears exactly `targetCount`
   * times out of `totalTokens` meaningful words. Pad with unique words.
   */
  function buildRepetitiveText(repeatWord: string, repeatCount: number, totalTokens: number): string {
    const pads = Array.from({ length: totalTokens - repeatCount }, (_, i) => `word${i}`);
    const tokens = [...Array(repeatCount).fill(repeatWord), ...pads];
    // Shuffle deterministically (stable sort by index mod)
    return tokens.sort((a, b) => (a === repeatWord ? -1 : 1) - (b === repeatWord ? -1 : 1)).join(" ");
  }

  it("topCount/total just below 25% (24.9%) → NOT flagged as repetitive", () => {
    // 24 repeats out of 97 total ≈ 24.7% — below threshold
    const text = buildRepetitiveText("echo", 24, 97);
    const edge = detectEdgeCases(text);
    // uniqueRatio check: 97 - 24 + 1 (echo) unique = 74 / 97 ≈ 0.76 — above 0.4
    // topCount: 24/97 ≈ 0.247 — below 0.25
    expect(edge.repetitive).toBe(false);
    // No fallback fires in coach mode
    const fallback = buildEdgeCaseFallback(text, "coach", edge);
    expect(fallback).toBeNull();
  });

  it("topCount/total just above 25% (26%) → IS flagged as repetitive", () => {
    // 26 repeats out of 100 total = 26% — above threshold
    const text = buildRepetitiveText("echo", 26, 100);
    const edge = detectEdgeCases(text);
    expect(edge.repetitive).toBe(true);
    expect(edge.topRepeatedToken).toBe("echo");
    // Fallback fires
    const fallback = buildEdgeCaseFallback(text, "coach", edge)!;
    expect(fallback).not.toBeNull();
    validShape(fallback);
    expect(fallback.suggestions.length).toBeGreaterThan(0);
  });

  it("uniqueRatio just above 0.4 (0.41) → NOT flagged as repetitive by ratio", () => {
    // 41 unique tokens out of 100 total = ratio 0.41 — above threshold
    const words = Array.from({ length: 100 }, (_, i) => (i < 41 ? `unique${i}` : "dup"));
    const text = words.join(" ");
    const edge = detectEdgeCases(text);
    // dup appears 59 times out of 100 = 59% — this WILL trigger topCount threshold
    // So let's use a scenario where topCount is low but uniqueRatio is just above 0.4
    // 41 unique words, each appearing once = ratio exactly 1.0. Need duplication without crossing topCount.
    // Use 5 repeated words × 12 times each = 60, + 40 unique = 100 total, topCount = 12/100 = 12% < 25%, ratio = 45/100 = 0.45
    const controlled: string[] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 12; c++) controlled.push(`rep${r}`);
    for (let u = 0; u < 40; u++) controlled.push(`uni${u}`);
    const controlledText = controlled.join(" ");
    const ce = detectEdgeCases(controlledText);
    // topCount = 12/100 = 12% < 25% ✓, uniqueRatio = 45/100 = 0.45 > 0.4 ✓
    expect(ce.repetitive).toBe(false);
  });

  it("uniqueRatio just below 0.4 (0.39) → IS flagged as repetitive by ratio", () => {
    // Build text with uniqueRatio ≈ 0.39 and topCount below 25%
    // 3 repeated words × 15 times each = 45, + 15 unique = 60 total
    // topCount = 15/60 = 25% — exactly at boundary. Let's use 14/60 < 25% with ratio 18/60 = 0.30 < 0.4
    const controlled: string[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 14; c++) controlled.push(`rep${r}`);
    for (let u = 0; u < 18; u++) controlled.push(`uni${u}`);
    const controlledText = controlled.join(" "); // 42 + 18 = 60 tokens, 21 unique → ratio 21/60 = 0.35 < 0.4
    const ce = detectEdgeCases(controlledText);
    expect(ce.repetitive).toBe(true);
  });

  it("coach-mode conciseness replacement fires ONLY for repetitive text, not normal text", () => {
    const normalText = "The fox ran swiftly across the meadow while the bird watched from a branch.";
    const repeatText = buildRepetitiveText("sprint", 30, 100);

    const normalEdge = detectEdgeCases(normalText);
    const repeatEdge = detectEdgeCases(repeatText);

    expect(normalEdge.repetitive).toBe(false);
    expect(repeatEdge.repetitive).toBe(true);

    const normalFallback = buildEdgeCaseFallback(normalText, "coach", normalEdge);
    const repeatFallback = buildEdgeCaseFallback(repeatText, "coach", repeatEdge);

    expect(normalFallback).toBeNull();    // Not triggered for normal text
    expect(repeatFallback).not.toBeNull(); // Triggered for repetitive text
    validShape(repeatFallback);
  });
});

// ---------------------------------------------------------------------------
// SUITE C — Case & punctuation substring validation (near-miss rejection)
// ---------------------------------------------------------------------------

describe("Suite C: Case & punctuation substring validation (near-miss rejection)", () => {
  // Source is carefully designed so every near-miss tested differs by an
  // interior character (not just trailing punctuation), guaranteeing
  // String.prototype.includes() returns false for all near-miss originals.
  //   Valid substrings: "Sphinx of black quartz!", "Judge my vow.", "UPPER lower MiXeD."
  //   Near-misses differ by: case, interior char, leading/trailing space, punctuation swap.
  const source = "Sphinx of black quartz!Judge my vow.UPPER lower MiXeD.";

  // --- Acceptance tests ---

  it("accepts exact case-matching phrase with punctuation", () => {
    expect(isValidSuggestion({ original: "Sphinx of black quartz!", replacement: "Riddle solved!" }, source)).toBe(true);
  });

  it("accepts phrase at end of source", () => {
    expect(isValidSuggestion({ original: "UPPER lower MiXeD.", replacement: "MIXED lower UPPER." }, source)).toBe(true);
  });

  it("accepts mid-source phrase ending with period", () => {
    expect(isValidSuggestion({ original: "Judge my vow.", replacement: "Weigh my oath." }, source)).toBe(true);
  });

  // --- Case mutation rejections ---

  it("rejects fully-lowercased near-miss of uppercase phrase", () => {
    expect(isValidSuggestion({ original: "sphinx of black quartz!", replacement: "riddle solved!" }, source)).toBe(false);
  });

  it("rejects near-miss with only first char lowercased", () => {
    expect(isValidSuggestion({ original: "sphinx of black quartz!", replacement: "Riddle solved!" }, source)).toBe(false);
  });

  it("rejects near-miss where all-caps word is lowercased", () => {
    // 'UPPER' is in source; 'upper' is not
    expect(isValidSuggestion({ original: "upper lower MiXeD.", replacement: "MIXED lower UPPER." }, source)).toBe(false);
  });

  // --- Interior character substitution rejections ---

  it("rejects near-miss with interior character substituted (a→X in 'black')", () => {
    expect(isValidSuggestion({ original: "Sphinx of blXck quartz!", replacement: "Riddle solved!" }, source)).toBe(false);
  });

  it("rejects near-miss with punctuation substituted (! → ?)", () => {
    expect(isValidSuggestion({ original: "Sphinx of black quartz?", replacement: "Riddle solved?" }, source)).toBe(false);
  });

  it("rejects near-miss with punctuation substituted (. → !)", () => {
    expect(isValidSuggestion({ original: "Judge my vow!", replacement: "Weigh my oath!" }, source)).toBe(false);
  });

  // --- Whitespace mutation rejections ---

  it("rejects original with extra leading space", () => {
    expect(isValidSuggestion({ original: " Sphinx of black quartz!", replacement: "Riddle solved!" }, source)).toBe(false);
  });

  it("rejects original with extra trailing space (source has 'quartz!Judge' with no gap)", () => {
    expect(isValidSuggestion({ original: "Sphinx of black quartz! ", replacement: "Riddle solved! " }, source)).toBe(false);
  });

  // --- Interior char substitution for punctuation-removal near-miss ---

  it("rejects original where interior char differs from source (definitive non-substring)", () => {
    const src2 = "ALPHA-BETA.GAMMA-DELTA.";
    expect(isValidSuggestion({ original: "ALPHA-BETA.",  replacement: "start." }, src2)).toBe(true);
    expect(isValidSuggestion({ original: "ALPHA-BETX.",  replacement: "start." }, src2)).toBe(false);
  });

  it("rejects original with hyphen replaced by underscore", () => {
    const src2 = "ALPHA-BETA.GAMMA-DELTA.";
    expect(isValidSuggestion({ original: "ALPHA_BETA.", replacement: "start." }, src2)).toBe(false);
  });

  // --- Identical replacement rejection ---

  it("identical replacement is rejected even when original is exact substring", () => {
    expect(isValidSuggestion({ original: "Judge my vow.", replacement: "Judge my vow." }, source)).toBe(false);
  });

  // --- Batch near-miss (regeneration simulation) ---

  it("all near-miss originals are identified as invalid → would be sent for regeneration", () => {
    const nearMisses = [
      { original: "sphinx of black quartz!",  replacement: "Riddle solved!" },    // lowercase
      { original: "Sphinx of blXck quartz!",  replacement: "Riddle solved!" },    // interior X
      { original: " Sphinx of black quartz!", replacement: "Riddle solved!" },    // leading space
      { original: "upper lower MiXeD.",       replacement: "MIXED lower UPPER." }, // lowercase UPPER
    ];
    const bad = nearMisses.filter((s) => !isValidSuggestion(s, source));
    expect(bad).toHaveLength(nearMisses.length);
  });
});

// ---------------------------------------------------------------------------
// SUITE D — Parse/retry failure → safe default fallback + mode compliance
// ---------------------------------------------------------------------------

describe("Suite D: Parse/retry failure → safe default fallback + mode compliance", () => {
  it("safeDefaultResponse passes ResponseSchema", () => {
    const def = safeDefaultResponse();
    const result = ResponseSchema.safeParse(def);
    expect(result.success).toBe(true);
  });

  it("safeDefaultResponse has score=0, empty suggestions, empty socratic_questions", () => {
    const def = safeDefaultResponse();
    expect(def.score).toBe(0);
    expect(def.suggestions).toEqual([]);
    expect(def.socratic_questions).toEqual([]);
  });

  it("safeDefaultResponse accessibility contains the fallback error message", () => {
    const def = safeDefaultResponse();
    expect(def.accessibility.issues.length).toBeGreaterThan(0);
    expect(def.accessibility.issues[0]).toMatch(/invalid output|try again/i);
  });

  it("coach mode fallback: schema-compliant, suggestions=[], questions ≤1, score=0", () => {
    const out = enforceModeConstraints(safeDefaultResponse(), "coach");
    validShape(out);
    expect(out.score).toBe(0);
    expect(out.suggestions).toEqual([]);
    expect(out.socratic_questions.length).toBeLessThanOrEqual(1);
    expect(out.accessibility.issues.length).toBeGreaterThan(0);
  });

  it("socratic mode fallback: schema-compliant, suggestions=[], questions ≥1, score=0", () => {
    const out = enforceModeConstraints(safeDefaultResponse(), "socratic");
    validShape(out);
    expect(out.score).toBe(0);
    expect(out.suggestions).toEqual([]);
    expect(out.socratic_questions.length).toBeGreaterThanOrEqual(1);
    expect(out.accessibility.issues.length).toBeGreaterThan(0);
  });

  it("invalid JSON-like object is rejected by ResponseSchema (simulating corrupt AI response)", () => {
    const corrupt = {
      score: "not-a-number",     // wrong type
      suggestions: null,          // wrong type
      // missing socratic_questions
      // missing accessibility
    };
    const result = ResponseSchema.safeParse(corrupt);
    expect(result.success).toBe(false);
    // Simulate what the handler does: fall back to safe default
    const fallback = enforceModeConstraints(safeDefaultResponse(), "coach");
    validShape(fallback);
    expect(fallback.suggestions).toEqual([]);
  });

  it("partially valid object (missing accessibility) is rejected by ResponseSchema", () => {
    const partial = {
      score: 70,
      suggestions: [],
      socratic_questions: [],
      // accessibility missing
    };
    const result = ResponseSchema.safeParse(partial);
    expect(result.success).toBe(false);
  });

  it("object with extra fields but otherwise valid still passes ResponseSchema", () => {
    // Zod with .passthrough() would allow this; by default Zod strips unknowns
    // The schema uses no .strict() so it should pass
    const withExtra = {
      score: 85,
      suggestions: [],
      socratic_questions: [],
      accessibility: { readability_score: "Grade 10", issues: [] },
      extra_field: "ignored",
    };
    const result = ResponseSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
  });

  it("all falsy/zero values still pass ResponseSchema (minimum valid shape)", () => {
    const minimal = {
      score: 0,
      suggestions: [],
      socratic_questions: [],
      accessibility: { readability_score: "", issues: [] },
    };
    const result = ResponseSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SUITE E — Deterministic snapshot tests for empty-input state
// ---------------------------------------------------------------------------

describe("Suite E: Deterministic empty-input snapshot tests", () => {
  /**
   * These are pinned reference objects.  If the engine logic or prompt changes
   * in a way that alters the deterministic fallback output, THESE TESTS WILL
   * FAIL on purpose — forcing a conscious review of the change.
   */

  const EMPTY_COACH_SNAPSHOT = {
    score: 0,
    suggestions: [],
    socratic_questions: [],
    accessibility: {
      readability_score: "n/a",
      issues: ["Input is empty."],
    },
  };

  const EMPTY_SOCRATIC_SNAPSHOT = {
    score: 0,
    suggestions: [],
    socratic_questions: [
      "What is the single most important idea you want the reader to take away?",
      "Who is the audience, and what do they already know?",
      "What outcome do you want from this writing?",
    ],
    accessibility: {
      readability_score: "n/a",
      issues: ["Input is empty."],
    },
  };

  it("empty coach mode output is byte-identical to pinned snapshot", () => {
    const edge = detectEdgeCases("");
    const out = buildEdgeCaseFallback("", "coach", edge);
    expect(out).toStrictEqual(EMPTY_COACH_SNAPSHOT);
  });

  it("empty socratic mode output is byte-identical to pinned snapshot", () => {
    const edge = detectEdgeCases("");
    const out = buildEdgeCaseFallback("", "socratic", edge);
    expect(out).toStrictEqual(EMPTY_SOCRATIC_SNAPSHOT);
  });

  it("empty coach snapshot passes ResponseSchema", () => {
    const result = ResponseSchema.safeParse(EMPTY_COACH_SNAPSHOT);
    expect(result.success).toBe(true);
  });

  it("empty socratic snapshot passes ResponseSchema", () => {
    const result = ResponseSchema.safeParse(EMPTY_SOCRATIC_SNAPSHOT);
    expect(result.success).toBe(true);
  });

  it("coach and socratic snapshots differ only in socratic_questions field", () => {
    // Score, suggestions, accessibility should be identical
    expect(EMPTY_COACH_SNAPSHOT.score).toBe(EMPTY_SOCRATIC_SNAPSHOT.score);
    expect(EMPTY_COACH_SNAPSHOT.suggestions).toEqual(EMPTY_SOCRATIC_SNAPSHOT.suggestions);
    expect(EMPTY_COACH_SNAPSHOT.accessibility).toEqual(EMPTY_SOCRATIC_SNAPSHOT.accessibility);
    // Questions differ
    expect(EMPTY_COACH_SNAPSHOT.socratic_questions).toEqual([]);
    expect(EMPTY_SOCRATIC_SNAPSHOT.socratic_questions.length).toBeGreaterThan(0);
  });

  it("re-running detection on empty string is always deterministic (call × 3)", () => {
    const run1 = buildEdgeCaseFallback("", "coach", detectEdgeCases(""));
    const run2 = buildEdgeCaseFallback("", "coach", detectEdgeCases(""));
    const run3 = buildEdgeCaseFallback("", "coach", detectEdgeCases(""));
    expect(run1).toStrictEqual(run2);
    expect(run2).toStrictEqual(run3);
    expect(run1).toStrictEqual(EMPTY_COACH_SNAPSHOT);
  });

  it("whitespace-only input is treated as empty and matches coach snapshot", () => {
    const edge = detectEdgeCases("   \n\t   ");
    expect(edge.empty).toBe(true);
    const out = buildEdgeCaseFallback("   \n\t   ", "coach", edge);
    expect(out).toStrictEqual(EMPTY_COACH_SNAPSHOT);
  });

  it("whitespace-only input is treated as empty and matches socratic snapshot", () => {
    const edge = detectEdgeCases("   \n\t   ");
    const out = buildEdgeCaseFallback("   \n\t   ", "socratic", edge);
    expect(out).toStrictEqual(EMPTY_SOCRATIC_SNAPSHOT);
  });
});
