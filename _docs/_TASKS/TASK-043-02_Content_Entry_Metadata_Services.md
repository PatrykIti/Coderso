# TASK-043-02: Content Entry Metadata Services
# FileName: TASK-043-02_Content_Entry_Metadata_Services.md

**Priority:** High  
**Category:** Content / Services  
**Estimated Effort:** Medium  
**Dependencies:** TASK-043-01  
**Status:** Done (2026-01-31)

---

## Overview

Extend entry services to expose full metadata (tags, scheduling, author) and sync SEO data for entries via `seo_documents`.

---

## Data & Type Contracts

### EntryStatus
Update the union everywhere in the services layer:

```ts
export type EntryStatus = "draft" | "published" | "scheduled" | "archived";
```

### EntryDetail (service return)

```ts
export type EntrySeo = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type EntryDetail = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: EntryStatus;
  data: Record<string, unknown>;
  tags: string[];
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; email: string } | null;
  seo: EntrySeo | null;
};
```

---

## Service Behavior

### getEntry()
Must return metadata + author + SEO:
- Join `users` on `author_id`.
- Load SEO via `getSeoDocumentByTarget("entry", entry.id)` (or direct query).
- Return `tags` + `scheduledAt`.

### listEntries()
Include:
- `tags`, `scheduledAt`, `author`
- SEO is optional here (do **not** load by default to avoid extra DB reads).

### updateEntryMetadata(entryId, input, actorId?)
**Core responsibilities:**
- Normalize tags (trim, dedupe, strip empty).
- Apply status change with correct side effects:
  - `published` → call `publishEntry(entryId, actorId)`  
    (must create revision + set `publishedAt`)
  - `draft` → call `unpublishEntry(entryId)`  
    (clears `publishedAt`)
  - `scheduled` → update status + `scheduledAt` (no auto publish)
  - `archived` → update status, clear `scheduledAt`
- Update `tags` and `scheduledAt` in `content_entries`.
- Upsert SEO in `seo_documents` for `targetType="entry"`.
- Return updated `EntryDetail` (including SEO).

### SEO sync on title/slug changes
When `updateEntry()` modifies `title` or `slug`, ensure the SEO document stays aligned:
- Call `upsertSeoDocument({ targetType: "entry", targetId, title, slug })`

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/content/entryService.ts` | extend `EntryStatus` | include scheduled/archived |
| `core/services/content/entryService.ts` | update `listEntries()` | include tags + scheduledAt + author |
| `core/services/content/entryService.ts` | update `getEntry()` | join users + seo + tags |
| `core/services/content/entryService.ts` | add `updateEntryMetadata()` | see behavior above |
| `core/services/seo/seoService.ts` | reuse `upsertSeoDocument()` | no new files |

---

## Example: updateEntryMetadata (pseudo)

```ts
export async function updateEntryMetadata(
  entryId: string,
  input: EntryMetadataInput,
  actorId?: string
) {
  const tags = normalizeTags(input.tags);

  if (input.status === "published") {
    if (!actorId) throw new Error("auth_required");
    await publishEntry(entryId, actorId);
  } else if (input.status === "draft") {
    await unpublishEntry(entryId);
  } else if (input.status) {
    await db.update(contentEntries).set({
      status: input.status,
      scheduledAt: input.status === "scheduled" ? input.scheduledAt ?? null : null,
      updatedAt: new Date(),
    }).where(eq(contentEntries.id, entryId));
  }

  if (tags || input.scheduledAt || input.tags) {
    await db.update(contentEntries).set({
      tags: tags ?? sql`tags`,
      scheduledAt: input.scheduledAt ?? sql`scheduled_at`,
      updatedAt: new Date(),
    }).where(eq(contentEntries.id, entryId));
  }

  if (input.seo) {
    await upsertSeoDocument({
      targetType: "entry",
      targetId: entryId,
      ...input.seo,
    });
  }

  return getEntry(entryId);
}
```

---

## Validation Rules (Service Layer)

- `status` must be one of: `draft`, `published`, `scheduled`, `archived`.
- If `scheduled`, `scheduledAt` is required and must be valid.
- `tags`: max 20 tags, max length 24 chars each.

---

## Testing Requirements

- `tests/unit/content/entryService.test.ts`
  - metadata update stores tags + scheduledAt
  - SEO upsert creates/updates `seo_documents`
  - invalid status and missing `scheduledAt` rejected

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-metadata-services.md`
