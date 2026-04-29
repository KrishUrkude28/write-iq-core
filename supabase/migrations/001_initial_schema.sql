-- ============================================================
-- WriteIQ — Initial Schema Migration
-- Run this in the Supabase SQL Editor or via supabase db push
-- ============================================================

-- analyses: stores each writing analysis result
CREATE TABLE IF NOT EXISTS public.analyses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id     uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_session text,                          -- anonymous browser session id
  input_text   text NOT NULL,
  context      text NOT NULL DEFAULT '',
  mode         text NOT NULL CHECK (mode IN ('coach', 'socratic')),
  result       jsonb NOT NULL,
  score        integer NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- voice_signatures: stores extracted writing voice profiles
CREATE TABLE IF NOT EXISTS public.voice_signatures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session    text,
  name            text NOT NULL DEFAULT 'My Voice',
  signature       jsonb NOT NULL,
  sample_preview  text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast access
CREATE INDEX IF NOT EXISTS analyses_share_id_idx       ON public.analyses (share_id);
CREATE INDEX IF NOT EXISTS analyses_user_session_idx   ON public.analyses (user_session);
CREATE INDEX IF NOT EXISTS analyses_created_at_idx     ON public.analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS voice_sigs_user_session_idx ON public.voice_signatures (user_session);

-- RLS: enable but keep open for anonymous access (session-scoped)
ALTER TABLE public.analyses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_signatures ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analyses (anonymous workflow)
CREATE POLICY "anon insert analyses"
  ON public.analyses FOR INSERT WITH CHECK (true);

-- Allow reading by share_id (public share links)
CREATE POLICY "read by share_id"
  ON public.analyses FOR SELECT USING (true);

-- Allow deleting own session analyses
CREATE POLICY "delete own analyses"
  ON public.analyses FOR DELETE USING (true);

-- Voice signatures: open insert/select/delete for anon session use
CREATE POLICY "anon insert voice_signatures"
  ON public.voice_signatures FOR INSERT WITH CHECK (true);

CREATE POLICY "read voice_signatures"
  ON public.voice_signatures FOR SELECT USING (true);

CREATE POLICY "delete voice_signatures"
  ON public.voice_signatures FOR DELETE USING (true);
