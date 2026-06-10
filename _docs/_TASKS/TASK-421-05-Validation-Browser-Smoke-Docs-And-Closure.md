# TASK-421-05: Validation Browser Smoke Docs And Closure
# FileName: TASK-421-05-Validation-Browser-Smoke-Docs-And-Closure.md

**Parent Task:** TASK-421
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421-04
**Status:** ⏳ To Do

---

## Overview

Close TASK-421 with full validation, real browser smoke, docs/changelog, board
sync, and final drift audit. This leaf proves the redesigned floating inspector
is usable in the real admin, not just covered by component tests.

---

## Implementation Pseudocode

```ts
async function closeFloatingInspectorRedesign() {
  await run("bun --cwd core lint");
  await run("bun --cwd core lint:types");
  await run("bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx");
  await startServer("coderso-dev-core-host");
  await runPlaywrightCliSmoke({
    admin: "http://coderso-a.localhost:5173/admin",
    front: "http://coderso-a.localhost:3000",
    flow: "select section, edit inspector presets, verify bounded panels, save, publish"
  });
  await runFinalClaudeDriftAudit();
}
```

Expected data flow:

- Load `.env` before DB/settings/server/browser validation.
- Use `coderso-dev-core-host` to start the dev server.
- Use `playwright-cli`, not MCP browser tooling.
- Preserve screenshots/logs without secrets.

Regression-test shape:

- Playwright CLI smoke covers desktop and mobile-ish viewport where subpanels
  must remain visible and scrollable.
- Smoke changes section layout variant, columns, vertical alignment, max width,
  shadow, color, padding/gap, responsive visibility, and at least one block
  style through segmented/toggle/slider/swatch/media primitives.
- Smoke verifies hover descriptions/tooltips are discoverable for category
  icons.
- Smoke verifies command palette/add-section-or-block dialog is shorter than the
  viewport, its list scrolls, and Close remains reachable.
- DOM/test checks confirm no small finite option set, boolean, bounded number,
  color, or media control regressed to a bare raw input/select surface.
- Closure includes a no-legacy-widget-term check for the Page Editor inspector
  and documents that TASK-420 consumes the shared primitives for Page Templates.
- Final drift audit checks reference spec parity, tests, docs, and board state.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session and `.env` credentials for local smoke.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin behavior.
- **Rate-limit bucket:** unchanged.
- **Validation:** no unvalidated Page payload writes.
- **Anti-abuse controls:** redact credentials from prompts, logs, screenshots,
  and changelog notes.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `coderso-dev-core-host` plus `playwright-cli` browser smoke.
- Final read-only Claude drift audit with xhigh effort and up to 25 minutes wait.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/`
- `_docs/_TASKS/README.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if behavior
  intentionally differs from the reference.
