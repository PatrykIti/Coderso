# TASK-551-03-L01: Shared Keyset Cursor and Bounded Read Contracts
# FileName: TASK-551-03-L01-Shared-Keyset-Cursor-And-Bounded-Read-Contracts.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-03
**Priority:** Critical
**Category:** Database / Performance / Domain / Runtime Adapter
**Estimated Effort:** Medium
**Dependencies:** TASK-551-01-L02, TASK-551-02-L02, TASK-551-05-L02
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create Bun-free, schema-first primitives for strict bounded reads and opaque,
tamper-evident keyset cursors, plus one narrow server lifecycle adapter that
loads and holds the immutable production keyring before traffic. The pure
contract supports ascending/descending tuples, nullable sort fields, stable
unique tie-breakers, and limit-plus-one page detection without exposing raw
database values as mutable API state.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `core/services/database/keysetCursor.ts`,
`core/services/database/boundedReadContract.ts`,
`core/server/paginationCursorLifecycle.ts`,
`tests/vitest/database/keysetCursor.test.ts`, and
`tests/vitest/database/boundedReadContract.test.ts`, and
`tests/integration/runtime/paginationCursorLifecycle.test.ts` only.

**Forbidden:** all routes/services outside the allowlist, including
`core/server/routes/index.ts` (L02 owner); DB client/schema and migrations;
TASK-511 backup files; TASK-517 entry/public-site files; TASK-493 SEO/GSC files;
TASK-518 files; task/changelog/workflow files.

## Implementation Pseudocode

```ts
type PageLimit = Brand<number, "PageLimit">;
type CursorField =
  | StrictReadonly<{ name: string; type: "text"; value: string }>
  | StrictReadonly<{ name: string; type: "uuid"; value: string }>
  | StrictReadonly<{ name: string; type: "timestamp"; value: string }>
  | StrictReadonly<{ name: string; type: "integer"; value: string }>
  | StrictReadonly<{ name: string; type: "boolean"; value: boolean }>
  | StrictReadonly<{ name: string; type: "null" }>;
type CursorPayload = StrictReadonly<{
  formatVersion: 1;
  keyVersion: number;
  issuedAtUnixSeconds: number;
  scope: string;
  direction: "next" | "previous";
  fields: readonly CursorField[];
}>;

type KeysetFieldSpec = StrictReadonly<{
  name: string;
  type: Exclude<CursorField["type"], "null">;
  column: SqlFragment; // code-owned identifier fragment, never cursor/request text
  order: "asc" | "desc";
  nulls: "first" | "last";
  nullable: boolean;
}>;
type KeysetSpec = StrictReadonly<{
  scope: string;
  fields: readonly [...KeysetFieldSpec[], KeysetFieldSpec];
}>;

export type PaginationCursorKeyring = StrictReadonly<{
  current: { version: number; secret: Uint8Array };
  previous?: { version: number; secret: Uint8Array };
  retired: readonly { version: number; secret: Uint8Array }[];
}>;

function parsePageLimit(value: unknown, options = { default: 50, max: 100 }): PageLimit {
  // Reject non-integer, negative, zero, overflow, and unknown option fields.
}

export function loadPaginationCursorKeyring(env: NodeJS.ProcessEnv): PaginationCursorKeyring {
  // PAGINATION_CURSOR_SECRET is required and must encode to at least 32 bytes.
  // PAGINATION_CURSOR_KEY_VERSION defaults to 1 and is an integer in 1..2^31-1.
  // PAGINATION_CURSOR_PREVIOUS_SECRET and PAGINATION_CURSOR_PREVIOUS_KEY_VERSION
  // are optional as a pair; the previous version must be lower and distinct.
  // PAGINATION_CURSOR_RETIRED_KEYS is an optional strict JSON tuple of <=16
  // older {version,secret} pairs, excluding current/previous. Reject missing,
  // weak, partial, duplicate-version, or malformed configuration.
}

function encodeKeysetCursor(input: CursorEncodeInput, spec: KeysetSpec,
  keys: PaginationCursorKeyring): string {
  // Normalize typed fields against spec, create canonical payload, then emit
  // unpaddedBase64url(payloadJson) + "." + unpaddedBase64url(HMAC-SHA-256).
  // MAC input is the ASCII payload token. Never serialize credentials.
}

function decodeKeysetCursor(input: string, spec: KeysetSpec,
  keys: PaginationCursorKeyring): CursorPayload {
  // After bounded token/base64 decoding, compute HMAC for every bounded current,
  // previous, and retired secret without interpreting payload JSON. Constant-time
  // compare every candidate, require exactly one matching secret, then strict-parse
  // the exact wire schema and require payload.keyVersion to equal that matched key's
  // declared version plus exact field name/type/order equality with the spec.
}

export function classifyPaginationCursorFailure(error: unknown):
  "expired_or_retired" | "invalid" {
  // Return the terminal class only for the internal 24-hour expiry code or a
  // retired key whose MAC and payload were verified with its retained secret.
  // Never return a version/key ID or parse detail.
}

function buildKeysetPredicate(spec: KeysetSpec, cursor: CursorPayload): SqlFragment {
  // Build a lexicographic OR-of-prefixes from code-owned column fragments using
  // the normative comparator table below. Never interpolate a payload name.
}

// core/server/paginationCursorLifecycle.ts: the only runtime adapter.
let registered = false;
let activeKeyring: PaginationCursorKeyring | null = null;

export function registerPaginationCursorLifecycleParticipant(): void {
  if (registered) return;
  registered = true;
  registerRuntimeLifecycleParticipant({
    id: "pagination-cursor-keyring",
    phase: "database",
    start: async () => {
      // This is the sole production env read and occurs during awaited start,
      // never at module evaluation or inside a request/read service.
      activeKeyring = loadPaginationCursorKeyring(process.env);
    },
    close: async () => { activeKeyring = null; },
  });
}

export function requirePaginationCursorKeyring(): PaginationCursorKeyring {
  if (!activeKeyring) throw new Error("pagination_cursor_keyring_unavailable");
  return activeKeyring;
}
```

## Exact Cursor Wire and SQL Contract

The cursor is exactly `<payload-base64url>.<mac-base64url>`, with no padding,
whitespace, alternate alphabet, or third segment. The decoded canonical JSON has
only `formatVersion,keyVersion,issuedAtUnixSeconds,scope,direction,fields` in
that serialization order. It is at most 1,024 UTF-8 bytes; the complete encoded
cursor is at most 2,048 ASCII bytes. `keyVersion` is an integer `1..2^31-1`,
`issuedAtUnixSeconds` is a non-negative safe integer, scope is NFC-normalized
UTF-8 `1..512` bytes, and there are `1..5` fields including the final tie-breaker.
Objects reject duplicate JSON keys and unknown keys; fields reject duplicate
names. A field name is an ASCII identifier matching
`[a-z][a-z0-9_]{0,63}`.

Scalar wire forms are exact:

- `text` is NFC-normalized UTF-8 of at most 512 bytes, with no NUL/control
  character; normalization that changes the supplied wire value is rejected;
- `uuid` is lowercase canonical `8-4-4-4-12` hex;
- `timestamp` is UTC millisecond ISO-8601 exactly
  `YYYY-MM-DDTHH:mm:ss.sssZ`; invalid dates or alternate offsets/precision fail;
- `integer` is an int64 encoded as canonical signed decimal text (`0`, or
  optional `-` followed by a non-zero digit and digits), with no `+`, leading
  zero, exponent, whitespace, or JSON-number precision loss;
- `boolean` is a JSON boolean; `null` has exactly `name,type` and is legal only
  when the matching spec is nullable. Non-null fields have exactly
  `name,type,value`.

`KeysetSpec` is a code-owned closed allowlist: every field binds a preconstructed
SQL identifier fragment plus scalar type, order, null placement, and nullability.
It rejects unknown spec keys, duplicate names/columns, more than five fields, or
a final field other than exactly `{name:"id",type:"uuid",nullable:false}`. The
payload must match spec field count, name, non-null type, and order byte-for-byte;
the payload never chooses a SQL column, order, or null placement. Scope equality
is constant-time over the canonical UTF-8 bytes after the MAC succeeds.

For one field `c` and cursor value `v`, the strict comparison used at the first
non-equal tuple position is frozen below. Prefix equality is always
`c IS NOT DISTINCT FROM v`. `after` means the logical next-page relation;
`before` means previous-page relation.

| SQL order | Cursor value | `after` predicate | `before` predicate |
|---|---|---|---|
| `ASC NULLS LAST` | non-null | `c > v OR c IS NULL` | `c < v` |
| `ASC NULLS LAST` | null | `FALSE` | `c IS NOT NULL` |
| `DESC NULLS LAST` | non-null | `c < v OR c IS NULL` | `c > v` |
| `DESC NULLS LAST` | null | `FALSE` | `c IS NOT NULL` |
| `ASC NULLS FIRST` | null | `c IS NOT NULL` | `FALSE` |
| `ASC NULLS FIRST` | non-null | `c > v` | `c < v OR c IS NULL` |
| `DESC NULLS FIRST` | null | `c IS NOT NULL` | `FALSE` |
| `DESC NULLS FIRST` | non-null | `c < v` | `c > v OR c IS NULL` |

