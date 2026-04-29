import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase-server";

const RetentionPolicyInput = z.object({
  workspaceId: z.string().uuid(),
  retentionDays: z.number().int().min(0).max(365),
  autoArchive: z.boolean(),
});

export const updateRetentionPolicy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RetentionPolicyInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("workspaces")
      .update({
        retention_days: data.retentionDays,
        auto_archive: data.autoArchive,
      })
      .eq("id", data.workspaceId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const cleanupWorkspaceData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    
    // Get workspace retention policy
    const { data: ws, error: wsError } = await supabase
      .from("workspaces")
      .select("retention_days")
      .eq("id", data.workspaceId)
      .single();

    if (wsError || !ws) throw new Error("Workspace not found");
    if (ws.retention_days === 0) return { success: true, message: "Retention set to indefinite." };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ws.retention_days);

    const { error: cleanupError, count } = await supabase
      .from("analyses")
      .delete()
      .eq("workspace_id", data.workspaceId)
      .lt("created_at", cutoffDate.toISOString());

    if (cleanupError) throw new Error(cleanupError.message);
    
    return { success: true, deletedCount: count };
  });

export const getRetentionPolicy = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { data: ws, error } = await supabase
      .from("workspaces")
      .select("retention_days, auto_archive")
      .eq("id", data.workspaceId)
      .single();

    if (error) throw new Error(error.message);
    return ws as { retention_days: number; auto_archive: boolean };
  });
