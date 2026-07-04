# TASK-487-03-L01: Wire the Dead Tags Input in `EntryCreateDrawer`
# FileName: TASK-487-03-L01-Wire-Entry-Create-Tags-Input.md

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

- **Goal:** The Tags `<Input>` at `EntryCreateDrawer.tsx:190` has no
  `value`/`onChange` — typed tags are silently dropped. Bind it to local state
  and persist tags via the existing metadata contract after the entry is
  created.
- **Owning module(s) to create-or-extend:**
  `core/admin/ui/entries/EntryCreateDrawer.tsx` (extend — `useState` block
  `:53-59`, `resetForm` `:64`, `handleSubmit` `:88-109`, the dead input `:190`).
  Reuse `updateEntryMetadata` (`core/admin/services/entriesClient.ts:354`,
  already accepts `tags: string[]`).
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md` (tags/taxonomy),
  `_docs/CONTENT_EDITOR_UX.md`, `_docs/ADMIN_CACHE.md`.
- **Out of scope:** taxonomy term creation, category UI, the editor's existing
  taxonomy panel, backend changes. Free-text tags only (the existing
  `EntryMetadataPayload.tags: string[]` contract).

---

## Security Contract

- **Endpoint visibility:** `internal` — reuses
  `PATCH /content/:type/entries/:id/metadata` (no new endpoint).
- **Auth model:** session (admin) via `updateEntryMetadata` client.
- **RBAC:** `content:write` (server-enforced on the metadata route).
- **CSRF:** the metadata PATCH already sends `{ withCsrf: true }`
  (`entriesClient.ts:366`). No raw fetch added.
- **Rate-limit bucket:** `admin` (server-side).
- **Validation:** server owns it via `contentEntryMetadataSchema`
  (`core/server/validation/contentSchemas.ts`) and `normalizeTags`
  (`entryService.ts:411`). Client only trims/splits.
- **Anti-abuse:** n/a (internal).
- **Secret/PII handling:** none — tags are non-sensitive free text.

---

## Implementation Pseudocode

```tsx
// core/admin/ui/entries/EntryCreateDrawer.tsx
import { createEntry, updateEntryMetadata } from "@/services/entriesClient";

const [tagsInput, setTagsInput] = useState("");
// add to resetForm(): setTagsInput("");

const parseTags = (raw: string) =>
  raw.split(",").map((t) => t.trim()).filter(Boolean);

// in handleSubmit, after createEntry succeeds (:97):
const tags = parseTags(tagsInput);
let entry = created;
if (created && tags.length > 0) {
  const withTags = await updateEntryMetadata(resolvedTypeSlug, created.id, { tags });
  if (withTags) entry = withTags;
}
onCreated?.(entry, resolvedTypeSlug, openAfterCreate);

// bind the input (:190):
<Input
  placeholder="news, release, update"
  className="pl-9"
  value={tagsInput}
  onChange={(event) => setTagsInput(event.target.value)}
/>
```

**Data flow:** create entry → if tags present, PATCH metadata with normalized
tag list → pass the enriched entry to `onCreated`. The metadata client already
patches `entries:detail/list` caches and broadcasts, so the list reflects tags
without extra wiring.

**Error handling:** keep the existing try/catch; a metadata failure after a
successful create should surface the existing error path
(`isApiClientError(err)` → `setError`) and still not leave the drawer in a
broken state. (Entry is created; tags simply did not attach — message reflects
that.)

**Regression-test shape (Vitest ui):**

- Typing `a, b ,` then submitting calls `updateEntryMetadata` with
  `{ tags: ["a", "b"] }`; empty/whitespace tags submit calls only `createEntry`.
- `resetForm` clears the tags input on close.

---

## Testing Requirements

- Lane: **Vitest** (Bun-free UI).
- `tests/vitest/ui/content-entries.test.tsx` (or
  `content-entry-editor.test.tsx`) with mocked `createEntry` /
  `updateEntryMetadata`.
- `bun --cwd core lint`, `bun --cwd core lint:types`.
- No DB schema change → **no migration artifacts**.
