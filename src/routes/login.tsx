import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { getSessionId } from "@/lib/session";
import { claimAnonymousData } from "@/server/history.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const claimFn = useServerFn(claimAnonymousData);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Claim anonymous data
      const sessionId = getSessionId();
      await claimFn({ data: { userSession: sessionId } });

      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to access your analysis history and voice profiles.">
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-background/50 border-border/50 focus:border-primary/50"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-background/50 border-border/50 focus:border-primary/50"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 text-base font-medium group"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Create one for free
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
