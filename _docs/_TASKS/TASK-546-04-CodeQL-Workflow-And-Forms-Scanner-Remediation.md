# TASK-546-04: CodeQL Workflow and Forms Scanner Remediation

# FileName: TASK-546-04-CodeQL-Workflow-And-Forms-Scanner-Remediation.md

**Parent Task:** TASK-546
**Priority:** High
**Category:** Static Analysis / Workflow Security / Test Modularity
**Estimated Effort:** Large
**Dependencies:** TASK-546-02-L01
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Scope

Remove the exact current CodeQL findings in the TASK-540 and TASK-543 workflow
harnesses and the Forms validation regression suite. The remediation must remove
the vulnerable source/data-flow shapes; it must not dismiss an alert, add a
scanner annotation, weaken validation, downgrade a dependency, or change product
UI/UX, routes, schemas, smoke scenarios, result schemas, or workflow ownership.

This child is a narrow owner-approved carveout from TASK-545. TASK-545 retains
its broad workflow-convergence program and changelog 1257. These leaves may edit
only the exact scripts/tests below, must read their current shared-tree state
before writing, and must not reformat or opportunistically modernize unrelated
workflow code.

## Grounded finding map

| Alerts | Current anchor | Sole leaf | Required structural result |
|---|---|---|---|
| #30 | `task-540-smoke-executor.mjs:2151` | L01 | remove the substring self-replacement while preserving the capture key |
| #90 | `task-540-smoke-executor.mjs:11010` | L01 | URL travels as validated data into a fixed run-code operation |
| #91-#92 | `task-540-smoke-executor.mjs:11806` | L01 | selector/value travel as data, never source text |
| #93-#94 | `task-540-smoke-executor.mjs:11823` | L01 | type selector/value travel as data, never source text |
| #95-#96 | `task-540-smoke-executor.mjs:11834` | L01 | press selector/key travel as data, never source text |
| #97 | `task-540-smoke-executor.mjs:11844` | L01 | focus selector travels as data, never source text |
| #98 | `task-540-smoke-executor.mjs:25534` | L01 | the legacy-selector negative probe uses the same safe builder |
| #100 | `task-540-smoke-executor.mjs:3885` | L01 | the credential-bearing bootstrap-restoration frame remains exact but omits its unnecessary fast `frameSha256`; the separate credential receipt path also uses fixed facts without hashing |
| #77-#79 | `task-543-implement.mjs:2657` | L02 | delayed-close values use a fixed operation plus validated data |
| #80 | `task-543-implement.mjs:2659` | L02 | restoration values use a fixed operation plus validated data |
| #81-#84 | `task-543-implement.mjs:2676` | L02 | double-close values use a fixed operation plus validated data |
| #85 | `task-543-implement.mjs:2687` | L02 | assertion selection is an allowlisted operation id, not a code fragment |
| #86-#89 | `task-543-implement.mjs:2698` | L02 | reset seed/selectors/URLs use a validated payload channel |
| #99 | `task-543-implement.mjs:2016` | L02 | the password-fill receipt bypasses the fast integrity hasher |
| #101 | `tests/vitest/forms/validation.test.ts:1069` | L03 | remove the executable pathological regex fixture |
| #102 | `tests/vitest/forms/validation.test.ts:1663` | L03 | use an equivalent linear conservatively rejected fixture |

The anchors describe the PR alert snapshot and may move after earlier edits. The
alert IDs and their data flows, not stale numeric line positions, are canonical.

## Leaves and exclusive ownership

| ID | Exclusive ownership | Status |
|---|---|---|
| TASK-546-04-L01 | `_docs/_workflows/task-540-smoke-executor.mjs`; only its frozen SHA pin in `task-540-implement.mjs`; new `tests/unit/workflows/task540SmokeExecutorSecurity.test.ts` | ✅ Done |
| TASK-546-04-L02 | `_docs/_workflows/task-543-implement.mjs`; new `tests/unit/workflows/task543ImplementSecurity.test.ts` | ✅ Done |
| TASK-546-04-L03 | the four split Forms validation Vitest files named below; only the repeated-star fixture occurrences in `formRuntimeResolver.test.ts`; only the validation-suite path list in `_docs/_workflows/task-536-implement.mjs` | ✅ Done |

