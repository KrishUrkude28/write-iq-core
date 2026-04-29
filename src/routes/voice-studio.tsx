import { createFileRoute, Link } from "@tanstack/react-router";
import { UserMenu } from "@/components/auth/UserMenu";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { useWorkspace } from "@/hooks/use-workspace";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { 
  listVoiceSignatures, 
  renameVoiceSignature, 
  promoteVoiceSignature, 
  archiveVoiceSignature 
} from "@/server/history.functions";
import { getSessionId } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Brain, 
  Mic, 
  Sparkles, 
  Sliders, 
  Save, 
  Trash2, 
  ArrowLeft,
  Settings2,
  Share2,
  FileText,
  Plus,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/voice-studio")({
  component: VoiceStudio,
});

function VoiceStudio() {
  const { activeWorkspaceId } = useWorkspace();
  const listVoicesFn = useServerFn(listVoiceSignatures);
  const renameFn = useServerFn(renameVoiceSignature);
  const promoteFn = useServerFn(promoteVoiceSignature);
  const archiveFn = useServerFn(archiveVoiceSignature);
  
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const sessionId = getSessionId();
      const data = await listVoicesFn({ data: { userSession: sessionId, workspaceId: activeWorkspaceId } });
      setVoices(data);
      if (data.length > 0) {
        setSelectedVoice(data[0]);
        setNameDraft(data[0].name);
      } else {
        setSelectedVoice(null);
      }
    } catch (err) {
      toast.error("Failed to load voices");
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!selectedVoice) return;
    try {
      await promoteFn({ data: { id: selectedVoice.id } });
      toast.success("Voice promoted to Brand asset!");
      refresh();
    } catch {
      toast.error("Failed to promote voice");
    }
  };

  const handleArchive = async () => {
    if (!selectedVoice) return;
    if (!confirm("Are you sure you want to archive this voice?")) return;
    try {
      await archiveFn({ data: { id: selectedVoice.id } });
      toast.success("Voice archived");
      refresh();
    } catch {
      toast.error("Failed to archive voice");
    }
  };

  useEffect(() => {
    refresh();
  }, [activeWorkspaceId]);

  const handleRename = async () => {
    if (!selectedVoice || !nameDraft.trim()) return;
    try {
      await renameFn({ data: { id: selectedVoice.id, name: nameDraft.trim() } });
      toast.success("Voice renamed successfully");
      setIsEditing(false);
      refresh();
    } catch {
      toast.error("Failed to rename voice");
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Editor</Link>
            </nav>
            <Separator orientation="vertical" className="h-6 mx-2" />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Voice Studio Pro</h1>
            <p className="text-muted-foreground">Fine-tune your personal and brand-consistent writing styles.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-8 items-start">
          {/* Library Sidebar */}
          <aside className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2">Voice Library</h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-secondary/40 animate-pulse" />)}
              </div>
            ) : voices.length === 0 ? (
              <Card className="p-6 text-center border-dashed border-2">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs text-muted-foreground">No voices found in this workspace.</p>
              </Card>
            ) : (
              <div className="space-y-1">
                {voices.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVoice(v); setNameDraft(v.name); setIsEditing(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all border flex items-center justify-between group ${
                      selectedVoice?.id === v.id 
                        ? "bg-primary/5 border-primary/20 shadow-sm" 
                        : "bg-transparent border-transparent hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${selectedVoice?.id === v.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                        <Mic className="w-4 h-4" />
                      </div>
                      <span className="font-medium truncate max-w-[140px]">{v.name}</span>
                    </div>
                    {v.is_brand_voice && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Brand
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => toast.info("Go to Editor to extract a new voice.")}>
              <Plus className="w-4 h-4" />
              Capture New Voice
            </Button>
          </aside>

          {/* Workbench */}
          <div className="space-y-6">
            {selectedVoice ? (
              <Card className="glassmorphic border-border/40 overflow-hidden" style={{ boxShadow: "var(--shadow-elegant)" }}>
                <div className="p-8 space-y-8">
                  {/* Title & Promotion */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={nameDraft} 
                            onChange={e => setNameDraft(e.target.value)}
                            className="text-2xl font-display font-bold h-12 bg-transparent border-0 border-b-2 border-primary rounded-none px-0 focus-visible:ring-0"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleRename}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 group/title">
                          <h2 className="text-3xl font-display font-bold">{selectedVoice.name}</h2>
                          <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover/title:opacity-100" onClick={() => setIsEditing(true)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">Captured on {new Date(selectedVoice.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!selectedVoice.is_brand_voice && (
                        <Button 
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" 
                          onClick={handlePromote}
                        >
                          <Share2 className="w-4 h-4" />
                          Promote to Brand Voice
                        </Button>
                      )}
                      <Button variant="outline" className="gap-2">
                        <Settings2 className="w-4 h-4" />
                        Tuning
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-border/40" />

                  {/* Linguistic Matrix */}
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <Sliders className="w-3.5 h-3.5" />
                        Tone Profile
                      </div>
                      <p className="text-lg font-medium">{selectedVoice.signature.tone}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        Syntactic Structure
                      </div>
                      <p className="text-lg font-medium">{selectedVoice.signature.sentence_style}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <Sparkles className="w-3.5 h-3.5" />
                        Lexical Range
                      </div>
                      <p className="text-lg font-medium">{selectedVoice.signature.vocabulary_level}</p>
                    </div>
                  </div>

                  {/* Distinct Traits */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Identified Stylistic Traits</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedVoice.signature.distinct_traits.map((trait: string, i: number) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors cursor-default">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Sample Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Reference Samples</h3>
                      <span className="text-[10px] text-muted-foreground uppercase">Snapshot of source text</span>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 text-sm leading-relaxed text-muted-foreground italic relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2">
                        <FileText className="w-4 h-4 opacity-10" />
                      </div>
                      "{selectedVoice.sample_preview}..."
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/20 p-4 border-t border-border/40 flex justify-between items-center">
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <Brain className="w-3.5 h-3.5" />
                     LLM-Ready style vector generated.
                   </div>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                     onClick={handleArchive}
                   >
                     <Trash2 className="w-4 h-4" />
                     Archive Voice
                   </Button>
                </div>
              </Card>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-3xl opacity-50">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Sliders className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">Workbench Empty</h3>
                <p className="max-w-xs text-sm text-muted-foreground">Select a voice from the library to begin fine-tuning or promotion to brand assets.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

