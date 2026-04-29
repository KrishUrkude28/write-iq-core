import { createFileRoute, Link } from "@tanstack/react-router";
import { UserMenu } from "@/components/auth/UserMenu";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { useWorkspace } from "@/hooks/use-workspace";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listAnalyses,
  listVoiceSignatures,
  deleteVoiceSignature,
  renameVoiceSignature,
} from "@/server/history.functions";
import { getSessionId } from "@/lib/session";
import { ShareSettingsModal } from "@/components/sharing/ShareSettingsModal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { BulkAnalyzer } from "@/components/analysis/BulkAnalyzer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Mic,
  BarChart3,
  Clock,
  Wand2,
  Brain,
  Trash2,
  ArrowRight,
  TrendingUp,
  Pencil,
  Check,
  X,
  Sliders,
  Share2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — WriteIQ" },
      { name: "description", content: "Your writing workspace: voice library, score trends, and recent analyses." },
    ],
  }),
  component: DashboardPage,
});

type AnalysisSummary = {
  id: string;
  share_id: string;
  input_text: string;
  mode: "coach" | "socratic";
  score: number;
  created_at: string;
  is_public: boolean;
  expires_at: string | null;
};

type VoiceSignature = {
  id: string;
  name: string;
  signature: {
    tone: string;
    sentence_style: string;
    vocabulary_level: string;
    patterns: string[];
    distinct_traits: string[];
  };
  sample_preview: string;
  created_at: string;
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card className="p-5 flex items-center gap-4" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
      >
        <Icon className="w-5 h-5 text-primary-foreground" />
      </div>
      <div>
        <div className="text-2xl font-display font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      </div>
    </Card>
  );
}

/** Inline editable voice card name */
function VoiceCardName({
  id,
  initialName,
  onRenamed,
}: {
  id: string;
  initialName: string;
  onRenamed: (id: string, name: string) => void;
}) {
  const renameFn = useServerFn(renameVoiceSignature);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await renameFn({ data: { id, name: draft.trim() } });
      onRenamed(id, draft.trim());
      toast.success("Voice renamed.");
    } catch {
      toast.error("Rename failed.");
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 mb-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setEditing(false); setDraft(initialName); }
          }}
          className="h-7 text-sm font-semibold px-2"
          autoFocus
          maxLength={64}
        />
        <Button size="icon" variant="ghost" className="w-6 h-6" onClick={save} disabled={saving}>
          <Check className="w-3.5 h-3.5 text-primary" />
        </Button>
        <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => { setEditing(false); setDraft(initialName); }}>
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mb-3 group/name">
      <div className="font-display font-semibold">{draft}</div>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover/name:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        title="Rename"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

