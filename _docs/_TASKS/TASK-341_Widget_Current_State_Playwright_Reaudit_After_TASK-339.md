# TASK-341: Widget Current-State Playwright Re-audit After TASK-339

# FileName: TASK-341_Widget_Current_State_Playwright_Reaudit_After_TASK-339.md

**Priority:** High
**Category:** QA + Widgets + Playwright + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-339, TASK-340
**Status:** Done (2026-05-27)

---

## Overview

Re-run the page-builder widget surface after the TASK-339 closure to verify the
current local behavior with `playwright-cli`, capture real current-state
evidence, and publish a fresh per-widget report set under
`_docs/PLAYWRIGHT/27-05-2026`.

This task is a QA/docs leaf. It does not widen widget scope or change runtime
contracts; it records what currently works, what is only a fixture/content gap,
and what remains an automation metadata follow-up.

## Source Findings

- The user reported that some widget functionality/options looked broken after
  TASK-339 even though tests were green.
- Historical per-widget reports already existed under
  `_docs/PLAYWRIGHT/23-05-2026-22-18/`, but they describe an earlier contract
  re-audit rather than the current post-TASK-339 runtime state.
- A clean rerun was required because an earlier smoke attempt was invalidated by
  session rotation during concurrent manual admin logins.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/27-05-2026/README.md` | Record the current-state methodology, summary, and per-widget index. |
| `_docs/PLAYWRIGHT/27-05-2026/REPORT_*_WIDGET.md` | Add one current-state report per page-builder widget using the clean smoke plus focused replay evidence. |
| `_docs/_TASKS/TASK-341_Widget_Current_State_Playwright_Reaudit_After_TASK-339.md` | Track status, evidence, and closure notes for this QA leaf. |
| `_docs/_TASKS/README.md` | Keep the board counts and Done table synchronized. |
| `_docs/_CHANGELOG/990-2026-05-27-widget-current-state-playwright-reaudit.md` | Record the user-facing QA summary for the new report wave. |
| `_docs/_CHANGELOG/README.md` | Add changelog index row `990`. |

## Implementation Pseudocode

```ts
1. Start the local host with `coderso-dev-core-host`.
2. Run a clean widget smoke over all 38 page-builder widgets.
3. Re-check smoke outliers with focused Playwright replay:
   - metadata-gap widgets
   - fixture-gap widgets
4. Write `_docs/PLAYWRIGHT/27-05-2026/README.md`.
5. Write one `REPORT_<WIDGET>_WIDGET.md` per widget with:
   - clean smoke result
   - focused follow-up result when applicable
   - historical report reference
```

Data flow:

- The clean smoke JSON/Markdown under `.tmp/` are the authoritative baseline.
- Focused Playwright replay refines only the widgets that need extra context.
- Historical reports remain reference material, not the current source of truth.

Error handling:

- If a smoke run is polluted by session churn or concurrent admin interaction,
  discard it and rerun from a fresh session.
- Distinguish user-facing runtime failures from fixture/data gaps and automation
  metadata gaps; do not collapse them into one generic "broken" bucket.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: reports and evidence must not persist privileged session
  tokens or redacted backend values.

## Testing Requirements

- `CODERSO_PLAYWRIGHT_EMAIL="<admin email>" CODERSO_PLAYWRIGHT_PASSWORD="<admin password>" bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-smoke-2026-05-27-clean --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/widget-contract-smoke-2026-05-27-clean.json --output-md .tmp/widget-contract-smoke-2026-05-27-clean.md`
- Focused `playwright-cli` replay for the smoke outliers (`pricing-plans`, `faq-accordion`, `cta-banner`, `contact`, `product-gallery`, `product-compare`, `product-table`)

## Documentation Updates Required

- Add the new `_docs/PLAYWRIGHT/27-05-2026/` report wave.
- Update `_docs/_TASKS/README.md`.
- Add changelog entry `990` and update `_docs/_CHANGELOG/README.md`.

## Acceptance Criteria

- `_docs/PLAYWRIGHT/27-05-2026/` contains a `README.md` and one report per
  page-builder widget.
- The final clean smoke result covers all 38 page-builder widgets.
- Reports clearly separate:
  - clean smoke passes,
  - automation metadata follow-ups,
  - empty-state/fixture gaps.

## Completion Notes (2026-05-27)

- `coderso-dev-core-host` was restarted until the admin UI rendered correctly
  and login reached the real dashboard.
- Final clean smoke result:
  - `adminFailures: 0`
  - `publicFailures: 0`
  - `fixtureGaps: 3`
  - `metadataGaps: 4`
- Focused replay confirmed the four admin outliers are current automation
  metadata gaps in Visual controls, not reproduced user-facing authoring
  failures.
- Focused public replay confirmed the three commerce outliers are empty-state
  fixtures that return `200` and render stable empty-state copy rather than
  crashing.
