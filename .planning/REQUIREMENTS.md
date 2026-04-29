# WriteIQ — Requirements

## Milestone 1: Core Platform + Persistence

### Must-Have

- [x] Coach mode analysis (before/after suggestion pairs)
- [x] Socratic mode (guiding questions, no rewrites)
- [x] Voice signature extraction and application
- [x] Edge-case detection (repetition, short text) with deterministic fallbacks
- [x] 55-test passing unit suite
- [x] TipTap rich-text editor (toolbar + word/char count)
- [x] Supabase server functions (save/list/delete analyses, voice signatures)
- [x] Session-scoped anonymous storage (localStorage UUID)
- [x] History page (`/history`)
- [x] Shareable read-only URL (`/share/$shareId`)
- [x] Dashboard page (`/dashboard`)
- [ ] **Supabase migration applied** — tables must exist before persistence works
- [ ] **Root meta tags corrected** — currently shows "Lovable App"
- [ ] **TipTap prose styles** — editor content needs typography CSS
- [ ] **End-to-end smoke test** — all routes verified working

### Nice-to-Have (Milestone 2+)

- [ ] Keyboard shortcut to trigger analysis (Ctrl+Enter)
- [ ] Apply suggestion inline (one-click replacement in editor)
- [ ] Export analysis as PDF/Markdown
- [ ] Voice signature naming UI
- [ ] Rate-limit UI feedback (when AI gateway is slow)

### Out of Scope

- Authentication (use anonymous sessions)
- Real-time collaboration
- Mobile native app
