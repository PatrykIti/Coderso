# TASK-546-04-L03: Remediate Forms Regex and Test Modularity

# FileName: TASK-546-04-L03-Remediate-Forms-Regex-And-Test-Modularity.md

**Parent Task:** TASK-546
**Parent Subtask:** TASK-546-04
**Priority:** High
**Category:** Test Security / Vitest Modularity / Workflow Gate Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-546-04-L02
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Exclusive ownership

This leaf exclusively owns:

- `tests/vitest/forms/validation.test.ts`;
- new `tests/vitest/forms/validation-field-schema.test.ts`;
- new `tests/vitest/forms/validation-patterns.test.ts`;
- new `tests/vitest/forms/validation-submission.test.ts`;
- `tests/vitest/forms/formRuntimeResolver.test.ts` only for its two occurrences
  of the same repeated-star legacy fixture;
- only the TASK-536 validation-suite path list in
  `_docs/_workflows/task-536-implement.mjs`.

It removes CodeQL alerts #101 and #102 and splits the current 1,695-line test by
cohesive responsibility. It must not change `core/services/forms/validation.ts`,
any production schema/normalizer, TASK-536 status/changelog/history, unrelated
TASK-536 workflow logic, scanner configuration, or another test. This is a test
organization and safe-fixture change with zero Forms/UI/runtime behavior change.

## Exact cohesive split

Move whole tests without rewriting or weakening assertions:

| Final file | Owned responsibility |
|---|---|
| `validation.test.ts` | normalization and field behavior currently before `describe("strict field document schemas")` |
| `validation-field-schema.test.ts` | the complete `strict field document schemas` suite |
| `validation-patterns.test.ts` | the complete `field normalization identity and safe patterns` suite |
| `validation-submission.test.ts` | the complete `strict submission and upload envelopes` suite |

Each file declares only the imports, Ajv validators, constants, and small fixture
builders it actually needs. Do not move arbitrary line ranges, create a generic
fixture dumping ground, add cross-file execution-order coupling, or import one
test file from another. Every file must run alone and remain at most 1,000
physical lines.

## Regex remediation

The two alerts point to the same known pathological fixture
`^a*a*a*a*a*a*a*a*a*a*b$`, once in the rejected-pattern matrix and once in the
stored-pattern fail-closed test. Do not execute, compile, forward, or preserve
that fixture in comments/snapshots.

Use the explicit linear-time conservatively rejected grouped-repetition fixture
`^(ab)+$` instead. It is safe for a backtracking JavaScript engine because each
iteration consumes the fixed token `ab`, while the Forms safety policy still
rejects quantified groups. Keep the existing nested/overlapping repetition
classes that are independently required by the grammar contract, but represent
the standalone overlapping-alternative assertion currently written as
`^(a|a{2})+$` with the linear, disjoint `^(a|b)+$` quantified-group fixture.
Do not retain or add a known expensive pattern merely to preserve fixture
variety; the policy branch and rejection behavior, not an unsafe engine input,
is the test contract.

## Implementation Pseudocode

```ts
// validation-patterns.test.ts
const LINEAR_POLICY_REJECTED_PATTERN = "^(ab)+$";
const LINEAR_ALTERNATIVE_REJECTED_PATTERN = "^(a|b)+$";

test("accepts simple patterns and rejects every unsafe grammar class", () => {
  const rejected = [
    // existing policy cases, with the pathological repeated-a-star fixture removed
    LINEAR_POLICY_REJECTED_PATTERN,
  ];
  for (const pattern of rejected) {
    expect(isSafeFormFieldPattern(pattern)).toBe(false);
    expect(() => compileSafeFormFieldPattern(pattern, "custom_failure")).toThrow(
      "custom_failure"
    );
  }
  expect(isSafeFormFieldPattern(LINEAR_ALTERNATIVE_REJECTED_PATTERN)).toBe(false);
});

// validation-submission.test.ts
test("rejects unsafe stored patterns before regex evaluation", () => {
  const field = normalizedTextField();
  const legacyField = {
    ...field,
    settings: { pattern: "^(ab)+$" },
  };
  expect(() => validateSubmissionPayload({ value: "a".repeat(32) }, [legacyField])).toThrow(
    "form_payload_invalid"
  );
});
```

The exact test count across the four split files remains 218. Preserve all
current assertion values except exactly five pattern occurrences: both
repeated-star occurrences in `validation.test.ts`, both matching occurrences in
`formRuntimeResolver.test.ts`, and the one overlapping-alternative occurrence
replaced by `LINEAR_ALTERNATIVE_REJECTED_PATTERN`. Mechanical imports/setup for
the cohesive split may move without changing assertions.

