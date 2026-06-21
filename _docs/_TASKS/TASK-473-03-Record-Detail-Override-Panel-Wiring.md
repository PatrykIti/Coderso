# TASK-473-03: Record Detail Override Panel Wiring
# FileName: TASK-473-03-Record-Detail-Override-Panel-Wiring.md

**Parent Task:** TASK-473
**Priority:** Medium
**Category:** Admin UI / Custom Screens / Entry Presentation
**Estimated Effort:** Medium
**Dependencies:** TASK-473-02
**Status:** ⏳ To Do

---

## Overview

Wire the record-detail presentation panel to read, save, clear, and reload
per-record overrides through the TASK-473-02 routes, without dirty-state loss and
without exposing builder controls in record mode. Canvas rendering merges
overrides **after** content data is validated, never mutating
`content_entries.data`. This complements TASK-474-03 (inline content-value
editing): values flow through the entry draft path, presentation through the
override client.

## Current State (summary)

- The record editor is `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`;
  TASK-474-03 retires the detached "Value" panel for content editing, so this
  panel is presentation-only.
- Custom Screen cached client + cache keys are the established admin pattern
  (cache key, cached wrapper, invalidation + `cacheBus`).
- The renderer is `ScreenRuntimeRenderer.tsx`; override merge happens at render
  time after content validation.

## Sub-Tasks

- [ ] Add a cached client wrapper for override read/replace (cache key + TTL +
  invalidation + `cacheBus` broadcast).
- [ ] Load overrides separately from entry data; merge after validation for
  canvas rendering.
- [ ] Add presentation controls (allowed targets only) to save/clear/reload
  overrides without dirty-state loss.
- [ ] Keep record mode free of section/block builder controls.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | Presentation panel read/save/clear/reload; merge overrides at render. |
| `core/admin/services/customScreensClient.ts` *(or the existing client module)* | Cached override read/replace wrapper + invalidation. |
| `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` | Apply merged presentation overrides at render (non-destructive). |
| `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx` | Override save/clear/reload + no-dirty-loss + no-builder-controls coverage. |

## Implementation Pseudocode

```tsx
const { data: overrides } = useCachedScreenEntryOverrides(screenId, entryId);
const merged = applyPresentationOverrides(document, overrides); // render-only merge

async function saveOverrides(next) {
  await replaceScreenEntryOverrides(screenId, entryId, next); // PUT (473-02)
  invalidateScreenEntryOverrides(screenId, entryId);          // cacheBus broadcast
}
// record mode renders ScreenRuntimeRenderer mode="entry" with NO add/move/
// duplicate/delete/library controls; presentation panel exposes allowed targets.
```

Data flow:

- Entry content data and presentation overrides load on separate cache keys.
- Override merge is render-only; `content_entries.data` is never mutated.
- Content field values persist via the entry draft path (TASK-474-03); overrides
  persist via the override routes (TASK-473-02).

Error handling:

- Partial save failures preserve local dirty state and show which layer failed
  (entry content vs presentation override).
- Reload re-reads from cache without overwriting unsaved local edits.
- No mount-force refetch loops; follow the shared cache-hydrate + background
  revalidation pattern.

Regression-test shape:

```tsx
test("saving an override does not mutate entry data and survives reload", async () => {
  render(<CustomScreenEntryEditor fixture={recordFixture} />);
  await user.click(screen.getByRole("button", { name: /text size/i }));
  await user.click(screen.getByRole("option", { name: "Small" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(overridesApi.lastPut.overrides[0].propPath).toBe("textSize");
  expect(entriesApi.lastPatch?.values).toBeUndefined(); // no content write for presentation
});
```

## Security Contract

- **Endpoint visibility:** internal admin override routes (TASK-473-02) — no new
  endpoint here.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` to load; `content:write` to save overrides.
- **CSRF expectations:** required for override writes (handled by the route).
- **Rate-limit bucket:** existing admin read/write buckets.
- **Reject unknown validation:** enforced server-side; the UI sends only allowed
  targets/values.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** do not place overrides, credentials, or privileged settings
  in browser cache/localStorage/debug payloads beyond normalized override records.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Live `playwright-cli`: save/clear/reload an override on a record; confirm no
  builder controls in record mode.
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (record presentation panel UX).
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` (new cached override
  resource).

## Acceptance Criteria

1. The record detail panel reads, saves, clears, and reloads overrides without
   dirty-state loss.
2. Override changes never mutate `content_entries.data` (render-only merge).
3. Record mode exposes no section/block builder controls.
4. Cache contract (key/TTL/invalidation/`cacheBus`) is complete; vitest, lint,
   and types are green.
