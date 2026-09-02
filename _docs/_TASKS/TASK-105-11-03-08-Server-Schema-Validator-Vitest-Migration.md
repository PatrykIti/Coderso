# TASK-105-11-03-08: Server Schema Validator Vitest Migration
# FileName: TASK-105-11-03-08-Server-Schema-Validator-Vitest-Migration.md

**Parent Subtask:** TASK-105-11-03
**Priority:** High
**Category:** QA + Platform
**Estimated Effort:** Medium
**Dependencies:** TASK-105-11-03-07
**Status:** ⏳ To Do

---

## Overview

Migrate the eight Bun-free behavior cases in `tests/unit/server/schemaValidator.test.ts` into the owning validation Vitest suites. This is a test-only lane migration with no production changes. The source suite is pure: it exercises the shared schema validator and strict validation schemas without Bun runtime, database, media, settings, or public-write transport coupling.

The migration is deliberately split by schema owner. The existing generic `tests/vitest/validation/schemaValidator.test.ts` remains unchanged and read-only; it is not a destination writer and must not be deleted or duplicated.

## Scope

1. Preserve all eight source behavior cases, payloads, strictness checks, and `ApiError` rejection assertions.
2. Move post-owned date-time behavior into the existing post schema suite.
3. Move content metadata and all-entries query behavior into a new content schema suite.
4. Move assistant planning/action intake behavior into a new assistant-action schema suite.
5. Delete the legacy Bun test only after every behavior case is represented in the destination suites.
6. Keep all production validation modules and the generic Vitest schema-validator suite read-only.

### Eight behavior cases

The source suite's eight behavior cases are preserved as these exact semantic groups:

1. valid post/content date-time metadata;
2. invalid date-time input maps to `ApiError` code `validation_error` with status 400;
3. content metadata accepts visibility/access-password fields while rejecting the invalid enum, an access password over 200 characters, and unknown fields;
4. the content all-entries query accepts `{}` and rejects an unknown `type` field;
5. assistant action planning rejects a client-supplied resource catalog;
6. assistant planning accepts the strict basic and advanced site-builder intake states;
7. assistant planning rejects tampered basic-intake `rawHtml`;
8. assistant planning rejects tampered advanced-intake option IDs.

Where case 1 spans post and content schemas, retain each owner-specific assertion in its corresponding destination suite without changing the source payload meaning or assertion strength.

## Exact Writer and Reader Scope

### Exact four test writers, and no others

- **DELETE** `tests/unit/server/schemaValidator.test.ts`
- **EXTEND** `tests/vitest/validation/postSchemas.test.ts`
- **CREATE** `tests/vitest/validation/contentSchemas.test.ts`
- **CREATE** `tests/vitest/validation/assistantActionSchemas.test.ts`

No other test file may be created, deleted, or modified by this leaf. In particular, retain `tests/vitest/validation/schemaValidator.test.ts` unchanged as a read-only generic consumer.

### Read-only production and contract inputs

The implementer may read, but must not modify:

- `core/server/validation/schemaValidator.ts`;
- `core/server/validation/postSchemas.ts`;
- `core/server/validation/contentSchemas.ts`;
- `core/server/validation/assistantActionSchemas.ts`;
- `core/server/errorHandler.ts`;
- `core/services/assistant/assistantSiteBuilderIntakeTypes.ts`;
- the current post schema Vitest suite;
- the current generic Vitest schema-validator suite;
- `tests/bun-lane-manifest.json` for lane context only.

No production writer exists for this task. Runner documentation, README, manifest, board, changelog, and the four remaining Bun server suites are outside the writer set.

## Implementation Pseudocode

