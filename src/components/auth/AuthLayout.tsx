import { ReactNode } from "react";
import { Sparkles, Brain } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="w-full max-w-md px-6 relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
            >
              <Brain className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <div className="font-display font-bold text-2xl leading-none tracking-tight">WriteIQ</div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1 opacity-70">
                Intelligence Engine
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-display font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>

        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-elegant">
          {children}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} WriteIQ. All rights reserved.
        </p>
      </div>
    </div>
  );
}
