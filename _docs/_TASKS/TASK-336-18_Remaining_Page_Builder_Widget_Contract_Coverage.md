# TASK-336-18: Remaining Page Builder Widget Contract Coverage

# FileName: TASK-336-18_Remaining_Page_Builder_Widget_Contract_Coverage.md

**Priority:** Medium
**Category:** Widgets + Shared Contract + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-336-04, TASK-336-05, TASK-336-06, TASK-336-07, TASK-336-08, TASK-336-09, TASK-336-10, TASK-336-11, TASK-336-12, TASK-336-13, TASK-336-14, TASK-336-15
**Status:** Done (2026-05-24)

---

## Overview

Give every remaining page-builder widget an explicit owner task before
`TASK-336-17` enforces strict 38/38 contract validation.

Earlier leaves focus on known P0/P1/P2 drift and layout/frontend fixture risk.
This leaf owns the widgets that still need v2 `editorContract` metadata and
focused smoke coverage but were not named as standalone high-risk fixes.

## Widgets in Scope

- `toggle-block`
- `feature-grid`
- `testimonials`
- `pricing-plans`
- `faq-accordion`
- `cta-banner`
- `logo-cloud`
- `gallery-mosaic`
- `rich-text-section`
- `entry-teaser`
- `product-gallery`
- `product-compare`
- `timeline`
- `compare-timeline`
- `newsletter`
- `contact`
- `navigation`
- `footer`

Screen-only widgets remain out of scope here:

- `screen-record-header`
- `screen-field-value`
- `screen-field-group`
- `screen-two-column`

## Sub-Tasks

- [x] Run `TASK-336-03` smoke inventory for the in-scope widgets and collect
  `missing-contract`, `path-metadata-gap`, and duplicate-owner findings.
- [x] Add or update `editorContract` metadata for each in-scope widget.
- [x] Use the existing editor wave tests for each widget when present.
- [x] Create a focused widget/editor test only when an in-scope widget lacks
  coverage for the changed contract.
- [x] Route any newly discovered high-risk ownership bug to a new physical
  leaf instead of hiding it in this sweep.
- [x] Record accepted/rejected Claude UX feedback for any widget whose mode
  labels or Advanced summaries change materially.

## Status Notes

- Done (2026-05-24): added explicit `editorContract.version = 2` metadata for
  all 18 in-scope remaining page-builder widgets and extended
  `tests/vitest/widgets/editorContract.test.ts` with strict coverage for the
  full TASK-336-18 set.
- Done (2026-05-24): full frontend Playwright smoke stayed green with
  `publicFailures=0` and no fixture gaps in
  `widget-contract-smoke-task-336-18-full-2026-05-24.*`.
- Done (2026-05-24): authenticated full admin Playwright smoke captured the
  remaining actual UI drift:
  `adminFailures=9`, `fixtureGaps=19`, `metadataGaps=2` in
  `widget-contract-smoke-task-336-18-admin-auth-2026-05-24.*`. These findings
  are routed to `TASK-336-19` instead of being hidden behind broad allowlists.
- Done (2026-05-24): Claude CLI read-only review confirmed the target direction:
  Wizard setup-only, Visual daily controls, and Advanced read-only diagnostics.
  It also flagged raw `formId`, `menuKey`, `assetId`, item-id,
  `map.embedUrl`, rich HTML, JSON-LD, and contact nonce diagnostics as
  `TASK-336-19` cleanup inputs. Two read-only helper-agent audits provided the
  concrete drift inventory used for `TASK-336-19`.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/*` | Add/update `editorContract` metadata for the in-scope widget definitions. |
| `core/admin/ui/widgets/editors/*Editors.tsx` | Add shared metadata/read-only summaries only where the contract requires markup changes. |
| `tests/vitest/ui/*editor-wave.test.tsx` | Extend existing editor wave tests for touched widgets. |
| `tests/vitest/widgets/*test.tsx` | Add pure widget tests only where no existing focused suite can prove the contract. |
| `_docs/_WIDGETS/*` | Document mode ownership for touched widgets. |

## Implementation Pseudocode

```ts
const remainingPageBuilderWidgets = [
  "toggle-block",
  "feature-grid",
  "testimonials",
  "pricing-plans",
  "faq-accordion",
  "cta-banner",
  "logo-cloud",
  "gallery-mosaic",
  "rich-text-section",
  "entry-teaser",
  "product-gallery",
  "product-compare",
  "timeline",
  "compare-timeline",
  "newsletter",
  "contact",
  "navigation",
  "footer",
] as const;

for (const widgetType of remainingPageBuilderWidgets) {
  const definition = getWidget(widgetType);
  const result = validateWidgetEditorContract(definition, { requireContract: true });
  if (!result.ok) routeContractError(widgetType, result.errors);
}
```

Data flow:

- Use `listWidgetsForSurface("page-builder")` as the closure source of truth.
- This sweep only covers widgets not already owned by TASK-336-04 through
  TASK-336-15.
- Any high-risk implementation finding becomes a new physical leaf before
  closure.

Error handling:

- Do not weaken strict validation by adding broad duplicate allowlists.
- Do not absorb screen-only widgets into this page-builder sweep.
- Do not modify runtime rendering unless contract validation exposes a real
  renderer bug; split that bug if needed.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve existing widget schemas.
- Anti-abuse: no raw script, raw CSS, unsafe URL, or public write changes.
- Secret handling: no secrets, provider keys, or privileged settings in
  diagnostics or screenshots.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- Existing focused Vitest UI editor-wave suites for touched widgets.
- Existing focused widget suites for touched widgets.
- Playwright CLI smoke for in-scope widgets through TASK-336-03 inventory.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Regression-test shape:

- Every in-scope widget has a v2 contract.
- No in-scope widget has unallowlisted duplicate writable paths.
- Advanced diagnostics are read-only unless a field is explicitly
  technical-only.
- Screen-only widgets are not counted in the page-builder 38/38 assertion.

## Documentation Updates Required

- Update affected `_docs/_WIDGETS/*` files.
- Append a dated TASK-336-18 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.

## Acceptance Criteria

- All page-builder widgets not owned by earlier TASK-336 leaves have explicit
  v2 editor contracts.
- Any newly discovered high/medium drift is routed to a physical follow-up
  before closure.
- `TASK-336-17` can require strict 38/38 validation without hidden unowned
  widgets.