L03's final four-file test inventory is exact:

```text
tests/vitest/forms/validation.test.ts
tests/vitest/forms/validation-field-schema.test.ts
tests/vitest/forms/validation-patterns.test.ts
tests/vitest/forms/validation-submission.test.ts
```

## Shared run-code data contract

Every data-bearing Playwright command follows one contract in both workflow
scripts:

1. Select a literal allowlisted operation id. An external selector, URL, key,
   value, seed, scenario kind, or assertion body can never select arbitrary
   JavaScript or become a raw code fragment.
2. Validate an exact-key operation-specific payload before serialization. Reject
   unknown keys, wrong scalar types, NUL, non-finite numbers, and values outside
   the existing selector/URL/text budgets. Apply a hard 65,536-byte UTF-8 cap to
   the complete canonical JSON payload; operation-specific limits stay tighter.
3. Encode the canonical JSON as unpadded base64url and require the canonical
   alphabet `^[A-Za-z0-9_-]+$`, a maximum encoded length of 87,384 characters,
   and decode/re-encode equality. No raw payload text crosses the code boundary.
4. Insert only that encoded value into a fixed operation template. Produce the
   JavaScript string literal through `JSON.stringify` plus CodeQL's
   context-specific escaping for `<`, `>`, `/`, U+2028, and U+2029; JSON already
   owns quote, backslash, and control-character escaping. Never interpolate a
   returned assertion/body/source string into another executable template.
5. Inside the fixed browser template, validate alphabet and length again,
   decode with fatal UTF-8 semantics, parse JSON, revalidate exact keys/types,
   and use the values only as Playwright/DOM API arguments. Decoded data is never
   evaluated, passed to `Function`, or concatenated back into source.

This follows the `js/bad-code-sanitization` recommendation while making the
stronger architectural separation explicit: executable text is repository-owned
and static; workflow/runtime values are bounded data.

## Shared receipt-integrity contract

- Password storage remains owned by the existing Argon2 service and its tests.
- Detect every credential-fill representation before generic evidence hashing.
  TASK-540's native fill must retain its exact raw stdout of one LF byte, empty
  stderr, discarded marker, and subsequent normalized `{"ok":true}\n` success;
  compare precomputed SHA-256 constants for LF and the empty stream without
  calling the digest helper. TASK-543's nested and timeline receipts retain
  their exact empty stdout/stderr, null parsed output, and empty-stream digest
  constants. Require the existing exact command, trusted context/scope, status,
  and schema facts for each representation.
- Do not call SHA-256 with a password, password-derived value, credential command
  payload, credential stdout/stderr, or a projection containing such data.
  Credential validation compares fixed empty/redacted facts directly.
- Rename/narrow the remaining fast digest helper to evidence integrity and pass
  only an explicit secret-free projection. Preserve exact non-secret receipt,
  file, manifest, and screenshot integrity checks.
- Never log, include in a thrown error, test fixture, snapshot, command display,
  or evidence object an actual credential or environment value.

## Security Contract

- **Endpoint visibility:** no route is added, removed, or made public.
- **Auth/RBAC:** current sessions, API-key scopes, and permissions are unchanged.
- **CSRF:** no request contract changes; all existing admin/public write checks
  remain mandatory.
- **Rate limits and anti-abuse:** current buckets, nonce/signature/HMAC, captcha,
  and replay protections are unchanged.
- **Validation:** workflow payloads become stricter and fail closed; Forms schema
  and normalization behavior remains byte/behavior compatible.
- Scanner configuration, allowlists, baselines, inline suppressions, alert
  dismissals, `eval`, `Function`, and shell-escaping workarounds are forbidden.

