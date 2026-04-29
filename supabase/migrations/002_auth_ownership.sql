-- Migration 002: Add User Ownership
-- Run this in the Supabase SQL Editor

-- Add user_id columns
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.voice_signatures ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON public.analyses (user_id);
CREATE INDEX IF NOT EXISTS voice_sigs_user_id_idx ON public.voice_signatures (user_id);

-- Update RLS Policies for analyses
DROP POLICY IF EXISTS "anon insert analyses" ON public.analyses;
CREATE POLICY "insert analyses" ON public.analyses FOR INSERT WITH CHECK (
  auth.uid() = user_id OR (user_id IS NULL)
);

DROP POLICY IF EXISTS "delete own analyses" ON public.analyses;
CREATE POLICY "delete own analyses" ON public.analyses FOR DELETE USING (
  auth.uid() = user_id OR (user_id IS NULL)
);

DROP POLICY IF EXISTS "read by share_id" ON public.analyses;
CREATE POLICY "read analyses" ON public.analyses FOR SELECT USING (
  true -- allow reading by share_id or own user_id
);

-- Update RLS Policies for voice_signatures
DROP POLICY IF EXISTS "anon insert voice_signatures" ON public.voice_signatures;
CREATE POLICY "insert voice_signatures" ON public.voice_signatures FOR INSERT WITH CHECK (
  auth.uid() = user_id OR (user_id IS NULL)
);

DROP POLICY IF EXISTS "read voice_signatures" ON public.voice_signatures;
CREATE POLICY "read voice_signatures" ON public.voice_signatures FOR SELECT USING (
  auth.uid() = user_id OR (user_id IS NULL)
);

DROP POLICY IF EXISTS "delete voice_signatures" ON public.voice_signatures;
CREATE POLICY "delete voice_signatures" ON public.voice_signatures FOR DELETE USING (
  auth.uid() = user_id OR (user_id IS NULL)
);
