import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Brain,
  Wand2,
  Mic,
  Sparkles,
  ArrowRight,
  CheckCheck,
  Users,
  History as HistoryIcon,
  ShieldCheck,
  Quote,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WriteIQ — Writing, made deliberate." },
      {
        name: "description",
        content:
          "WriteIQ is an AI writing intelligence engine. Coach mode for precise fixes, Socratic mode for sharper thinking, and voice cloning that adapts to how you actually write.",
      },
      { property: "og:title", content: "WriteIQ — Writing, made deliberate." },
      {
        property: "og:description",
        content:
          "Precise fixes, Socratic questions, and voice-matched suggestions. Built for writers who care about every sentence.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      {/* ───────── Header ───────── */}
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
            >
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="font-display font-bold text-xl tracking-tight">WriteIQ</div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#modes" className="text-muted-foreground hover:text-foreground transition-colors">Modes</a>
            <a href="#voice" className="text-muted-foreground hover:text-foreground transition-colors">Voice</a>
            <a href="#workflow" className="text-muted-foreground hover:text-foreground transition-colors">Workflow</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-1.5"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
            >
              <Link to="/app">
                Open app <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ───────── Hero ───────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div
              className="absolute -top-32 -left-32 w-[42rem] h-[42rem] rounded-full opacity-40 blur-[120px]"
              style={{ background: "var(--gradient-primary)" }}
            />
            <div
              className="absolute top-40 -right-40 w-[36rem] h-[36rem] rounded-full opacity-25 blur-[140px]"
              style={{ background: "var(--gradient-primary)" }}
            />
          </div>

          <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/60 backdrop-blur text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Deterministic AI writing intelligence
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-semibold leading-[1.02] tracking-tight max-w-4xl mx-auto">
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
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              WriteIQ analyzes every sentence with precision. Get direct fixes when you
              need speed, Socratic questions when you need depth — all matched to your
              own voice.
            </p>
            <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
              <Button
                asChild
                size="lg"
                className="gap-2 h-12 px-7 text-base"
                style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
              >
                <Link to="/app">
                  Start writing <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <Link to="/voice-studio">Train your voice</Link>
              </Button>
            </div>
            <div className="mt-6 text-xs text-muted-foreground">
              No credit card. Works on any draft, any length.
            </div>
          </div>
        </section>

        {/* ───────── Features ───────── */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-14">
            <div className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
              Features
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
              Built for writers who care about <em className="italic">every</em> sentence.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Wand2,
                title: "Precise edits",
                body: "Every coach suggestion includes the exact original phrase and a verbatim replacement — apply with one click.",
              },
              {
                icon: Brain,
                title: "Socratic mode",
                body: "Sometimes you don't want answers. WriteIQ asks the questions that unlock your sharpest thinking.",
              },
              {
                icon: Mic,
                title: "Voice cloning",
                body: "Paste a few paragraphs of your writing. WriteIQ extracts your tone, vocabulary, and patterns.",
              },
              {
                icon: HistoryIcon,
                title: "Full history",
                body: "Every analysis is saved and shareable. Compare drafts, revisit decisions, ship better next time.",
              },
              {
                icon: Users,
                title: "Workspaces",
                body: "Collaborate with your team. Shared voice signatures, shared history, shared standards.",
              },
              {
                icon: ShieldCheck,
                title: "Schema-strict",
                body: "Outputs validated against a strict schema with automatic recovery — no hallucinated edits.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <Card
                key={title}
                className="p-6 bg-card/60 backdrop-blur border-border/60 transition hover:border-primary/40 hover:-translate-y-0.5"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="font-display text-xl font-semibold mb-2">{title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ───────── Modes ───────── */}
        <section id="modes" className="border-y border-border/60 bg-card/30">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
                Two modes
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
                Speed or depth. You decide.
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Toggle between Coach and Socratic with a single switch — the engine
                enforces strict rules so you always get exactly what you asked for.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-8 bg-background border-border/60" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Wand2 className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-semibold">Coach</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">
                      Direct fixes
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground mb-5 leading-relaxed">
                  Concrete original → replacement pairs you can apply instantly. Capped to
                  one Socratic question so you stay focused on shipping.
                </p>
                <ul className="space-y-2.5 text-sm">
                  {[
                    "Verbatim original substring matching",
                    "One-click apply in the editor",
                    "Markdown export of the full analysis",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-8 bg-background border-border/60" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Brain className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-semibold">Socratic</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">
                      Guided thinking
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground mb-5 leading-relaxed">
                  Suggestions disappear. Instead, WriteIQ surfaces 1–5 sharp questions
                  that interrogate your draft's logic, audience, and intent.
                </p>
                <ul className="space-y-2.5 text-sm">
                  {[
                    "Forces clarity before correction",
                    "Best for outlines, arguments, essays",
                    "No suggestions — guaranteed",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* ───────── Voice ───────── */}
        <section id="voice" className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
                Voice cloning
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight leading-[1.05]">
                Suggestions in <span style={{
                  background: "var(--gradient-primary)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>your</span> voice — not a generic one.
              </h2>
              <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
                Drop in a few paragraphs of your past writing. WriteIQ extracts a voice
                signature — tone, sentence rhythm, vocabulary level, and your distinctive
                patterns — and uses it to bias every future suggestion.
              </p>
              <div className="mt-7">
                <Button
                  asChild
                  size="lg"
                  className="gap-2"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
                >
                  <Link to="/voice-studio">
                    Open Voice Studio <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <Card className="p-7 bg-card/60 backdrop-blur border-border/60" style={{ boxShadow: "var(--shadow-elegant)" }}>
              <div className="flex items-start gap-3 mb-5">
                <Quote className="w-6 h-6 text-primary flex-shrink-0" />
                <p className="font-display italic text-lg leading-relaxed">
                  "It stopped sounding like a chatbot and started sounding like me. The
                  Socratic mode alone changed how I outline."
                </p>
              </div>
              <div className="border-t border-border/60 pt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Tone</div>
                  <div className="font-medium">Direct, warm</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Style</div>
                  <div className="font-medium">Short, punchy</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Vocab</div>
                  <div className="font-medium">Conversational</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Traits</div>
                  <div className="font-medium">Em-dash, asides</div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ───────── Workflow ───────── */}
        <section id="workflow" className="border-t border-border/60 bg-card/30">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
                Workflow
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
                From draft to deliberate in three steps.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 relative">
              {[
                { n: "01", title: "Paste your draft", body: "Any length, any context. Add audience and intent for sharper results." },
                { n: "02", title: "Pick your mode", body: "Coach for fixes, Socratic for questions. Toggle anytime mid-flow." },
                { n: "03", title: "Apply & ship", body: "One-click apply in the editor. Export as Markdown. Share via link." },
              ].map(({ n, title, body }) => (
                <div key={n} className="relative">
                  <div className="font-display text-7xl font-semibold opacity-10 leading-none mb-2">{n}</div>
                  <div className="font-display text-2xl font-semibold mb-2">{title}</div>
                  <p className="text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── CTA ───────── */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <Card
            className="p-12 md:p-16 text-center relative overflow-hidden border-border/60"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white/30 blur-[100px]" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-white/20 blur-[120px]" />
            </div>
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-primary-foreground max-w-2xl mx-auto leading-[1.05]">
                Stop guessing. Start writing with intent.
              </h2>
              <p className="mt-5 text-primary-foreground/85 text-lg max-w-xl mx-auto">
                Open the editor and analyze your first draft in seconds.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                <Button asChild size="lg" variant="secondary" className="h-12 px-7 text-base gap-2">
                  <Link to="/app">
                    Open the editor <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 text-base bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Link to="/signup">Create an account</Link>
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">WriteIQ</span>
            <span className="text-xs text-muted-foreground ml-2">
              &copy; {new Date().getFullYear()} — Writing, made deliberate.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/app" className="hover:text-foreground transition-colors">App</Link>
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
