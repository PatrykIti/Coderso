# 579. TASK-101-09 site-builder convergence plan

**Date:** 2026-04-11
**Version:** 0.1.0
**Tasks:** TASK-101-09-01-03

## Key Changes

### Planning
- Expanded the site-builder convergence task into a concrete implementation plan.
- Clarified that site kits belong to `LLM Guide`, not docs-only RAG.
- Defined target site-kit action families:
  - `site-kit.recommend`
  - `site-kit.install`
  - `site-kit.validate`

### Test Matrix
- Added coverage requirements for:
  - planner behavior,
  - action executor adapter behavior,
  - `/assistant/actions/*` site-kit route behavior,
  - retirement of legacy `/assistant/site-builder/*` route registration,
  - UI migration/smoke tests,
  - DB/runtime acceptance where safe.

### Compatibility
- Clarified that `/assistant/site-builder/*` is not a final compatibility surface.
- Allowed temporary aliases only inside the migration branch while tests move, with task closure blocked until old route registration and client methods are removed or migrated.
