# TASK-479-21-L02: Solution Kits Tests
# FileName: TASK-479-21-L02-Solution-Kits-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Solution Kits / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-21-L01
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-21
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Add a Vitest render test that locks the restyled Solution Kits gallery's
structure and proves the restyle preserved behavior: the **featured banner**
renders as a non-action hero (heading + AI-assembled badge) and the single
reviewed-flow CTA ("Open LLM Guide") stays in the **Reviewed Site Builder** card
(not duplicated in the banner), the **kit card grid** renders one card per cached
kit (title + recommended-module badges), the **active/selected** kit shows the
"Selected" badge and button label, and the page still exposes the **Reviewed Site
Builder** handoff while never introducing an "Apply kit" install action.

- **Goal:** Guard L01 against regressions with focused, deterministic render
  tests in the Bun-free admin Vitest lane.
- **Owning module/service:**
  `tests/vitest/ui-integration/solution-kits-restyle.test.tsx` (new), exercising
  `core/admin/ui/kits/SolutionKitsPage.tsx` + `SolutionKitCard.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/SOLUTION_KITS.md`.
  Pattern reference: existing `tests/vitest/ui/solution-kits-page.test.tsx`
  (`renderAdminUi`, `cacheKeys.solutionKitsList` cache seeding, localStorage
  stub), `tests/vitest/admin/solutionKitSelection.test.ts`.
- **Out of scope:** No runtime/Bun coverage moves; no new product code (that is
  L01); no API/contract tests beyond what the UI render already exercises.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests seed the cache and stub localStorage
exactly as the existing kits suite does; no real network, secrets, or RBAC bypass.

---

## Implementation Pseudocode

Reuse the established harness from `tests/vitest/ui/solution-kits-page.test.tsx`
(`renderAdminUi` from `tests/utils/adminRouterRender`, `cacheKeys.solutionKitsList`
seeding, the `createLocalStorage` stub). Do NOT invent a new render utility.

```tsx
// tests/vitest/ui-integration/solution-kits-restyle.test.tsx
import React from "react";
import { afterEach, expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { SolutionKitsPage } from "../../../core/admin/ui/kits/SolutionKitsPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

// Copy createLocalStorage() + the install/restore helpers from solution-kits-page.test.tsx.
const seedKits = (storage, kits) =>
  storage.setItem(cacheKeys.solutionKitsList, JSON.stringify({ value: kits, savedAt: Date.now() }));

const KITS = [
  { id: "automotive-workshop", title: "Automotive Workshop", shortDescription: "Bookings + leads",
    recommendedModules: ["booking", "reviews"], features: ["Lead form"] },
  { id: "small-ecommerce", title: "Small Ecommerce", shortDescription: "Sell products",
    recommendedModules: ["catalog"], features: ["Product grid"] },
];

afterEach(() => { /* restore globalThis.localStorage like the existing suite */ });

test("featured banner is a non-action hero; the reviewed CTA stays single", () => {
  // banner renders regardless of kit hydration (no cache seed needed here)
  const html = renderAdminUi(<SolutionKitsPage />, { path: "/admin/advanced/solution-kits" });
  expect(html).toContain("Launch a full site in minutes"); // banner hero heading
  expect(html).toContain("AI assembled");                  // banner badge
  expect(html).toContain("Reviewed Site Builder");         // right-column card
  expect(html).toContain("Open LLM Guide");                // the single reviewed-flow CTA
  // guard the "duplicate banner CTA" fix: the CTA label appears exactly once
  expect(html.split("Open LLM Guide").length - 1).toBe(1);
});

test("grid renders one card per cached kit with title + module badges", () => {
  // seedKits(storage, KITS) inside the localStorage-stub block, then render
  const html = renderAdminUi(<SolutionKitsPage />, { path: "/admin/advanced/solution-kits" });
  expect(html).toContain("Automotive Workshop");
  expect(html).toContain("Small Ecommerce");
  expect(html).toContain("booking");           // module badge text = de-hyphenated token; `capitalize` is CSS-only, so the HTML text stays lowercase "booking"
  expect(html).not.toContain("Loading solution kits");
});

test("active kit shows Selected state and the page never offers Apply kit", () => {
  // seed cache + set the active-kit localStorage key (coderso.solutionKits.activeKit.v1)
  // to "automotive-workshop" before render, then assert:
  const html = renderAdminUi(<SolutionKitsPage />, { path: "/admin/advanced/solution-kits" });
  expect(html).toContain("Selected");          // success badge + button label on active card
  expect(html).toContain("Select kit");        // non-active card keeps the read-only label
  expect(html).not.toContain("Apply kit");     // reviewed-flow constraint preserved
});
```

**Data flow:** seed `cacheKeys.solutionKitsList` via the localStorage stub so the
page hydrates from cache (the `useSolutionKits` lazy initial-cache path) → render
with `renderAdminUi` (SSR-string render, same as the existing kits suite) → assert
on the returned HTML string. For the active-kit case, also pre-set the
`coderso.solutionKits.activeKit.v1` key so `getActiveSolutionKitId()` resolves the
selected card.

**Error handling (test concerns):** keep each test independent — install the
localStorage stub at the start of each test and restore the original in `afterEach`
(mirror the `originalLocal` save/restore in the existing suite). No real timers,
network, or `openAssistantPanel` side effects are required (assert on rendered
markup only).

**Regression-test shape:** featured non-action banner hero + AI-assembled badge,
with the single reviewed CTA ("Open LLM Guide") living in the Reviewed Site
Builder card (asserted to appear exactly once — not duplicated in the banner);
grid cardinality + title + module badges (no loading placeholder when cache is
warm); active/selected state with the "Selected" label and the absence of "Apply
kit". Do not assert on exact Tailwind class strings — assert on user-visible text
and structural markers.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-restyle.test.tsx`
- Regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/admin/solutionKitSelection.test.ts tests/vitest/admin/solutionKitsClient.test.ts`
- State explicitly in the closeout if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-21-L02`.
- No contract-doc change expected (tests only); note the new suite path in the
  changelog entry.
