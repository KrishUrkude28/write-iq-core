import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase-server";

// ─── Get Workspace Usage ──────────────────────────────────────────────────────

export const getWorkspaceUsage = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { data: ws, error } = await supabase
      .from("workspaces")
      .select("credits_total, credits_used")
      .eq("id", data.workspaceId)
      .single();

    if (error) throw new Error(error.message);
    return ws;
  });

// ─── Check Credits ────────────────────────────────────────────────────────────

export async function checkCredits(workspaceId: string, required: number) {
  const supabase = getSupabaseServer();
  const { data: ws, error } = await supabase
    .from("workspaces")
    .select("credits_total, credits_used")
    .eq("id", workspaceId)
    .single();

  if (error) throw new Error(error.message);
  if (ws.credits_used + required > ws.credits_total) {
    throw new Error("Insufficient AI credits. Please upgrade your plan.");
  }
}

// ─── Track Usage ──────────────────────────────────────────────────────────────

export async function trackUsage(workspaceId: string, credits: number, action: string) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Log the usage
  await supabase.from("usage_logs").insert({
    workspace_id: workspaceId,
    user_id: user?.id,
    credits,
    action
  });

  // 2. Increment the workspace total
  await supabase.rpc("increment_workspace_usage", {
    ws_id: workspaceId,
    amount: credits
  });
}
