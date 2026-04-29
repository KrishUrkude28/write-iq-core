-- Migration 005: Workspace Usage & Limits
-- Tracks AI credit consumption per workspace.

-- 1. Add credit columns to workspaces
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS credits_total integer NOT NULL DEFAULT 1000,
ADD COLUMN IF NOT EXISTS credits_used integer NOT NULL DEFAULT 0;

-- 2. Create usage_logs table
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  credits      integer NOT NULL,
  action       text NOT NULL, -- e.g. 'analysis', 'rewrite', 'batch'
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS for usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace usage logs"
  ON public.usage_logs FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- 4. Function to increment usage safely
CREATE OR REPLACE FUNCTION public.increment_workspace_usage(ws_id uuid, amount integer)
RETURNS void AS $$
BEGIN
  UPDATE public.workspaces
  SET credits_used = credits_used + amount
  WHERE id = ws_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