For each tuple position, the builder ORs `prefix equality AND strict comparison`;
the final UUID `id` makes the relation unique. `direction:"next"` selects
`after` and retains the declared `ORDER BY`. `direction:"previous"` selects
`before`, reverses every SQL direction and null placement for the bounded
`LIMIT + 1` fetch, and reverses fetched rows in memory before envelope encoding;
it does not use `OFFSET`. The encoder derives fields only from the boundary row:
last returned row for `next`, first returned row for `previous`.

`toBoundedPage(rows, limit, encode)` accepts at most `limit + 1` rows and emits
`items`, `nextCursor`, and `hasMore`. Errors are machine-readable:
`page_limit_invalid`, `cursor_invalid`, `cursor_schema_invalid`,
`cursor_value_invalid`, `cursor_spec_mismatch`, `cursor_scope_mismatch`,
`cursor_version_unsupported`, `cursor_expired`, `cursor_key_retired`, and lifecycle-only
`pagination_cursor_keyring_unavailable`.
Route boundaries map schema/value/spec/version/signature/age failures to the same
generic `cursor_invalid` response and never expose the cursor, field value, MAC,
spec, SQL fragment, or parse offset; internal exact codes remain testable.

That generic mapping is the default, not loss of internal terminal semantics.
`PaginationCursorKeyring` also carries an immutable, deduplicated, ascending
`retired` tuple of at most 16 `{version,secret}` pairs whose versions are lower
than current and different from previous and whose decoded secrets are at least
32 bytes. The loader reads optional strict reject-unknown JSON
`PAGINATION_CURSOR_RETIRED_KEYS`; malformed/weak pairs, duplicates,
current/previous/future values, overflow, or more than 16 reject startup. The
decoder verifies the bounded complete keyring before JSON interpretation as
specified above. After exactly one MAC match, it strictly parses the payload and
requires `keyVersion` equality with that matched declaration; a matched retired key
then fails `cursor_key_retired`. Invalid/no/multiple MAC matches remain generic
invalid. A validly signed payload whose embedded version differs from its matching
key, including an unknown/future version, fails `cursor_version_unsupported`.
`classifyPaginationCursorFailure` exposes only the
coarse `expired_or_retired|invalid` result. A later internal route may map that
coarse terminal class to one fixed refresh code, while malformed/signature/scope/
unknown-version failures remain generic. No route may return a key version or
distinguish age from retirement.

The cursor lifetime is code-owned at 24 hours with at most 60 seconds of future
clock skew. Rotation publishes a higher current key version while retaining at
most one previous key for the 24-hour overlap. An intentionally revoked prior key
may move to the bounded retired tuple so its valid cursors receive only the coarse
terminal classification; deleting all copies makes them generic invalid. A process that mounts the paginated
admin routes must load this keyring during startup and fail fast before
accepting traffic when the current secret is absent or shorter than 32 UTF-8
bytes. `loadPaginationCursorKeyring(env)` remains pure. The exact production
handoff is the idempotent
`registerPaginationCursorLifecycleParticipant()` plus fail-closed
`requirePaginationCursorKeyring()`: L02 calls register once from
`routes/index.ts` module evaluation, the participant calls the loader exactly
once during lifecycle start, and route handlers require the installed value and
pass it explicitly into read operations. Registration itself performs no env
read. A missing/weak configuration rejects `startRuntimeLifecycle()` before
`prod.ts` listens. Calls to `require*` before successful start or after close
fail `pagination_cursor_keyring_unavailable`. TASK-551-08-L03 must preserve the
already-registered participant and must not load, replace, or duplicate the
keyring. Pure unit tests inject an explicit keyring and never depend on developer
env; the runtime integration test owns scoped env setup/restore.

## Testing Requirements

- Property-style round trips cover every scalar wire type, equal timestamps,
  nulls, both directions, stable canonical encoding, and 1/5-field boundaries.
- Mutation, truncation, wrong scope/secret/version, alternate base64/JSON/date/
  UUID/integer encodings, oversized input, duplicate JSON keys/field names,
  unknown properties, spec-column injection attempts, and mismatched field
  name/type/order/count fail closed without input disclosure.
- Table-driven SQL tests execute all 16 comparator rows (four order/null modes ×
  null/non-null × after/before), two- through five-field prefix ties, and first/
  middle/last navigation against PostgreSQL. They prove no gaps/duplicates,
  previous-fetch SQL reversal plus output reversal, and exact code-owned columns.
- Missing/short current secrets, incomplete previous-key pairs, duplicate or
  non-monotonic key versions, expired cursors, and future issue times fail
  closed; current and previous keys pass only during the defined overlap.
- Retired-key tests cover absent, one, 16, duplicate/current/previous/future/
  weak-secret/17-member/malformed cases; only expired or MAC-valid explicitly
  retired values classify terminal, while malformed/signature/scope/unknown-version
  inputs classify invalid without exposing a version.
- Verification-order tests instrument all configured HMAC candidates and prove no
  payload JSON/keyVersion access occurs before the bounded current/previous/retired
  comparisons complete; embedded-version mismatch and multiple-match configuration
  fail closed without selecting an attacker-provided key.
- Boundary tests pin defaults 50, maximum 100, and exactly `limit + 1` lookahead.
- Import test proves the two pure production modules are Bun/runtime/DB-client
  free; only the named server adapter may import the lifecycle registry.
- Contract tests pin the exact exported names `PaginationCursorKeyring`,
  `loadPaginationCursorKeyring`,
  `classifyPaginationCursorFailure`,
  `registerPaginationCursorLifecycleParticipant`, and
  `requirePaginationCursorKeyring`.
- Runtime integration calls register repeatedly and proves exactly one fixed-ID
  participant, zero env reads during module evaluation/registration, exactly one
  load during awaited start, one immutable object reused by multiple route/read
  calls, start rejection before listen for missing/weak config, fail-closed
  require before start/after close, and idempotent reset across test lifecycles.

## Security Contract

- Pure internal library plus a server-only lifecycle adapter; no endpoint, auth,
  RBAC, CSRF, rate-limit, nonce/HMAC public-write, or CAPTCHA changes.
- Cursor HMAC keys come only from `PAGINATION_CURSOR_SECRET`, its optional
  rotation pair, and strict optional retired-key pairs through explicit
  dependencies. They are never persisted,
  logged, returned to clients, placed in browser storage, or reused as a
  session/JWT/public-write signature key.
- Strict reject-unknown payload parsing, constant-time MAC comparison, maximum
  2 KiB encoded cursor, and generic client errors prevent oracle/data leakage.

## Validation Commands

- `bunx vitest run tests/vitest/database/keysetCursor.test.ts tests/vitest/database/boundedReadContract.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/paginationCursorLifecycle.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`

## Documentation Updates Required

No shared docs. Hand the exact loader/register/require lifecycle API, cursor
format, environment variables, startup failure semantics, rotation procedure,
limits, and error codes to TASK-551-10-L02 for `.env.example`,
`_docs/ORM_SPEC.md`, and API documentation.

## Quantified Acceptance

- 100% of malformed/tampered cursor fixtures fail closed; valid fixtures round
  trip byte-deterministically.
- Startup rejects every missing/weak/partial keyring fixture before listen, and
  rotation tests prove one-current/one-previous verification with a fixed
  24-hour expiry; retired-key fixtures prove the coarse terminal class only for
  verified retired/expired values and never expose a version.
- The handoff registers exactly one participant, loads exactly once per started
  lifecycle, exposes one immutable required value, and requires zero environment
  reads from module registration, route handlers, or read services.
- Default/max limits are 50/100 and cannot be bypassed through coercion.
- Produced predicates always include final non-null UUID `id`, interpolate zero
  cursor-supplied identifiers, and match the frozen comparator truth table for
  every direction/null/order combination with no page gaps or duplicates.

## Workflow Dispatch Envelope

