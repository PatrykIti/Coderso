# TASK-479-20-L03: Popups Tests
# FileName: TASK-479-20-L03-Popups-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-20-L01, TASK-479-20-L02
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-20
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Add Vitest render tests that lock in the Popups list restyle and the Popup editor
restyle, and confirm the restyle did not regress any data/cache/mutation behavior.
These are presentation guards layered on top of the existing behavioral popups
suites, not a replacement for them.

- **Goal:** New Vitest suites that render the real `PopupsListPage` and the real
  `PopupEditorPage` and assert the prototype look is present (stat row, soft
  `rounded-2xl` card grid, live popup preview, grouped inspector) while the core
  behaviors (search/status filter, active-toggle status mutation, delete, draft
  binding via `onPatch`, dirty-state, save payload) still work — and that NO
  fabricated `impressions`/`conversion` analytics leaked into the UI.
- **Owning module/service:**
  `tests/vitest/ui-integration/popups-list-restyle.test.tsx` and
  `tests/vitest/ui-integration/popup-editor-restyle.test.tsx` (new), exercising
  `core/admin/ui/popups/PopupsListPage.tsx` and
  `core/admin/ui/popups/PopupEditorPage.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane), the prototype
  screens under `_docs/_PROTOTYPE/src/pages/advanced/`, and the existing
  `tests/vitest/ui/popups-page.test.tsx` + `tests/vitest/admin/popupsClient.test.ts`
  suites used as fixture/setup references.
- **Out of scope:** No runtime (browser) tests; no new product code (L01/L02 own the
  components). Do not move existing runtime tests into Vitest for coverage.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Mirror the setup of the existing popups suite (mock `popupsClient` cache reads/
mutations, seed `getCachedPopups` / `getCachedPopup`, wrap in the
`AdminRouterContext`/shell test providers already used by
`tests/vitest/ui/popups-page.test.tsx`). Assert on stable, semantic signals —
accessible roles/text and load-bearing class tokens — not brittle full-class
snapshots.

```tsx
// tests/vitest/ui-integration/popups-list-restyle.test.tsx
describe("Popups list restyle", () => {
  it("renders header, Beta badge, stat row, and a soft card grid", () => {
    seedCachedPopups([popup({ status: "published" }), popup({ status: "draft" })]);
    renderPopupsListPage();
    expect(screen.getByRole("heading", { name: /popups/i })).toBeInTheDocument();
    expect(screen.getByText(/beta/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new popup/i })).toBeInTheDocument();
    // stat row derived from real counts (Total/Published/Drafts)
    expect(screen.getByText(/published/i)).toBeInTheDocument();
    // card wrapper adopts the prototype card tokens
    const card = screen.getByText("Newsletter signup").closest("[class*='rounded-2xl']");
    expect(card).toBeTruthy();
  });

  it("does NOT render fabricated impressions/conversion analytics", () => {
    seedCachedPopups([popup({ status: "published" })]);
    renderPopupsListPage();
    expect(screen.queryByText(/impressions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/conversion/i)).not.toBeInTheDocument();
  });

  it("active toggle flips status via updatePopupStatus", async () => {
    const spy = vi.spyOn(popupsClient, "updatePopupStatus").mockResolvedValue(popup());
    seedCachedPopups([popup({ id: "p1", status: "draft" })]);
    renderPopupsListPage();
    await userEvent.click(screen.getByRole("switch", { name: /toggle/i }));
    expect(spy).toHaveBeenCalledWith("p1", "published");
  });

  it("search/status filter narrows the grid (filterable, behavior preserved)", async () => {
    seedCachedPopups([popup({ name: "Alpha" }), popup({ name: "Beta promo" })]);
    renderPopupsListPage();
    await userEvent.type(screen.getByRole("textbox", { name: /search popups/i }), "Alpha");
    expect(screen.queryByText("Beta promo")).not.toBeInTheDocument();
  });
});

// tests/vitest/ui-integration/popup-editor-restyle.test.tsx
describe("Popup editor restyle", () => {
  it("renders the three-region frame + live preview from the draft", () => {
    seedCachedPopup(popup({ content: { title: "Join us", body: "Subscribe" } }));
    renderPopupEditorPage("/advanced/popups/p1");
    expect(screen.getByText("Join us")).toBeInTheDocument();   // preview reflects draft.title
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("typing a title flips dirty + updates the preview, Save sends toPopupInput(draft)", async () => {
    const spy = vi.spyOn(popupsClient, "updatePopup").mockResolvedValue(popup());
    seedCachedPopup(popup({ id: "p1" }));
    renderPopupEditorPage("/advanced/popups/p1");
    await userEvent.type(screen.getByLabelText(/title/i), "Hello");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(spy).toHaveBeenCalledWith("p1", expect.objectContaining({ content: expect.objectContaining({ title: expect.stringContaining("Hello") }) }));
  });

  it("changing the trigger Select swaps the conditional field (binding intact)", async () => {
    seedCachedPopup(popup({ trigger: { type: "time_delay", delaySeconds: 3 } }));
    renderPopupEditorPage("/advanced/popups/p1");
    await userEvent.selectOptions(screen.getByLabelText(/trigger/i), "scroll_depth");
    expect(screen.getByLabelText(/scroll depth/i)).toBeInTheDocument();
  });

  it("does not overwrite the draft while dirty (no dirty-state clobber)", async () => {
    seedCachedPopup(popup({ id: "p1" }));
    renderPopupEditorPage("/advanced/popups/p1");
    await userEvent.type(screen.getByLabelText(/title/i), "WIP");
    emitCacheEvent(cacheKeys.popupsList);            // background revalidation
    expect(screen.getByLabelText(/title/i)).toHaveValue("WIP"); // unchanged
  });
});
```

**Data flow:** tests seed cache → render the real component → assert DOM/role/text +
load-bearing tokens (`rounded-2xl`, stat labels, preview text) → drive one
behavioral path per area (toggle→status mutation, search→filter, type→dirty+preview,
save→`toPopupInput` payload, cacheBus→no clobber) to prove the restyle preserved
wiring.

**Error handling:** keep assertions resilient — query by accessible role/name and
`toMatch`/`class*=` token checks instead of exact className strings, so future token
tweaks from TASK-479-05/06 do not falsely fail these suites. The
no-fabricated-analytics assertion is a guardrail for the L01 truthfulness contract.

**Regression-test shape:** the two new suites above PLUS a green run of the existing
popups behavioral suites (no edits to those files unless a selector genuinely moved;
if a selector moved due to the restyle, update the minimal query rather than the
assertion intent).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/popups-list-restyle.test.tsx tests/vitest/ui-integration/popup-editor-restyle.test.tsx`
- Full popups regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/popups-page.test.tsx tests/vitest/ui/popup-defaults.test.ts tests/vitest/admin/popupsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-20-L03`.
- Note the two new `ui-integration` suites in any test-inventory doc that lists the
  Popups coverage, so the restyle guards are discoverable.
