# 1159 - TASK-418 collection form embed runtime binding

**Date:** 2026-06-10
**Version:** Unreleased
**Tasks:** TASK-418-06-L04

## Key Changes

### Pages Runtime

- Added a Page v2 async runtime pre-pass that prunes anonymous-ineligible
  sections before resolving data-bound blocks and passes bounded runtime DTOs
  into the synchronous renderer.
- Promoted `collection`, `form`, and `embed` block capabilities to
  `runtimeRenderer: "real"` with `publicDataBinding: "scoped-read-only"` while
  keeping them hidden from editor insertion and assistant emission.
- Reused the existing content-list resolver for collection blocks with public
  `statusScope: "published"` and fail-closed handling for invalid/missing
  binding identifiers.
- Reused the forms runtime resolver for form blocks so public output preserves
  existing nonce, captcha, internal-submission, and unavailable-state behavior.
- Added Pages embed sanitization plus hardened YouTube provider iframe rendering
  and documented the narrow sanitized inline HTML exception in
  `_docs/SECURITY_SPEC.md`.
- Disabled public HTML cache for Page renders that depend on collection/form
  data or anonymous section gating while preserving cacheability for static
  atomic Pages.

### QA And Docs

- Added Vitest coverage for data-bound pre-pass pruning, collection mapping,
  preview behavior, embed sanitization, and capability metadata.
- Added Bun public runtime coverage for published-only collection output,
  fail-closed no-leak collection/form errors, public cache gating, and existing
  Page runtime behavior.
- Verified a live public page through `coderso-dev-core-host` plus direct
  `playwright-cli`, checking collection ready state, form fail-closed output,
  YouTube iframe rendering, no unsafe URL/script leakage, and no console/page
  errors.
- Updated `_docs/PAGE_MODEL.md`, `_docs/CMS_SPEC.md`, `_docs/SECURITY_SPEC.md`,
  TASK-418 task files, and the task board.
- Created TASK-421 as the separate floating-inspector UX redesign follow-up for
  segmented controls, sliders, swatches, pickers, tooltips, and viewport-safe
  panels based on the reference HTML/spec.
- Claude `--effort xhigh` read-only audits found and then verified fixes for
  L04 task drift before implementation. Final release validation passed:
  targeted Vitest suites, `tests/integration/runtime/pages-runtime.test.ts`,
  `bun --cwd core lint`, `bun --cwd core lint:types`, live Playwright CLI
  smoke, and `bun run gates:coderso`.