The lifecycle suite is database-free and installs its own short-lived cursor
secret in-process; it therefore has no L11 environment profile. The envelope
does not authorize the later route, schema, or migration owners.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-03-L01",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-03"
  },
  "allowlist": [
    "core/services/database/keysetCursor.ts",
    "core/services/database/boundedReadContract.ts",
    "core/server/paginationCursorLifecycle.ts",
    "tests/vitest/database/keysetCursor.test.ts",
    "tests/vitest/database/boundedReadContract.test.ts",
    "tests/integration/runtime/paginationCursorLifecycle.test.ts"
  ],
  "forbiddenPaths": [
    "core/server/routes/index.ts",
    "core/db/client.ts",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json",
    "core/server/runtimeLifecycle.ts",
    "core/server/runtimeEntrypoint.ts"
  ],
  "dependencies": ["TASK-551-05-L02:single"],
  "commands": [
    {
      "id": "keyset-cursor-contract-tests",
      "lane": "vitest",
      "argv": ["bunx", "vitest", "run", "tests/vitest/database/keysetCursor.test.ts", "tests/vitest/database/boundedReadContract.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": [
          "tests/vitest/database/keysetCursor.test.ts",
          "tests/vitest/database/boundedReadContract.test.ts"
        ],
        "minimum": 1
      }
    },
    {
      "id": "pagination-cursor-lifecycle-test",
      "lane": "bun-test",
      "argv": ["bun", "test", "tests/integration/runtime/paginationCursorLifecycle.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/runtime/paginationCursorLifecycle.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "argv": ["git", "diff", "--check"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-05-L02:single"],
      "commandIds": [
        "keyset-cursor-contract-tests",
        "pagination-cursor-lifecycle-test",
        "core-lint-types",
        "core-lint",
        "diff-check"
      ]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-24 (03-L02 FAZA-0 dependency; append-only)

This section is append-only. It supersedes the conflicting sentences above
only where it says so; every other clause of this leaf stays binding. Status,
Changelog (1310, pinned to TASK-551-10-L02 closure) and the Workflow Dispatch
Envelope are unchanged. Anchors below were verified against HEAD `ae6bea8a`.

### K1 — Tie-breaker order rule (binding source change)

Current state: `core/services/database/keysetCursor.ts:189-198`
(`normalizeKeysetSpec`) rejects with `configInvalid` any spec whose last field
is not exactly
`{name:"id",type:"uuid",order:"asc",nulls:"last",nullable:false}`; the JSDoc at
`keysetCursor.ts:125-130` states the same. The contract text above
(`## Exact Cursor Wire and SQL Contract`, "a final field other than exactly
`{name:"id",type:"uuid",nullable:false}`") left order/null placement open; the
03-L01 receipt (`_docs/_workflows/_smoke/task-551/impl-03-l01.json`) disclosed
the stricter asc/last pin as a LOW.

New binding rule for the LAST field of every `KeysetSpec`, replacing both the
contract sentence above and the current asc/last pin (orchestrator decision,
2026-09-24; flexible tie-breaker direction):

- `name === "id"`, `type === "uuid"`, `nullable === false` (unchanged);
- `order` is `"asc"` OR `"desc"`, freely chosen by the caller (it is NOT tied to
  `fields[0].order`);
- `nulls` MUST be `"last"` when `order` is `"asc"` and `"first"` when `order` is
  `"desc"` (the PostgreSQL-native default placement for each direction, which is
  what a plain `ASC`/`DESC` B-tree index column stores).

Fields before the last one stay free and remain governed only by the existing
per-field validation (`keysetCursor.ts:172-179`); mixed-direction specs such as
`(t DESC, id ASC NULLS LAST)` remain valid, so NO existing test vector breaks.
Rejected with `PAGINATION_CURSOR_ERROR_CODES.configInvalid`: any final `id`
with a mismatched null placement, e.g. `(id DESC NULLS LAST)` or
`(id ASC NULLS FIRST)`. The implementer also updates the `normalizeKeysetSpec`
JSDoc (`keysetCursor.ts:125-130`) to state the K1 rule.

Rationale for the flexible rule: zero production consumers of
`normalizeKeysetSpec` / `encodeKeysetCursor` / `decodeKeysetCursor` exist
outside the two owner modules (verified by the orchestrator), so relaxing the
pin has no downstream blast radius; the caller aligns the tie-breaker with its
index (`(ts DESC, id DESC NULLS FIRST)` for the 03-L02 matrix); and the
previous-direction flip stays uniform (`boundedReadContract.ts:209-216`).

Pseudocode (replaces the last-field check at `keysetCursor.ts:189-198`):

```ts
const last = fields[fields.length - 1]!;
const tieOk =
  (last.order === "asc" && last.nulls === "last") ||
  (last.order === "desc" && last.nulls === "first");
if (
  last.name !== "id" ||
  last.type !== "uuid" ||
  last.nullable ||
  !tieOk
) {
  fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
}
```

Why:

- TASK-551-03-L02 mandates `ORDER BY <timestamp> DESC, id DESC` for every
  timestamp list (`TASK-551-03-L02-...md:368-369`) and says every paginated
  family builds one L01 `KeysetSpec` from `<business field>,id`
  (`:376-379`). The landed indexes are all-DESC, for example
  `core/db/tables/pages.ts:59` `pages_list_updated_id_idx` on
  `(desc(updatedAt), desc(id))` and `pages.ts:60-64`
  `pages_author_list_updated_id_idx` on `(authorId, desc(updatedAt), desc(id))`,
  and the frozen statement shapes pin `order: "updated_at DESC, id DESC"`
  (`tests/perf/fixtures/task551AdminReadStatementShapes.ts:228`). Under the
  current asc/last pin none of those families can build a spec at all; a
  mixed `(ts DESC, id ASC)` order could not be served by an ordered scan of a
  uniformly-DESC index in either scan direction, so those callers choose
  `id DESC NULLS FIRST` under the flexible rule.
- `DESC` index columns default to `NULLS FIRST` in PostgreSQL, so the
  `id DESC NULLS FIRST` mirror keeps the rendered `ORDER BY` identical to the
  index order (next page) and to its exact backward scan (previous page).
  03-L02 should likewise declare its `NOT NULL` timestamp field as
  `order:"desc", nulls:"first", nullable:false` so the whole rendered tuple
  matches the index; this is a 03-L02 authoring note, not an L01 rule.
- K1 itself needs no change in `core/services/database/boundedReadContract.ts`
  (K6 and K7 below change that module for independent round-2 findings; neither
  changes the behavior of `buildKeysetOrderBy` or `strictComparison`, and K7
  edits only the `buildKeysetOrderBy` JSDoc). The
  previous-direction fetch stays correct because it flips every column
  uniformly: `buildKeysetOrderBy` (`boundedReadContract.ts:209-216`) maps each
  field independently at `:211` (`asc`↔`desc`) and `:212` (`first`↔`last`), so
  `(ts DESC NULLS FIRST, id DESC NULLS FIRST)` renders
  `ts ASC NULLS LAST, id ASC NULLS LAST` for `previous`. The predicate side
  (`assemblePredicate`, `:160-202`) reads `order`/`nulls` per field from the
  spec (`:185-192`) and delegates to `strictComparison` (`:106-135`), whose
  `DESC NULLS FIRST` branch (`:128-134`) already implements the frozen table
  rows above (non-null: `after` = `c < v`, `before` = `c > v OR c IS NULL`);
  for the non-null `id` the `IS NULL` arm is simply never true. Neither
  function assumes an ascending tie-breaker.

Scope-version rule (round 2, binding on every spec owner): a cursor scope
identifies exactly ONE `KeysetSpec`. Any change to a spec field's direction
(`order`) or null placement (`nulls`), and likewise to its `nullable`, type,
column fragment, or the field count or sequence, MUST bump the scope's version
segment (for example `admin:pages:v1:<digest>` → `admin:pages:v2:<digest>`; the
`v1` segment is minted at `TASK-551-03-L02-...md:733`), so a cursor minted
under the old spec fails `cursor_scope_mismatch` instead of being reinterpreted.
The rule binds EVERY scope family, not only pages (round 3): the generic
`admin:<family>:vN:<digest>` families (`03-L02:373`), the pages instance
(`03-L02:733`), the `revision:<family>:vN:<digest>` families (`03-L02:878`),
and any scope family a later task mints over an L01 `KeysetSpec`.
Reason: the wire payload carries only `name,type,value` per field, and decode
compares field names, non-null types, count and sequence, but NOT per-field
direction or null placement; a direction flip alone would therefore decode a
stale cursor successfully under the new spec. L01 needs no code for this rule.

### K2 — Text tie-breaker for facets: NOT a KeysetSpec change

The L01 keyset contract is untouched for facets: no text, `count`, or
non-`id` final tie-breaker is admitted by K1.

Verification against 03-L02 shows its facet text does NOT describe bounded
non-cursor reads; it describes cursored facets:

- `TASK-551-03-L02-...md:599-604` defines `FacetPage<T>` with
  `nextCursor: string | null` and `hasMore`;
- `:632` accepts a strict follow-up with `facetKind,facetQ,facetCursor,facetLimit`;
- `:639-640` (continuing `:634-640`) states "Variable values are keyset-paged and searchable";
- the frozen shapes pin facet keyset predicates
  `"count < $cursor or (count = $cursor and group_key > $cursorKey)"`
  (`tests/perf/fixtures/task551AdminReadStatementShapes.ts:208`, `:305`, `:556`)
  with orders `count DESC, group_key ASC` (`:307`, `:558`),
  `count DESC, author_id ASC` (`:258`, `:355`, `:401`) and
  `count DESC, role_id ASC` (`:447`);
- the prose at `:634-635` ("Authors ... sort by label/id") contradicts the
  fixture's `count DESC, author_id ASC`.

None of those facet orders is an admissible L01 `KeysetSpec` (before or after
K1): each final field is not `id`/`uuid` (and `group_key` is text). This is recorded as an OWED 03-L02 correction, not an L01
change: 03-L02 must either (i) make facets bounded non-cursor reads (declared
cap, drop `facetCursor`/`nextCursor`/`hasMore` paging), or (ii) define and test
its own code-owned facet cursor contract outside `KeysetSpec`, and in either
case reconcile the author-facet order between its prose (`:634-635`) and the
fixture shapes. Until 03-L02 resolves this, no facet path may call
`normalizeKeysetSpec`.

Orchestrator disposition for 03-L02 (binding, 2026-09-24): option (i). Facets
become bounded NON-cursor reads with a declared cap and a `truncated` flag
(no `facetCursor`/`nextCursor`/`hasMore` paging and no `KeysetSpec`
involvement); 03-L02 reconciles its facet prose, types and fixture shapes to
that disposition.

### K3 — Test obligations

Existing vectors are NOT migrated to the flexible K1 rule. Every existing
assertion stays byte-identical except the single expectation K7 rewrites
(`tests/vitest/database/boundedReadContract.test.ts:389-390`); the test-helper
extensions below (shared comparator, interpreter grammar) change no existing
expectation. No existing predicate-text assertion changes under K6, because
every one uses the nullable-first-field `twoFieldSpec`
(`boundedReadContract.test.ts:187-195`, asserted at `:238` and `:252-262`); the
prefix-tie walk (`:280-344`) does receive the K6 bound (its leading integer
`k0` is `nullable:false`) but asserts only visitation, which K6 preserves.

`tests/vitest/database/keysetCursor.test.ts` adds these vectors:

- (a) `(updated_at timestamp DESC NULLS FIRST nullable:false, id DESC NULLS FIRST)`
  is accepted and round-trips for `direction:"next"` and `"previous"`;
- (b) `(updated_at timestamp DESC NULLS FIRST nullable:false, id DESC NULLS LAST)`
  is rejected with `configInvalid`. The leading field is identical to (a)
  (`order:"desc"`, `nulls:"first"`, `nullable:false`) and valid on its own, so
  the rejection can only come from the final `id` null placement;
- (c) `(t ASC, id ASC NULLS FIRST)` rejected with `configInvalid`;
- (d) NO new test. The existing mixed-direction acceptance is already proven by
  `keysetCursor.test.ts:92-106` (five-field spec with `t`/`ts` DESC and final
  `id ASC NULLS LAST`) and `:137-146` (`flag DESC`, final `id ASC NULLS LAST`);
  both stay green and unchanged;
- (e) single-field `(id DESC NULLS FIRST)` accepted;
- (h) the K8 microsecond wire vectors (listed under K8, "Tests").

`tests/vitest/database/boundedReadContract.test.ts` adds:

- Shared comparator (prerequisite for (g), K6 and K7): hoist the prefix-tie
  test's local `compareBySpec` (`:298-311`) into one module-level
  `compareRowsBySpec(spec, a, b)` that honors `field.order` for EVERY field type.
  Today only `integer` flips (`:302-304`); text/uuid/timestamp/boolean fall
  through ascending at `:305-306`, which would silently mis-sort a DESC `id` or
  timestamp. The prefix-tie test switches to the shared helper with unchanged
  expectations. Datasets sorted by it are non-null (null placement stays covered
  by `sortedDataset`, `:210-227`).

  ```ts
  function compareRowsBySpec(spec: KeysetSpec, a: Cell[], b: Cell[]): number {
    for (let i = 0; i < spec.fields.length; i += 1) {
      const field = spec.fields[i]!;
      let delta =
        field.type === "integer"
          ? compareValues(Number(a[i]), Number(b[i]))
          : compareValues(a[i]!, b[i]);
      if (field.order === "desc") delta = -delta;
      if (delta !== 0) return delta;
    }
    return 0;
  }
  ```

- (f) exact render vectors for the DESC/DESC spec
  `DD = (updated_at timestamp column "updated_at" DESC NULLS FIRST nullable:false, id uuid column "id" DESC NULLS FIRST)`
  with cursor values `[TS, ID]`, `TS = "2026-01-02T00:00:00.000Z"`,
  `ID = UUID(3)`:
  - `buildKeysetOrderBy(DD,"next") === "updated_at DESC NULLS FIRST, id DESC NULLS FIRST"`;
  - `buildKeysetOrderBy(DD,"previous") === "updated_at ASC NULLS LAST, id ASC NULLS LAST"`;
  - `after` (next) text
    `updated_at <= $1 AND ((updated_at < $2) OR (updated_at IS NOT DISTINCT FROM $3 AND (id < $4)))`,
    params exactly `[TS, TS, TS, ID]`;
  - `before` (previous) text
    `updated_at >= $1 AND (((updated_at > $2) OR updated_at IS NULL) OR (updated_at IS NOT DISTINCT FROM $3 AND ((id > $4) OR id IS NULL)))`,
    params exactly `[TS, TS, TS, ID]`.

  These are the PINNED post-K6 literals (K6 lands in the same change). For the
  record only, the pre-K6 shapes (what the builder would emit for DD without the
  K6 bound, params `[TS, TS, ID]`) are `after`
  `(updated_at < $1) OR (updated_at IS NOT DISTINCT FROM $2 AND (id < $3))` and
  `before`
  `((updated_at > $1) OR updated_at IS NULL) OR (updated_at IS NOT DISTINCT FROM $2 AND ((id > $3) OR id IS NULL))`;
  they are NOT asserted as builder output for DD. (The analogous HEAD shape for
  the currently admissible `(updated_at DESC NULLS FIRST, id ASC NULLS LAST)`
  was confirmed by executing the HEAD builder:
  `(updated_at < $1) OR (updated_at IS NOT DISTINCT FROM $2 AND ((id > $3) OR id IS NULL))`.)
- (g) two-way traversal over DD with tied `updated_at`, using the existing
  `evalFragment` interpreter (`:92-184`, extended per K6) and the shared
  comparator. Dataset `G` (six rows, non-null):

  | row | `updated_at` | `id` |
  |---|---|---|
  | r1 | `2026-01-03T00:00:00.000Z` | `UUID(1)` |
  | r2 | `2026-01-02T00:00:00.000Z` | `UUID(2)` |
  | r3 | `2026-01-02T00:00:00.000Z` | `UUID(3)` |
  | r4 | `2026-01-02T00:00:00.000Z` | `UUID(4)` |
  | r5 | `2026-01-01T00:00:00.000Z` | `UUID(5)` |
  | r6 | `2026-01-01T00:00:00.000Z` | `UUID(6)` |

  `G` sorted by `compareRowsBySpec(DD)` (display order) is pinned as ids
  `[1, 4, 3, 2, 6, 5]`, so a comparator regression fails loudly.
  Forward walk: `visited` starts as `[display[0]]`; each step encodes/decodes
  the current (last visited) row as a `direction:"next"` cursor, filters `G`
  with `evalFragment(buildKeysetPredicate(DD, cursor, "after"), row, ["updated_at","id"])`,
  sorts by `compareRowsBySpec`, and appends the FIRST remaining row; stop when
  nothing remains (step cap 12). Backward walk: `visited` starts as
  `[display[5]]`; each step uses a `direction:"previous"` cursor with relation
  `before`, sorts the remaining rows by `compareRowsBySpec`, and appends the
  LAST remaining row (nearest to the cursor). At EVERY step of both walks assert
  `evalFragment(predicate, boundaryRow, ["updated_at","id"]) === false` (the
  boundary row is never matched by its own predicate). Assert that the forward
  `visited` sequence equals the display order exactly and the backward
  `visited` sequence equals the reversed display order exactly: all six rows
  visited exactly once in each direction, no gaps, no duplicates. Every
  `G`-based test in this section (K3 (g), the K6 equivalence vectors and the
  K7 traversal) passes the columns argument `["updated_at","id"]` to
  `evalFragment`; the suite's existing `COLUMNS` (`["score","id"]`,
  `boundedReadContract.test.ts:207`) is for the `twoFieldSpec` vectors only.
  The in-test interpreter and the shared comparator compare timestamp text
  lexicographically; that is valid only for single-representation,
  fixed-width datasets (every `G` value is `.000Z`) and is not a model of
  PostgreSQL timestamp comparison across mixed 3- and 6-digit forms.

The Quantified Acceptance clause "every direction/null/order combination" is
read as every combination admitted by K1 (free leading fields, final `id` in
either direction with its native null placement).

### K4 — Scope and gates

- The `## File Ownership` allowlist and the Workflow Dispatch Envelope JSON
  (including its `allowlist`) are unchanged; they already name both production
  modules and both Vitest suites. `core/server/paginationCursorLifecycle.ts`
  and `tests/integration/runtime/paginationCursorLifecycle.test.ts` are NOT
  edited. The round-1 wording that excluded `boundedReadContract.ts` is
  withdrawn: it is IN scope for K6 and K7.
- Binding land order and writer plan (round 3): exactly ONE writer per file,
  four sequential writers, each reading the on-disk state left by the previous
  one:
  1. W1 `core/services/database/keysetCursor.ts` — K1 and K8;
  2. W2 `core/services/database/boundedReadContract.ts` — K6 and K7;
  3. W3 `tests/vitest/database/keysetCursor.test.ts` — K3 (a)-(e) and the K8
     vectors (K3 (h));
  4. W4 `tests/vitest/database/boundedReadContract.test.ts` — K3 shared
     comparator, (f) and (g); the K6 tests including the interpreter extension;
     the K7 tests.
- Writer fast gates. Source writers (W1, W2), run from `core/`:
  `../node_modules/.bin/eslint --max-warnings=0 services/database/<file>.ts`,
  `wc -l` on the file, and `prettier --write` then `prettier --check` on the
  file. Test writers (W3, W4) run the same three gates on their own test file
  (ESLint and Prettier from the repository root with the test path). W3 also
  runs the airtight single-suite Vitest form on
  `tests/vitest/database/keysetCursor.test.ts`; W4 also runs the airtight
  two-suite Vitest form (both production sources have landed by then). The
  orchestrator keeps `lint:types`, `core lint`, root `tsc`, the lifecycle suite
  and the line gate.
- Expected red window: this applies only if someone runs the two-suite Vitest
  form early (before W4 lands); no writer is asked to.
  Between W2 and W4 the combined Vitest run is expected to be red ONLY on the
  prefix-tie walk (`boundedReadContract.test.ts:280-344`, which cannot parse the
  K6 bound until W4's interpreter-grammar extension) and on the K7-rewritten
  expectation `:389-390`; any other red in that window is a real regression.
  After W1 alone (and after W3), `keysetCursor.test.ts` is expected green
  (K1 and K8 only widen what is accepted; the existing 4-digit rejection at
  `keysetCursor.test.ts:272` stays rejected under K8).
- Orchestrator gates after W4: the airtight local Vitest form
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/database/keysetCursor.test.ts tests/vitest/database/boundedReadContract.test.ts`
  (the owner-map PostgreSQL arm skips by name under this form),
  `bun --cwd core lint`, `bun --cwd core lint:types`, root `tsc --noEmit`, the
  DB-free lifecycle suite
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/runtime/paginationCursorLifecycle.test.ts`
  (it imports `core/server/paginationCursorLifecycle.ts`, which imports
  `keysetCursor.ts` at `paginationCursorLifecycle.ts:12-15`, so the K1 and K8
  changes reach it; the suite installs its own in-process secret and its
  envelope profile is `none`), the 1,000-line gate on the four touched files,
  and `git diff --check`.
- 1,000-line stop rule for ALL four files: at HEAD `keysetCursor.ts` is 815,
  `boundedReadContract.ts` 264, `keysetCursor.test.ts` 754 and
  `boundedReadContract.test.ts` 512 physical lines. Each must stay at or below
  1,000 after its writer lands; if a writer's change would exceed that, the
  writer stops and reports instead of creating a file outside the allowlist.
- The receipt `_docs/_workflows/_smoke/task-551/impl-03-l01.json` receives an
  addendum entry for this correction (K1, K6, K7, K8), written by the
  orchestrator after the change lands; no writer edits it.
- Status and Changelog fields are unchanged (Changelog 1310 at TASK-551-10-L02).

### K5 — Downstream

TASK-551-03-L02 consumes K1: its pseudocode must build every timestamp-list
spec as `(<ts> DESC NULLS FIRST nullable:false, id DESC NULLS FIRST)` and must
land only after this correction (K1, K6, K7, K8) is implemented and gated. The
03-L02 FAZA-0 read-only audit (2026-09-24) raised the asc/last tie-breaker pin
as a HIGH blocker for the 03-L02 timestamp-list matrix; K2 additionally records
the owed 03-L02 facet-cursor correction discovered while verifying that finding.

Further 03-L02 obligations recorded here (owed by 03-L02, not L01 changes):

- scope strings follow the K1 scope-version rule (03-L02 already mints
  `admin:pages:v1:<digest>`, `TASK-551-03-L02-...md:733`);
- sanitized `EXPLAIN (ANALYZE, BUFFERS)` evidence on `DATABASE_URL3` for the
  K6 bound (see K6, "Planner evidence");
- the K2 option (i) facet disposition, including reconciling the facet
  statement-shape fixture text
  (`tests/perf/fixtures/task551AdminReadStatementShapes.ts:208`, `:305`, `:556`)
  and the author-facet prose (`03-L02:634-635`);
- Admin Previous keeps its client-side stack of forward cursors
  (`03-L02:382-383`), so K7 has no user-visible effect in 03-L02 today; any
  later server-side `previous` read must pass rows in fetch order per K7;
- every 03-L02 `KeysetSpec` field declared `nullable:false` maps to a Drizzle
  column declared `.notNull()` (for example `core/db/tables/pages.ts:40`
  `updatedAt ... .notNull()`), pinned by a spec-vs-schema test in 03-L02 that
  fails when a declared non-nullable field's column is nullable (the K6 bound's
  precondition);
- the K8 microsecond boundary obligation: every read service selects its keyset
  timestamp column ALSO as microsecond-exact UTC text via the pinned
  `to_char(<col>, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` form, encodes only that
  text, never a `Date`-derived millisecond value, and ships the microsecond
  tie-group walk test (see K8);
- every keyset read (the predicate params) runs through the Drizzle-constructed
  client from `core/db/client.ts` (`db` or `sqlClient`, wrapped at
  `core/db/client.ts:91`), never a raw `postgres()` client (K8 item 2);
- the 03-L02 microsecond tie-group walk runs against real PostgreSQL through
  that client under a non-UTC session TimeZone (for example
  `SET TimeZone='Europe/Warsaw'`), proving driver pass-through and TimeZone
  independence;
- `core/db/sessionClient.ts:62` (dedicated sessions) is NOT Drizzle-wrapped:
  any future keyset read over a dedicated session must wrap that client with
  `drizzle()` first or is forbidden. Owed to whichever leaf first introduces
  such a read.

### K6 — Index-seekable keyset predicate (binding source change, `boundedReadContract.ts`)

Finding (round-2 audit B, MEDIUM): `assemblePredicate`
(`core/services/database/boundedReadContract.ts:160-202`) emits an OR of
per-position disjuncts in which every prefix field is compared with
`IS NOT DISTINCT FROM` (`:173`, `:177`). PostgreSQL cannot use
`IS NOT DISTINCT FROM`, nor a top-level OR of such disjuncts, as a B-tree index
condition, so `WHERE <predicate> ORDER BY <index order> LIMIT n+1` starts the
ordered index scan at the top of the index and evaluates the predicate as a
Filter: rows read grow linearly with page depth (OFFSET-like), which defeats
the 03-L02 rows-read budgets on its 100k fixtures.

Disposition: the builder prepends a redundant, semantically implied range bound
on the FIRST spec field when both hold:

1. `spec.fields[0].nullable === false`;
2. the cursor's first field is non-null (always true under 1, because the
   decoder rejects a null for a non-nullable field; the check is defensive).

Otherwise (nullable first field or null boundary) no bound is added and the
text is byte-identical to HEAD. The rule applies to single-field specs too
(`(id ASC NULLS LAST)` after renders `((id > $1) OR id IS NULL)` at HEAD, whose
`OR` arm is itself not a clean index condition).

| relation | `fields[0].order` | bound |
|---|---|---|
| `after` (next) | `desc` | `<col> <= $1` |
| `after` (next) | `asc` | `<col> >= $1` |
| `before` (previous) | `desc` | `<col> >= $1` |
| `before` (previous) | `asc` | `<col> <= $1` |

Null placement is irrelevant to the bound because the column is non-null. The
output text is `<bound> AND (<existing disjuncts joined by " OR ">)`.

Parameter scheme (pinned; exactly one choice): the bound gets its OWN fresh
placeholder `$1`, pushed before the existing per-position loop runs, converted
with the same `sqlParam(fields[0].type, value)` (`:85-93`) used for the strict
comparison; every existing placeholder shifts by +1. The invariant "each `$N`
occurs exactly once in the text and `params.length` equals the highest
placeholder" is kept, so every placeholder has one unambiguous server-inferred
type (no `$N` reused under two operators). For DD the params are
`[TS, TS, TS, ID]` (three identical ISO strings, then the uuid string); for an
integer first field the bound param is the same `Number`/`BigInt` `sqlParam`
produces for the strict comparison. Pinned post-K6 literals are K3 (f); a
single-field `(id DESC NULLS FIRST)` `after` cursor `[ID]` renders
`id <= $1 AND ((id < $2))` with params `[ID, ID]`.

Correctness: under the NOT NULL precondition every disjunct implies the bound.
Position 0's strict comparison is `c < v` / `c > v` (its `OR c IS NULL` arm is
unsatisfiable for a NOT NULL column), and every later position carries the
prefix equality `c IS NOT DISTINCT FROM v`, which equals `c = v` for non-null
`c`. Hence `bound AND P ≡ P` and page results are identical. The
`bound AND P ≡ P` and no-gaps proofs assume the cursor value equals the stored
column value exactly (K8). The bound uses the
same column fragment and the same comparison operator family and collation as
the strict comparison, so the implication also holds for text and boolean
columns. Precondition (spec-author obligation, restated): `nullable:false` MUST
describe a NOT NULL column; the 03-L02 timestamp columns are NOT NULL (for
example `core/db/tables/pages.ts:40` `updatedAt ... .notNull()`). A NULL-bearing
column mis-declared as non-nullable would lose its NULL rows for `before` on
`DESC NULLS FIRST` (and `after` on `ASC NULLS LAST`); that is why condition 1
gates the bound.

