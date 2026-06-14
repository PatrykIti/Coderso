# TASK-464: Page Editor Modular Reuse And Security Hardening
# FileName: TASK-464_Page_Editor_Modular_Reuse_And_Security_Hardening.md

**Priority:** High
**Category:** Pages / Admin UI / Architecture / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-418, TASK-420, TASK-421, TASK-458-03, TASK-462, TASK-463
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Split the current monolithic Page Editor implementation into small,
browser-safe, reusable authoring modules without changing the user experience.
The existing editor works for Pages, Page Templates, and Menu Design through
`PageEditorHost`, but too much of the reusable surface is still trapped inside
`core/admin/ui/pages/PageEditor.tsx`: document state, selection, canvas chrome,
floating toolbar, registry panel rendering, command palette, layers overlay,
template insertion, inline edit, preview/settings/revisions, and sanitizer
boundaries.

Preview/settings/revisions remain in the slim shell during this family unless a
later task explicitly extracts them; TASK-464 focuses on reusable authoring
canvas, floating panel, layers, command, template, mutation, and sanitizer
surfaces.

This family converts the Page Editor into a composed shell over reusable
modules:

- a pure host/state contract layer,
- a reusable Page v2 authoring canvas,
- a reusable floating toolbar/panel shell,
- separate layers/command/template picker modules,
- centralized authoring sanitizers and XSS guardrails,
- a slim `PageEditor` orchestrator that preserves all current hosts.

Hard constraint: **the full UX and UI must stay untouched**. This is an
architecture and security refactor, not a redesign. Do not change visible copy,
layout, button order, panel order, shortcuts, hover behavior, selection behavior,
breakpoint behavior, class-driven styling, or data attributes unless a child
task explicitly records a parity-preserving reason and updates tests first.

The target is reuse by future CMS authoring surfaces without copying the whole
Page Editor. Surfaces that already use `PageDocumentV2` should be able to mount
the extracted canvas and floating panel through typed adapters. Non-Page-v2
surfaces must not receive Page v2 `sections[]` unless their own task migrates
their document contract.

---

## Security Contract

- **Endpoint visibility:** no new endpoints in this family unless a child task
  explicitly opens a route-focused follow-up. Existing Pages, Page Templates,
  and Menus admin endpoints remain internal.
- **Auth model:** unchanged admin session and existing host route auth.
- **RBAC:** unchanged Pages/Page Templates `content:*` permissions and Menus
  permissions.
- **CSRF expectations:** unchanged for existing admin writes.
- **Rate-limit bucket:** unchanged.
- **Validation:** Page v2 schemas, normalizers, registry control clamps, and
  reject-unknown behavior remain the source of truth. Refactors must not add
  loose object patching or schema bypasses.
- **XSS/HTML safety:** all author-controlled text, URLs, media values, iframe
  or embed values, inline-edit commits, control labels, tooltip copy derived
  from data, and style values must flow through owned sanitizer/normalizer
  helpers before rendering or persistence. No new `dangerouslySetInnerHTML`
  path is allowed in admin authoring modules.
- **Secret handling:** extracted modules remain browser-safe and must not import
  DB clients, server routes, runtime loaders, storage adapters, provider SDKs,
  auth password hashing, secret stores, or privileged settings.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [x] TASK-464-01: Contract freeze, module map, and UI parity baseline.
- [x] TASK-464-02: Extract pure editor host, state, and mutation contracts.
- [x] TASK-464-03: Extract reusable Page authoring canvas module.
- [x] TASK-464-04: Extract reusable floating toolbar and panel module.
- [x] TASK-464-05: Extract layers, command palette, and template picker modules.
- [x] TASK-464-06: Centralize authoring sanitizers and XSS guardrails.
- [x] TASK-464-07: Compose the slim PageEditor shell and close validation.

---

## Architecture

Target dependency direction:

