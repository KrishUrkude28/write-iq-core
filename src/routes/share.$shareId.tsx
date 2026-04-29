import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSharedDocument } from "@/server/history.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Lock, AlertCircle, FileText, Download, Share2, Sparkles } from "lucide-react";
import { exportToPDF } from "@/lib/export.functions";

export const Route = createFileRoute("/share/$shareId")({
  component: ShareView,
});

function ShareView() {
  const { shareId } = Route.useParams();
  const getDocFn = useServerFn(getSharedDocument);

  const [password, setPassword] = useState("");
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);

  const fetchDoc = async (pwd?: string) => {
    setLoading(true);
    try {
      const result = await getDocFn({
        data: { shareId, password: pwd || null },
      });
      if (result.needsPassword) {
        setNeedsPassword(true);
      } else {
        setDocument(result);
        setNeedsPassword(false);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc();
  }, [shareId]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoc(password);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020817] text-white">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-bold tracking-tight">WriteIQ Security</p>
            <p className="text-sm text-muted-foreground animate-pulse">
              Verifying credentials and decrypting content...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020817] text-white p-4">
        <Card className="max-w-md glass-morphism border-none shadow-2xl shadow-red-500/10 p-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Access Error</CardTitle>
            <CardDescription className="text-muted-foreground mt-3 text-base leading-relaxed">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              variant="secondary"
              className="px-8 rounded-full bg-white/10 hover:bg-white/20"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020817] text-white p-4">
        <Card className="w-full max-w-md glass-morphism border-none shadow-2xl shadow-primary/10 overflow-hidden">
          <div className="h-2 bg-primary animate-pulse" />
          <CardHeader className="text-center pt-10">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Protected Content</CardTitle>
            <CardDescription className="text-muted-foreground mt-3 text-base">
              The owner has restricted this document. Please enter the access code.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-12 px-8">
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <Input
                type="password"
                placeholder="Enter Access Password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 bg-white/5 border-white/10 focus:border-primary/50 rounded-2xl text-center text-xl font-mono tracking-widest"
              />
              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Decrypt & View
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white selection:bg-primary/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#020817]/80 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-white/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-xl block leading-none">
                WriteIQ <span className="text-primary font-black">.</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Professional Reader
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 rounded-xl h-10 px-5 bg-white/5 hover:bg-white/10 border border-white/5"
              onClick={() => exportToPDF("share-content", "WriteIQ_Document.pdf")}
            >
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-32">
        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-[0.2em] shadow-sm">
              {document.mode} Mode
            </div>
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-white/20" />
              Shared on {new Date(document.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </div>
            
            <div className="ml-auto flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-white/5 border border-white/10">
              <div
                className={`w-2.5 h-2.5 rounded-full ${document.score > 70 ? "bg-green-500" : "bg-yellow-500"} shadow-[0_0_15px_rgba(34,197,94,0.4)]`}
              />
              <span className="text-sm font-black tracking-tight">{document.score} IQ Score</span>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-tight mb-4">
            Document Intelligence Preview
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            This document has been refined and analyzed for maximum clarity and impact using the WriteIQ platform.
          </p>
        </header>

        <Card className="glass-morphism border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-10 sm:p-20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors duration-1000" />
          
          <article
            id="share-content"
            className="prose prose-invert prose-xl max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:leading-[1.8] prose-p:text-gray-200/90"
            dangerouslySetInnerHTML={{ __html: document.input_text }}
          />
        </Card>

        {/* Footer Branding */}
        <footer className="mt-20 pt-10 border-t border-white/5 text-center space-y-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Ready to elevate your own writing?
            </p>
            <p className="text-gray-400 max-w-lg mx-auto">
              Join thousands of professionals using AI to craft perfectly clear, engaging, and persuasive content.
            </p>
          </div>
          
          <Button
            size="lg"
            className="rounded-2xl bg-primary hover:bg-primary/90 px-10 h-16 text-lg font-bold gap-3 shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
            asChild
          >
            <a href="/">
              <Sparkles className="w-5 h-5" /> Experience WriteIQ Free
            </a>
          </Button>
          
          <div className="flex justify-center gap-6 text-xs text-muted-foreground font-medium pt-4">
            <span>Powered by Gemini 3.1 Pro</span>
            <span>Enterprise Encryption</span>
            <span>Real-time Clarity Engine</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
