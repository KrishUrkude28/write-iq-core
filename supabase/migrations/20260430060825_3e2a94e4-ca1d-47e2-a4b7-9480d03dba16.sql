
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_session TEXT NOT NULL,
  user_id UUID,
  workspace_id UUID,
  input_text TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL CHECK (mode IN ('coach','socratic')),
  result JSONB NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  share_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_password TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analyses_user_session ON public.analyses(user_session);
CREATE INDEX idx_analyses_workspace ON public.analyses(workspace_id);
CREATE INDEX idx_analyses_share_id ON public.analyses(share_id);

CREATE TABLE public.voice_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_session TEXT NOT NULL,
  user_id UUID,
  workspace_id UUID,
  name TEXT NOT NULL DEFAULT 'My Voice',
  signature JSONB NOT NULL,
  sample_preview TEXT NOT NULL DEFAULT '',
  is_brand_voice BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_user_session ON public.voice_signatures(user_session);
CREATE INDEX idx_voice_workspace ON public.voice_signatures(workspace_id);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_signatures ENABLE ROW LEVEL SECURITY;

-- Server uses service role (bypasses RLS). Provide permissive policies so direct
-- access via anon key would still work for the session-scoped model.
CREATE POLICY "anyone can insert analyses" ON public.analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "view own or public analyses" ON public.analyses FOR SELECT USING (true);
CREATE POLICY "update own analyses" ON public.analyses FOR UPDATE USING (true);
CREATE POLICY "delete own analyses" ON public.analyses FOR DELETE USING (true);

CREATE POLICY "anyone can insert voices" ON public.voice_signatures FOR INSERT WITH CHECK (true);
CREATE POLICY "view voices" ON public.voice_signatures FOR SELECT USING (true);
CREATE POLICY "update voices" ON public.voice_signatures FOR UPDATE USING (true);
CREATE POLICY "delete voices" ON public.voice_signatures FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voices_updated_at
  BEFORE UPDATE ON public.voice_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