```text
PageEditor shell
  -> editor host/state contracts
  -> reusable authoring canvas
  -> reusable floating toolbar/panels
  -> layers/command/template picker modules
  -> pure Page v2 services/sanitizers

Reusable modules
  -> React UI primitives
  -> pure schemas/contracts/helpers
  -> injected callbacks and typed data

Reusable modules must not import:
  -> admin API clients
  -> DB/server/runtime modules
  -> provider/storage SDKs
  -> host-specific cache clients
```

The extracted modules should keep Page v2 adapters separate from generic UI
shell contracts. A future non-Page-v2 CMS surface should be able to reuse the
floating panel shell by supplying its own panel descriptors and mutation
callbacks, without importing Page document services.

---

## Implementation Order

1. Freeze the module map and capture UI/UX parity baselines before moving code.
2. Extract pure state and mutation contracts without moving JSX.
3. Extract the authoring canvas with copied markup/classes and focused tests.
4. Extract the floating toolbar and registry panel renderer with copied
   markup/classes and focused tests.
5. Extract layers, command palette, and template picker to remove remaining
   large UI chunks from `PageEditor.tsx`.
6. Centralize sanitizer and XSS guard paths, then add scanner-oriented tests.
7. Recompose `PageEditor` from modules, preserve Pages/Page Templates/Menu
   Design behavior, run full targeted validation, and update docs/changelog.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- Targeted Vitest UI suites for PageEditor, Page Templates, and Menu Design:
  `tests/vitest/ui/page-editor-v2-flow.test.tsx`,
  `tests/vitest/ui/page-templates-surface.test.tsx`, and
  `tests/vitest/ui/menu-design-editor-flow.test.tsx`.
- Pure Vitest suites for extracted state, mutation, panel, and sanitizer
  helpers.
- Security validation from `_docs/SECURITY_SPEC.md` where feasible:
  `bun run scan:semgrep`, `bun run scan:audit`, and the strict scanner matrix
  before final closure when local tooling is available.
- Real browser smoke through the existing dev-host/Playwright path before
  closure: Pages editor, Page Templates editor, and Menu Design editor must
  look and behave the same before and after extraction.
- `bun run precommit` before any manual commit.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` for the Page Editor modular architecture and reuse
  contract.
- `_docs/ARCHITECTURE.md` if the reusable module dependency direction becomes
  a general admin authoring rule.
- `_docs/CMS_SPEC.md` if the reusable module boundary changes CMS authoring
  surface rules.
- `_docs/SECURITY_SPEC.md` if scanner runbooks or authoring sanitizer
  contracts change.
- `_docs/ADMIN_CACHE.md` only if host/cache behavior changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` on completion.

## Closeout Notes

- Extracted browser-safe Page Editor modules under
  `core/admin/ui/pages/editor/`: host contract, authoring canvas, floating
  toolbar primitive, layers tree, command/template picker, labels, and option
  metadata. The default Pages host remains in `PageEditor.tsx`; Page Templates
  and Menu Design keep host-specific API/cache wiring outside reusable modules.
- Added pure state/mutation modules in `core/services/pages/` and centralized
  authoring sanitizers for link/media/style sinks. Page document normalization,
  responsive CSS, and the public/admin renderer now reject unsafe URLs and CSS
  values before persistence or render.
- Preserved the existing UI/UX: markup classes, data attributes, toolbar order,
  layers behavior, command palette behavior, template picker behavior, and Menu
  Design host appearance panel remain equivalent and are covered by targeted
  Vitest and live browser smoke.
- Local CodeQL CLI was not available on `PATH`; GitHub CodeQL/code scanning
  remains the final external scanner confirmation for the CodeQL-specific
  query class.

## Validation Evidence

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
- `bun run scan:semgrep` (0 findings; Semgrep reported non-blocking rule
  timeouts on existing large files)
- `bun run scan:audit`
- `bun run scan:security:strict`
- `set -a && source .env && set +a && bun .tmp/task-464-live-smoke-runner.ts`
  against `coderso-dev-core-host`: passed for Pages editor, Page Templates
  editor, Menu Design editor, and the published public front page.
