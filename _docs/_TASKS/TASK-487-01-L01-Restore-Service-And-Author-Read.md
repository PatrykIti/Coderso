# TASK-487-01-L01: `restoreEntryRevision` Service + Author-Joined Revision Read
# FileName: TASK-487-01-L01-Restore-Service-And-Author-Read.md

**Parent Subtask:** TASK-487-01
**Priority:** Medium
**Category:** Engine / Entries
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Add a `restoreEntryRevision(entryId, revisionId, actorId?)` service
  that restores an entry's `data` from a stored revision, plus upgrade the
  unused `listEntryRevisions` read helper into a typed, author-joined,
  PII-redacted shape suitable for the route response and admin client.
- **Owning module(s) to create-or-extend:**
  `core/services/content/entryReadService.ts` (upgrade the EXISTING
  `listEntryRevisions` at `:196` — it already lives HERE, NOT in
  entryService.ts; audit H1 fix) + `core/services/content/entryService.ts`
  (re-export `listEntryRevisions` — it already imports `:31` and re-exports
  `:53` the read helper, so the leaf upgrades the read module and re-exports,
  NEVER redeclares the symbol; `createEntryRevisionTx` `:768`, `publishEntry`
  `:492`).
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md` (revisions for
  entries, `:9`), `_docs/CMS_API.md` (revision contract reference, posts at
  `:791`), `_docs/SECURITY_SPEC.md` (PII redaction seams).
- **Reference implementation to mirror:**
  `core/services/content/postsService.ts` — `listPostRevisionsInternal`
  (`:426`, author join + `resolveEmailValue`) and `restorePostRevision`
  (`:973`, snapshot-equality + snapshot-current-then-restore).
- **Out of scope:** routes (TASK-487-01-L02), client/UI (TASK-487-02), autosave
  revisions, revision deletion. No DB schema change.

---

## Security Contract

- **Endpoint visibility:** n/a (service module; routes added in L02). No
  `Bun.serve` surface here.
- **Auth model:** n/a at service layer; the route enforces session auth. Service
  takes an optional `actorId` only to attribute the "current snapshot before
  restore" revision (same as `restorePostRevision`).
- **RBAC:** enforced at the route in L02 (`content:read` for list,
  `content:write` for restore). Not duplicated in the service.
- **CSRF:** n/a at service layer (handled globally by `enforceCsrf`,
  `core/server/httpServer.ts:358`, for internal writes).
- **Rate-limit bucket:** n/a (service); inherited `admin` bucket at the route.
- **Validation:** restore re-runs `validateEntryData` through `updateEntry`
  (`entryService.ts:789`). Reject-unknown is owned by the existing entry data
  schema; this leaf adds no new external input fields.
- **Anti-abuse:** n/a (internal-only path; no public write).
- **Secret/PII handling:** revision `createdBy` is a user id. The read shape
  must `leftJoin(users)` and resolve email through
  `resolveEmailValue` (`core/services/security/piiEmail.ts:118`). **Never** emit
  raw `users.email` or `users.emailEncrypted` to the returned shape (which feeds
  the admin client cache). Mirror the redaction in `postsService.ts:455-459`.

---

## Implementation Pseudocode

```ts
// core/services/content/entryReadService.ts  (upgrade; entryService.ts
// re-exports the upgraded symbol — see H1 fix above)

// 1) Typed, author-joined, PII-safe read shape (replaces the raw-row helper).
//    Existing callers only read `.length`, so the array contract is preserved.
export type EntryRevisionAuthor = { id: string; name: string | null; email: string };
export type EntryRevision = {
  id: string;
  entryId: string;
  version: number;
  data: EntryData;
  createdAt: Date;
  createdBy: EntryRevisionAuthor | null;
};

