# 1119 - TASK-407 follow-up target scoping

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-05-L05

## Key Changes

### Assistant Site Builder
- Added a pure guided follow-up resolver for site-builder target scoping.
- Resolved exact follow-up targets through active admin context or
  server-derived resource catalogs instead of trusting prompt text.
- Classified trusted targets into scoped refinement kinds for static pages,
  content-engine pages, listings, detail pages, and custom screens.

### Safety
- Ambiguous trusted matches return `needs_input` before action assembly.
- Stale, spoofed, unsupported resource families, and unsupported operations
  return `needs_input` or `gated`.
- Active-surface/name-hint conflicts fail closed instead of silently mutating
  the active resource.
- Follow-up diagnostics omit raw prompt text and sanitize secret-like candidate
  fields.

### QA
- Added Vitest coverage for active-context targets, active-context/name-hint
  conflicts, collection page classification, listing/detail/custom-screen
  targets, ambiguity questions, stale ids, free-text spoofing, secret-like
  details, and unsupported gates.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderFollowUpResolver.test.ts`
- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderFollowUpResolver.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  (126 tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
