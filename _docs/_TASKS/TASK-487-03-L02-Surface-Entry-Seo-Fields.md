# TASK-487-03-L02: Surface SEO `title` / `canonicalUrl` / `robots` in Entry Metadata Panel
# FileName: TASK-487-03-L02-Surface-Entry-Seo-Fields.md

**Parent Subtask:** TASK-487-03
**Priority:** Medium
**Category:** Engine / Entries
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** The entry metadata save already persists SEO `title`,
  `canonicalUrl`, and `robots` end-to-end, but the panel only surfaces
  `description`. Surface the three missing fields so editors can set them.
- **Owning module(s) to create-or-extend:**
  `core/admin/ui/entries/EntryMetadataPanel.tsx` (extend — props at `:73-82`,
  SEO section around `:397-407` currently exposes only `seoDescription`),
  `core/admin/ui/entries/EntryEditor.tsx` (extend — SEO state `:140`, save
  payload `handleSaveMetadata` `:568` currently sends only
  `seo: { description }`).
- **Backend is already complete:** `updateEntryMetadata`
  (`entryService.ts:947-957`) forwards `title`, `description`, `canonicalUrl`,
  `robots` to `upsertSeoDocument`; the client type `EntrySeo`
  (`entriesClient.ts:56`) already includes all four; the route schema
  `contentEntryMetadataSchema` already accepts them (`contentEntryRoutes.ts:250`).
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`
  (metadata endpoint `:2487`), `_docs/SEARCH_SPEC.md`/SEO docs.
- **Out of scope:** SEO preview/snippet redesign, sitemap/robots policy changes,
  any backend/schema change (none needed). Keep `description` working as-is.

---

## Security Contract

- **Endpoint visibility:** `internal` — reuses
  `PATCH /content/:type/entries/:id/metadata` (no new endpoint).
- **Auth model:** session (admin) via `updateEntryMetadata`.
- **RBAC:** `content:write` (server-enforced).
- **CSRF:** the metadata PATCH already sends `{ withCsrf: true }`
  (`entriesClient.ts:366`).
- **Rate-limit bucket:** `admin` (server-side).
- **Validation:** server owns `contentEntryMetadataSchema` (reject-unknown);
  `canonicalUrl`/`robots` are normalized via `upsertSeoDocument` and
  `normalizeSeoSlug` in the service. Client adds only trimming.
- **Anti-abuse:** n/a (internal).
- **Secret/PII handling:** none — SEO fields are public-facing content, not
  secrets.

---

## Implementation Pseudocode

```tsx
// core/admin/ui/entries/EntryMetadataPanel.tsx — extend props + render
type EntryMetadataPanelProps = {
  // ...existing...
  seoTitle: string;
  onSeoTitleChange: (value: string) => void;
  seoCanonicalUrl: string;
  onSeoCanonicalUrlChange: (value: string) => void;
  seoRobots: string;
  onSeoRobotsChange: (value: string) => void;
};
// In the SEO section (near the existing description textarea :406), add an
// Input for Title, an Input for Canonical URL, and a select/Input for Robots
// (e.g. index,follow / noindex,nofollow). Mirror the existing description
// control styling.

// core/admin/ui/entries/EntryEditor.tsx — state + hydrate + save
const [seoTitle, setSeoTitle] = useState("");
const [seoCanonicalUrl, setSeoCanonicalUrl] = useState("");
const [seoRobots, setSeoRobots] = useState("");

// hydrate alongside seoDescription (:182, :448):
setSeoTitle(entryResult.seo?.title ?? "");
setSeoCanonicalUrl(entryResult.seo?.canonicalUrl ?? "");
setSeoRobots(entryResult.seo?.robots ?? "");

// in handleSaveMetadata (:568) expand the seo payload:
seo: {
  title: seoTitle || undefined,
  description: seoDescription,
  canonicalUrl: seoCanonicalUrl || undefined,
  robots: seoRobots || undefined,
},

// re-sync from the saved entry (:573) for all four fields.
// Pass the new props to BOTH EntryMetadataPanel usages (:925 desktop, :958 sheet).
```

**Data flow:** hydrate four SEO fields from `entry.seo` → edit in panel → save
sends the full `seo` object through `updateEntryMetadata` →
`upsertSeoDocument` persists → re-sync state from the returned entry. No cache or
endpoint changes (the metadata client already patches entry caches).

**Effect/lint discipline:** hydrate via the existing detail-load path (no new
mount-force effect); derive `previewUrl` as today. Avoid synchronous `setState`
in effects (AGENTS React-hooks rule).

**Error handling:** unchanged — reuse the existing metadata save error path.

**Regression-test shape (Vitest ui):**

- Editing Title/Canonical/Robots and saving calls `updateEntryMetadata` with a
  `seo` object containing all four fields.
- Loading an entry hydrates the three new fields from `entry.seo`.
- Both panel placements (desktop aside + mobile sheet) receive the new props.

---

## Testing Requirements

- Lane: **Vitest** (Bun-free UI).
- `tests/vitest/ui/content-entry-editor.test.tsx` with mocked
  `updateEntryMetadata` / entry detail.
- `bun --cwd core lint`, `bun --cwd core lint:types`.
- No DB schema change → **no migration artifacts**.
