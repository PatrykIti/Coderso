# TASK-479-11-L02: Media Tests
# FileName: TASK-479-11-L02-Media-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Media / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-11-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-11
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Add Vitest render tests that lock the restyled Media Library's structure and
prove the restyle preserved behavior: the media card **grid** renders correctly
(display-name precedence, missing-alt badge, type tone, selection), the **folder
rail** drives the existing `filter` state, the **storage usage** card shows a
real derived summary, and the **details drawer** opens on card select with its
autosave/copy/replace affordances intact.

- **Goal:** Guard L01 against regressions with focused, deterministic render
  tests in the Bun-free admin Vitest lane.
- **Owning module/service:** `tests/vitest/ui-integration/media-restyle.test.tsx`
  (new), exercising `core/admin/ui/media/MediaLibraryPage.tsx` + children.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/MEDIA_SPEC.md`.
  Pattern reference: existing `tests/vitest/ui/media-library.test.tsx`,
  `tests/vitest/ui/media-card.test.tsx`, `tests/vitest/ui-integration/media.test.tsx`.
- **Out of scope:** No runtime/Bun coverage moves; no new product code (that is
  L01); no API/contract tests beyond what the UI render already exercises.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests use mocked `fetch`/cache exactly as
the existing media suites do; no real network, secrets, or RBAC bypass.

---

## Implementation Pseudocode

Reuse the established harness from `tests/vitest/ui/media-library.test.tsx`
(`renderAdminUi`, `AdminRouterProvider`, `clearMediaCache`, `writeMediaCache`,
mocked `fetch`, `flushEffects`). Do NOT invent a new render utility.

```tsx
// tests/vitest/ui-integration/media-restyle.test.tsx
// @vitest-environment happy-dom
import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";
import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
// + cacheKeys, broadcastCacheEvent, renderAdminUi, mediaRecord(), writeMediaCache(),
//   userSettingsResponse, jsonResponse, flushEffects — copy shapes from existing suite.

afterEach(() => { clearMediaCache(); vi.restoreAllMocks(); /* clear localStorage */ });

test("grid renders one card per cached asset with display-name precedence", async () => {
  writeMediaCache([
    mediaRecord({ id: "m1", type: "image",    title: "Hero banner", originalName: "hero.png", alt: null }),
    mediaRecord({ id: "m2", type: "document", title: null, originalName: "brief.pdf" }),
  ]);
  // mock fetch: media list + user settings + storage settings
  const { container } = await renderAdminUi(<MediaLibraryPage />);
  await flushEffects();
  expect(getByText("Hero banner")).toBeTruthy();   // title wins over originalName
  expect(getByText("brief.pdf")).toBeTruthy();     // falls back to originalName
});

test("image without alt shows the missing-alt accessibility badge", async () => {
  writeMediaCache([mediaRecord({ id: "m1", type: "image", alt: null, title: "No alt" })]);
  // ... render + flush ...
  expect(queryByText(/missing alt/i)).toBeTruthy(); // MEDIA_SPEC accessibility rule preserved
});

test("folder rail click re-filters the grid via existing filter state", async () => {
  writeMediaCache([
    mediaRecord({ id: "m1", type: "image" }),
    mediaRecord({ id: "m2", type: "document", title: "Spec doc" }),
  ]);
  // render, click the "Documents" folder button (by accessible name / aria-pressed)
  // assert: only the document card remains; folder shows count badge "1"; "all" count = 2.
});

test("storage card shows a real derived asset summary (no fabricated quota)", async () => {
  writeMediaCache([mediaRecord({ id: "m1", size: 1024 }), mediaRecord({ id: "m2", size: 2048 })]);
  // assert the storage card renders "2 assets" and a formatBytes(3072) summary;
  // assert NO hard-coded "10 GB" string is present.
});

test("selecting a card opens the details drawer with autosave/copy/replace controls", async () => {
  writeMediaCache([mediaRecord({ id: "m1", title: "Selectable" })]);
  // click the card button -> drawer open; assert title/alt/caption inputs +
  // Copy URL + Replace affordances are present (behavior untouched by restyle).
});
```

**Data flow:** seed `cacheKeys.mediaList` via `writeMediaCache` so the page
hydrates from cache (lazy `useMemo` initial-cache path) → mock `fetch` for the
background list refresh + user/storage settings → `flushEffects` → assert DOM.

**Error handling (test concerns):** stub `navigator.clipboard` where Copy URL is
asserted; assert the dashed empty-state panel renders when the cache + list are
empty; ensure no test depends on real timers/network.

**Regression-test shape:** grid cardinality + display-name precedence; missing-alt
badge; folder-rail filtering + counts; derived storage summary (no fake quota);
drawer open + preserved affordances. Keep each `test` independent
(`clearMediaCache` + localStorage reset in `afterEach`).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/media-restyle.test.tsx`
- Regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-card.test.tsx tests/vitest/mediaUi/mediaLibrary.test.tsx tests/vitest/ui-integration/media.test.tsx`
- State explicitly in the closeout if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-11-L02`.
- No contract-doc change expected (tests only); note the new suite path in the
  changelog entry.
