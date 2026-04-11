# 580. TASK-101-09-01-03 single LLM Guide site-kit flow

**Date:** 2026-04-11
**Version:** 0.1.0
**Tasks:** TASK-101-09-01-03

## Key Changes

### Assistant Actions
- Added `site-kit.recommend`, `site-kit.install`, and `site-kit.validate` to the generic assistant action plan contract.
- Moved AI Site Wizard planning and execution to `/assistant/actions/*`.
- Retired `/assistant/site-builder/*` route registration and site-builder-specific admin client methods.
- Added an LLM availability guard so `site-kit.*` actions cannot run as docs-only/RAG fallback.

### Internal Reuse
- Added a Bun-free site-kit plan adapter so planner tests can build kit plans without importing DB/runtime installer code.
- Kept solution-kit execution delegated to the existing guided site-builder executor and installer path.

### Tests And Docs
- Added Bun coverage for route retirement, site-kit action dry-run, and generic execution delegation.
- Added Vitest coverage for planner routing, admin client wrapper behavior, and AI Site Wizard rendering.
- Updated assistant, CMS API, architecture, and security docs to describe `/assistant/actions/*` as the only assistant mutation flow.
