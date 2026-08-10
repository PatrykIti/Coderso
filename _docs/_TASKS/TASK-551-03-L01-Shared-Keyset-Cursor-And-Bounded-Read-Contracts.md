# TASK-551-03-L01: Shared Keyset Cursor and Bounded Read Contracts
# FileName: TASK-551-03-L01-Shared-Keyset-Cursor-And-Bounded-Read-Contracts.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-03
**Priority:** Critical
**Category:** Database / Performance / Domain / Runtime Adapter
**Estimated Effort:** Medium
**Dependencies:** TASK-551-01-L02, TASK-551-02-L02, TASK-551-05-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

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
