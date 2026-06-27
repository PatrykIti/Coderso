# TASK-479-15-L04: Forms Tests
# FileName: TASK-479-15-L04-Forms-Tests.md

**Priority:** Medium
**Category:** Admin UI / Forms / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-15

---

## Overview

Add the per-screen Vitest render suites that lock in the Forms restyle
(L01–L03) and keep every existing forms suite green. These are **render/behavior**
tests in the Bun-free admin/UI Vitest lane — they assert the new soft/violet
chrome is present AND that all preserved data/logic/anti-abuse wiring still
works. No runtime tests move into Vitest for coverage.

- **Goal:** Prove the restyle is presentation-only: stat bands render from real
  in-state data, tables/panes keep their rows/controls, routing stays canonical
  (no raw `<a href>`), public-write anti-abuse controls remain present, and no
  cache/dirty-state regression is introduced.
- **Owning module/service:** `tests/vitest/ui-integration/forms-*-restyle.test.tsx`
  (new) plus the existing forms suites under `tests/vitest/ui/` and
  `tests/vitest/forms/`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/FORMS_SPEC.md`;
  prototype references as in L01–L03.
- **Out of scope:** No new server/runtime test lane; no change to the forms
  domain suites' assertions beyond what the restyle intentionally changes.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

Tests must include at least one assertion per builder/settings suite that the
public-submit anti-abuse controls (honeypot / CAPTCHA toggle / `submissionAccess`)
still render and stay bound — guarding against the restyle silently dropping a
control.

---

## Implementation Pseudocode

New suites (mirror the existing forms test setup: render under the admin router
provider with `formsClient` mocked; assert on roles/text, not implementation
detail).

```tsx
// tests/vitest/ui-integration/forms-list-restyle.test.tsx
describe("FormListPage restyle", () => {
  it("renders the stat band derived from items", () => {
    renderWithAdminRouter(<FormListPage />, { forms: seedForms(/* 3 published, 2 draft */) });
    expect(screen.getByText("Total forms")).toBeInTheDocument();
    expect(within(statCard("Active")).getByText("3")).toBeInTheDocument();
  });
  it("keeps selection + bulk bar", async () => { /* select a row → FormBulkActionsBar appears */ });
  it("opens the create drawer from New", async () => { /* click New → FormCreateDrawer */ });
  it("uses AdminLink for the form name (no raw <a href>)", () => {
    const { container } = renderWithAdminRouter(<FormListPage />, { forms: seedForms() });
    // assert resolved admin href, not a hand-built "/advanced/forms/..." anchor
  });
  it("does NOT render fabricated field/submission count columns", () => { /* assert absence */ });
});

// tests/vitest/ui-integration/forms-builder-restyle.test.tsx
describe("FormBuilderPage restyle", () => {
  it("renders palette rail + canvas preview + inspector tabs", () => { /* … */ });
  it("adds a field from the palette", async () => { /* click palette item → onAddField */ });
  it("shows selected-field settings with Required switch bound", async () => { /* … */ });
  it("keeps anti-abuse controls on the Settings tab", async () => {
    // switch to Settings tab → honeypot/CAPTCHA/submissionAccess controls present
  });
  it("Save/Publish still call the client writes", async () => { /* mocked updateFormFields/updateForm */ });
});

// tests/vitest/ui-integration/forms-submissions-restyle.test.tsx
describe("FormSubmissionsPage restyle", () => {
  it("renders stat band from submissions fixture", () => { /* Total/This week/Spam */ });
  it("renders a row per submission with payload labels", () => { /* fieldLabels lookup */ });
  it("keeps the read-only contract (calls listFormSubmissions, no submissions cache key)", () => { /* … */ });
});

// tests/vitest/ui-integration/forms-action-logs-restyle.test.tsx
describe("FormActionLogsPage restyle", () => {
  it("renders stat band + status filter", () => { /* … */ });
  it("retries a run via retryFormActionRun", async () => { /* mocked */ });
});
```

**Existing suites to keep green (update only intentional class/markup
assertions):** `tests/vitest/ui-integration/forms.test.tsx`,
`tests/vitest/ui/form-builder.test.tsx`, `tests/vitest/ui/form-canvas.test.tsx`,
`tests/vitest/ui/form-canvas-wave.test.tsx`,
`tests/vitest/ui/form-actions-panel.test.tsx`,
`tests/vitest/ui/form-submissions-page.test.tsx`,
`tests/vitest/ui/form-action-logs-page.test.tsx`,
`tests/vitest/ui/forms-pages-wave.test.tsx`,
`tests/vitest/ui/forms-component-wave.test.tsx`,
`tests/vitest/admin/formsClient.test.ts`, and the domain suites under
`tests/vitest/forms/` (`formSettings`, `formPresets`, `formActionsContract`,
`formAutomationRunnerCore`, `formRuntimeResolver`) — the last group must stay
**untouched** (no schema/validation/anti-abuse change).

**Data flow / error handling:** tests mock `formsClient` + the cache helpers and
render under the admin router provider so `AdminLink`/`navigate` resolve.
Behavioral assertions (selection, bulk, create, add/select field, save/publish,
load/empty/error, pagination, status filter, retry) are preserved; only literal
chrome assertions are updated where the restyle intentionally changes them.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/forms-list-restyle.test.tsx tests/vitest/ui-integration/forms-builder-restyle.test.tsx tests/vitest/ui-integration/forms-submissions-restyle.test.tsx tests/vitest/ui-integration/forms-action-logs-restyle.test.tsx`
- Full forms regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/form-builder.test.tsx tests/vitest/ui/form-canvas.test.tsx tests/vitest/ui/form-canvas-wave.test.tsx tests/vitest/ui/form-actions-panel.test.tsx tests/vitest/ui/form-submissions-page.test.tsx tests/vitest/ui/form-action-logs-page.test.tsx tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/forms`

State in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-15-L04`.
- `_docs/TESTING_STRATEGY.md` — list the new forms restyle suites under the
  admin/UI Vitest lane if the strategy doc enumerates per-screen suites.
