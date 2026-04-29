# WriteIQ — AI Writing Intelligence Platform

## What This Is

WriteIQ is a full-stack, AI-driven writing quality analyzer built on TanStack Start (React SSR). It analyzes prose with two adaptive modes — **Coach** (direct suggestions with before/after rewrites) and **Socratic** (thought-provoking questions to develop the writer's own thinking). It extracts a writer's unique voice signature and uses it to personalize all feedback.

## Current State (Brownfield — Milestone 1 in progress)

All core features are implemented. The platform is running at localhost:8080. Remaining work is:
1. Apply the Supabase database migration (tables for analyses + voice signatures)
2. Update the `__root.tsx` meta tags (still says "Lovable App")
3. End-to-end verification of all routes (Editor, History, Dashboard, Share)
4. TypeScript types regeneration from Supabase schema

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (React SSR) + Vite |
| Styling | Tailwind CSS v4 |
| Editor | TipTap (rich text) |
| Database | Supabase (PostgreSQL + RLS) |
| AI Gateway | Lovable API (OpenAI-compatible) |
| Testing | Vitest (55 unit tests, all passing) |
| Router | TanStack Router (file-based) |

## Requirements

### Validated

- ✓ Coach mode analysis with before/after suggestions
- ✓ Socratic mode with guiding questions
- ✓ Voice signature extraction and application
- ✓ Deterministic edge-case detection (repetition, short text)
- ✓ Safe default fallback on AI parse/retry failure
- ✓ 55-test unit suite (all passing)
- ✓ TipTap rich-text editor with formatting toolbar + word/char count
- ✓ Analysis auto-save to Supabase (server functions built)
- ✓ History page (`/history`) with expand/delete/share
- ✓ Shareable read-only URL (`/share/$shareId`)
- ✓ Dashboard (`/dashboard`) with Voice Library + stats + recent analyses

### Active

- [ ] Supabase migration applied (tables must exist in DB)
- [ ] `__root.tsx` meta tags updated (title/description/og)
- [ ] TipTap prose styles added to styles.css (editor content styling)
- [ ] End-to-end smoke test of all 4 routes
- [ ] Supabase TypeScript types regenerated

### Out of Scope

- Auth / user accounts — Anonymous UUID session chosen for zero-friction access
- Real-time collaboration — Not in scope for v1
- Mobile native app — Web only for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Anonymous sessions | Reduced sign-up friction; share via UUID URL | ✓ Implemented |
| TipTap editor | Best extension ecosystem, TypeScript-first | ✓ Implemented |
| Supabase anonymous RLS | Public insert/select policies for anon use | ✓ In migration SQL |
| TanStack Start file-based routing | Auto-discovers routes; routeTree generated | ✓ Working |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-04-28 after Milestone 1 brownfield initialization*
