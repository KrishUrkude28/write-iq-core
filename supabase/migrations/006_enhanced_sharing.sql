-- Migration 006: Enhanced Sharing Features
-- Adds password protection, expiration, and tighter public access controls.

-- 1. Add columns to analyses
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS share_password text, -- Plain text for now as it's a simple share feature
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Tighter RLS for public shares
DROP POLICY IF EXISTS "read by share_id" ON public.analyses;

CREATE POLICY "read public by share_id"
  ON public.analyses FOR SELECT
  USING (
    (is_public = true AND (expires_at IS NULL OR expires_at > now()))
    OR 
    (auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR 
      workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    ))
  );

-- 3. Comments for documentation
COMMENT ON COLUMN public.analyses.is_public IS 'Whether the document is accessible via its share_id link.';
COMMENT ON COLUMN public.analyses.share_password IS 'Optional simple password to view the document.';
COMMENT ON COLUMN public.analyses.expires_at IS 'When the share link should automatically become inactive.';
