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

Reuse the established harness in `tests/vitest/ui/media-library.test.tsx` — copy
its exact helpers (`mountMediaLibrary()` = `createRoot` + `AdminRouterProvider` +
`React.act`, `click()`, `getButton()`, `flushEffects()`, `mediaRecord()`,
`writeMediaCache()`, `jsonResponse()`, `userSettingsResponse`). Do NOT invent a
new render utility, and do NOT use any `@testing-library/*` API (`getByText`,
`queryByText`, `user-event` — none are installed in this repo).

Two repo-reality constraints drive the shapes below:

- **`renderAdminUi` is SSR-only.** It is `renderToString(...)` → returns an HTML
  **string** (not async, no `{ container }`). Use it only for a static snapshot
  string or to render the (portalled) `MediaDetailsDrawer` in isolation. Any
  click / re-filter / selection assertion MUST go through `mountMediaLibrary()` +
  `click()` and read `view.container.textContent` / `querySelector`.
- **`mediaRecord()` seeds a `MediaRecord` (the cache wire type), not a
  `MediaItem`.** On `MediaRecord`, `type` is **`"image" | "file"`** (NOT
  `"document"`/`"video"`) and the size field is **`size`** (NOT `sizeBytes`).
  `toMediaItem()` derives the grid tile's `MediaKind` from `mimeType` via
  `resolveKindFromMime`, so to seed a non-image tile set the **mime**, e.g. a
  document is `{ type: "file", mimeType: "application/pdf" }` and audio is
  `{ type: "file", mimeType: "audio/mpeg" }`. Passing `type: "document"` /
  `type: "video"` is a TypeScript error against `MediaRecord`.

```tsx
// tests/vitest/ui-integration/media-restyle.test.tsx
// @vitest-environment happy-dom
import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";
import { MediaDetailsDrawer } from "../../../core/admin/ui/media/MediaDetailsDrawer";
import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
import { invalidateUserSettingsCache } from "../../../core/admin/services/userSettingsClient";
import { formatBytes } from "../../../core/admin/ui/media/utils";
import type { MediaItem } from "../../../core/admin/ui/media/types";
// + cacheKeys, mediaRecord(), writeMediaCache(), userSettingsResponse,
//   jsonResponse(), flushEffects(), click(), getButton(), mountMediaLibrary()
//   — COPY verbatim from tests/vitest/ui/media-library.test.tsx (no new utility).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mount-time fetch stub: page only fetches /user-settings on mount; with a seeded
// cache listMediaCached() reads cache (no /media call), but keep a fallback.
// getStorageSettings() is NOT called on mount (only when the settings drawer
// opens), so the storage card needs no storage-settings stub.
const mediaFetch = () => async (input: RequestInfo | URL) => {
  if (String(input).endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
  if (String(input).endsWith("/media")) return jsonResponse([]);
  return jsonResponse({});
};

afterEach(() => {
  clearMediaCache();
  invalidateUserSettingsCache();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

test("grid renders one card per cached asset with display-name precedence", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([
    mediaRecord({ id: "m1", type: "image", title: "Hero banner", originalName: "hero.png", alt: null }),
    // document tile: kind comes from mimeType, NOT a bogus type: "document"
    mediaRecord({ id: "m2", type: "file", mimeType: "application/pdf", title: null, originalName: "brief.pdf" }),
  ]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(view.container.textContent).toContain("Hero banner"); // title wins over originalName
    expect(view.container.textContent).toContain("brief.pdf");   // falls back to originalName
  } finally {
    view.cleanup();
  }
});

test("image without alt shows the missing-alt accessibility badge", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([mediaRecord({ id: "m1", type: "image", alt: null, title: "No alt" })]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(view.container.textContent).toContain("Missing alt"); // MEDIA_SPEC accessibility rule preserved
  } finally {
    view.cleanup();
  }
});

test("folder rail click re-filters the grid via existing filter state", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([
    mediaRecord({ id: "m1", type: "image", title: "Pic" }),
    mediaRecord({ id: "m2", type: "file", mimeType: "application/pdf", title: "Spec doc" }),
  ]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    // folder buttons carry label + count; match by text prefix / aria-pressed.
    const docFolder = Array.from(view.container.querySelectorAll("button"))
      .find((b) => b.textContent?.trim().startsWith("Documents")) ?? null;
    await click(docFolder);
    expect(view.container.textContent).toContain("Spec doc"); // document remains
    expect(view.container.textContent).not.toContain("Pic");  // image filtered out
  } finally {
    view.cleanup();
  }
});

test("storage card shows a real derived asset summary (no fabricated quota)", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([mediaRecord({ id: "m1", size: 1024 }), mediaRecord({ id: "m2", size: 2048 })]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(view.container.textContent).toContain("2 assets");          // items.length
    expect(view.container.textContent).toContain(formatBytes(3072));   // derived total ("3.0 KB")
    expect(view.container.textContent).not.toMatch(/\bGB of\b/);       // no fabricated "X GB of Y" quota
  } finally {
    view.cleanup();
  }
});

test("the details drawer exposes its autosave/copy/replace affordances when open", () => {
  // MediaDetailsDrawer is a Radix Sheet (portals to document.body) and the page
  // opens it only on interactive select; assert affordances by rendering the
  // drawer directly with `open` — the tests/vitest/ui-integration/media.test.tsx
  // idiom — since renderAdminUi is a single SSR snapshot of the page.
  const item: MediaItem = {
    id: "m1", name: "hero.png", type: "image", sizeBytes: 1024,
    url: "/media/hero.png", mimeType: "image/png", createdAt: "2026-01-28T10:00:00Z",
  };
  const drawer = renderAdminUi(
    <MediaDetailsDrawer
      item={item} open onOpenChange={() => undefined} onSave={() => undefined}
      onDelete={() => undefined} onCopy={() => undefined} onOpen={() => undefined}
      onReplace={() => undefined}
    />
  );
  expect(drawer).toContain("Metadata");  // metadata editor preserved
  expect(drawer).toContain("Copy URL");
  expect(drawer).toContain("Replace");
});

// Optional interactive coverage of the open path: under mountMediaLibrary(),
// click a card's main button (onSelect -> handleSelectItem) and assert the
// portalled SheetTitle appears in document.body.textContent ("Media Details").
```

**Data flow:** seed `cacheKeys.mediaList` via `writeMediaCache` so the page
hydrates from cache (lazy `useMemo` initial-cache path) → stub `globalThis.fetch`
for `/user-settings` (+ a `/media` fallback) → `mountMediaLibrary()` →
`flushEffects` → assert on `view.container`. No storage-settings stub is needed:
`getStorageSettings()` only fires when the settings drawer opens, which these
tests do not trigger; the storage card derives from cached items.

**Error handling (test concerns):** the `Copy URL` affordance is asserted via the
direct `renderAdminUi(<MediaDetailsDrawer open />)` snapshot, which never runs the
click handler, so no `navigator.clipboard` stub is required (add one only if a
real Copy-URL click is exercised); assert the dashed empty-state panel renders
when the cache + list are empty; ensure no test depends on real timers/network.

**Regression-test shape:** grid cardinality + display-name precedence; missing-alt
badge; folder-rail filtering + counts; derived storage summary (no fake quota);
drawer affordances preserved. Keep each `test` independent (`clearMediaCache` +
`invalidateUserSettingsCache` + `window.localStorage.clear()` in `afterEach`).

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
