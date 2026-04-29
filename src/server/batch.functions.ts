import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyzeWriting } from "./writeiq.functions";
import { getSupabaseServer } from "@/lib/supabase-server";

const AnalyzeBatchInput = z.object({
  items: z.array(z.object({
    id: z.string(),
    text: z.string(),
    context: z.string().optional(),
  })),
  mode: z.enum(["coach", "socratic"]),
  voice: z.any().optional(),
  userSession: z.string().optional(),
  workspaceId: z.string().uuid().optional().nullable(),
});

/**
 * Server function to analyze a batch of documents and save results.
 */
export const analyzeBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeBatchInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    
    const results = await Promise.all(
      data.items.map(async (item) => {
        try {
          const res = await analyzeWriting({
            data: {
              text: item.text,
              mode: data.mode,
              context: item.context || "",
              voice: data.voice || { tone: "", vocab: "", traits: "" },
              workspaceId: data.workspaceId ?? undefined,
            },
          });
          return { id: item.id, name: item.id, text: item.text, success: true, result: res };
        } catch (error: any) {
          return { id: item.id, name: item.id, text: item.text, success: false, error: error.message };
        }
      })
    );

    // Save successful results to history if session/workspace is provided
    if (data.userSession || data.workspaceId) {
      const successfulItems = results.filter(r => r.success);
      if (successfulItems.length > 0) {
        const insertData = successfulItems.map(item => ({
          user_session: data.userSession,
          workspace_id: data.workspaceId,
          input_text: item.text,
          context: data.items.find(i => i.id === item.id)?.context || "",
          mode: data.mode,
          result: item.result,
          score: (item.result as any).score || 0,
        }));

        const { error } = await supabase.from("analyses").insert(insertData);
        if (error) console.error("Failed to save batch results to history:", error.message);
      }
    }

    return results;
  });
