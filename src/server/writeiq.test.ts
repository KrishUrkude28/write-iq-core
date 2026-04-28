import { describe, it, expect } from "vitest";
import {
  ResponseSchema,
  detectEdgeCases,
  buildEdgeCaseFallback,
  isValidSuggestion,
  safeDefaultResponse,
  enforceModeConstraints,
} from "./writeiq.functions";

const validShape = (obj: unknown) => {
  // Must round-trip as JSON and pass the strict schema.
  const json = JSON.stringify(obj);
  expect(() => JSON.parse(json)).not.toThrow();
  const parsed = ResponseSchema.safeParse(JSON.parse(json));
  expect(parsed.success).toBe(true);
};

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