function DashboardPage() {
  const listAnalysesFn = useServerFn(listAnalyses);
  const listVoicesFn = useServerFn(listVoiceSignatures);
  const deleteVoiceFn = useServerFn(deleteVoiceSignature);

  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [voices, setVoices] = useState<VoiceSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingItem, setSharingItem] = useState<AnalysisSummary | null>(null);
  const { activeWorkspaceId } = useWorkspace();

  useEffect(() => {
    const sessionId = getSessionId();
    setLoading(true);
    Promise.all([
      listAnalysesFn({ data: { userSession: sessionId, workspaceId: activeWorkspaceId } }),
      listVoicesFn({ data: { userSession: sessionId, workspaceId: activeWorkspaceId } }),
    ])
      .then(([a, v]) => {
        setAnalyses(a as AnalysisSummary[]);
        setVoices(v as VoiceSignature[]);
      })
      .catch(() => toast.error("Failed to load workspace"))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const handleDeleteVoice = async (id: string) => {
    try {
      await deleteVoiceFn({ data: { id } });
      setVoices((prev) => prev.filter((v) => v.id !== id));
      toast.success("Voice signature deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleVoiceRenamed = (id: string, name: string) => {
    setVoices((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  };

  // Stats
  const totalAnalyses = analyses.length;
  const avgScore =
    analyses.length > 0
      ? Math.round(analyses.reduce((acc, a) => acc + a.score, 0) / analyses.length)
      : 0;
  const mostUsedMode =
    analyses.filter((a) => a.mode === "coach").length >= analyses.filter((a) => a.mode === "socratic").length
      ? "Coach"
      : "Socratic";

  // Score trend data — last 20 analyses in chronological order
  const chartData = [...analyses]
    .slice(0, 20)
    .reverse()
    .map((a, i) => ({
      idx: i + 1,
      score: a.score,
      date: new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }));

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
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Editor
              </Link>
              <Link to="/history" className="text-muted-foreground hover:text-foreground transition-colors">
                History
              </Link>
            </nav>
            <div className="h-6 w-[1px] bg-border/60 hidden md:block" />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* Page title */}
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tight">Your Workspace</h1>
          <p className="mt-2 text-muted-foreground">
            Voice library, score trend, and recent analyses.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-12">
          <TabsList className="glassmorphic p-1 h-12 w-full max-w-md">
            <TabsTrigger value="overview" className="flex-1 gap-2">
              <TrendingUp className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex-1 gap-2">
              <Sparkles className="w-4 h-4" />
              Bulk Lab
            </TabsTrigger>
            <TabsTrigger value="voices" className="flex-1 gap-2">
              <Mic className="w-4 h-4" />
              Voices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* Stats */}
        <section>
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Stats
          </h2>
          {loading ? (
            <div className="grid sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-secondary/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <StatCard label="Total Analyses" value={totalAnalyses} icon={TrendingUp} />
              <StatCard label="Avg Score" value={avgScore || "—"} icon={BarChart3} />
              <StatCard label="Preferred Mode" value={totalAnalyses > 0 ? mostUsedMode : "—"} icon={Wand2} />
            </div>
          )}
        </section>

        {/* Score Trend Chart */}
        {!loading && chartData.length > 1 && (
          <section>
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Score Trend
            </h2>
            <Card className="p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "var(--color-muted-foreground)" }}
                    itemStyle={{ color: "var(--color-primary)" }}
                    formatter={(v: number) => [`${v}`, "Score"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </section>
        )}

        <Separator />

        {/* Recent Analyses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Recent Analyses
            </h2>
            <Link to="/history">
              <Button variant="outline" size="sm" className="gap-2">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
              ))}
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No analyses yet.{" "}
              <Link to="/" className="underline underline-offset-4">Go analyze some writing.</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.slice(0, 5).map((item) => {
                const scoreColor =
                  item.score >= 90
                    ? "text-emerald-600"
                    : item.score >= 70
                      ? "text-primary"
                      : item.score >= 40
                        ? "text-amber-600"
                        : "text-destructive";
                return (
                  <Card key={item.id} className="p-4 flex items-center gap-4" style={{ boxShadow: "var(--shadow-soft)" }}>
                    <span className={`text-2xl font-display font-semibold w-12 text-center flex-shrink-0 ${scoreColor}`}>
                      {item.score}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {item.input_text.slice(0, 100)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="gap-1 text-xs">
                        {item.mode === "coach" ? <Wand2 className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                        {item.mode === "coach" ? "Coach" : "Socratic"}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        title="Sharing settings"
                        onClick={() => setSharingItem(item)}
                      >
                        <Share2 className="w-3 h-3" />
                      </Button>
                      <a href={`/share/${item.share_id}`} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="w-7 h-7" title="View shared">
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </a>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
        </TabsContent>

        <TabsContent value="bulk" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <BulkAnalyzer />
        </TabsContent>

        <TabsContent value="voices" className="animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* Voice Library */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" /> Voice Library
            </h2>
            <div className="flex gap-2">
              <Link to="/voice-studio">
                <Button variant="outline" size="sm" className="gap-2">
                  <Sliders className="w-3.5 h-3.5" />
                  Voice Studio
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Extract new
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 rounded-xl bg-secondary/40 animate-pulse" />
              ))}
            </div>
          ) : voices.length === 0 ? (
            <div className="text-center py-14 border border-dashed border-border/60 rounded-xl text-muted-foreground">
              <Mic className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No voice signatures yet</p>
              <p className="text-sm mt-1 mb-4">Extract your writing voice from the editor sidebar.</p>
              <Link to="/"><Button variant="outline" size="sm">Go to Editor</Button></Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {voices.map((v) => (
                <Card key={v.id} className="p-5 relative group" style={{ boxShadow: "var(--shadow-soft)" }}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-3 right-3 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteVoice(v.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>

                  {/* Inline rename */}
                  <VoiceCardName id={v.id} initialName={v.name} onRenamed={handleVoiceRenamed} />

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tone</span>
                      <p>{v.signature.tone}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vocabulary</span>
                      <p>{v.signature.vocabulary_level}</p>
                    </div>
                    {v.signature.distinct_traits.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Traits</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.signature.distinct_traits.slice(0, 3).map((t, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* Recent Analyses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Recent Analyses
            </h2>
            <Link to="/history">
              <Button variant="outline" size="sm" className="gap-2">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
              ))}
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No analyses yet.{" "}
              <Link to="/" className="underline underline-offset-4">Go analyze some writing.</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.slice(0, 5).map((item) => {
                const scoreColor =
                  item.score >= 90
                    ? "text-emerald-600"
                    : item.score >= 70
                      ? "text-primary"
                      : item.score >= 40
                        ? "text-amber-600"
                        : "text-destructive";
                return (
                  <Card key={item.id} className="p-4 flex items-center gap-4" style={{ boxShadow: "var(--shadow-soft)" }}>
                    <span className={`text-2xl font-display font-semibold w-12 text-center flex-shrink-0 ${scoreColor}`}>
                      {item.score}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {item.input_text.slice(0, 100)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="gap-1 text-xs">
                        {item.mode === "coach" ? <Wand2 className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                        {item.mode === "coach" ? "Coach" : "Socratic"}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        title="Sharing settings"
                        onClick={() => setSharingItem(item)}
                      >
                        <Share2 className="w-3 h-3" />
                      </Button>
                      <a href={`/share/${item.share_id}`} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="w-7 h-7" title="View shared">
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </a>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
        </TabsContent>
        </Tabs>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-center text-sm text-muted-foreground">
        WriteIQ Workspace · {voices.length > 0 ? "Professional Laboratory" : "Personal Workspace"}
      </footer>

      {sharingItem && (
        <ShareSettingsModal
          id={sharingItem.id}
          shareId={sharingItem.share_id}
          isOpen={!!sharingItem}
          onClose={() => setSharingItem(null)}
          initialSettings={{
            isPublic: sharingItem.is_public,
            expiresAt: sharingItem.expires_at,
          }}
        />
      )}
    </div>
  );
}