1. Read the current Bun suite and copy its eight behavior cases into an ownership map. Preserve payloads, schema entry points, strict unknown-field checks, and exact `ApiError` code/status assertions.
2. Extend `tests/vitest/validation/postSchemas.test.ts` with the post-owned date-time behavior and its invalid-input assertion. Keep the existing post tests intact.
3. Create `tests/vitest/validation/contentSchemas.test.ts` with the content date-time, metadata visibility/access-password/unknown-field, and all-entries query behavior. Keep the schema's strict rejection semantics visible in assertions.
4. Create `tests/vitest/validation/assistantActionSchemas.test.ts` with resource-catalog rejection, strict basic/advanced acceptance, basic `rawHtml` tamper rejection, and advanced option-ID tamper rejection. Use the existing assistant intake types and schema exports rather than duplicating production contracts.
5. Run the destination suites and the retained generic suite. Confirm each of the eight source behavior groups has one destination assertion set before deleting `tests/unit/server/schemaValidator.test.ts`.
6. If a destination requires a production import or a weaker assertion, stop and report contract drift. Do not add casts, permissive schemas, duplicate generic tests, or production fallbacks to make the migration pass.

## Security Contract

This is not an API, route, authentication, authorization, CSRF, rate-limit, persistence, or public-write implementation. No security boundary or production behavior changes. The migration must preserve strict reject-unknown behavior, exact validation errors, intake tamper rejection, and resource-catalog trust boundaries. Test fixtures and receipts must contain no credentials, nonce values, provider keys, or raw user data.

## Testing Requirements

This contract-authoring pass runs no tests. The future implementation gate must run the exact owning Vitest paths:

- `tests/vitest/validation/postSchemas.test.ts`;
- `tests/vitest/validation/contentSchemas.test.ts`;
- `tests/vitest/validation/assistantActionSchemas.test.ts`;
- retained read-only `tests/vitest/validation/schemaValidator.test.ts`.

The implementation must also run the repository-required static checks for the changed contract, including `bun --cwd core lint`, `bun --cwd core lint:types`, Markdown/ancestry/line-cap checks, and `git diff --check`. The four remaining Bun server suites are not moved or modified by this child and are validated by their owning runtime/DB/security contracts.

## Documentation Updates Required

1. This leaf writes no runner documentation, manifest, board, changelog, or parent task file during implementation.
2. Send the final four-path migration receipt and the eight-case mapping to `TASK-105-11-03` and `TASK-105-11-03-05`.
3. Send the lane delta to `TASK-105-08-11`, which owns `tests/RUNNER_OWNERSHIP.md` and any contract-authorized manifest follow-through. Do not edit `tests/bun-lane-manifest.json` here.
4. Send the final receipt to `TASK-105-11-04`, which owns `tests/README.md`, family closure, and changelog follow-through.
5. Preserve the generic Vitest schema-validator suite as an existing read-only compatibility/consumer check.

## Receipt, Ordering, and Line-Cap Rules

- The receipt must name exactly the four writer paths, the eight behavior groups, the retained generic suite, and the no-production-change rule.
- Destination assertions must be in place and the exact Vitest suite receipt must be green before the legacy Bun file is deleted. The four remaining Bun server suites are a separate retained-lane receipt.
- Every added or modified test/contract file must remain at or below 1,000 physical lines. No production file is modified by this leaf, and no line-cap waiver is permitted.
- Keep the receipt deterministic, bounded, and secret-safe. Do not introduce generated hashes, retry ledgers, broad coverage claims, or terminal envelopes as independent gates.

## Sub-Tasks

1. Map the eight source behavior groups to post, content, and assistant schema owners.
2. Extend the post suite and create the content and assistant suites with exact assertions.
3. Run the four target Vitest paths, verify the mapping, and delete the legacy Bun suite.
4. Publish the migration and runner-document handoff receipts.

## Acceptance Criteria

1. All eight source behavior cases are represented in the owning Vitest suites with unchanged validation and rejection semantics.
2. Exactly four test writers are used: one delete, one extension, and two creations named above.
3. The generic `tests/vitest/validation/schemaValidator.test.ts` remains present and unchanged.
4. No production, runner-document, manifest, board, changelog, or remaining Bun-suite file is modified.
5. The exact target suites, static checks, line-cap checks, and diff checks pass before closure.
