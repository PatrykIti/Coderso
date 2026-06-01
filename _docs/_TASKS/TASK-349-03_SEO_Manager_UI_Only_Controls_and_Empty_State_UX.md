# TASK-349-03: SEO Manager UI-Only Controls and Empty-State UX
# FileName: TASK-349-03_SEO_Manager_UI_Only_Controls_and_Empty_State_UX.md

**Priority:** Medium
**Category:** SEO + Admin UI + UX + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-349-01, TASK-349-02
**Status:** To Do

---

## Overview

Close the SEO Manager UI-only and weak-state findings:

- Filter icon button has no behavior.
- `Discard` and `Add Keyword` in the drawer are UI-only.
- `GLOBAL SCAN: 0%` looks like a stalled scan before any audit runs.
- Empty table lacks a strong table-body message and CTA.

## Sub-Tasks

- Decide whether the filter icon opens an advanced filter panel or is removed /
  disabled.
- Make `Discard` restore the last saved drawer values and close dirty warnings,
  or remove it.
- Either implement focus-keyword authoring end-to-end or disable/remove
  `Add Keyword` with truthful product copy.
- Add neutral pre-scan state before any audit exists.
- Add `SeoTable` empty rows for no data, filtered-empty, and loading/error
  contexts where appropriate.
- Add an in-table `Run Full Audit` CTA only when it triggers the real audit
  path and preserves accessibility.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/seo/SeoManagerPage.tsx` | Replace dead filter icon, derive pre-scan state, and pass empty-state context to the table. |
| `core/admin/ui/seo/SeoTable.tsx` | Render dedicated empty table rows with active filter/search context and optional CTA. |
| `core/admin/ui/seo/SeoDrawer.tsx` | Implement or remove `Discard` and `Add Keyword`; preserve dirty-state clarity. |
| `tests/vitest/ui/seo-manager.test.tsx` | Cover filter action/disabled state, empty rows, pre-scan badge, and drawer buttons. |

## Implementation Pseudocode

```tsx
const scanState =
  items.some((item) => item.lastAuditAt)
    ? { kind: "complete", label: `Global Scan: ${averageScore}%` }
    : isAuditing
      ? { kind: "running", label: "Global Scan running" }
      : { kind: "not-run", label: "Audit not run" };

function handleDiscard() {
  setMetaTitle(item?.metaTitle ?? "");
  setMetaDescription(item?.metaDescription ?? "");
}

<SeoTable
  items={filteredItems}
  emptyState={resolveSeoEmptyState({ query, statusFilter, items })}
  onRunAudit={() => setAuditDialogOpen(true)}
/>
```

Data flow:

- Page owns current filters/search and passes explicit table empty-state copy.
- Drawer owns local draft values and can reset them to the latest item props.
- Advanced filtering, if implemented, updates the same filter derivation as
  status/search.

Error handling:

- Do not add an empty-state CTA that starts an audit while `isAuditing` is true.
- If keyword support is deferred, use disabled button semantics rather than a
  clickable no-op.
- Preserve keyboard access and ARIA labels on icon-only controls.

Regression-test shape:

- Render no SEO rows and assert a table row says no pages found plus Run Audit
  CTA.
- Click the filter icon and assert a visible panel or disabled state.
- Change drawer text then click Discard and assert values reset.
- Assert Add Keyword is either functional or disabled with `aria-disabled`.

## Security Contract

No route changes are required unless focus-keyword persistence is implemented.
If keyword persistence is added:

- Endpoint visibility: internal admin only.
- Auth model: session cookie.
- RBAC: `content:write`.
- CSRF: required for mutation.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: keywords must be a bounded string array with
  trimming/deduplication.
- Anti-abuse: no public write.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/seo-manager.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Focused Playwright SEO pass for no rows, filtered rows, drawer reset, and
  audit CTA

## Documentation Updates Required

- Update SEO report with UI-only control decisions.
- Update user docs if keyword authoring becomes a real product feature.

## Acceptance Criteria

- No visible SEO button is clickable without behavior.
- Empty and pre-scan states are truthful.
- Drawer reset/keyword behavior cannot silently discard or fake persistence.
- Accessibility console stays clean when opening the drawer/dialog.
