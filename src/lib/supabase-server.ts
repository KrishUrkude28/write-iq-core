import { createClient } from "@supabase/supabase-js";

export function getSupabaseServer() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables for server-side operations.");
  }
  
  return createClient(url, key);
}
