# 1104 - TASK-407 site-builder intake redaction and browser state

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-02, TASK-407-02-L04

## Key Changes

### Assistant Intake

- Added redacted site-builder intake diagnostics with schema/version metadata,
  answered step ids, readiness flags, warning codes, and deterministic facts
  hashes only.
- Added provider-only site-builder intake context packaging from normalized
  facts. The package is bounded, advisory, non-executable, and excludes raw
  references, files, signed URLs, provider keys, cookies, CSRF/session values,
  and schema/RBAC/media-gate override instructions.
- Kept final route planning on the existing `context.siteKit` contract; no
  route-owned `context.siteBuilderIntake` payload was added.

### Admin State

- Added a pure browser-state helper for future TASK-407 UI wiring. Restore is
  schema-versioned, size-bounded, expiry-bounded, strict about allowed keys, and
  stores no answers, raw facts, plans, actions, run-option patches, or secrets.

### Security

- Expanded assistant text redaction to cover generic secret pairs such as
  `password=`, cookie/session/CSRF/API-key fragments, bearer/OpenRouter tokens,
  JWT-like tokens, and signed/tokenized URLs embedded in normal text.

### QA

- Added Vitest coverage for redacted diagnostics, provider-only intake context,
  provider planning package integration, generic secret/signed-URL text
  redaction, and browser-state stale/oversized/unknown-key discard behavior.
- Curie post-implementation re-audit blockers were fixed: provider fact ids are
  runtime-whitelisted before provider packaging, and restored browser readiness
  is diagnostic-only.
- Curie final targeted re-audit reported no blocking findings after those
  fixes.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/ui/assistant-site-builder-intake-browser-state.test.ts` (38 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
