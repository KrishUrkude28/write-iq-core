-- Migration 003: Enterprise Workspaces & Multi-tenancy
-- Supports teams, shared voices, and collaborative analyses.

-- 1. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text UNIQUE NOT NULL,
  owner_id     uuid REFERENCES auth.users(id) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. Workspace Members (Roles: owner, admin, member)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role         text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- 3. Extend existing tables
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);
ALTER TABLE public.voice_signatures ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);
ALTER TABLE public.voice_signatures ADD COLUMN IF NOT EXISTS is_brand_voice boolean DEFAULT false;

-- 4. Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 5. Workspace RLS Policies
CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = public.workspaces.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage workspaces"
  ON public.workspaces FOR ALL
  USING (owner_id = auth.uid());

-- 6. Analysis RLS Policies (Update existing ones)
DROP POLICY IF EXISTS "read analyses" ON public.analyses;
CREATE POLICY "workspace read analyses"
  ON public.analyses FOR SELECT
  USING (
    auth.uid() = user_id OR 
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- 7. Voice Signatures RLS Policies
DROP POLICY IF EXISTS "read voice_signatures" ON public.voice_signatures;
CREATE POLICY "workspace read voice_signatures"
  ON public.voice_signatures FOR SELECT
  USING (
    auth.uid() = user_id OR 
    (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) AND is_brand_voice = true)
  );
