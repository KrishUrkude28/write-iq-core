---
phase: 5
title: Polish & Verification
status: in_progress
---

# Phase 5 — Polish & Verification

## Goal
Complete the final QA pass: fix meta tags, add TipTap prose styles, apply the Supabase migration, and smoke-test all routes end-to-end.

## Plans

### Plan 5.1 — Fix __root.tsx Meta Tags
**File:** `src/routes/__root.tsx`
**What:** Replace generic "Lovable App" title/description with WriteIQ branding in the root shell meta.
**UAT:** Page `<title>` shows "WriteIQ — AI Writing Intelligence Engine" by default.

### Plan 5.2 — TipTap Prose Styles
**File:** `src/styles.css`
**What:** Add `.prose` typography CSS so TipTap editor content renders with correct font sizes, line height, heading styles and list styles.
**UAT:** Bold/italic text in editor renders visually distinct; paragraphs have comfortable spacing.

### Plan 5.3 — Supabase Migration (Database)
**File:** `supabase/migrations/001_initial_schema.sql` (already written)
**What:** Apply migration to Supabase project via MCP or manual SQL Editor paste.
**UAT:** `analyses` and `voice_signatures` tables appear in Supabase Table Editor. After analyzing text, an entry appears in `/history`.

### Plan 5.4 — Smoke Test All Routes
**What:** Browser verification of `/`, `/history`, `/dashboard`, `/share/[id]`.
**UAT:**
- Editor loads with TipTap toolbar visible
- History page loads (empty state shown if no analyses)
- Dashboard loads with all 3 sections
- Share page loads gracefully (shows "not found" for a bad UUID)

## Verification Criteria
- [ ] `npm test` → 55 passed
- [ ] All 4 routes render without console errors
- [ ] `<title>` tag on all pages is correct
- [ ] TipTap editor content is styled (bold/italic visible)
- [ ] Supabase tables exist OR clear instructions given for manual apply
