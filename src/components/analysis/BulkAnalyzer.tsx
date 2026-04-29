import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeBatch } from "@/server/batch.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/hooks/use-workspace";
import { getSessionId } from "@/lib/session";
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Play,
  BarChart2,
  Download,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

interface BatchItem {
  id: string;
  name: string;
  text: string;
  status: "idle" | "loading" | "success" | "error";
  result?: any;
  error?: string;
}

export function BulkAnalyzer() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const analyzeBatchFn = useServerFn(analyzeBatch);
  const { activeWorkspaceId } = useWorkspace();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.type !== "text/plain") {
        toast.error(`${file.name} is not a text file.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setItems(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          text,
          status: "idle"
        }]);
      };
      reader.readAsText(file);
    });
  }, []);

  const runAnalysis = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setItems(prev => prev.map(i => ({ ...i, status: "loading" })));

    try {
      const results = await analyzeBatchFn({
        data: {
          items: items.map(i => ({ id: i.id, text: i.text })),
          mode: "coach",
          userSession: getSessionId(),
          workspaceId: activeWorkspaceId,
        }
      });

      setItems(prev => prev.map(item => {
        const res = (results as any).find((r: any) => r.id === item.id);
        if (res) {
          return {
            ...item,
            status: res.success ? "success" : "error",
            result: res.result,
            error: res.error
          };
        }
        return item;
      }));
      toast.success("Bulk analysis complete! Results saved to history.");
    } catch (err: any) {
      toast.error(err.message || "Batch analysis failed");
      setItems(prev => prev.map(i => i.status === "loading" ? { ...i, status: "error", error: "Batch failed" } : i));
    } finally {
      setIsProcessing(false);
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearResults = () => {
    setItems([]);
  };

  const exportJSON = () => {
    const data = items.filter(i => i.status === "success").map(i => ({
      name: i.name,
      score: i.result?.score,
      suggestions: i.result?.suggestions,
      text: i.text
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `writeiq-batch-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const successItems = items.filter(i => i.status === "success");
    if (successItems.length === 0) return;

    const headers = ["Filename", "Score", "Suggestion Count", "Readability"];
    const rows = successItems.map(i => [
      `"${i.name}"`,
      i.result?.score,
      i.result?.suggestions?.length || 0,
      `"${i.result?.accessibility?.readability_score || ""}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `writeiq-batch-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasSuccess = items.some(i => i.status === "success");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold">Bulk Laboratory</h2>
          <p className="text-sm text-muted-foreground">Upload multiple files for parallel analysis.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.length > 0 && !isProcessing && (
            <Button variant="ghost" onClick={clearResults} className="text-muted-foreground hover:text-destructive gap-2">
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          )}
          <Button variant="outline" className="relative gap-2 overflow-hidden cursor-pointer" disabled={isProcessing}>
            <Upload className="w-4 h-4" />
            Upload TXT
            <input 
              type="file" 
              multiple 
              accept=".txt" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileUpload}
            />
          </Button>
          <Button 
            onClick={runAnalysis} 
            disabled={isProcessing || items.length === 0}
            className="gap-2 bg-primary shadow-elegant active:scale-95 transition-transform"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start Batch
          </Button>
        </div>
      </div>

      {hasSuccess && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <Button size="sm" variant="secondary" className="gap-2" onClick={exportJSON}>
            <Download className="w-3.5 h-3.5" /> Export JSON
          </Button>
          <Button size="sm" variant="secondary" className="gap-2" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-muted-foreground bg-secondary/10">
          <FileText className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm">No documents queued.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(item => (
            <Card key={item.id} className="p-4 flex items-center justify-between border-border/40 group">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`p-2 rounded-lg ${
                  item.status === "success" ? "bg-emerald-500/10 text-emerald-600" :
                  item.status === "error" ? "bg-destructive/10 text-destructive" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {item.status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.name}</span>
                    {item.result && (
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        Score: {item.result.score}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    {item.status === "success" && <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Analysis ready</>}
                    {item.status === "error" && <><AlertCircle className="w-3 h-3 text-destructive" /> {item.error}</>}
                    {item.status === "idle" && "Ready for analysis"}
                    {item.status === "loading" && "Analyzing with AI..."}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.result && (
                  <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100">
                    <BarChart2 className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 text-muted-foreground hover:text-destructive" 
                  onClick={() => removeItem(item.id)}
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
