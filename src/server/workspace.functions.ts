import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase-server";

// ─── Create Workspace ─────────────────────────────────────────────────────────

export const createWorkspace = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ name: z.string().min(2), slug: z.string().min(2) }).parse(input)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        name: data.name,
        slug: data.slug,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Add owner as initial member
    const { error: memberError } = await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) throw new Error(memberError.message);

    return workspace;
  });

// ─── List Workspaces ──────────────────────────────────────────────────────────

export const listWorkspaces = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch workspaces where the user is a member
    const { data, error } = await supabase
      .from("workspaces")
      .select(`
        *,
        members:workspace_members!inner(role)
      `)
      .eq("workspace_members.user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

// ─── Invite Member ────────────────────────────────────────────────────────────

export const inviteToWorkspace = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), userEmail: z.string().email(), role: z.enum(["admin", "member"]) }).parse(input)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Lookup the user by email in the profiles table
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.userEmail)
      .single();

    if (userError || !targetUser) throw new Error("User with this email not found in WriteIQ.");

    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: data.workspaceId,
      user_id: targetUser.id,
      role: data.role,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });

// ─── List Members ─────────────────────────────────────────────────────────────

export const listWorkspaceMembers = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { data: members, error } = await supabase
      .from("workspace_members")
      .select(`
        role,
        user_id,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("workspace_id", data.workspaceId);

    if (error) throw new Error(error.message);
    return members.map((m: any) => ({
      id: m.user_id,
      email: m.profiles.email,
      name: m.profiles.full_name || "New Member",
      role: m.role,
      avatar: m.profiles.avatar_url,
    }));
  });

// ─── Remove Member ────────────────────────────────────────────────────────────

export const removeMember = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), userId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Check if current user is owner or admin
    const { data: me } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", currentUser.id)
      .single();

    if (!me || (me.role !== "owner" && me.role !== "admin")) {
      throw new Error("Only owners or admins can remove members.");
    }

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", data.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