export async function listEntryRevisions(entryId: string): Promise<EntryRevision[]> {
  const rows = await db
    .select({
      id: contentRevisions.id,
      entryId: contentRevisions.entryId,
      version: contentRevisions.version,
      data: contentRevisions.data,
      createdAt: contentRevisions.createdAt,
      createdById: users.id,
      createdByName: users.name,
      createdByEmail: users.email,
      createdByEmailEncrypted: users.emailEncrypted,
    })
    .from(contentRevisions)
    .leftJoin(users, eq(contentRevisions.createdBy, users.id))
    .where(eq(contentRevisions.entryId, entryId))
    .orderBy(desc(contentRevisions.version));

  return rows.map((row) => ({
    id: row.id,
    entryId: row.entryId,
    version: row.version,
    data: row.data as EntryData,
    createdAt: row.createdAt,
    createdBy:
      row.createdById && (row.createdByEmail || row.createdByEmailEncrypted)
        ? {
            id: row.createdById,
            name: row.createdByName ?? null,
            email:
              resolveEmailValue({
                emailEncrypted: row.createdByEmailEncrypted,
                email: row.createdByEmail,
              }) ?? "",
          }
        : null,
  }));
}

// 2) Restore service — mirrors restorePostRevision (postsService.ts:973).
export async function restoreEntryRevision(
  entryId: string,
  revisionId: string,
  actorId?: string | null
) {
  const entry = await getEntry(entryId);
  if (!entry) throw new Error("entry_not_found");

  const revisions = await listEntryRevisions(entryId);
  const revision = revisions.find((item) => item.id === revisionId);
  if (!revision) throw new Error("entry_revision_not_found");

  const currentData = entry.data as EntryData;
  const targetData = revision.data;

  // No-op when current data already equals the snapshot (stable JSON compare).
  // Reuse the shared helper restorePostRevision uses (postsService.ts:988).
  if (areRevisionSnapshotsEqual(currentData, targetData)) {
    return { restored: false, revision, entry };
  }

  // Snapshot current state before overwrite so restore is itself reversible.
  if (actorId) {
    await createEntryRevision(entryId, currentData, actorId);
  }

  // updateEntry re-runs validateEntryData against the CURRENT content-type
  // schema. If the old snapshot no longer matches, this throws
  // ContentValidationError -> mapped to a clean 400 by the route (L02).
  const updated = await updateEntry(entryId, { data: targetData });
  if (!updated) throw new Error("entry_not_found");

  return { restored: true, revision, entry: updated };
}
```

**Data flow:** route (L02) resolves type + entry guard → calls
`listEntryRevisions` / `restoreEntryRevision` → service reads/writes
`content_revisions` + `content_entries` via the owning module → returns typed,
PII-safe shape. Routes stay orchestration-only.

**Error handling:** raise machine-readable domain errors
(`entry_not_found`, `entry_revision_not_found`); restore validation failures
surface as the existing `ContentValidationError` from `validateEntryData`. All
mapped at the route boundary in L02 (`mapContentEntryError`). No transport
errors thrown in the service.

**Helpers:** reuse the existing `areRevisionSnapshotsEqual` (stable-key JSON
compare) from `core/services/content/revisionSnapshot.ts:25` — the same helper
`restorePostRevision` uses (`postsService.ts:988`); do **not** reinvent a
per-entry snapshot comparator. Add `import { areRevisionSnapshotsEqual } from
"./revisionSnapshot";` (not yet imported in `entryService.ts`; mirror
`postsService.ts:15`). `resolveEmailValue`, `desc`, `max`, `users`,
`contentRevisions` are already imported in this module (verify the `users`
import — add if missing).

**Regression-test shape:**

- DB-backed (Bun): publish an entry twice → `listEntryRevisions` returns 2 rows,
  descending `version`, `createdBy` populated with a non-empty resolved email and
  no `emailEncrypted` leak.
- DB-backed (Bun): restore an earlier revision → `restored: true`,
  `content_entries.data` equals snapshot, and a new "pre-restore" revision is
  written when `actorId` is passed; restoring the already-current snapshot
  returns `restored: false` with no new revision.
- DB-backed (Bun): unknown `revisionId` → throws `entry_revision_not_found`.

---

## Testing Requirements

- Lane: **Bun** (module imports `db` from `db/client` → not Bun-free).
- Extend `tests/unit/content/entryService.test.ts` (DB-backed, already exercises
  `listEntryRevisions` at `:113`) with the restore + author-shape cases above.
  Keep fixtures uniquely scoped and clean up only owned rows (the existing test
  already deletes its `content_revisions` rows in `finally`).
- `set -a && source .env && set +a` before running.
- `bun --cwd core lint`, `bun --cwd core lint:types`.
- No DB schema change → **no migration artifacts**.
