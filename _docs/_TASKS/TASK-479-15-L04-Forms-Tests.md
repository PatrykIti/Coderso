# TASK-479-15-L04: Forms Tests
# FileName: TASK-479-15-L04-Forms-Tests.md

**Priority:** Medium
**Category:** Admin UI / Forms / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
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
public-submit `submissionAccess` (public|internal) control still renders —
asserted by rendering `FormSettingsPanel` directly (presence guard against the
restyle silently dropping it; its value/binding contract is covered by the
existing builder/settings behavioral suites under `tests/vitest/ui/` and
`tests/vitest/forms/`, which stay untouched). Note: honeypot / CAPTCHA are NOT
rendered by `FormSettingsPanel` (it only renders `submissionAccess`) — they are
enforced server-side (bot protection + global security settings), so do not
assert them on this panel.

---

## Implementation Pseudocode

New suites mirror the EXISTING forms test setup. **This repo has NO
`@testing-library/react` / `jest-dom` / `user-event`** — do NOT use
`render`/`screen`/`getByText`/`getByRole`/`within`/`userEvent`/`toBeInTheDocument`.
There are two real idioms:

- **Static presence** → SSR `renderToString` under `AdminRouterProvider`, assert
  with `expect(html).toContain(...)` (see
  `tests/vitest/ui-integration/forms.test.tsx`).
- **Interaction / seeded data** → `// @vitest-environment happy-dom`,
  `vi.hoisted(...)` + `vi.mock(...)` to seed `formsClient` + the cache helpers +
  router `navigate`, then `createRoot` + `React.act`, asserting on
  `container.textContent` / `querySelector` (see
  `tests/vitest/ui/forms-pages-wave.test.tsx`'s `formsPageState`).

The SSR snapshot renders ONE static pass, so do not assert anything behind a
click or tab-switch under `renderToString` — route those to the happy-dom +
`createRoot`/`act` lane.

```tsx
// tests/vitest/ui-integration/forms-list-restyle.test.tsx
// happy-dom + vi.mock(formsClient) seeded with e.g. 3 published + 2 draft forms.
test("renders the stat band derived from items (Total/Active/Drafts)", () => {
  // createRoot render; container.textContent contains "Total forms"/"Active"/
  // "Drafts" with the derived counts (Active === "3").
});
test("renders one row per form with Status/Access badges + resolved name link", () => {
  // each name is an <a> whose href === resolveAdminHref(base, `/advanced/forms/${id}`).
  // Assert the RESOLVED admin href — AdminLink emits an <a>, so do NOT assert
  // "no <a href>"; assert it is the path-helper href, not a hand-built one.
});
test("does NOT render fabricated field/submission count columns", () => {
  // assert absence of "Fields"/"Submissions"/"Last submission" headers.
});
test("selection shows FormBulkActionsBar; New opens FormCreateDrawer", () => {
  // happy-dom: dispatch click on a row checkbox / the New button inside act();
  // assert FormBulkActionsBar / FormCreateDrawer appear in the DOM.
});

// tests/vitest/ui-integration/forms-builder-restyle.test.tsx
test("renders the Fields/Library rail + canvas preview + inspector", () => {
  // SSR renderToString of FormBuilderPage → html.toContain the rail + canvas + inspector.
});
test("submissionAccess control renders (FormSettingsPanel direct)", () => {
  // render FormSettingsPanel DIRECTLY with seeded props (NO tab-switch under SSR);
  // assert the submissionAccess (public|internal) Select is present (presence only).
  // NB: honeypot/CAPTCHA are server-side (bot protection + global security
  // settings), not FormSettingsPanel controls — do not assert them here.
});
test("add-field + Save/Publish call the client writes", () => {
  // happy-dom + createRoot/act: click a Library item → handleAddField; Save →
  // updateFormFields/updateForm (mocked recorders).
});

// tests/vitest/ui-integration/forms-submissions-restyle.test.tsx
test("renders stat band from submissions fixture (Total/This week/Spam)", () => { /* SSR */ });
test("renders a row per submission with payload labels", () => { /* fieldLabels lookup */ });
test("keeps the read-only contract", () => {
  // calls listFormSubmissions directly; assert NO submissions cache key exists
  // (static: cacheKeys exposes formsList/formDetail/formActionRuns only).
});

// tests/vitest/ui-integration/forms-action-logs-restyle.test.tsx
test("renders stat band + status filter (all/success/failed/skipped)", () => {
  // SSR snapshot; FormActionRunStatus = "success" | "failed" | "skipped".
});
test("retries a run via retryFormActionRun", () => {
  // happy-dom + createRoot/act: click Retry → retryFormActionRun (mocked).
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