## Land order and collision guards

Land strictly `TASK-546-04-L01 → TASK-546-04-L02 → TASK-546-04-L03`.
Each leaf passes its focused gate before the next begins. Once all three leaves
are landed and validated, L03 hands the tree to `TASK-546-03-L01`. That closure
leaf exclusively records the three leaf statuses and then this child as
terminal in dependency order; source validation must finish before that status
write begins.

TASK-545 must read the landed TASK-540/TASK-543 scripts fresh and must not revert
this security remediation. TASK-546-04 must not edit any other TASK-545-owned
workflow, task/changelog metadata, product source, scanner configuration, or
`_TMP-pr-feature-tasks-fixes.md`. Changelog 1259 remains created only by
TASK-546-03-L01. The only additional workflow write is L01's exact
`FROZEN_SMOKE_EXECUTOR_SHA256` value in `task-540-implement.mjs`, required
because that workflow verifies the executor byte identity; no other byte in the
implement workflow may change.

## Combined validation

```bash
node --check _docs/_workflows/task-540-smoke-executor.mjs
node --check _docs/_workflows/task-540-implement.mjs
node --check _docs/_workflows/task-543-implement.mjs
node --check _docs/_workflows/task-536-implement.mjs
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
bun test tests/unit/workflows/task540SmokeExecutorSecurity.test.ts \
  tests/unit/workflows/task543ImplementSecurity.test.ts

bunx vitest run --config vitest.config.ts tests/vitest/forms/validation.test.ts
bunx vitest run --config vitest.config.ts tests/vitest/forms/validation-field-schema.test.ts
bunx vitest run --config vitest.config.ts tests/vitest/forms/validation-patterns.test.ts
bunx vitest run --config vitest.config.ts tests/vitest/forms/validation-submission.test.ts
bunx vitest run --config vitest.config.ts tests/vitest/forms/formRuntimeResolver.test.ts
bunx vitest run --config vitest.config.ts \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/validation-field-schema.test.ts \
  tests/vitest/forms/validation-patterns.test.ts \
  tests/vitest/forms/validation-submission.test.ts \
  tests/vitest/forms/formRuntimeResolver.test.ts

wc -l tests/unit/workflows/task540SmokeExecutorSecurity.test.ts \
  tests/unit/workflows/task543ImplementSecurity.test.ts \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/validation-field-schema.test.ts \
  tests/vitest/forms/validation-patterns.test.ts \
  tests/vitest/forms/validation-submission.test.ts \
  tests/vitest/forms/formRuntimeResolver.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
git diff --check
```

Every named test file must be at most 1,000 physical lines. The four Forms files
must remain independently runnable and together preserve the 218-test baseline.
Run targeted Semgrep against both changed workflow scripts and all five touched
Forms test files before the full strict scan. A local CodeQL CLI is not installed in the
authoring container; the next PR CodeQL run is the authoritative alert-closure
proof. This limitation never permits a local regression, Semgrep, or strict-scan
failure to be treated as passing.

## Acceptance criteria

- All 27 mapped alerts (#30 and #77-#102) have a source-level remediation with
  no suppression or downgrade.
- Hostile strings remain byte-identical data after round-trip decoding and can
  neither terminate a literal nor execute a sentinel side effect.
- The credential-bearing TASK-540 bridge frame and both workflows' credential
  receipts are validated without sending credential-tainted values to a fast
  digest; normal secret-free integrity evidence remains exact.
- TASK-540/TASK-543 command order, scenarios, observable browser behavior,
  schemas, cleanup, and evidence cardinality remain unchanged.
- Forms behavior and 218 assertions remain intact across four cohesive files,
  each below 1,000 lines, and TASK-536's exact gate path list is synchronized.
- L01, L02, then L03 are landed and validated before handoff to
  TASK-546-03-L01, which alone records those leaves and this child terminal.
