# TASK-479-24-L03: Plugin Store Tests
# FileName: TASK-479-24-L03-Plugin-Store-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Store / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-24-L01, TASK-479-24-L02
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-24
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Add Vitest render tests that lock in the Plugin Store gallery restyle (L01) and the
Plugin Details restyle (L02), and confirm the restyle did not regress any store
selection/install/tab behavior. These are presentation guards layered on top of the
existing store/plugin suites, not a replacement for them.

- **Goal:** New Vitest suites that render the real `PluginStorePage` and
  `PluginDetailsPage` and assert the prototype look is present (featured banner,
  category tabs, `rounded-2xl` gallery cards with security score + installs +
  install/view affordance; hero header, underline tabs, SectionCard sidebar) while
  the core behaviors (search filter, master-detail selection, Store/Installed tabs,
  install flow, details tabs) still work.
- **Owning module/service:** `tests/vitest/ui-integration/plugin-store-restyle.test.tsx`
  and `tests/vitest/ui-integration/plugin-details-restyle.test.tsx` (new), exercising
  `core/admin/ui/store/PluginStorePage.tsx` and
  `core/admin/ui/store/PluginDetailsPage.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane); the prototype
  screens under `_docs/_PROTOTYPE/src/pages/store/`; the existing store suites used as
  fixture/setup references — `tests/vitest/ui/plugin-store.test.tsx`,
  `tests/vitest/ui/plugin-details.test.tsx`, `tests/vitest/storeUi/storeList.test.tsx`,
  and the shared SSR helper `tests/utils/adminRouterRender.tsx` (`renderAdminUi`).
- **Out of scope:** No runtime (browser) tests; no new product code (L01/L02 own the
  components). Do not move existing runtime tests into Vitest for coverage.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Mirror the existing store tests' setup: import the real page, render through
`renderAdminUi` (SSR `renderToString` wrapped in `AdminRouterProvider`, path
`/admin/store`). The existing suites assert on the returned HTML string; new suites
may use the same string assertions, or switch to `@testing-library/react` +
`render`/`screen` if a click-interaction assertion is needed (match whichever the
ui-integration lane already uses). Assert on stable, semantic signals — visible text
and load-bearing class tokens — not brittle full-class snapshots.

```tsx
// tests/vitest/ui-integration/plugin-store-restyle.test.tsx
import { renderAdminUi } from "../../../tests/utils/adminRouterRender";
import { PluginStorePage } from "../../../core/admin/ui/store/PluginStorePage";

describe("Plugin Store gallery restyle", () => {
  it("renders header, featured banner, and category tabs", () => {
    const html = renderAdminUi(<PluginStorePage />, { path: "/admin/store" });
    expect(html).toContain("Plugin Store");          // PageHeader preserved
    expect(html).toContain("Featured");              // new featured banner
    expect(html).toContain("Search plugins");        // search preserved (keeps old test green)
    // category strip + Store/Installed tabs
    expect(html).toMatch(/All|Analytics|Marketing/);
    expect(html).toContain("Installed");
  });

  it("renders a gallery card per catalog item with score + installs + CTA", () => {
    const html = renderAdminUi(<PluginStorePage />, { path: "/admin/store" });
    expect(html).toContain("SEO Boost");             // seed catalog item
    expect(html).toContain("Coderso Analytics");
    expect(html).toMatch(/installs/);                // downloads label
    expect(html).toMatch(/rounded-2xl/);             // prototype card token
    expect(html).toMatch(/Install|View|Manage/);     // per-card affordance
  });

  // If switching to testing-library for interaction:
  it("clicking a card selects it into the detail panel (no navigation)", async () => {
    render(<AdminRouterProvider initialPath="/admin/store"><PluginStorePage /></AdminRouterProvider>);
    await userEvent.click(screen.getByRole("button", { name: /Polyglot Localizer/i }));
    // detail panel reflects selection; URL/path unchanged (master-detail preserved)
    expect(screen.getByText(/Polyglot Localizer/i)).toBeInTheDocument();
  });
});

// tests/vitest/ui-integration/plugin-details-restyle.test.tsx
import { PluginDetailsPage } from "../../../core/admin/ui/store/PluginDetailsPage";

describe("Plugin Details restyle", () => {
  it("renders hero header, status badge, and install controls", () => {
    const html = renderAdminUi(<PluginDetailsPage />, { path: "/admin/store" });
    expect(html).toContain("SEO Optimizer");
    expect(html).toContain("Enabled");               // token-driven status badge
    expect(html).toContain("Auto-update");
    expect(html).toContain("Uninstall");
  });

  it("renders underline tabs and SectionCard sidebar content", () => {
    const html = renderAdminUi(<PluginDetailsPage />, { path: "/admin/store" });
    expect(html).toMatch(/Overview/);
    expect(html).toMatch(/Permissions/);
    expect(html).toMatch(/Changelog/);
    expect(html).toMatch(/Settings/);
    // sidebar SectionCards + seed content
    expect(html).toContain("Information");
    expect(html).toContain("content:read");          // permission scope from seed
    expect(html).toMatch(/2\.4\.1/);                 // changelog version from seed
  });
});
```

**Data flow:** render the real component through `renderAdminUi` → assert visible
text + load-bearing tokens (`rounded-2xl`, "Featured", tab labels, badge text, seed
content) → for one interaction, drive a click (select card) to prove the master-
detail wiring survived the restyle.

**Error handling:** keep assertions resilient — query by visible text / `toMatch`
token checks (or accessible role/name when using testing-library) instead of exact
className strings, so future token tweaks from TASK-479-05/06 do not falsely fail
these suites.

**Regression-test shape:** the two new suites above PLUS a green run of the existing
store family (`plugin-store.test.tsx`, `plugin-details.test.tsx`, `storeList.test.tsx`,
`plugin-card.test.tsx`, `plugin-filters.test.tsx`, `ui-integration/plugins.test.tsx`).
Do not edit those files unless a selector genuinely moved due to the restyle; if so,
update the minimal query, not the assertion intent.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/plugin-store-restyle.test.tsx tests/vitest/ui-integration/plugin-details-restyle.test.tsx`
- Full store regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/plugin-store.test.tsx tests/vitest/ui/plugin-details.test.tsx tests/vitest/ui/plugin-card.test.tsx tests/vitest/ui/plugin-filters.test.tsx tests/vitest/storeUi/storeList.test.tsx tests/vitest/ui-integration/plugins.test.tsx`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-24-L03`.
- Note the two new `ui-integration` suites in any test-inventory doc that lists the
  store coverage, so the restyle guards are discoverable.
