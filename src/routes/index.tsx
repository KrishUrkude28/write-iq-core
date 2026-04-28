import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeWriting, extractVoice } from "@/server/writeiq.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Sparkles,
  Loader2,
  Wand2,
  Brain,
  HelpCircle,
  ArrowRight,
  Mic,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WriteIQ — AI Writing Intelligence Engine" },
      {
        name: "description",
        content:
          "Analyze and improve your writing with precision. Coach mode for direct fixes, Socratic mode for guided thinking, voice cloning for personal style.",
      },
      { property: "og:title", content: "WriteIQ — AI Writing Intelligence Engine" },
      {
        property: "og:description",
        content: "Precision writing analysis with adaptive voice matching.",
      },
    ],
  }),
  component: Index,
});

type Suggestion = {
  title: string;
  description: string;
  original: string;
  replacement: string;
};

type AnalysisResult = {
  score: number;
  suggestions: Suggestion[];
  socratic_questions: string[];
  accessibility: { readability_score: string; issues: string[] };
};

type Voice = {
  tone: string;
  sentence_style: string;
  vocabulary_level: string;
  patterns: string[];
  distinct_traits: string[];
};

function Index() {
  const analyzeFn = useServerFn(analyzeWriting);
  const extractFn = useServerFn(extractVoice);

  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [mode, setMode] = useState<"coach" | "socratic">("coach");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [voiceSamples, setVoiceSamples] = useState("");
  const [voice, setVoice] = useState<Voice | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to analyze.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await analyzeFn({
        data: {
          text,
          mode,
          context,
          voice: voice
            ? {
                tone: voice.tone,
                vocab: voice.vocabulary_level,
                traits: voice.distinct_traits.join(", "),
              }
            : { tone: "", vocab: "", traits: "" },
        },
      });
      setResult(res as AnalysisResult);
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExtractVoice = async () => {
    if (voiceSamples.trim().length < 20) {
      toast.error("Please paste at least a paragraph of your writing.");
      return;
    }
    setVoiceLoading(true);
    try {
      const sig = await extractFn({ data: { samples: voiceSamples } });
      setVoice(sig as Voice);
      toast.success("Voice signature captured.");
    } catch (e: any) {
      toast.error(e?.message ?? "Voice extraction failed");
    } finally {
      setVoiceLoading(false);
    }
  };

  const scoreColor =
    result == null
      ? ""
      : result.score >= 90
      ? "text-primary"
      : result.score >= 70
      ? "text-foreground"
      : result.score >= 40
      ? "text-amber-600"
      : "text-destructive";

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}>
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display font-semibold text-lg leading-none">WriteIQ</div>
              <div className="text-xs text-muted-foreground">Writing Intelligence Engine</div>
            </div>
          </div>
          {voice && (
            <Badge variant="secondary" className="gap-1">
              <Mic className="w-3 h-3" /> Voice: {voice.tone}
            </Badge>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <section className="mb-12 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-display font-semibold leading-[1.05] tracking-tight">
            Writing,{" "}
            <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              made deliberate.
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Paste your draft. Get precise fixes, or thought-provoking questions.
            WriteIQ adapts to your voice, audience and intent.
          </p>
        </section>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Editor column */}
          <div className="space-y-6">
            <Card className="p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className={`w-4 h-4 ${mode === "coach" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${mode === "coach" ? "text-foreground" : "text-muted-foreground"}`}>Coach</span>
                  </div>
                  <Switch
                    checked={mode === "socratic"}
                    onCheckedChange={(v) => setMode(v ? "socratic" : "coach")}
                  />
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${mode === "socratic" ? "text-foreground" : "text-muted-foreground"}`}>Socratic</span>
                    <Brain className={`w-4 h-4 ${mode === "socratic" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{text.length} chars</span>
              </div>

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or write your draft here..."
                className="min-h-[280px] resize-none border-0 bg-secondary/40 focus-visible:ring-1 focus-visible:ring-primary/40 text-base leading-relaxed"
              />

              <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <Label htmlFor="ctx" className="text-xs text-muted-foreground">
                    Context (audience, purpose) — optional
                  </Label>
                  <Input
                    id="ctx"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="e.g. cold email to a senior PM"
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={loading}
                  size="lg"
                  className="gap-2"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Analyze
                </Button>
              </div>
            </Card>

            {/* Results */}
            {result && (
              <Card className="p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex items-baseline justify-between mb-6">
                  <h2 className="text-xl font-display font-semibold">Analysis</h2>
                  <div className="text-right">
                    <div className={`text-5xl font-display font-semibold ${scoreColor}`}>
                      {result.score}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Score</div>
                  </div>
                </div>

                {mode === "coach" && result.suggestions.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Suggestions
                    </h3>
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="border-l-2 border-primary/40 pl-4 py-1">
                        <div className="font-semibold mb-1">{s.title}</div>
                        <p className="text-sm text-muted-foreground mb-3">{s.description}</p>
                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
                            <div className="text-xs font-medium text-destructive mb-1">Original</div>
                            <div className="line-through opacity-80">{s.original}</div>
                          </div>
                          <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                            <div className="text-xs font-medium text-primary mb-1">Replacement</div>
                            <div>{s.replacement}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {mode === "socratic" && result.socratic_questions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Questions to consider
                    </h3>
                    {result.socratic_questions.map((q, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <HelpCircle className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                        <p className="text-base leading-relaxed">{q}</p>
                      </div>
                    ))}
                  </div>
                )}

                <Separator className="my-6" />

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Accessibility
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Readability: {result.accessibility.readability_score}</Badge>
                  </div>
                  {result.accessibility.issues.length > 0 && (
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      {result.accessibility.issues.map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Voice sidebar */}
          <aside>
            <Card className="p-6 sticky top-24" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Mic className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-lg">Voice cloning</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Paste 1–3 samples of your writing. WriteIQ extracts your style and applies it to all suggestions.
              </p>

              <Textarea
                value={voiceSamples}
                onChange={(e) => setVoiceSamples(e.target.value)}
                placeholder="Paste writing samples..."
                className="min-h-[140px] resize-none bg-secondary/40 border-0 text-sm"
              />

              <Button
                onClick={handleExtractVoice}
                disabled={voiceLoading}
                variant="outline"
                className="w-full mt-3 gap-2"
              >
                {voiceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {voice ? "Re-extract voice" : "Extract my voice"}
              </Button>

              {voice && (
                <div className="mt-5 space-y-3 text-sm">
                  <Separator />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tone</div>
                    <div>{voice.tone}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sentence style</div>
                    <div>{voice.sentence_style}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vocabulary</div>
                    <div>{voice.vocabulary_level}</div>
                  </div>
                  {voice.distinct_traits.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Traits</div>
                      <div className="flex flex-wrap gap-1">
                        {voice.distinct_traits.map((t, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </aside>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-center text-sm text-muted-foreground">
        Powered by Lovable AI · Built with WriteIQ prompt architecture
      </footer>
    </div>
  );
}