Planner effect: `c <= $1` (next, `ORDER BY c DESC, id DESC`) and `c >= $1`
(previous, reversed `ORDER BY c ASC, id ASC`, a backward scan) become the
`Index Cond` of the ordered scan on an index whose leading key after equality
filters is `c` (for example `pages_list_updated_id_idx`, `pages.ts:59`, or
`pages_author_list_updated_id_idx` after `author_id = $x`, `pages.ts:60-64`).
The scan then starts at the cursor and reads at most the `c = v` tie group plus
`limit + 1` rows; the remaining Filter cost is bounded by the tie-group size,
not by page depth.

Pseudocode (replaces the body of `assemblePredicate`, `:165-201`;
`strictComparison` and `buildKeysetOrderBy` are unchanged):

```ts
function assemblePredicate(spec, cursor, relation): SqlFragment {
  const params: unknown[] = [];
  const first = spec.fields[0]!;
  const firstValue = cursor.fields[0]!;
  let bound: string | null = null;
  if (!first.nullable && firstValue.type !== "null") {
    params.push(sqlParam(first.type, firstValue.value as string | boolean));
    const op = (relation === "after") === (first.order === "desc") ? "<=" : ">=";
    bound = `${first.column} ${op} $${params.length}`;
  }
  const disjuncts: string[] = [];
  // Existing per-position loop, unchanged: it keeps pushing onto `params`,
  // so its placeholders continue after the bound's `$1`.
  // ...
  if (disjuncts.length === 0) {
    return Object.freeze({ text: "FALSE", params: Object.freeze([]) });
  }
  const body = disjuncts.join(" OR ");
  return Object.freeze({
    text: bound === null ? body : `${bound} AND (${body})`,
    params: Object.freeze(params),
  });
}
```

