# TASK-479-11-L01: Media Library Restyle
# FileName: TASK-479-11-L01-Media-Library-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Media
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-11
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Restyle the real Media Library to match the prototype. Port the prototype's
layout — a left **folder nav rail**, a **storage usage** Progress card, a
grid-first **FilterBar**, the soft **media card grid**, and a polished
**details drawer** — onto the existing `MediaLibraryPage.tsx` and its child
components, preserving every behavior (upload, cache, selection, usage, dimension
recovery, settings drawer).

- **Goal:** A Notion-like, violet-accented Media screen: warm canvas, white
  `rounded-2xl` cards, soft shadows, a folder rail that switches the existing
  `filter` state, a real storage-usage card, and a comfortable responsive grid —
  with zero behavior changes.
- **Owning module/service:** `core/admin/ui/media/MediaLibraryPage.tsx` (+
  `MediaCard.tsx`, `MediaGrid.tsx`, `MediaToolbar.tsx`,
  `MediaDetailsDrawer.tsx`), reusing `core/admin/ui/shared/PageHeader.tsx`,
  `core/admin/components/ui/{card,badge,button,progress,checkbox}.tsx`.
- **Source-of-truth docs:** `_docs/MEDIA_SPEC.md` (Admin UI behavior v1),
  `_docs/DESIGN_TOKENS.md`. **Ports from:**
  `_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx`,
  `_docs/_PROTOTYPE/src/components/patterns/FilterBar.tsx`,
  `_docs/_PROTOTYPE/src/components/patterns/SectionCard.tsx`,
  tokens in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No change to `mediaClient`, `cachePolicy`, `cacheBus`,
  `settingsClient`, `userSettingsClient`, upload/replace/delete/usage/dimension
  logic, or `MediaSettingsDrawer` behavior. No new endpoints. No editor preview.
  Do NOT introduce a real "folders" backend — folder counts are derived from the
  already-loaded `items` (see pseudocode).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Reads stay on `listMediaCached`
(`media:read`); mutations stay on the existing `mediaClient` calls
(`media:write`, admin CSRF). No new fields enter client cache, logs, or debug
payloads; signed/asset URLs are rendered exactly as today (no new persistence).

---

## Implementation Pseudocode

Concrete shapes — port the prototype's visual structure but bind it to the REAL
state already in `MediaLibraryPage.tsx`. **Keep all existing hooks, effects,
handlers, and the cache-hydrate + background-revalidation flow untouched**; only
the returned JSX and the child-component class names change.

### 1) Page layout (`MediaLibraryPage.tsx` — JSX only)

```tsx
// Real state stays: items, filteredItems, selectedId/Ids, view, isLoading, etc.
// PORT layout from prototype pages/media/MediaLibraryPage.tsx:
//   PageHeader -> storage SectionCard -> [folder rail | (FilterBar + grid)].

// Derive folder counts from REAL loaded items (NO new API). Pure, render-time.
const folderDefs = [
  { key: "all",      label: "All files", icon: HardDrive },
  { key: "image",    label: "Images",    icon: ImageIcon },
  { key: "video",    label: "Videos",    icon: Video },
  { key: "document", label: "Documents", icon: FileText },
  { key: "audio",    label: "Audio",     icon: Music },
] as const;
// Derivation must be useMemo (no setState-in-effect; obey react-hooks rules):
const folderCounts = useMemo(() => {
  const counts: Record<string, number> = { all: items.length };
  for (const it of items) counts[it.type] = (counts[it.type] ?? 0) + 1;
  return counts;
}, [items]);

// Folder click reuses the EXISTING filter state (MediaFilter union).
// NOTE: MediaFilter today is "all" | "image" | "document" | "audio". If the
// "video" folder is shown, either (a) extend MediaFilter to include "video"
// (types.ts already has MediaKind "video") OR (b) only render folders whose key
// is a valid MediaFilter. Pick ONE and keep MediaToolbar's filter union in sync.
<button onClick={() => setFilter(folder.key)} aria-pressed={filter === folder.key}
  className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm",
    filter === folder.key
      ? "bg-primary/10 font-medium text-primary"        // violet active pill
      : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
  <span className="flex items-center gap-2.5"><folder.icon className="size-4" />{folder.label}</span>
  <span className="text-xs tabular-nums">{folderCounts[folder.key] ?? 0}</span>
</button>
```

### 2) Storage usage card (real or honestly-presentational)

