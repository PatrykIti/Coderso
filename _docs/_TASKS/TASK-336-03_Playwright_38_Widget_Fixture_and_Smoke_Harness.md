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
- Write tracked JSON/Markdown evidence under `_docs/PLAYWRIGHT`; screenshots
  are local-only unless this task also adds an explicit safe gitignore
  exception for curated screenshots.
- Add fixture coverage for widgets that currently lack public pages or have
  weak fixture data.

## Sub-Tasks

- [ ] Create a 38-widget inventory file used by the smoke script.
- [ ] Exclude the four screen-only widgets from the 38-widget page-builder
  inventory: `screen-record-header`, `screen-field-value`,
  `screen-field-group`, and `screen-two-column`.
- [ ] Add or document fixture pages for every widget that must be checked on
  the frontend.
- [ ] Implement admin login/session reuse for Playwright CLI.
- [ ] For each widget, insert or open a fresh block before checking a mode so
  unsaved-state dialogs do not leak between modes.
- [ ] Assert each mode has one `data-widget-editor-mode` root and at least one
  `data-widget-editor-section`.
- [ ] Collect writable paths by mode and fail on unallowlisted duplicates only
  when the widget/control metadata is instrumented; otherwise record
  `path-metadata-gap` until `TASK-336-17` strict mode.
- [ ] Capture local screenshots for P0/P1/P2 widgets and frontend CSS risk
  widgets, but make tracked JSON/Markdown the durable evidence.
- [ ] Add body-overflow checks with explicit intentional-overflow markers.
- [ ] Write the final smoke report into `_docs/PLAYWRIGHT`.

## Files to Change

| File | Required change |
|---|---|
| `scripts/playwright-widget-contract-smoke.ts` | New Playwright CLI orchestration script owned by this task. |
| `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` | 38-widget inventory, fixture paths, admin insertion metadata, and public route expectations. |
| `_docs/PLAYWRIGHT/ENVIRONMENT.md` | Document server startup, ports, env loading, credentials handling, and artifact policy. |
| `_docs/PLAYWRIGHT/REPORT_WIDGET_CONTRACT_REAUDIT_2026_05_23.md` | Link the new repeatable smoke output when available. |
| `_docs/PLAYWRIGHT/screenshots/` | Local-only screenshots unless a safe tracked-screenshot exception is deliberately added. |
| `tests/README.md` | Document the new reusable smoke command and its ownership. |

## Implementation Pseudocode

```ts
type WidgetSmokeCase = {
  widgetType: string;
  publicPath?: string;
  adminInsertLabel: string;
  requiredModes: Array<"wizard" | "visual" | "advanced">;
  cssChecks?: Array<"body-overflow" | "card-overflow" | "empty-fixture">;
};

async function openFreshWidgetEditor(page: Page, widgetType: string) {
  await openTemporaryDraftPage(page);
  await insertWidgetBlock(page, widgetType);
  await dismissOrFailUnexpectedUnsavedDialog(page);
}

for (const smokeCase of inventory) {
  for (const mode of smokeCase.requiredModes) {
    await openFreshWidgetEditor(page, smokeCase.widgetType);
    await switchEditorMode(page, mode);
    await expect(page.locator(`[data-widget-editor-mode="${mode}"]`)).toHaveCount(1);
    await expect(page.locator(`[data-widget-editor-mode="${mode}"] [data-widget-editor-section]`).first()).toBeVisible();
    const paths = collectWritablePaths(smokeCase.widgetType, mode);
    if (paths.metadataGaps.length > 0) recordPathMetadataGap(smokeCase.widgetType, paths);
  }
  assertNoDuplicateWritablePaths(smokeCase.widgetType, { strict: isFullyInstrumented(smokeCase.widgetType) });
  if (smokeCase.publicPath) await runPublicCssSmoke(page, smokeCase);
}
```

Data flow:

- Inventory defines widget type, admin insertion route, and public fixture
  route.
- Playwright logs in once and reuses the browser context.
- Each mode check starts from a fresh block or fresh page state.
- The script writes tracked JSON plus a concise Markdown summary.
- Local raw logs and screenshots are scratch artifacts unless explicitly
  promoted into a sanitized tracked Markdown/JSON report.
- Follow-up tasks consume failures by widget priority.

Error handling:

- If admin login fails, abort with a redacted error and no password in output.
- If a widget has no frontend fixture, mark it `admin-only-fixture-gap` instead
  of silently skipping.
- If a widget lacks path metadata, mark `path-metadata-gap` instead of claiming
  ownership success.
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
  raw `_raw` modal-error dumps, screenshots containing secrets, or full admin
  session artifacts.

## Testing Requirements

Target smoke command:

- `bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-smoke --admin http://localhost:5173/admin --front http://localhost:3000`

The wrapper may invoke `playwright-cli -s=widget-contract-smoke ...`
internally, but the repo-owned command must be the stable entry point.

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
- Add `_docs/PLAYWRIGHT/ENVIRONMENT.md` with server startup and artifact rules.
- Update `_docs/PLAYWRIGHT/REPORT_WIDGET_CONTRACT_REAUDIT_2026_05_23.md` with
  the smoke harness link when this task lands.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- A repeatable Playwright CLI smoke path exists for all 38 widgets.
- The smoke output distinguishes admin-mode contract failures from frontend CSS
  failures and fixture gaps.
- No sensitive credentials or sessions are committed.
- Later widget leaves can cite this harness as their manual/automated smoke
  lane.
