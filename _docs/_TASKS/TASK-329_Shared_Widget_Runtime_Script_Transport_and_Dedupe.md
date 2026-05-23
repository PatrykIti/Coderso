# TASK-329: Shared Widget Runtime Script Transport and Dedupe

# FileName: TASK-329_Shared_Widget_Runtime_Script_Transport_and_Dedupe.md

**Priority:** High
**Category:** Widgets + Runtime Render + Shared Infrastructure + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-256-04, TASK-288-03
**Status:** Done (2026-05-23)

---

## Overview

Several interactive widgets still emit static inline runtime scripts once per
widget instance. During `TASK-288` we kept the Tabs preview/runtime activation
work local to the widget, but the remaining "one script payload per page"
transport/dedupe requirement is shared across widgets and should not be solved
with a Tabs-only escape hatch.

Create a shared request-scoped or render-scoped helper that lets widgets publish
static runtime client scripts once per page render while preserving SSR safety,
preview-mode exclusions, and root-scoped initialization guards.

## Scope Boundary

This task owns only shared runtime transport/dedupe.

It does not own:

- widget-local data model changes,
- Tabs accessibility residuals already split to `TASK-330`,
- public API routes or admin API behavior,
- any user-authored script execution path.

## Sub-Tasks

- [ ] Design a render-scoped script registry/helper that widgets can call from
  SSR without import-time Bun/runtime coupling.
- [ ] Wire at least Tabs plus one additional inline-script widget through the
  shared helper to prove cross-widget dedupe.
- [ ] Preserve preview-mode behavior so React-driven admin/editor preview does
  not emit parser-dependent inline scripts.
- [ ] Keep emitted script source static and repo-owned; no user-authored code,
  no dynamic eval payload construction, and no secret-bearing attributes.
- [ ] Add SSR/runtime tests that prove one script payload per page render while
  widget-local `window.__*Bound` guards still prevent double-binding.

## Files to Change

| File | Required change |
|---|---|
| `core/site/renderPublicPage.tsx` and/or shared widget runtime render helpers | Introduce a page/render-scoped runtime-script collector if this is the chosen transport surface. |
| `core/widgets/core/tabs.tsx` | Consume the shared helper instead of emitting a duplicated per-instance script payload once the helper exists. |
| `core/widgets/core/accordion.tsx`, `toggleBlock.tsx`, `navigation.tsx`, or another inline-script widget | Consume the same shared helper to prove this is not Tabs-only infrastructure. |
| `tests/vitest/widgets/tabs.test.tsx` and matching widget SSR suites | Assert deduped public markup plus unchanged root-scoped runtime behavior. |

## Implementation Pseudocode

```tsx
type RuntimeScriptCollector = {
  registerScript: (id: string, source: string) => void;
  renderPendingScripts: () => ReactNode[];
};

function createRuntimeScriptCollector(): RuntimeScriptCollector {
  const seen = new Map<string, string>();
  return {
    registerScript(id, source) {
      if (!seen.has(id)) seen.set(id, source);
    },
    renderPendingScripts() {
      return Array.from(seen.entries()).map(([id, source]) => (
        <script key={id} type="text/javascript" dangerouslySetInnerHTML={{ __html: source }} />
      ));
    },
  };
}

function TabsBlock({ renderContext }: { renderContext?: WidgetRenderContext }) {
  if (!isPreviewMode(renderContext?.previewDevice, renderContext)) {
    renderContext?.runtimeScripts?.registerScript("tabs", getTabsRuntimeClientScript());
  }
  return <TabsMarkupOnly />;
}
```

Error handling:

- Helper registration must be idempotent for the same `id` within one page
  render.
- Widgets rendered without the shared collector must fail safely with either the
  legacy local script path or a clearly documented invariant, depending on the
  final implementation.
- Multiple widget roots on one page must still keep widget-local active state
  isolated even when they share one script payload.

## Regression Test Shape

- SSR tests: render a page/body with multiple Tabs widgets and confirm only one
  Tabs runtime script payload is emitted.
- Multi-widget proof: render Tabs plus another inline-script widget and confirm
  each runtime kind is emitted once.
- Runtime interaction: existing widget-level click/keyboard tests still pass
  after switching transport to the shared collector.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: runtime script sources remain static, source-controlled strings
  only.
- Secret handling: do not serialize secrets, tokens, or private settings into
  collector IDs, script sources, or DOM markers.

## Testing Requirements

- Relevant SSR/runtime Vitest suites for every adopted widget
- `bun run lint`
- `git diff --check`
- `bun run scan:security:strict` (record any local scanner-tool blocker)

## Documentation Updates Required

- Update the adopted widget docs and reports to reference the shared runtime
  transport helper instead of local per-instance script payloads.
- Update `_docs/_TASKS/README.md` and changelog entries when the shared task is
  complete.

## Changelog Policy

- Add a dedicated changelog entry before moving this task to `Done`.

## Acceptance Criteria

- Multiple Tabs widgets on the same page emit one shared Tabs runtime payload.
- At least one second widget family proves the helper is shared, not Tabs-only.
- Admin/editor preview remains script-free and interactive where the local
  widget contract already uses React preview state.
- Public runtime behavior remains root-scoped, idempotent, and deterministic.