```tsx
// Prefer a real number if available cheaply. The page already calls
// getStorageSettings() in loadMediaSettings(); if storage usage/quota is NOT in
// that payload, do NOT fabricate a backend call here. Derive a best-effort
// "used" from sum(item.sizeBytes) of loaded items and render WITHOUT a fake
// quota/percentage, OR render the card as a neutral summary ("N assets ·
// formatBytes(totalBytes)") using the existing Progress primitive only when a
// real quota exists. Never show a made-up "6.2 GB of 10 GB".
const totalBytes = useMemo(() => items.reduce((n, it) => n + (it.sizeBytes ?? 0), 0), [items]);
// Card chrome ports from prototype SectionCard (rounded-2xl, soft shadow):
<Card className="rounded-2xl shadow-soft">
  <CardContent>
    <header> <HardDrive/> Storage  —  "{items.length} assets · {formatBytes(totalBytes)}" </header>
    {quota ? <Progress value={pct} className="h-2.5" /> : null}   // core/admin/components/ui/progress.tsx
  </CardContent>
</Card>
```

### 3) FilterBar / toolbar (`MediaToolbar.tsx`)

```tsx
// KEEP the real controlled props (search/filter/view/onChange...). Restyle to
// the prototype FilterBar look: search input with leading icon, segmented
// grid/list view switch in a rounded-xl bordered pill (bg-card, shadow-soft),
// violet active state. The folder rail now owns the filter pills, so the inline
// "All Files / Images / ..." buttons can move into the rail; if MediaToolbar
// keeps them for narrow screens, style them as the prototype's soft chips.
// Do NOT remove the openAfterUpload checkbox wiring.
```

### 4) Media card grid (`MediaCard.tsx` + `MediaGrid.tsx`)

```tsx
// MediaGrid: comfortable responsive grid per prototype:
//   "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
// MediaCard (grid variant): wrap in <Card className="rounded-2xl overflow-hidden
//   p-2 transition-all hover:-translate-y-0.5 hover:shadow-card">; keep the real
//   <img> preview (lazy load, onLoad/onError skeleton), the "Missing alt"
//   accessibility badge (MEDIA_SPEC requires it), the selection Checkbox in
//   selectionMode, and the type Badge. Use type-tone classes mapped from
//   item.type (image=violet/primary-soft, video=info, document=warning,
//   audio=success) like prototype KINDS[].tone. PRESERVE displayName precedence
//   (title -> originalName -> storage name) via resolveMediaDisplayName.
```

### 5) Details drawer (`MediaDetailsDrawer.tsx`)

```tsx
// Restyle the existing drawer chrome to soft cards / rounded-2xl panels and
// violet primary actions. DO NOT touch: metadata autosave (saving/saved/failed),
// Copy URL result state, replace-asset-without-ID-change, usage links list,
// dimension recovery messaging. Every onSave/onCopy/onReplace/onDelete prop and
// its async-result UI stays identical — only spacing, radii, shadow, and accent.
```

**Data flow:** unchanged. `listMediaCached` hydrate (lazy `useMemo` initial
cache) → `items` → `filteredItems` (search+filter) → grid; `cacheBus`
subscription drives background revalidation; folder rail and storage card are
pure render-time derivations of `items` (no new fetch, no setState-in-effect).

**Error handling:** unchanged — keep the existing `Alert` blocks for `error` /
`actionMessage`, the dashed empty/loading panels, and the drawer's per-action
states. The restyle must not swallow or relocate any error surface.

**React-hooks / cache rules to honor (call out in PR):** folder counts and
`totalBytes` are `useMemo` derivations (no sync setState in effects); no
mount-force refetch added; no dirty-state overwrite of in-flight edits; nav stays
on `AdminShell` + shared helpers — do not hand-build any href.

**Regression-test shape (delivered in L02):** grid renders one card per item with
display-name precedence + missing-alt badge; folder rail click updates `filter`
and re-filters; storage card shows derived asset count/size; details drawer opens
on card select and preserves autosave/copy/replace affordances.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-card.test.tsx tests/vitest/mediaUi/mediaLibrary.test.tsx tests/vitest/ui-integration/media.test.tsx`
- The new restyle suite from L02 (`tests/vitest/ui-integration/media-restyle.test.tsx`).
- Manual: light + dark toggle on `/admin/media`; confirm grid/list switch, folder
  rail filtering, selection, upload, and the details drawer all behave as before.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-11-L01`.
- `_docs/MEDIA_SPEC.md` "Admin UI behavior (v1)" — only if a user-visible label
  changes (e.g. folder rail labels); document no behavior change.