The JSDoc of `buildKeysetPredicate` (`:137-142`) and `assemblePredicate`
(`:154-159`) states the bound and its NOT NULL precondition.

Contract text amended (round 3): K6 explicitly amends the sentence at
`## Exact Cursor Wire and SQL Contract` (`:199-200` of this file, "For each
tuple position, the builder ORs `prefix equality AND strict comparison`"):
for a non-nullable first field with a non-null cursor value, the OR of
per-position disjuncts is wrapped as `<bound> AND (<OR-of-prefixes>)`; for a
nullable first field or a null boundary the text is the unwrapped OR as before.
The prefix-equality rule (`:184`, "Prefix equality is always
`c IS NOT DISTINCT FROM v`") and the frozen comparator table (`:188-197`) are
unchanged.

Tests (`tests/vitest/database/boundedReadContract.test.ts`):

- Interpreter extension (prerequisite; the post-K6 text is otherwise
  mis-evaluated). `evalConjunct` (`:147-184`) must (i) recurse: after
  `stripOuterParens` (`:102-113`), a conjunct that still has a top-level
  `" OR "` or `" AND "` (`splitTopLevel`, `:115-133`) is evaluated as
  `evalFragment({ text: inner, params }, tuple, columns)` BEFORE the
  paren-flattening at `:155`. Without this the bound's parenthesized body
  flattens into `updated_at < $2 OR updated_at IS NOT DISTINCT FROM $3 AND id < $4`
  and hits the `IS NOT DISTINCT FROM` branch (`:160-163`) with the wrong
  placeholder. (ii) accept `^<col> <= \$n$` and `^<col> >= \$n$` (non-null value
  required, like `:173-182`). The composite form at `:164-170` stays (recursion
  yields the same result); unknown grammar still throws (`:183`).
- Exact text pins: K3 (f); the single-field pin above; and the no-bound pin
  `twoFieldSpec("desc","first")` `after` cursor `["10", UUID(1)]` renders the
  HEAD text `(score < $1) OR (score IS NOT DISTINCT FROM $2 AND ((id > $3) OR id IS NULL))`
  with params `[10, 10, UUID(1)]` (confirmed by executing the HEAD builder).
- Equivalence vectors "with and without the bound": for S1 = DD, S2 =
  `(updated_at ASC NULLS LAST nullable:false, id ASC NULLS LAST)` and S3 =
  `(updated_at DESC NULLS FIRST nullable:false, id ASC NULLS LAST)`, over `G`
  sorted by `compareRowsBySpec(S)`, for every boundary row and both relations:
  let `F = buildKeysetPredicate(S, cursor, relation)`; assert `F.text` matches
  `/^updated_at (<=|>=) \$1 AND \((.*)\)$/s` with the operator from the bound
  table; let `R = { text: match[2], params: F.params }` (the unbounded body,
  which keeps its `$2..` numbering against the same params array); assert the
  rows matched by `F`, the rows matched by `R`, and the expected side (dataset
  slice after/before the boundary) are all equal.
- Planner evidence is NOT produced in L01 (pure lane, no database). 03-L02
  produces sanitized `EXPLAIN (ANALYZE, BUFFERS)` on `DATABASE_URL3` showing
  the bound as `Index Cond` (not `Filter`) and rows read flat across page depth
  on its 100k fixture. The owner-map PostgreSQL arm (`:427-483`) is unchanged
  (its `score` field is nullable, so no bound).
- Real-PostgreSQL proof deferral (round 3): L01 does not prove against a real
  server that the bound's fresh `$1` gets the column's type by parameter-type
  inference, nor that it becomes an `Index Cond`; both are deferred to the
  03-L02 `EXPLAIN (ANALYZE, BUFFERS)` evidence on `DATABASE_URL3`. This is safe
  because (i) the owner-gated PG arm uses a nullable `score` first field, so it
  never renders a bound and its current evidence is unaffected; (ii) the bound
  is logically redundant (`bound AND P ≡ P`, proven in the pure lane by the
  equivalence vectors), so a planner that ignores it changes cost, not results;
  (iii) `$1` appears exactly once, directly compared with the column, which is
  the same inference shape the existing strict comparisons already rely on; and
  (iv) no production caller exists before 03-L02, which must produce that
  evidence before its lists land. The PG arm stays unchanged.

### K7 — Previous-direction boundary (binding source change, `boundedReadContract.ts` `toBoundedPage`)

Finding (round-2 audit B, MEDIUM): a `previous` read runs
`buildKeysetOrderBy(spec,"previous")` (`:209-216`, fully reversed) with the
`before` relation, so the database returns rows in REVERSED display order:
nearest to the cursor first, the `limit + 1` lookahead last. `toBoundedPage`
(`:236-264`) slices `rows.slice(0, limit)` (`:253`) without reversing and, when
`hasMore`, encodes `items[0]` (`:256`), the row NEAREST the old cursor. The
following previous request (`before items[0]`) therefore returns the rest of
the same page again (duplicates), and items come back in reversed display
order. The existing test pins the wrong boundary
(`boundedReadContract.test.ts:389-390`: `page(["a","b","c"],"previous")` →
`cursor(a)`; confirmed by executing the HEAD builder: items `["a","b"]`,
`nextCursor` `cursor(a)`). Example: display order a..f, limit 2, current page
`[d,e]`; `before d` fetches `[c,b,a]`; HEAD returns items `[c,b]` with
`cursor(c)`, and `before c` then fetches `[b,a]`, repeating `b`.

Disposition:

- Input contract (pinned): callers pass `rows` in FETCH order, exactly as the
  SQL built with `buildKeysetOrderBy(spec, direction)` returned them, for BOTH
  directions, at most `limit + 1` rows. Callers never pre-reverse.
- `next`: unchanged.
- `previous`: take `rows.slice(0, limit)` in fetch order (dropping the
  lookahead, the furthest row), REVERSE it into display order, and return that
  as `items`. When `hasMore`, encode `items[0]` after reversal: the row
  FURTHEST from the old cursor, which is the new backward boundary. For
  `previous`, `nextCursor` means "continue backward" and `hasMore` means rows
  exist before `items[0]`.

Pseudocode (replaces `:252-258`):

```ts
const hasMore = input.rows.length > input.limit;
const window = hasMore ? input.rows.slice(0, input.limit) : input.rows.slice();
const items = input.direction === "previous" ? window.reverse() : window;
let nextCursor: string | null = null;
if (hasMore) {
  const boundaryRow = input.direction === "next" ? items[items.length - 1]! : items[0]!;
  nextCursor = input.encodeBoundary(boundaryRow);
}
```

`window` is a fresh slice, so the in-place `reverse()` never mutates the
caller's array; `items` stays frozen as today. The JSDoc of `toBoundedPage`
(`:231-235`) and `buildKeysetOrderBy` (`:204-208`) is updated to the K7 input
contract.

Superseded text: in `## Exact Cursor Wire and SQL Contract` (`:202-205` of
this file), "and reverses fetched rows in memory before envelope encoding" is
superseded: the reversal happens INSIDE `toBoundedPage`, and callers pass fetch
order. "first returned row for `previous`" is read as the first row of the
returned `items` in display order, after K7's reversal. The Testing
Requirements phrase "previous-fetch SQL reversal plus output reversal" is met
by the K7 tests below.

Tests (`tests/vitest/database/boundedReadContract.test.ts`):

- Rewrite `:389-390`: `page(["a","b","c"],"previous")` yields items
  `["b","a"]`, `hasMore` true and `nextCursor` `"cursor(b)"`. Add
  `page(["b","a"],"previous")` yields items `["a","b"]`, `hasMore` false,
  `nextCursor` null, and the caller's input array is not mutated.
- Forward-then-backward traversal over `G` with DD and
  `limit = parsePageLimit(2)`. A test-local `fetchPage(cursor | null, direction)`
  filters `G` with `evalFragment(buildKeysetPredicate(DD, cursor,
  direction === "next" ? "after" : "before"))` (all rows when the cursor is
  null), sorts by `compareRowsBySpec` for `next` or its negation for `previous`
  (the non-null equivalent of `buildKeysetOrderBy(DD,"previous")`), slices to
  `limit + 1`, and calls `toBoundedPage` with `encodeBoundary` producing an
  `encodeKeysetCursor` token in the request's direction (decoded for the next
  request). Walk `next` from null until `!hasMore`: the pages must be ids
  `[1,4]`, `[3,2]`, `[6,5]`, concatenating to the display order exactly. Then,
  from the first item of the final forward page (r6) as a `previous` cursor,
  walk `previous` until `!hasMore`: the pages must be `[3,2]` then `[1,4]`, each
  in display order, and the backward pages prepended to the final forward page
  must equal the display order exactly (no gaps, no duplicates). At HEAD this
  test fails: the second backward page repeats row 3.

Impact: latent. There are zero production callers of `toBoundedPage`,
`buildKeysetPredicate` or `buildKeysetOrderBy` outside
`boundedReadContract.ts` and its test (verified with a repository search of
`core`, `tests` and `packages`), and 03-L02's Admin Previous uses a client-side
stack of forward cursors (`03-L02:382-383`).

### K8 — Microsecond-exact timestamp boundaries (binding source change, `keysetCursor.ts`)

Finding (round-2 audit A, MEDIUM): the wire `timestamp` is millisecond ISO
(`## Exact Cursor Wire and SQL Contract`, `:166-167` of this file;
`core/services/database/keysetCursor.ts:104`
`TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/`), while the
03-L02 sort columns are PostgreSQL `timestamp` with the default precision 6
(microseconds) filled by `now()`: `core/db/tables/pages.ts:40`
`updatedAt: timestamp("updated_at").defaultNow().notNull()`, migration
`core/db/migrations/0001_productive_jazinda.sql:18`
`"updated_at" timestamp DEFAULT now() NOT NULL` for `pages` (the same shape as
`0000_good_beyonder.sql:33` for `users`). No `core/db/tables/*.ts` column
declares a precision, and the Drizzle `timestamp()` default mode maps values
to a JS `Date`, which holds only milliseconds. A boundary row stored at
`.123456` therefore encodes as `.123`, and every predicate term (the K6 bound,
the strict comparison and the prefix equality) compares against `.123000`: for
`DESC` the next page skips rows in `(.123, .123456)` and the remaining rows of
the boundary's own tie group, i.e. page gaps (and for `ASC`, duplicates).

Column-type verification: every 03-L02 keyset timestamp column is
`timestamp without time zone`. `grep withTimezone core/db/tables/*.ts` finds
exactly one match, `core/db/tables/forms.ts:155`
`tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true })`, which
is not a list sort column; every other `timestamp(...)` column in
`core/db/tables/*.ts` is declared without `withTimezone` and holds wall time in the writing
session TimeZone (UTC by deployment convention); ordering and round-trip
exactness do not depend on it.

Disposition (orchestrator, binding):

1. L01 wire widening. `TIMESTAMP_PATTERN` accepts EXACTLY 3 OR EXACTLY 6
   fractional digits:
   `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:\d{3})?Z$/`. This supersedes
   the `timestamp` bullet at `:166-167` of this file ("UTC millisecond ISO-8601
   exactly `YYYY-MM-DDTHH:mm:ss.sssZ`"): the wire form is now
   `YYYY-MM-DDTHH:mm:ss.sssZ` or `YYYY-MM-DDTHH:mm:ss.ssssssZ`; any other
   precision (none, 1, 2, 4, 5, 7+ digits), offset, or invalid calendar date
   still fails `cursor_value_invalid`.
   - Where values are validated today: `isValidTimestamp`
     (`keysetCursor.ts:240-245`) tests the pattern and then requires
     `new Date(Date.parse(value)).toISOString() === value` (`:244`), a
     millisecond round-trip that would reject every 6-digit value. It is
     reached through `validateScalarValue` (`:254-273`, `timestamp` case
     `:265-266`) from `encodeKeysetCursor` (`:439`) and `decodeKeysetCursor`
     (`:756-758`). Neither path reformats: encode stores the supplied string as
     the field `value` (`:440-444`), and decode returns each field as a shallow
     copy of the parsed payload field (`:798-800`).
   - Change: the calendar check runs on the millisecond prefix only; the value
     itself is never reparsed into output. No `Date` round-trip may produce,
     truncate, pad or reformat a wire value in encode or decode.

     ```ts
     const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:\d{3})?Z$/;

     export function isValidTimestamp(value: string): boolean {
       if (!TIMESTAMP_PATTERN.test(value)) return false;
       // Calendar validity on the millisecond prefix; microseconds are opaque digits.
       const millisecondForm = `${value.slice(0, 23)}Z`;
       const parsed = Date.parse(millisecondForm);
       if (!Number.isFinite(parsed)) return false;
       return new Date(parsed).toISOString() === millisecondForm;
     }
     ```

   - `sqlParam` (`boundedReadContract.ts:85-93`) passes a `timestamp` value
     as the unchanged wire string (the non-integer path at `:87`). What reaches
     PostgreSQL depends on the client. A raw postgres.js client describes a
     parameterized statement first (`node_modules/postgres/src/connection.js:238`
     `describeFirst`, types recorded at `:630`), learns OID 1114/1184 from the
     compared column, and serializes those through
     `(x instanceof Date ? x : new Date(x)).toISOString()`
     (`node_modules/postgres/src/types.js:28-33`, registered for every `from`
     OID at `:205-206`), truncating `.123456Z` to `.123Z`. Microseconds survive
     only because drizzle-orm installs identity serializers and parsers for
     1082/1083/1114/1184 (and the array OIDs) on the client it wraps
     (`node_modules/drizzle-orm/postgres-js/driver.js:17-19`);
     `core/db/client.ts:91` wraps `sqlClient` at module load, so `db` and
     `sqlClient` from `core/db/client.ts` pass the text through exactly, while
     raw `postgres()` clients (`tests/vitest/database/boundedReadContract.test.ts:434`,
     `core/db/sessionClient.ts:62`) truncate. Through the wrapped client, for
     `timestamp without time zone` the trailing `Z` is ignored by PostgreSQL's
     input parser, so the bound value equals the stored value exactly
     regardless of the session `TimeZone`.
   - Compatibility: every existing 3-digit cursor stays valid (the 6-digit form
     is a strict superset), so this widening needs NO scope-version bump; the
     K1 scope-version rule is about spec changes, and K8 changes no spec.
   - Canonical form: the encoder never truncates or pads; the caller supplies
     the exact stored value text. `.123Z` and `.123000Z` denote the same
     instant and compare equal in SQL, but they are different wire bytes;
     byte-determinism is per caller, and 03-L02 callers always supply the
     6-digit form below.
2. 03-L02 obligation (recorded in K5): every read service selects its keyset
   timestamp column ALSO as microsecond-exact UTC text for boundary encoding,
   with the pinned SQL form
   `to_char(<col>, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` (valid for the
   `timestamp without time zone` UTC columns verified above; `to_char` of a
   `timestamp without time zone` does not depend on the session `TimeZone`).
   A future `timestamptz` sort column would need `<col> AT TIME ZONE 'UTC'`
   inside `to_char` and is out of scope here. The encoder input for a timestamp
   field is always that text; a `Date`-derived millisecond value
   (`row.updatedAt.toISOString()`) is never encoded. 03-L02 adds a test that
   seeds a microsecond tie group (for example 5 rows inside one millisecond
   with distinct microseconds, plus rows before and after it) and walks it with
   `limit` smaller than the group in both directions, proving no gaps and no
   duplicates. Every keyset read runs through the Drizzle-constructed client
   from `core/db/client.ts` (`db` or `sqlClient`), never a raw `postgres()`
   client, and the walk runs against real PostgreSQL through that client under
   a non-UTC session TimeZone (for example `SET TimeZone='Europe/Warsaw'`).
   `core/db/sessionClient.ts` is not wrapped; see K5.
3. K6 proofs: K6 gains the sentence "The `bound AND P ≡ P` and no-gaps proofs
   assume the cursor value equals the stored column value exactly (K8)." (done
   in place above).

Tests (`tests/vitest/database/keysetCursor.test.ts`, writer W3; K3 (h)):

- a 6-digit value such as `2024-03-04T05:06:07.089123Z` is accepted by
  `encodeKeysetCursor` and round-trips: the decoded field `value` is
  byte-identical to the input, and encoding the same input twice yields the
  same cursor;
- a 3-digit value is still accepted (the existing round trip at
  `keysetCursor.test.ts:108-124` stays unchanged);
- 4-, 5- and 7-digit fractions and a missing fraction
  (`2024-03-04T05:06:07.0899Z`, `...07.08912Z`, `...07.0891234Z`,
  `...07Z`) are rejected by `encodeKeysetCursor` with the existing
  `PAGINATION_CURSOR_ERROR_CODES.value`, alongside the unchanged `badTimestamps`
  vector at `:267-284` (which already holds the 4-digit and missing-fraction
  cases); a signed payload built with the existing `signRaw` helper (`:83`)
  carrying a 7-digit value fails `decodeKeysetCursor` with the same code;
- an invalid calendar date in 6-digit form (`2024-02-30T00:00:00.000000Z`) is
  rejected with `value`;
- the `decodeKeysetCursor` result for a cursor produced by `encodeKeysetCursor`
  from a 6-digit value carries that value byte-identically (no truncation to
  milliseconds).

### Round-2 record (after audits R1)

Round-2 read-only audits A and B ran against this section at HEAD `ae6bea8a`
(uncommitted). K1, K3, K4 and K5 were amended in place and K6/K7 were appended
within this section before any implementation; no source or test file was
edited. Findings closed:

Audit A:

- MEDIUM: no traversal proof for the DESC/DESC spec with tied timestamps, and
  the in-test comparator flipped only integer fields → K3 (g) plus the shared
  `compareRowsBySpec`.
- LOW: (f) was not literal → K3 (f) pins exact post-K6 text and params (pre-K6
  shapes recorded as informational).
- LOW: (b) left the leading field underspecified, so the rejection source was
  ambiguous → K3 (b).
- LOW: (d) duplicated an existing proof → K3 (d) cites
  `keysetCursor.test.ts:92-106` and `:137-146`; no new test.
- LOW: the lifecycle suite imports `keysetCursor.ts` but was missing from the
  gates → K4 orchestrator gate.

Audit B:

- MEDIUM: the keyset predicate is not index-seekable (OFFSET-like rows read) →
  K6.
- MEDIUM: the previous-direction boundary and row order in `toBoundedPage` →
  K7.
- LOW: a spec direction/null change without a scope bump would reinterpret
  stale cursors → K1 scope-version rule.
- INFO: the facet disposition and the statement-shape fixture text are owed to
  03-L02 → K2 option (i) plus K5; no L01 change.

### Round-3 record (2026-09-24; after audits R2)

Round-2 re-audits A and B ran against this section at HEAD `ae6bea8a`
(uncommitted). K1, K3, K4, K5 and K6 were amended in place and K8 was appended
within this section before any implementation; no source or test file was
edited. Anchors were re-verified against the working tree (`keysetCursor.ts`
815 lines, `boundedReadContract.ts` 264, `keysetCursor.test.ts` 754,
`boundedReadContract.test.ts` 512). Findings closed:

Audit A (round 2):

- MEDIUM: millisecond wire timestamps versus microsecond `timestamp` columns
  cause page gaps at boundaries → K8 (3-or-6-digit wire, prefix-only calendar
  check, no reformatting, 03-L02 `to_char(... .US ...)` obligation and
  microsecond tie-group walk, K6 exactness sentence).

Audit B (round 2):

- MEDIUM: no binding land order or per-file writer plan, and no statement of
  the expected red window → K4 W1-W4 plan, fast gates, orchestrator-only
  combined gates, expected-red statement and a four-file 1,000-line stop rule.

Round-2 LOWs (orchestrator disposition, all closed in place):

- LOW: K6 did not state which body sentence it amends; K1 said K6/K7 do not
  "touch" functions whose JSDoc K7 edits → K6 contract-text amendment of
  `:199-200` (with `:184` and `:188-197` unchanged) and K1 "changes the
  behavior of" wording.
- LOW: the scope-version rule named only pages → K1 now binds every scope
  family (`03-L02:373`, `:733`, `:878`).
- LOW: K3 (g) walk initialization, per-step self-exclusion assertion and the
  `evalFragment` columns argument were implicit → K3 (g) pins them.
- LOW: the NOT NULL precondition of K6 had no downstream enforcement → K5
  spec-vs-schema test obligation.
- LOW: no stated reason why the real-PostgreSQL proof of the bound may wait for
  03-L02 → K6 deferral bullet.

### Round-4 record (2026-09-24; after audits R3)

Round-3 re-audits A and B ran against this section at HEAD `ae6bea8a`
(uncommitted). K3, K4, K5, K6 and K8 were amended in place before any
implementation; no source or test file was edited. Driver anchors were
verified in `node_modules/postgres/src/{types,connection}.js`,
`node_modules/drizzle-orm/postgres-js/driver.js`, `core/db/client.ts` and
`core/db/sessionClient.ts`. Findings closed:

- MEDIUM (audit B): K8 claimed the timestamp param reaches PostgreSQL as the
  unchanged wire string; raw postgres.js clients truncate to milliseconds →
  K8 item 1 rewritten with driver citations; K5 and K8 item 2 bind keyset
  reads to the Drizzle-wrapped client, a non-UTC TimeZone real-PostgreSQL walk,
  and the dedicated-session wrap-or-forbid obligation.
- LOW (audit A): K6 optional PG-arm sentence contradicted K3/K6 → deleted (the
  arm stays unchanged); K8 decode anchor corrected to `:798-800`.
- LOW (audit B): K4 lets W3/W4 run the airtight single/two-suite Vitest forms;
  the expected-red statement now applies only to early runs.
- INFO: K3 lexicographic-comparator validity sentence; K8 wall-time wording;
  record headings renamed consistently.

### Round-5 record (2026-09-25; after the post-implementation audits)

Implementation landed per K1..K8 (line counts before the LOW pass):
`keysetCursor.ts` 823, `boundedReadContract.ts` 306, `keysetCursor.test.ts`
922, `boundedReadContract.test.ts` 790 — all under the 1,000-line gate.

Gates: airtight Vitest 68 pass / 1 skip (owner-map skip); lifecycle 4/4
airtight; eslint 0; core `tsc` 0; root `tsc` 0.

Post-implementation audit: 2 lenses, PASS / PASS. LOWs closed in-leaf:

- K6: the test now uses an explicit lookup table instead of re-deriving the
  implementation formula.
- K6: added a non-native null-placement vector.
- K6: integer bound parameters are pinned.
- K8: 8-digit and 9-digit fractional-second rejections added.

K3 AMENDMENT (binding): the pre-existing test "keeps cursor fields immutable
API state" was vacuous (it froze its own array and asserted on it). It is
replaced by an assertion that the real returned output is frozen. This is the
second existing expectation changed by this leaf (besides `:389-390`) and is
recorded here as binding.

Mechanical lint repair (no behavior change): the unused `Array.from` callback
parameter in the prefix-tie dataset builder (HEAD `:314`) was removed; test
names, data, control flow and assertions are unchanged.
