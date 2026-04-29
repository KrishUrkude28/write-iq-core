import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserMenu } from "@/components/auth/UserMenu";
import { listAnalyses, deleteAnalysis, deleteAllAnalyses } from "@/server/history.functions";
import { getSessionId } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Sparkles,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  ArrowLeft,
  Brain,
  Wand2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — WriteIQ" },
      { name: "description", content: "Your past writing analyses." },
    ],
  }),
  component: HistoryPage,
});

type AnalysisSummary = {
  id: string;
  share_id: string;
  input_text: string;
  context: string;
  mode: "coach" | "socratic";
  score: number;
  created_at: string;
};

function ScoreDot({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-emerald-500"
      : score >= 70
        ? "bg-primary"
        : score >= 40
          ? "bg-amber-500"
          : "bg-destructive";
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold text-white ${color}`}
    >
      {score}
    </span>
  );
}

function AnalysisCard({
  item,
  onDelete,
}: {
  item: AnalysisSummary;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = item.input_text.slice(0, 140) + (item.input_text.length > 140 ? "…" : "");
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${item.share_id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied!");
  };

  return (
    <Card className="p-5 transition-shadow hover:shadow-md" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-start gap-4">
        <ScoreDot score={item.score} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="gap-1 text-xs">
              {item.mode === "coach" ? (
                <Wand2 className="w-3 h-3" />
              ) : (
                <Brain className="w-3 h-3" />
              )}
              {item.mode === "coach" ? "Coach" : "Socratic"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>

          {item.context && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              Context: {item.context.slice(0, 80)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8"
            onClick={copyLink}
            title="Copy share link"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8"
            asChild
            title="View shared analysis"
          >
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(item.id)}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Collapse" : "Expand full text"}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border/40">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.input_text}</p>
        </div>
      )}
    </Card>
  );
}

function HistoryPage() {
  const listFn = useServerFn(listAnalyses);
  const deleteFn = useServerFn(deleteAnalysis);
  const deleteAllFn = useServerFn(deleteAllAnalyses);

  const [items, setItems] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = getSessionId();
    listFn({ data: { userSession: sessionId } })
      .then((rows) => setItems(rows as AnalysisSummary[]))
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteFn({ data: { id } });
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Deleted.");
    } catch {
      toast.error("Delete failed.");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear your entire history? This cannot be undone.")) return;
    try {
      const sessionId = getSessionId();
      await deleteAllFn({ data: { userSession: sessionId } });
      setItems([]);
      toast.success("History cleared.");
    } catch {
      toast.error("Failed to clear history.");
    }
  };

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
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
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                Editor
              </Link>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
            </nav>
            <div className="h-6 w-[1px] bg-border/60 hidden md:block" />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display font-semibold tracking-tight">Analysis History</h1>
            <p className="mt-2 text-muted-foreground">
              Your past writing analyses, stored for this browser session.
            </p>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2" onClick={handleClearAll}>
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-secondary/40 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No analyses yet</p>
            <p className="text-sm mt-1 mb-6">Go analyze some writing to see results here.</p>
            <Link to="/">
              <Button style={{ background: "var(--gradient-primary)" }}>Open Editor</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{items.length} result{items.length !== 1 ? "s" : ""}</p>
            {items.map((item) => (
              <AnalysisCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
