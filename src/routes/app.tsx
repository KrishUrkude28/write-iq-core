import { createFileRoute, Link } from "@tanstack/react-router";
import { UserMenu } from "@/components/auth/UserMenu";
import { Presence } from "@/components/editor/Presence";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { useWorkspace } from "@/hooks/use-workspace";
import { useState, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeWriting, extractVoice } from "@/server/writeiq.functions";
import { saveAnalysis, saveVoiceSignature } from "@/server/history.functions";
import { getSessionId } from "@/lib/session";
import {
  WriteIQEditor,
  type WriteIQEditorHandle,
} from "@/components/editor/WriteIQEditor";
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
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Loader2,
  Wand2,
  Brain,
  HelpCircle,
  ArrowRight,
  Mic,
  ClipboardCopy,
  LayoutDashboard,
  Clock,
  CheckCheck,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/")(({
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
} as any));

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
  const saveFn = useServerFn(saveAnalysis);
  const saveVoiceFn = useServerFn(saveVoiceSignature);
  const { activeWorkspaceId } = useWorkspace();

  const editorRef = useRef<WriteIQEditorHandle>(null);

  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [mode, setMode] = useState<"coach" | "socratic">("coach");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [appliedSet, setAppliedSet] = useState<Set<number>>(new Set());

  const [voiceSamples, setVoiceSamples] = useState("");
  const [voice, setVoice] = useState<Voice | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to analyze.");
      return;
    }
    setLoading(true);
    setResult(null);
    setShareUrl(null);
    setAppliedSet(new Set());
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
          workspaceId: activeWorkspaceId,
        },
      });
      const analysisResult = res as AnalysisResult;
      setResult(analysisResult);

      // Auto-save to history
      try {
        const sessionId = getSessionId();
        const saved = await saveFn({
          data: {
            userSession: sessionId,
            workspaceId: activeWorkspaceId,
            inputText: text,
            context,
            mode,
            result: analysisResult,
            score: analysisResult.score,
          },
        });
        const url = `${window.location.origin}/share/${(saved as any).share_id}`;
        setShareUrl(url);
        toast.success("Analysis saved to history.");
      } catch {
        // Non-fatal — analysis still shows even if save fails
        toast.error("Could not save to history (Supabase not configured).");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [text, mode, context, voice, analyzeFn, saveFn]);

  /** Apply a coach suggestion directly into the TipTap editor */
  const handleApply = useCallback(
    (idx: number, original: string, replacement: string) => {
      const applied = editorRef.current?.applyReplacement(original, replacement);
      if (applied) {
        setAppliedSet((prev) => new Set([...prev, idx]));
        toast.success("Suggestion applied in editor.");
      } else {
        toast.error("Could not find the original text in the editor.");
      }
    },
    [],
  );

  /** Export analysis results as a Markdown file */
  const handleExport = useCallback(() => {
    if (!result) return;
    const lines: string[] = [
      `# WriteIQ Analysis`,
      ``,
      `**Score:** ${result.score}/100  `,
      `**Mode:** ${mode}  `,
      `**Readability:** ${result.accessibility.readability_score}`,
      ``,
    ];

    if (mode === "coach" && result.suggestions.length > 0) {
      lines.push(`## Suggestions`, ``);
      result.suggestions.forEach((s, i) => {
        lines.push(
          `### ${i + 1}. ${s.title}`,
          ``,
          s.description,
          ``,
          `**Original:** ${s.original}`,
          `**Replacement:** ${s.replacement}`,
          ``,
        );
      });
    }

    if (result.socratic_questions.length > 0) {
      lines.push(`## Questions to Consider`, ``);
      result.socratic_questions.forEach((q) => lines.push(`- ${q}`));
      lines.push(``);
    }

    if (result.accessibility.issues.length > 0) {
      lines.push(`## Accessibility Issues`, ``);
      result.accessibility.issues.forEach((iss) => lines.push(`- ${iss}`));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `writeiq-analysis-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Analysis exported as Markdown.");
  }, [result, mode]);

  const handleExtractVoice = async () => {
    if (voiceSamples.trim().length < 20) {
      toast.error("Please paste at least a paragraph of your writing.");
      return;
    }
    setVoiceLoading(true);
    try {
      const sig = await extractFn({ 
        data: { 
          samples: voiceSamples,
          workspaceId: activeWorkspaceId
        } 
      });
      setVoice(sig as Voice);
      toast.success("Voice signature captured.");

      // Auto-save voice signature
      try {
        const sessionId = getSessionId();
        await saveVoiceFn({
          data: {
            userSession: sessionId,
            workspaceId: activeWorkspaceId,
            name: "My Voice",
            signature: sig,
            samplePreview: voiceSamples.slice(0, 200),
          },
        });
      } catch {
        // Non-fatal
      }
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
        ? "text-emerald-600"
        : result.score >= 70
          ? "text-primary"
          : result.score >= 40
            ? "text-amber-600"
            : "text-destructive";

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
              >
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="font-display font-bold text-xl tracking-tight">WriteIQ</div>
            </Link>
            <div className="h-6 w-[1px] bg-border/60 mx-2 hidden md:block" />
            <WorkspaceSwitcher />
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/history" className="text-muted-foreground hover:text-foreground transition-colors">
                History
              </Link>
            </nav>
            <div className="h-6 w-[1px] bg-border/60 hidden md:block" />
            <Presence />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <section className="mb-12 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-display font-semibold leading-[1.05] tracking-tight">
            Writing,{" "}
            <span
              style={{
                background: "var(--gradient-primary)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
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
            <Card className="p-6 overflow-hidden" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className={`w-4 h-4 ${mode === "coach" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${mode === "coach" ? "text-foreground" : "text-muted-foreground"}`}>
                      Coach
                    </span>
                  </div>
                  <Switch
                    checked={mode === "socratic"}
                    onCheckedChange={(v) => setMode(v ? "socratic" : "coach")}
                  />
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${mode === "socratic" ? "text-foreground" : "text-muted-foreground"}`}>
                      Socratic
                    </span>
                    <Brain className={`w-4 h-4 ${mode === "socratic" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                </div>
              </div>

              {/* TipTap rich text editor */}
              <WriteIQEditor
                ref={editorRef}
                value={text}
                onChange={setText}
                onAnalyze={handleAnalyze}
                placeholder="Paste or write your draft here..."
                workspaceId={activeWorkspaceId ?? undefined}
                className="min-h-[280px] border border-border/40 rounded-md"
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
                  <div className="flex items-center gap-4">
                    {/* Export button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleExport}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export .md
                    </Button>
                    <div className="text-right">
                      <div className={`text-5xl font-display font-semibold ${scoreColor}`}>
                        {result.score}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Score</div>
                    </div>
                  </div>
                </div>

                {/* Share link */}
                {shareUrl && (
                  <div className="mb-5 flex items-center gap-2 p-3 bg-secondary/40 rounded-lg">
                    <span className="text-sm text-muted-foreground flex-1 truncate">{shareUrl}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 flex-shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        toast.success("Share link copied!");
                      }}
                    >
                      <ClipboardCopy className="w-3.5 h-3.5" />
                      Copy
                    </Button>
                  </div>
                )}

                {mode === "coach" && result.suggestions.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Suggestions
                    </h3>
                    {result.suggestions.map((s, i) => {
                      const isApplied = appliedSet.has(i);
                      return (
                        <div
                          key={i}
                          className={`border-l-2 pl-4 py-1 transition-opacity ${
                            isApplied ? "border-emerald-500/60 opacity-60" : "border-primary/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="font-semibold">{s.title}</div>
                            <Button
                              size="sm"
                              variant={isApplied ? "secondary" : "default"}
                              className="gap-1.5 flex-shrink-0 h-7 text-xs"
                              disabled={isApplied}
                              onClick={() => handleApply(i, s.original, s.replacement)}
                            >
                              {isApplied ? (
                                <>
                                  <CheckCheck className="w-3 h-3" /> Applied
                                </>
                              ) : (
                                <>
                                  <CheckCheck className="w-3 h-3" /> Apply
                                </>
                              )}
                            </Button>
                          </div>
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
                      );
                    })}
                  </div>
                )}

                {mode === "socratic" && result.socratic_questions.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Questions to consider
                    </h3>
                    {result.socratic_questions.map((q, i) => (
                      <div key={i} className="flex gap-4 items-start p-3 bg-primary/5 border border-primary/10 rounded-lg group/q transition-colors hover:bg-primary/10">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <HelpCircle className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base leading-relaxed mb-2">{q}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1.5 opacity-0 group-hover/q:opacity-100 transition-opacity"
                            onClick={() => {
                              editorRef.current?.insertText(`\n\n> ${q}\n\n`);
                              toast.success("Question copied to editor.");
                            }}
                          >
                            <ClipboardCopy className="w-3 h-3" />
                            Copy to Editor
                          </Button>
                        </div>
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
        Powered by WriteIQ AI ·{" "}
        <Link to="/history" className="underline underline-offset-4">History</Link> ·{" "}
        <Link to="/dashboard" className="underline underline-offset-4">Dashboard</Link>
      </footer>
    </div>
  );
}
