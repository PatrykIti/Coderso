# TASK-105-08-05: Menus, Dashboard, and Kits UI
# FileName: TASK-105-08-05-menus-dashboard-kits.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08-11 (splits the menu-design-editor suite before this leaf extends it)  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Close every line gap in `core/admin/ui/menus/**` (17 files), `core/admin/ui/dashboard/**`
(6 files), and `core/admin/ui/kits/**` (4 files). Two files sit at 0 covered lines
(`MenuAppearancePanel`, `SiteHealthCard`) and one hook (`useSolutionKitRuns`) is 0/109 —
all real executable targets. Test-only: no API surface, no production change.

## Scope

Uncovered-line budget: **492** (286 menus + 58 dashboard + 148 kits), 27 files.

`core/admin/ui/menus/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `MenuAppearancePanel.tsx` | 0/35 | 0.0% |
| `MenuCreateDialog.tsx` | 24/27 | 88.9% |
| `MenuDesignEditor.tsx` | 107/114 | 93.9% |
| `MenuDesignEditorBarPanel.tsx` | 48/56 | 85.7% |
| `MenuDesignEditorBlockFields.tsx` | 98/119 | 82.4% |
| `MenuDesignEditorBlockPanel.tsx` | 7/9 | 77.8% |
| `MenuDesignEditorBrandNavControls.tsx` | 66/100 | 66.0% |
| `MenuDesignEditorCanvas.tsx` | 45/50 | 90.0% |
| `MenuDesignEditorControls.tsx` | 94/95 | 98.9% |
| `MenuDesignEditorPage.tsx` | 4/7 | 57.1% |
| `MenuEditorPage.tsx` | 309/407 | 75.9% |
| `MenuItemDrawer.tsx` | 45/51 | 88.2% |
| `MenuItemForm.tsx` | 30/43 | 69.8% |
| `MenuItemRow.tsx` | 21/30 | 70.0% |
| `MenuListPage.tsx` | 148/178 | 83.1% |
| `MenuTree.tsx` | 47/53 | 88.7% |
| `SiteShellDialog.tsx` | 63/68 | 92.6% |

`core/admin/ui/dashboard/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `DashboardBuilder.tsx` | 224/242 | 92.6% |
| `DashboardWidgetHost.tsx` | 13/16 | 81.3% |
| `SecurityStatusCard.tsx` | 7/8 | 87.5% |
| `SiteHealthCard.tsx` | 0/17 | 0.0% |
| `WidgetConfigForm.tsx` | 63/80 | 78.8% |
| `widgetRegistry.ts` | 20/22 | 90.9% |

`core/admin/ui/kits/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `SolutionKitCard.tsx` | 6/7 | 85.7% |
| `SolutionKitsPage.tsx` | 15/34 | 44.1% |
| `hooks/useSolutionKitRuns.ts` | 0/109 | 0.0% |
| `hooks/useSolutionKits.ts` | 9/28 | 32.1% |

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 27 source files above and of its test files
  under `tests/vitest/ui/*`, `tests/vitest/kits/*`, and `tests/vitest/services/*`
  (menu-document suites, incl. `tests/vitest/site/menu-document-css-*.test.ts`).
- Existing suites it may extend (owned by this leaf, ONLY after TASK-105-08-11 splits
  them): the split pieces of `tests/vitest/ui/menu-design-editor.test.tsx` (2711 lines
  today). Also `menu-item-settings-variant.test.ts`, `normalize-menu-appearance.test.ts`
  (services), `full-site-install-planner.test.ts` (kits, 902 lines — watch).
- New suites per component (`menu-appearance-panel.test.tsx`, `menu-editor-page.test.tsx`,
  `site-health-card.test.tsx`, `widget-config-form.test.tsx`,
  `use-solution-kit-runs.test.ts`, `solution-kits-page.test.tsx`, etc.).
  No other leaf may edit these test files.

## Pseudocode

Mock seams: menus call `@/services/menusClient`; dashboard calls the Dashboard widget
registry + `dashboardClient`/`@/ui/dashboard/widgetRegistry`; kits call
`@/services/solutionKitsClient`. Pure models (`widgetRegistry`, menu document helpers)
are Bun-free and get direct unit tests.

```tsx
const getMenus = vi.fn(); const saveMenu = vi.fn();
vi.mock("@/services/menusClient", () => ({ getMenus, saveMenu /* ... */ }));

function renderSubject() { return render(<MenuEditorPage menuId="m-1" />); }
```

Assertion shape per component:

1. `MenuEditorPage` (98 uncovered): every editor tab/panel (structure, design,
   appearance), item CRUD, save flow, and cancel/revert branch, asserting visible
   DOM/ARIA effect and client payload shape.
2. `MenuAppearancePanel` (0/35): dedicated suite rendering each appearance control
   (colors, layout, typography) and asserting emitted appearance values.
3. Dashboard: `DashboardBuilder` add/remove/reorder/configure widgets;
   `SiteHealthCard` (0/17) and `SecurityStatusCard` render every health/status state;
   `WidgetConfigForm` exercises each widget config field and validation branch.
4. Kits: `useSolutionKitRuns` (0/109) via `renderHook` covering run create/status
   polling/error/cancel; `useSolutionKits` and `SolutionKitsPage` list/apply flows.
5. `widgetRegistry` gets a table-driven unit test over every registered widget's
   config/defaults/validation.

Work order (worst first): `MenuEditorPage` (98), `MenuAppearancePanel` (35),
`MenuDesignEditorBrandNavControls` (34), `MenuListPage` (30), `MenuDesignEditorBlockFields`
(21), `DashboardBuilder` (18), `useSolutionKitRuns` (109 lines total, currently 0),
`SolutionKitsPage` (19), `SiteHealthCard` (17), `WidgetConfigForm` (17), then the rest.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/menu-appearance-panel.test.tsx`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.

## 1000-Line Rule

The 2711-line `menu-design-editor.test.tsx` is split by TASK-105-08-11 into named,
independently runnable suites (structure / design-canvas / brand-nav / blocks / controls).
This leaf extends those split pieces only, and splits again if any piece would exceed
1000 lines.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 27 files reach `100%` lines, including the three currently-zero files.
2. Every dashboard widget config field and every menu editor panel is covered.
