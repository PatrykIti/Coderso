# TASK-517-01-L02: Narrow Server-Only `getEntryAccessPasswordHash` Loader

# FileName: TASK-517-01-L02-Narrow-Access-Password-Hash-Loader.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-01
**Priority:** High
**Category:** Content / Security / DB
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds ONE new exported function `getEntryAccessPasswordHash(entryId)` to
`core/services/content/entryService.ts` that selects ONLY `contentEntries.accessPassword`
(the HASHED value) for a single entry id. This is the ONLY read path that touches the hash;
it is invoked EXCLUSIVELY by the 517-02 unlock-submit endpoint. Introduced in 517-01 (not
517-02) so `entryService.ts` keeps a single writer within 517 and 517-02 imports it
read-only. **NO widening** of `getEntry` / `getEntryBySlug` / `listEntries` — those
projections stay hash-free by design.

## Grounded anchors

- `contentEntries.accessPassword = text("access_password")` (`core/db/schema.ts:793`,
  HASHED, null unless `visibility='password'`). The comment at `schema.ts:791` +
  `entryService.ts:691-693` document that the hash is deliberately omitted from every read
  projection.
- Existing narrow-select precedent in this service: `getEntry` (`:618`) selects a fixed
  column list; `getEntryBySlug` (`:690`) resolves slug→id. Mirror the same
  `db.select({...}).from(contentEntries).where(eq(contentEntries.id, entryId)).limit(1)`
  shape.
- `hashPassword` is already imported here (`entryService.ts:3`, `import { hashPassword }
  from "../auth/password"`), confirming the auth/password module is the write side; the
  verify side lives in 517-02, not here.

## Implementation pseudocode

```ts
// core/services/content/entryService.ts — ADD this exported fn; touch NOTHING else in the
// existing read projections (getEntry/getEntryBySlug/listEntries stay hash-free).

/**
 * SERVER-ONLY, NARROW. Returns the HASHED access_password for a single entry, or null.
 * Used EXCLUSIVELY by the public unlock-submit endpoint (TASK-517-02) to verify a
 * submitted password. NEVER call this from a render/list path — the hash must never enter
 * a projection that maps into rendered HTML.
 */
export async function getEntryAccessPasswordHash(entryId: string): Promise<string | null> {
  if (!entryId) return null;
  const [row] = await db
    .select({ accessPassword: contentEntries.accessPassword })
    .from(contentEntries)
    .where(eq(contentEntries.id, entryId))
    .limit(1);
  return row?.accessPassword ?? null;   // null when no entry OR no password set
}
```

**Design notes.** Returns `null` for a missing entry AND a null hash — the 517-02 endpoint
treats a `null` hash as "cannot unlock" (uniform failure, no existence confirmation). The
function does NOT check `visibility` — that is the endpoint's concern; keeping it a pure
single-column fetch makes it trivially auditable as the sole hash reader.

## Regression-test shape

- **Lane:** Bun `tests/integration/server/entry-access-password-hash.test.ts` (NEW; DB
  round-trip → Bun lane. There is NO `tests/integration/content/` dir; `tests/integration/server/`
  is the existing DB-backed service lane — cf. `contentEntriesLiveMatrix.test.ts` under
  `tests/integration/assistant-live/`).
- Seed one entry with `visibility:'password'` + a hashed `access_password` (via the 514
  create/update service so the hash is produced the real way), one `public` entry with no
  password.
- Assert: `getEntryAccessPasswordHash(passwordEntry.id)` returns a NON-null string that is
  NOT the plaintext (starts with the argon2 `$argon2id$` prefix); `getEntryAccessPasswordHash(publicEntry.id)`
  returns `null`; `getEntryAccessPasswordHash("does-not-exist")` returns `null`;
  `getEntryAccessPasswordHash("")` returns `null`.
- **Grep-guard test** (cheap regression against accidental widening): assert that the
  `getEntry`/`getEntryBySlug` results do NOT carry an `accessPassword` key (the render
  projections stay hash-free) — read a seeded password entry through `getEntry` and assert
  `("accessPassword" in result) === false`.
- **Shared-DB safety:** unique slugs per test, per-test teardown of seeded rows, no
  cross-suite row-count coupling.

## Hard Invariants

1. Selects ONLY `contentEntries.accessPassword`; returns `string | null`.
2. `getEntry`/`getEntryBySlug`/`listEntries` projections UNCHANGED — no hash widening.
3. Server-only; the sole hash reader; consumed only by the 517-02 unlock endpoint.
4. Returns `null` (never throws) for missing entry / empty id / null hash.
