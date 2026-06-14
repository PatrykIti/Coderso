# 1172 - TASK-464 Page Editor modular reuse and security

**Date:** 2026-06-14
**Version:** Unreleased
**Tasks:** TASK-464, TASK-464-01, TASK-464-01-L01, TASK-464-01-L02,
TASK-464-02, TASK-464-02-L01, TASK-464-02-L02, TASK-464-02-L03,
TASK-464-03, TASK-464-03-L01, TASK-464-03-L02, TASK-464-03-L03,
TASK-464-04, TASK-464-04-L01, TASK-464-04-L02, TASK-464-04-L03,
TASK-464-04-L04, TASK-464-05, TASK-464-05-L01, TASK-464-05-L02,
TASK-464-05-L03, TASK-464-06, TASK-464-06-L01, TASK-464-06-L02,
TASK-464-06-L03, TASK-464-07, TASK-464-07-L01, TASK-464-07-L02
**Type:** Pages/Admin UI/Architecture/Security/QA/Docs

## Key Changes

### Pages Admin UI

- Split reusable Page Editor authoring surfaces out of the monolithic
  `PageEditor.tsx`: host contracts, authoring canvas, toolbar primitive,
  layers tree, command/template picker, neutral labels, and option metadata now
  live under `core/admin/ui/pages/editor/`.
- Added pure editor state and mutation helpers for selection, responsive
  override reads, toolbar offset clamping, block prop/control patches, section
  control patches, visibility toggles, and sanitized style patches.
- Kept Pages, Page Templates, and Menu Design host behavior unchanged. Host
  shells still own admin clients, cache hydration, preview/publish/revisions,
  settings, assistant context, and site-token style bridging.

### Security

- Added centralized Page authoring sanitizers for safe link URLs, media URLs,
  CSS colors/backgrounds, gradients, and CSS string escaping.
- Routed Page document normalization, responsive CSS emission, and renderer
  sinks through sanitizer helpers so unsafe `javascript:`/`data:` URLs and
  CSS `url(javascript:...)` style payloads fail closed.
- Preserved safe contact links for link sinks (`mailto:` and `tel:`) while
  keeping media URL sinks restricted to relative and HTTP(S) assets.
- Added scanner-friendly XSS regression coverage for authoring values, render
  sinks, and extracted reusable modules.

### Documentation

- Documented the TASK-464 reusable module dependency direction in
  `_docs/PAGE_MODEL.md` and `_docs/ARCHITECTURE.md`.
- Documented the Page authoring sanitizer boundary in `_docs/SECURITY_SPEC.md`.
- Closed the TASK-464 family and synchronized the task board.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-editor-host-contract.test.ts tests/vitest/pages/page-editor-state-helpers.test.ts tests/vitest/pages/page-editor-action-groups.test.ts tests/vitest/pages/page-authoring-sanitizers.test.ts tests/vitest/pages/page-editor-xss-guards.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/floating-editor-toolbar.test.tsx tests/vitest/ui/page-editor-layers.test.tsx tests/vitest/ui/page-editor-command-palette.test.tsx tests/vitest/ui/page-editor-template-picker.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/ui/page-editor-control-primitives.test.tsx tests/vitest/pages/page-responsive-css.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun test tests/security`
- `bun run gates:coderso`
- `bun run scan:semgrep` (0 findings; non-blocking Semgrep rule timeouts on
  existing large files)
- `bun run scan:audit`
- `bun run scan:security:strict`
- `set -a && source .env && set +a && bun .tmp/task-464-live-smoke-runner.ts`
  through `coderso-dev-core-host` for Pages editor, Page Templates editor,
  Menu Design editor, and public front runtime.
- Post-commit read-only drift audit found a `mailto:`/`tel:` link sanitizer
  mismatch; the implementation and regression tests were updated, then the
  targeted sanitizer/XSS suites, lint, typecheck, security tests, Semgrep, and
  strict security scan were rerun cleanly.

Local CodeQL CLI was not available on `PATH`; GitHub CodeQL/code scanning
remains the final external confirmation for CodeQL-specific queries.
