import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase-server";

// ─── Save Analysis ───────────────────────────────────────────────────────────

const SaveAnalysisInput = z.object({
  userSession: z.string(),
  workspaceId: z.string().uuid().optional().nullable(),
  inputText: z.string(),
  context: z.string().default(""),
  mode: z.enum(["coach", "socratic"]),
  result: z.any(),
  score: z.number().int().min(0).max(100),
});

export const saveAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveAnalysisInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { data: row, error } = await supabase
      .from("analyses")
      .insert({
        user_session: data.userSession,
        workspace_id: data.workspaceId,
        input_text: data.inputText,
        context: data.context,
        mode: data.mode,
        result: data.result,
        score: data.score,
      })
      .select("id, share_id, created_at")
      .single();

    if (error) throw new Error(error.message);
    return row as { id: string; share_id: string; created_at: string };
  });

// ─── List Analyses (by session) ──────────────────────────────────────────────

const ListAnalysesInput = z.object({ 
  userSession: z.string(),
  workspaceId: z.string().uuid().optional().nullable(),
});

export const listAnalyses = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ListAnalysesInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    let query = supabase
      .from("analyses")
      .select("id, share_id, input_text, context, mode, score, created_at, is_public, expires_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data.workspaceId) {
      query = query.eq("workspace_id", data.workspaceId);
    } else {
      query = query.eq("user_session", data.userSession);
    }

    const { data: rows, error } = await query;

    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ─── Update Share Settings ───────────────────────────────────────────────────

const UpdateShareSettingsInput = z.object({
  id: z.string().uuid(),
  isPublic: z.boolean(),
  password: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export const updateShareSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpdateShareSettingsInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("analyses")
      .update({
        is_public: data.isPublic,
        share_password: data.password,
        expires_at: data.expiresAt,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

// ─── Get Shared Document ─────────────────────────────────────────────────────

const GetSharedDocumentInput = z.object({
  shareId: z.string().uuid(),
  password: z.string().optional().nullable(),
});

export const getSharedDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetSharedDocumentInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();

    // 1. Fetch metadata first to check for password/access
    const { data: meta, error: metaError } = await supabase
      .from("analyses")
      .select("id, is_public, share_password, expires_at")
      .eq("share_id", data.shareId)
      .single();

    if (metaError || !meta) throw new Error("Document not found or private");
    if (!meta.is_public) throw new Error("This document is no longer public");

    // 2. Check Expiration
    if (meta.expires_at && new Date(meta.expires_at) < new Date()) {
      throw new Error("This share link has expired");
    }

    // 3. Check Password
    const isProtected = !!meta.share_password;
    if (isProtected && meta.share_password !== data.password) {
      return { isProtected: true, needsPassword: true };
    }

    // 4. Fetch full content if authorized
    const { data: doc, error: docError } = await supabase
      .from("analyses")
      .select("id, input_text, context, mode, result, score, created_at")
      .eq("share_id", data.shareId)
      .single();

    if (docError) throw new Error(docError.message);

    return {
      ...doc,
      isProtected: false,
    };
  });

const DeleteAnalysisInput = z.object({ id: z.string().uuid() });

export const deleteAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DeleteAnalysisInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("analyses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ─── Delete All Analyses (by session) ────────────────────────────────────────

const DeleteAllAnalysesInput = z.object({ userSession: z.string() });

export const deleteAllAnalyses = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DeleteAllAnalysesInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("analyses")
      .delete()
      .eq("user_session", data.userSession);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ─── Save Voice Signature ─────────────────────────────────────────────────────

const SaveVoiceInput = z.object({
  userSession: z.string(),
  workspaceId: z.string().uuid().optional().nullable(),
  name: z.string().default("My Voice"),
  signature: z.any(),
  samplePreview: z.string().default(""),
  isBrandVoice: z.boolean().optional().default(false),
});

export const saveVoiceSignature = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveVoiceInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { data: row, error } = await supabase
      .from("voice_signatures")
      .insert({
        user_session: data.userSession,
        workspace_id: data.workspaceId,
        name: data.name,
        signature: data.signature,
        sample_preview: data.samplePreview,
        is_brand_voice: data.isBrandVoice,
      })
      .select("id, created_at")
      .single();

    if (error) throw new Error(error.message);
    return row as { id: string; created_at: string };
  });

// ─── List Voice Signatures ────────────────────────────────────────────────────

const ListVoicesInput = z.object({ 
  userSession: z.string(),
  workspaceId: z.string().uuid().optional().nullable(),
});

export const listVoiceSignatures = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ListVoicesInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    let query = supabase
      .from("voice_signatures")
      .select("id, name, signature, sample_preview, created_at, is_brand_voice")
      .order("created_at", { ascending: false });

    if (data.workspaceId) {
      query = query.eq("workspace_id", data.workspaceId);
    } else {
      query = query.eq("user_session", data.userSession);
    }

    const { data: rows, error } = await query;

    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ─── Delete Voice Signature ───────────────────────────────────────────────────

const DeleteVoiceInput = z.object({ id: z.string().uuid() });

export const deleteVoiceSignature = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DeleteVoiceInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("voice_signatures").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ─── Rename Voice Signature ───────────────────────────────────────────────────

const RenameVoiceInput = z.object({ id: z.string().uuid(), name: z.string().min(1).max(64) });

export const renameVoiceSignature = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RenameVoiceInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("voice_signatures")
      .update({ name: data.name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ─── Claim Anonymous Data ─────────────────────────────────────────────────────

export const claimAnonymousData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ userSession: z.string() }).parse(input)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No authenticated user" };

    // Link analyses
    await supabase
      .from("analyses")
      .update({ user_id: user.id })
      .eq("user_session", data.userSession)
      .is("user_id", null);

    // Link voice signatures
    await supabase
      .from("voice_signatures")
      .update({ user_id: user.id })
      .eq("user_session", data.userSession)
      .is("user_id", null);

    return { success: true };
  });
// ─── Promote Voice Signature ──────────────────────────────────────────────────
 
const PromoteVoiceInput = z.object({ id: z.string().uuid() });
 
export const promoteVoiceSignature = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PromoteVoiceInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("voice_signatures")
      .update({ is_brand_voice: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ─── Archive Voice Signature ──────────────────────────────────────────────────

export const archiveVoiceSignature = deleteVoiceSignature;
