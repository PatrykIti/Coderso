# TASK-479-25-L02: Theme Editor Tests
# FileName: TASK-479-25-L02-Theme-Editor-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Admin UI Theme / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-25-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-25

---

## Overview

Extend the Vitest UI coverage for the restyled Admin UI Theme screen so it asserts
the new chrome (preset cards, live mini-admin preview, restyled `PageHeader` /
`SectionCard` headings) while keeping every existing themes suite green. This is
the regression net that locks in the L01 restyle without changing any data or
persistence contract.

- **Goal:** `tests/vitest/ui/themes.test.tsx` (and, if the cards/preview moved
  visual logic, `tests/vitest/ui/theme-leaf-components.test.tsx`) reflect the
  restyled `ThemesPage` — they assert the new section structure and the live
  preview reflecting the active profile, and the existing CRUD/cache flows still
  pass unchanged.
- **Owning module/service:** `tests/vitest/ui/themes.test.tsx` (+ optional
  `tests/vitest/ui/theme-leaf-components.test.tsx`), exercising
  `core/admin/ui/themes/ThemesPage.tsx` / `ThemePreviewPanel.tsx` /
  `ThemeTemplateCard.tsx` / `ThemeProfileCard.tsx`.
- **Source-of-truth docs:**
  - Existing suites: `tests/vitest/ui/themes.test.tsx`,
    `tests/vitest/ui/theme-leaf-components.test.tsx`
  - Component under test + L01 mapping: `TASK-479-25-L01-Theme-Editor-Page-Restyle.md`
  - Persistence contract: `core/services/adminThemeClient.ts`,
    `core/services/adminThemes/tokenUtils.ts` (`toAdminThemeCssVariableMap`)
  - `_docs/TESTING_STRATEGY.md` (Vitest = Bun-free admin/UI lane)
- **Out of scope:** No runtime/E2E tests; no data-layer test changes
  (`adminThemeClient` coverage stays in
  `tests/vitest/admin/adminThemeClient.test.ts`); no per-token-picker tests (those
  belong to TASK-479-05-L05); no snapshot churn of unrelated screens.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The tests keep the existing
`activeHref`/breadcrumbs assertions and the `adminThemeClient` mock contract; they
do not touch auth, RBAC, or network behavior.

---

## Implementation Pseudocode

The existing `tests/vitest/ui/themes.test.tsx` already mounts `ThemesPage` in
happy-dom with full `adminThemeClient` / `AdminShell` / `PageHeader` / card /
drawer mocks and asserts the CRUD + cache-bus + export flows. **Keep that suite's
behavior assertions intact** (search → "No templates match your search.", New
Template/Profile save payloads, activate, cache-bus refresh, empty/error states,
auto-activate). Add restyle assertions; only adjust the card/PageHeader mocks if
the restyle changes their prop API (e.g. `PageHeader` now takes an `icon`,
`ThemePreviewPanel` now takes `tokens`).

```tsx
// tests/vitest/ui/themes.test.tsx  (additions — same happy-dom mount/flush harness)

// PageHeader mock: accept the new `icon` prop without breaking existing assertions
vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({ title, description, actions, icon }: {
    title: string; description?: string; actions?: React.ReactNode; icon?: React.ReactNode;
  }) => (<div>{icon}<h1>{title}</h1><p>{description}</p>{actions}</div>),
}));

// 1) RESTYLED CHROME — new section structure renders alongside the kept CRUD
test("ThemesPage renders restyled chrome (preset row + live preview)", async () => {
  const { ThemesPage } = await import("../../../core/admin/ui/themes/ThemesPage");
  const view = mount(<ThemesPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Admin UI Theme");   // PageHeader title (kept)
    expect(view.container.textContent).toContain("Live preview");     // new SectionCard
    expect(view.container.textContent).toContain("Profiles");         // section heading (kept)
    expect(view.container.textContent).toContain("Studio");           // preset/template card (real data)
    expect(view.container.textContent).toContain("Active profile: Studio Active"); // unchanged line
  } finally { view.cleanup(); }
});

// 2) LIVE PREVIEW reflects the ACTIVE profile's tokens
// Either (a) keep the ThemePreviewPanel mock and assert it received `tokens`
// derived from the active template, or (b) render the REAL ThemePreviewPanel and
// assert a --admin-* CSS var from the active template paints the preview root.
test("ThemesPage live preview reflects the active profile tokens", async () => {
  // option (a): a capturing mock
  let received: unknown = null;
  vi.doMock("../../../core/admin/ui/themes/ThemePreviewPanel", () => ({
    ThemePreviewPanel: ({ tokens }: { tokens: unknown }) => {
      received = tokens; return <div>preview</div>;
    },
  }));
  const { ThemesPage } = await import("../../../core/admin/ui/themes/ThemesPage");
  const view = mount(<ThemesPage />);
  try {
    await flush();
    expect(received).toBeTruthy();                 // active template tokens passed (e.g. base.bg "#101010")
  } finally { view.cleanup(); vi.doUnmock("../../../core/admin/ui/themes/ThemePreviewPanel"); }
});
```

```tsx
// tests/vitest/ui/theme-leaf-components.test.tsx  (additions, if cards moved visuals)
// Assert the restyled cards keep their data-driven visuals:
test("ThemeProfileCard marks the active profile", () => {
  // render ThemeProfileCard with isActive:true → assert "Active" affordance + ring class
});
test("ThemeTemplateCard renders the palette swatches", () => {
  // render ThemeTemplateCard with palette:[...] → assert one swatch span per color
});
```

**Data flow:** the happy-dom `mount` + `flush` harness already in
`themes.test.tsx` renders `ThemesPage` against the hoisted `themesState` mock
(templates/profiles, cache, subscribers). The added tests read
`container.textContent` / a capturing `ThemePreviewPanel` mock. No real network;
the mount hydrate resolves via the mocked `listAdmin*Cached`.

**Error handling:** keep the existing empty-state and error-state tests verbatim
(they assert the unchanged copy "No theme templates yet…", "Create a profile to
activate…", and the ApiClientError message). If a card/preview prop API changed,
update only that mock — never weaken a behavior assertion to make the restyle
pass.

**Regression-test shape:**

- Restyled chrome: PageHeader title + "Live preview" + "Profiles" headings + a
  real template name render without throwing.
- Live preview: the active profile's resolved tokens reach `ThemePreviewPanel`
  (or a `--admin-*` var paints the real preview root).
- Kept flows: the existing search / New Template / New Profile / activate /
  cache-bus / export / empty / error / auto-activate assertions all still pass.
- (If cards moved visuals) leaf-component tests: active-profile affordance +
  palette swatch count.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/themes.test.tsx tests/vitest/ui/theme-leaf-components.test.tsx`
- Confirm `tests/vitest/admin/adminThemeClient.test.ts` still passes (unchanged
  persistence contract).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure linking `TASK-479` +
  `TASK-479-25-L02`.
- If a live-preview token fixture is introduced, note its location so future
  token-contract changes update it alongside `core/services/adminThemes/tokenTypes.ts`.
