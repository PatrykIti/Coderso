# TASK-336-03: Playwright 38 Widget Fixture and Smoke Harness

# FileName: TASK-336-03_Playwright_38_Widget_Fixture_and_Smoke_Harness.md

**Priority:** High
**Category:** Playwright + QA + Widgets + Frontend CSS
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02
**Status:** To Do

---

## Overview

Create a repeatable Playwright CLI smoke harness that exercises all 38 widgets
in the admin editor and checks frontend CSS behavior on `http://localhost:3000`.

The previous `_docs/PLAYWRIGHT` reports were useful, but the next pass must be
repeatable enough to run after each ownership wave. The harness must verify
mode metadata, section presence, duplicate writable paths, public rendering,
and known CSS drift areas.

## Scope

- Use the existing installed `playwright-cli` workflow rather than introducing
  a separate runner contract.
- Log in through `http://localhost:5173/admin`.
- Exercise widget editor modes in the admin app.
- Visit frontend fixture pages through `http://localhost:3000`.
- Capture screenshots and compact JSON/Markdown evidence under
  `_docs/PLAYWRIGHT`.
- Add fixture coverage for widgets that currently lack public pages or have
  weak fixture data.

## Sub-Tasks

- [ ] Create a 38-widget inventory file used by the smoke script.
- [ ] Add or document fixture pages for every widget that must be checked on
  the frontend.
- [ ] Implement admin login/session reuse for Playwright CLI.
- [ ] For each widget, insert or open a fresh block before checking a mode so
  unsaved-state dialogs do not leak between modes.
- [ ] Assert each mode has one `data-widget-editor-mode` root and at least one
  `data-widget-editor-section`.
- [ ] Collect writable paths by mode and fail on unallowlisted duplicates.
- [ ] Capture screenshots for P0/P1/P2 widgets and frontend CSS risk widgets.
- [ ] Add body-overflow checks with explicit intentional-overflow markers.
- [ ] Write the final smoke report into `_docs/PLAYWRIGHT`.

## Files to Change

| File | Required change |
|---|---|
| `scripts/playwright-widget-contract-smoke.ts` | New or updated Playwright CLI orchestration script if the repo accepts script ownership here. |
| `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` | 38-widget inventory, fixture paths, admin insertion metadata, and public route expectations. |
| `_docs/PLAYWRIGHT/REPORT_WIDGET_CONTRACT_REAUDIT_2026_05_23.md` | Link the new repeatable smoke output when available. |
| `_docs/PLAYWRIGHT/screenshots/` | Store representative evidence for failed or risky widgets. |
| `tests/README.md` | Document command ownership only if a new reusable command is added. |

## Implementation Pseudocode

```ts
type WidgetSmokeCase = {
  widgetType: string;
  publicPath?: string;
  adminInsertLabel: string;
  requiredModes: Array<"wizard" | "visual" | "advanced">;
  cssChecks?: Array<"body-overflow" | "card-overflow" | "empty-fixture">;
};

for (const smokeCase of inventory) {
  for (const mode of smokeCase.requiredModes) {
    await openFreshWidgetEditor(page, smokeCase.widgetType);
    await switchEditorMode(page, mode);
    await expect(page.locator(`[data-widget-editor-mode="${mode}"]`)).toHaveCount(1);
    await expect(page.locator(`[data-widget-editor-mode="${mode}"] [data-widget-editor-section]`).first()).toBeVisible();
    collectWritablePaths(smokeCase.widgetType, mode);
  }
  assertNoDuplicateWritablePaths(smokeCase.widgetType);
  if (smokeCase.publicPath) await runPublicCssSmoke(page, smokeCase);
}
```

Data flow:

- Inventory defines widget type, admin insertion route, and public fixture
  route.
- Playwright logs in once and reuses the browser context.
- Each mode check starts from a fresh block or fresh page state.
- The script writes raw JSON plus a concise Markdown summary.
- Follow-up tasks consume failures by widget priority.

Error handling:

- If admin login fails, abort with a redacted error and no password in output.
- If a widget has no frontend fixture, mark it `admin-only-fixture-gap` instead
  of silently skipping.
- If a public page has intentional horizontal overflow, require
  `data-overflow-intentional="true"` on the element that owns it.
- If the local servers are not reachable, report environment failure rather
  than converting it into a widget failure.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: not applicable.
- Secret handling: do not commit credentials, cookies, tokens, local storage,
  screenshots containing secrets, or full admin session artifacts.

## Testing Requirements

Target smoke command:

- `playwright-cli` against `http://localhost:5173/admin` and
  `http://localhost:3000`

Supporting validation:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

Regression-test shape:

- The smoke harness can run only a single widget for debugging.
- The smoke harness can run all 38 widgets for audit evidence.
- Missing mode root fails.
- Missing section fails.
- Duplicate writable path fails unless the contract allowlist includes it.
- Frontend body overflow fails unless marked intentional.

## Documentation Updates Required

- Add smoke command and environment prerequisites to `_docs/PLAYWRIGHT`.
- Update `_docs/PLAYWRIGHT/REPORT_WIDGET_CONTRACT_REAUDIT_2026_05_23.md` with
  the smoke harness link when this task lands.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- A repeatable Playwright CLI smoke path exists for all 38 widgets.
- The smoke output distinguishes admin-mode contract failures from frontend CSS
  failures and fixture gaps.
- No sensitive credentials or sessions are committed.
- Later widget leaves can cite this harness as their manual/automated smoke
  lane.

