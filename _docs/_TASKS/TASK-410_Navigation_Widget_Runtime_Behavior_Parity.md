# TASK-410: Navigation Widget Runtime Behavior Parity
# FileName: TASK-410_Navigation_Widget_Runtime_Behavior_Parity.md

**Priority:** High
**Category:** CMS Widgets / Navigation / Admin Preview / Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-397
**Status:** ✅ Done
**Started:** 2026-06-06
**Completed:** 2026-06-06

---

## Overview

Fix Navigation widget behavior parity across the page editor canvas, admin runtime
preview, and public frontend. The UI exposes sticky/floating and collapse-on-scroll
controls, but the behavior is not reliably observable because admin React previews
do not execute the inline runtime script, sticky positioning is applied only to the
inner `<nav>`, and public/admin wrappers can constrain sticky behavior to a short
block surface.

This task intentionally changes the old documented admin-preview boundary from a
static Navigation preview to an interactive preview for drawer, submenu, active
link, and collapse-on-scroll behavior.

Read-only audit evidence:

- Claude `--effort xhigh` completed read-only code/docs/runtime probes. Its plan
  mode forbade DB mutations, so live page creation is deferred to implementation
  validation with direct `playwright-cli`.
- Subagent navigation audit confirmed sticky wrapper, admin bridge, preview banner,
  collapse padding, and runtime-script-registry risks.
- Preserve TASK-397 closure contracts for safe href handling, public menu-key
  redaction, drawer `aria-current`, Visual metadata, and bounded colors.

---

## Security Contract

- **Endpoint visibility:** no new endpoint and no route visibility change.
- **Auth model:** existing admin page editing and preview flows remain
  session-authenticated through current admin routes.
- **RBAC:** unchanged; page editing still depends on existing content/page
  permissions.
- **CSRF:** unchanged for existing admin write flows; this task does not add an
  admin write route.
- **Rate-limit bucket:** unchanged; no new public write or admin route.
- **Validation:** Navigation data remains schema-first through
  `navigationSchema`, `normalizeNavigationData`, and widget block validation.
- **Anti-abuse controls:** not applicable to this UI/runtime-only task. Public
  Navigation rendering remains read-only; nonce/signature/HMAC and reCAPTCHA are
  not applicable.

---

## Sub-Tasks

- [x] Export a Bun-free Navigation runtime binder that can initialize drawer,
      submenu, active-link, and collapse-on-scroll behavior inside a supplied DOM
      container.
- [x] Wire the binder into `AdminWidgetPreviewRuntimeBridge` alongside FAQ
      accordion binding so React-rendered admin previews become interactive.
- [x] Move public Navigation runtime script emission to the shared runtime script
      registry while preserving standalone widget render fallback.
- [x] Fix sticky/floating behavior by making the outer Navigation block surface
      sticky when `behavior.sticky` is enabled, and avoid wrapper overflow that
      traps sticky positioning.
- [x] Keep collapse-on-scroll visually meaningful for low padding values and
      clarify/guard the relationship between collapse and sticky behavior.
- [x] Offset sticky Navigation in runtime preview when the preview banner is
      present, so preview and public output remain understandable.
- [x] Update Navigation docs for the new admin interactive-preview contract.
- [x] Run targeted Vitest, Bun/runtime tests where applicable, lint/typecheck, and
      a direct `playwright-cli` smoke that creates a temporary QA page.

---

## Implementation Pseudocode

```ts
export function bindNavigationRuntimeRoots(
  container: ParentNode,
  options?: { scrollTarget?: Window | HTMLElement }
): () => void {
  const roots = findNavigationRoots(container);
  const scrollSource = options?.scrollTarget ?? window;

  roots.forEach((root) => initializeNavigationRuntimeRoot(root, scrollSource));
  updateNavigationCollapseState(roots, scrollSource);

  const cleanup = bindScopedNavigationListeners(roots, scrollSource);

  return () => {
    cleanup();
  };
}
```

Expected data flow:

- `NavigationBlock` renders deterministic `data-navigation-*` attributes and
  registers one shared runtime script for public output.
- Public output uses the shared script registry and initializes roots from
  `document`.
- Admin canvas/live previews call the exported binder from
  `AdminWidgetPreviewRuntimeBridge`, scoped to the preview container.
- Collapse state reads from the correct scroll source: `window` on public pages
  and the editor canvas scroller in admin previews when available.
- Sticky behavior is expressed on the outer block surface so it remains sticky
  for the page scroll range instead of only the short inner `<nav>` range.
- Preview mode sets or emits a stable offset so the preview banner does not cover
  sticky Navigation.

Regression-test shape:

- Vitest runtime-script tests keep drawer, submenu, active-link, and collapse
  behavior covered for public output.
- Admin bridge tests mount React-rendered Navigation under
  `AdminWidgetPreviewRuntimeBridge` and assert drawer/submenu/collapse state
  without evaluating inline scripts.
- Public renderer tests assert shared runtime-script dedupe and sticky surface
  markup for Navigation.
- Browser smoke with direct `playwright-cli` creates
  `codex-navigation-qa-<timestamp>`, adds only Navigation, toggles sticky and
  collapse, then checks admin canvas, admin preview, and public frontend scroll
  behavior.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/navigationRuntimeScript.test.ts`
- `bun run test:vitest -- tests/vitest/ui-integration/pageBuilder.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx`
- Relevant Bun runtime/preview route tests if public preview markup changes route
  behavior.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Direct `playwright-cli` smoke against `coderso-dev-core-host` with a clearly
  temporary QA page.

---

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`: admin interactive-preview and sticky/collapse
  runtime behavior.
- `_docs/_TASKS/README.md`: task board status and statistics.
- `_docs/_CHANGELOG/`: task-linked changelog entry on completion.

---

## Completion Notes

- Exported `bindNavigationRuntimeRoots` and shared collapse/drawer/submenu/active
  link helpers from the Navigation widget module.
- Wired Navigation into `AdminWidgetPreviewRuntimeBridge` with the page editor
  canvas scroller as the admin preview scroll source.
- Registered public Navigation output through the shared widget runtime script
  registry, while preserving standalone direct widget fallback rendering.
- Made sticky/collapse Navigation sticky on the outer widget surface and removed
  page/runtime wrapper overflow that trapped sticky positioning.
- Added preview-banner offset support so sticky Navigation does not sit under the
  runtime preview banner.
- Updated `_docs/_WIDGETS/NAVIGATION.md` and Navigation editor UI copy to reflect
  that admin preview and public pages share the runtime behavior.

## Validation Evidence

- `bun run test:vitest -- tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/widgets/navigation.test.tsx tests/vitest/site/publicRenderer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui-integration/pageBuilder.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts tests/integration/runtime/pages-runtime.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- Direct `playwright-cli` smoke created and published
  `Codex Navigation QA 20260606` at `/codex-navigation-qa-20260606`; verified one
  Navigation block, admin canvas sticky surface, admin canvas collapse on local
  canvas scroll, public sticky surface, exactly one shared `navigation` runtime
  script, public collapse on window scroll, and zero browser console errors.
- Runtime preview modal was opened; local dev preview probe reported
  `http://http/preview`, which was recorded as a dev public-base-url
  configuration issue rather than a Navigation runtime failure. Public runtime
  was validated directly on `http://coderso-a.localhost:3000`.

## Audit Closeout

- Claude `--effort xhigh` pre-audit and navigation/page-editor subagent audits
  identified the implemented sticky wrapper, runtime bridge, shared script, and
  overflow fixes.
- Actionable audit findings were verified against local source and browser smoke
  before implementation closeout.