## TASK-536 gate synchronization

In `_docs/_workflows/task-536-implement.mjs`, change only the L02 targeted Vitest
path segment so it names all four exact files before the existing Forms companion
suites:

```text
tests/vitest/forms/validation.test.ts
tests/vitest/forms/validation-field-schema.test.ts
tests/vitest/forms/validation-patterns.test.ts
tests/vitest/forms/validation-submission.test.ts
```

Do not change its command runner, environment prefix, companion test paths,
task phases, prompts, metadata, or closure behavior. `node --check` plus a
focused static assertion must prove no stale single-file gate silently omits the
extracted suites.

## Security Contract

- **Endpoint visibility/auth/RBAC/CSRF/rate limit/anti-abuse:** no route or
  product security contract changes.
- Strict reject-unknown Forms schemas, normalization, field/submission limits,
  regex policy, error codes, and persistence/runtime behavior remain unchanged.
- No pathological regex is compiled or evaluated by the tests. The replacement
  fixture is linear but still rejected by the conservative policy before normal
  submission matching.
- No scanner suppression, allowlist, alert dismissal, timeout inflation,
  skipped test, weakened assertion, or production fallback is allowed.

## Validation

Run each suite independently first, then the exact combined gate:

```bash
bunx vitest run --config vitest.config.ts tests/vitest/forms/validation.test.ts
bunx vitest run --config vitest.config.ts tests/vitest/forms/validation-field-schema.test.ts
bunx vitest run --config vitest.config.ts tests/vitest/forms/validation-patterns.test.ts
bunx vitest run --config vitest.config.ts tests/vitest/forms/validation-submission.test.ts
bunx vitest run --config vitest.config.ts tests/vitest/forms/formRuntimeResolver.test.ts
bunx vitest run --config vitest.config.ts \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/validation-field-schema.test.ts \
  tests/vitest/forms/validation-patterns.test.ts \
  tests/vitest/forms/validation-submission.test.ts
node --check _docs/_workflows/task-536-implement.mjs
node -e 'const fs=require("node:fs");const s=fs.readFileSync("_docs/_workflows/task-536-implement.mjs","utf8");const m=s.match(/id: "536-04-L02",[\s\S]*?gate: `([^`]*)`/u);if(!m)throw new Error("TASK-536 L02 gate missing");const got=[...m[1].matchAll(/tests\/vitest\/forms\/[A-Za-z-]+\.test\.tsx?/gu)].map((x)=>x[0]);const expected=["tests/vitest/forms/validation.test.ts","tests/vitest/forms/validation-field-schema.test.ts","tests/vitest/forms/validation-patterns.test.ts","tests/vitest/forms/validation-submission.test.ts","tests/vitest/forms/formSettings.test.ts","tests/vitest/forms/fileField.test.ts","tests/vitest/forms/formRuntimeResolver.test.ts"];if(JSON.stringify(got)!==JSON.stringify(expected))throw new Error("TASK-536 Forms gate path drift")'
bun --cwd core lint:types
bun --cwd core lint
wc -l tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/validation-field-schema.test.ts \
  tests/vitest/forms/validation-patterns.test.ts \
  tests/vitest/forms/validation-submission.test.ts \
  tests/vitest/forms/formRuntimeResolver.test.ts
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten \
  --config p/security-audit --config p/nodejs --config p/typescript \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/validation-field-schema.test.ts \
  tests/vitest/forms/validation-patterns.test.ts \
  tests/vitest/forms/validation-submission.test.ts \
  tests/vitest/forms/formRuntimeResolver.test.ts
git diff --check
```

Require 218 tests across the four split files, a green independently run
resolver companion, zero failures, and every touched test at most 1,000 lines.
Re-run any named failure alone before classifying it. After this focused gate,
handoff to TASK-546-03-L01 for the full Vitest lane, coverage, precommit, gates,
strict scan, and final PR CodeQL rerun evidence.

## Acceptance criteria

- Alerts #101 and #102 are removed without suppression and no known expensive
  repeated-star or overlapping-alternative fixture remains in the five touched
  test files.
- The linear `^(ab)+$` fixture proves the same conservative rejection behavior.
- All 218 tests pass individually by file and together; no assertion or Forms
  product behavior was weakened.
- Each resulting test file contains at most 1,000 physical lines.
- TASK-536's exact validation gate names all four files and no other workflow
  behavior or historical metadata changed.
- This leaf and TASK-546-04 hand a green, source-stable tree to TASK-546-03-L01.
