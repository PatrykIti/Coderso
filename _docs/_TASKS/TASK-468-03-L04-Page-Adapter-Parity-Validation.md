# TASK-468-03-L04: Page Adapter Parity Validation
# FileName: TASK-468-03-L04-Page-Adapter-Parity-Validation.md

**Parent Subtask:** TASK-468-03
**Priority:** High
**Category:** Admin UI / Regression Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-468-03-L02, TASK-468-03-L03
**Status:** ✅ Done
**Completed:** 2026-06-21

---

## Overview

Validate that Page Editor behavior remains stable after neutral authoring
extraction. This leaf closes the extraction subtask before Custom Screens start
using the shared primitives.

2026-06-21 completion: Page Editor stayed on its existing Page-owned authoring
surface while Custom Screens adopted the additive neutral shell. Boundary tests
now prove Page Editor files do not import Custom Screen modules and active
Custom Screen canvas modules do not import Page builder/runtime widget code.

## Sub-Tasks

- [ ] Add or update Page Editor adapter parity tests for render, select, insert,
  reorder, edit, undo/redo, save, and preview.
- [ ] Add admin bundle evidence proving neutral extraction did not pull Screen
  editor code into Page routes.
- [ ] Run boundary and targeted Page Editor validation.
- [ ] Record remaining acceptable gaps or split follow-up tasks before closing
  TASK-468-03.

## Files To Change

| File | Required change |
|---|---|
| `tests/vitest/ui-integration/pages/**` | Page Editor adapter regression coverage. |
| `tests/vitest/ui-integration/authoring/**` | Shared authoring parity fixtures. |
| `_docs/_TASKS/TASK-468-03-Neutral-Authoring-Shell-Extraction-For-Screen-Canvas-Reuse.md` | Completion evidence and drift notes. |

## Implementation Pseudocode

```tsx
function renderPageEditorWithAdapter(fixture: PageDocumentFixture) {
  const model = createPageEditorModel(fixture);
  return render(<PageEditorPage initialModel={model} />);
}

test("page editor keeps save payload shape after neutral extraction", async () => {
  const api = createPageEditorApiMock();
  renderPageEditorWithAdapter(pageFixture);
  await editBlockText("title", "Updated");
  await savePage();
  expect(api.lastPatch.document.schemaVersion).toBe(2);
});
```

Data flow:

- Page fixture enters the Page adapter.
- Neutral authoring shell emits commands and selection operations.
- Page adapter mutates Page v2 state and persists existing Page payloads.

Error handling:

- Test stale selections after delete/reorder to ensure adapter reconciliation.
- Test save errors to ensure dirty state is preserved.
- Fail validation if Page payloads gain Screen-specific fields.

Regression-test shape:

```tsx
test("does not load screen authoring modules from page editor route", async () => {
  const chunks = await readAdminBundleManifest();
  expect(routeImports(chunks, "PageEditor")).not.toContain("custom-screens/Screen");
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Page routes only.
- **Auth model:** authenticated admin session.
- **RBAC:** unchanged Page Editor permissions.
- **CSRF expectations:** unchanged for Page saves/publish actions.
- **Rate-limit bucket:** existing admin write bucket.
- **Reject unknown validation:** Page payloads remain Page v2 and do not accept
  Screen document fields.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** parity tests must not snapshot tokens, cookies, or raw
  privileged payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/pages`
- `bun run test:vitest -- tests/vitest/ui-integration/authoring`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/TASK-468-03-Neutral-Authoring-Shell-Extraction-For-Screen-Canvas-Reuse.md`

## Acceptance Criteria

1. Page Editor parity tests pass after extraction.
2. Page save/publish payloads remain Page v2.
3. Admin bundle evidence shows no accidental Screen editor static import from
   Page Editor routes.
