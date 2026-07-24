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
type CursorPayload = StrictReadonly<{
  formatVersion: 1;
  keyVersion: number;
  issuedAtUnixSeconds: number;
  scope: string;
  direction: "next" | "previous";
  sort: readonly CursorScalar[];
  id: string;
}>;

export type PaginationCursorKeyring = StrictReadonly<{
  current: { version: number; secret: Uint8Array };
  previous?: { version: number; secret: Uint8Array };
}>;

function parsePageLimit(value: unknown, options = { default: 50, max: 100 }): PageLimit {
  // Reject non-integer, negative, zero, overflow, and unknown option fields.
}

export function loadPaginationCursorKeyring(env: NodeJS.ProcessEnv): PaginationCursorKeyring {
  // PAGINATION_CURSOR_SECRET is required and must encode to at least 32 bytes.
  // PAGINATION_CURSOR_KEY_VERSION defaults to 1 and is an integer in 1..2^31-1.
  // PAGINATION_CURSOR_PREVIOUS_SECRET and PAGINATION_CURSOR_PREVIOUS_KEY_VERSION
  // are optional as a pair; the previous version must be lower and distinct.
  // Reject missing, weak, partial, duplicate-version, or malformed configuration.
}

function encodeKeysetCursor(payload: CursorPayload, keys: PaginationCursorKeyring): string {
  // Canonical JSON + base64url + HMAC-SHA-256; never serialize credentials.
  // Always stamp the current key version and current wall-clock issue time.
}

function decodeKeysetCursor(input: string, expectedScope: string, keys: PaginationCursorKeyring): CursorPayload {
  // Select only the declared current/previous key version, then verify HMAC in
  // constant time. Bound bytes, age, future skew, format, tuple, and scope.
  // Throw cursor_invalid or cursor_scope_mismatch without echoing the input.
}

function buildKeysetPredicate(spec: KeysetSpec, cursor: CursorPayload): SqlFragment {
  // Lexicographic predicate matching ORDER BY, null ordering, and unique id.
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

`toBoundedPage(rows, limit, encode)` accepts at most `limit + 1` rows and emits
`items`, `nextCursor`, and `hasMore`. Errors are machine-readable:
`page_limit_invalid`, `cursor_invalid`, `cursor_scope_mismatch`,
`cursor_version_unsupported`, and lifecycle-only
`pagination_cursor_keyring_unavailable`.

The cursor lifetime is code-owned at 24 hours with at most 60 seconds of future
clock skew. Rotation publishes a higher current key version while retaining at
most one previous key for the 24-hour overlap; removing the previous pair
invalidates any remaining old cursors. A process that mounts the paginated
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

- Property-style round trips cover equal timestamps, nulls, UTF-8 IDs, both
  directions, and stable canonical encoding.
- Mutation, truncation, wrong scope/secret/version, oversized input, duplicate
  sort fields, and unknown properties fail closed without input disclosure.
- Missing/short current secrets, incomplete previous-key pairs, duplicate or
  non-monotonic key versions, expired cursors, and future issue times fail
  closed; current and previous keys pass only during the defined overlap.
- Boundary tests pin defaults 50, maximum 100, and exactly `limit + 1` lookahead.
- Import test proves the two pure production modules are Bun/runtime/DB-client
  free; only the named server adapter may import the lifecycle registry.
- Contract tests pin the exact exported names `PaginationCursorKeyring`,
  `loadPaginationCursorKeyring`,
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
- Cursor HMAC keys come only from `PAGINATION_CURSOR_SECRET` and its optional
  rotation pair through explicit dependencies. They are never persisted,
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
  24-hour expiry.
- The handoff registers exactly one participant, loads exactly once per started
  lifecycle, exposes one immutable required value, and requires zero environment
  reads from module registration, route handlers, or read services.
- Default/max limits are 50/100 and cannot be bypassed through coercion.
- Produced predicates always include the declared unique tie-breaker and match
  the requested sort/null order in all test matrices.
