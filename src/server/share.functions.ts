import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

const GetSharedAnalysisInput = z.object({ shareId: z.string().uuid() });

export const getSharedAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetSharedAnalysisInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabase();
    const { data: row, error } = await supabase
      .from("analyses")
      .select("id, share_id, input_text, context, mode, result, score, created_at")
      .eq("share_id", data.shareId)
      .single();

    if (error || !row) throw new Error("Analysis not found");
    return row as {
      id: string;
      share_id: string;
      input_text: string;
      context: string;
      mode: "coach" | "socratic";
      result: any;
      score: number;
      created_at: string;
    };
  });
