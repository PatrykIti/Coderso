# TASK-546-04-L02: Remediate TASK-543 CodeQL Findings

# FileName: TASK-546-04-L02-Remediate-Task-543-CodeQL-Findings.md

**Parent Task:** TASK-546
**Parent Subtask:** TASK-546-04
**Priority:** High
**Category:** Workflow Security / Static Analysis
**Estimated Effort:** Medium
**Dependencies:** TASK-546-04-L01
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Exclusive ownership

This leaf is the sole TASK-546 writer of:

- `_docs/_workflows/task-543-implement.mjs`;
- new `tests/unit/workflows/task543ImplementSecurity.test.ts`.

It removes CodeQL alerts #77-#89 and #99. It must not edit Posts product source,
TASK-543 task/changelog history, another workflow, scanner configuration, the
Forms suite, TASK-545 metadata, or unrelated dirty-tree files. Read the landed
L01 data/receipt contract fresh, but do not introduce a shared file or edit the
TASK-540 script from this leaf.

## Grounded remediation

| Alerts | Existing flow | Required change |
|---|---|---|
| #77-#79 | `evidenceAssertionBody("dirty-delayed-close")` interpolated into run-code | literal operation id plus fixed template |
| #80 | pending-revert-restoration body interpolation | literal operation id plus fixed template |
| #81-#84 | double-close selector/body interpolation | exact payload schema plus fixed template |
| #85 | `expectedEvidenceAssertionCommand` interpolates a returned body | switch to a whole static command per allowlisted scenario kind |
| #86-#89 | reset seed/selectors/URLs interpolated at line 2698 | validated reset payload through encoded data channel |
| #99 | `receiptIntegrityValid` hashes the password-fill receipt | dispatch credential scope before the generic hasher |
| adjacent returned-fragment sink | `transientAssertionBody` returns text that `expectedTransientAssertionCommands` interpolates into run-code | remove the returned fragment and select complete fixed transient operations through the same closed operation builder |

Line numbers are alert-snapshot anchors. Trace the current symbols after L01
lands and remove the complete tainted path, not only the highlighted token.

## Implementation Pseudocode

```js
const RUN_CODE_PAYLOAD_MAX_BYTES = 65_536;
const EVIDENCE_OPERATIONS = new Set([
  "assert-transient-dirty-delayed-close",
  "assert-transient-pending-revert-restoration",
  "assert-transient-failure-retry",
  "assert-transient-double-close",
  "assert-clean-close",
  "assert-dirty-delayed-close",
  "assert-pending-revert-restoration",
  "assert-failure-retry",
  "assert-double-close",
  "assert-table-keyboard",
  "assert-mid-viewport-metadata",
  "reset-scenario",
]);
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function expectedEvidenceAssertionCommand(scenario) {
  const operation = requireKnownScenarioOperation(scenario.kind);
  const payload = validateEvidencePayload(operation, { kind: scenario.kind });
  return smokeRunOperation(operation, payload); // never receives JavaScript text
}

function expectedTransientAssertionCommands(scenario) {
  if (!scenarioHasTransientAssertion(scenario.kind)) return [];
  const operation = requireKnownTransientScenarioOperation(scenario.kind);
  const payload = validateTransientPayload(operation, { kind: scenario.kind });
  return [smokeRunOperation(operation, payload)]; // complete fixed operation
}

function expectedScenarioResetCommand(scenario, fixture) {
  return smokeRunOperation(
    "reset-scenario",
    validateResetPayload({
      scenarioId: scenario.id,
      fixtureId: fixture.id,
      title: fixture.title,
      editorUrl: fixture.editorUrl,
    })
  );
}

function smokeRunOperation(operation, payload) {
  const encoded = encodeBoundedCanonicalBase64Url(operation, payload, {
    maxDecodedBytes: RUN_CODE_PAYLOAD_MAX_BYTES,
  });
  const literal = encodeCodeQlSafeJavaScriptStringLiteral(encoded);
  return shellCommandForStaticOperation(operation, literal); // exhaustive switch
}

function credentialReceiptValidWithoutDigest(receipt, context, exactCommand) {
  requireOneOf(context, ["bootstrap.passwordFill", "timeline.browserPassword"]);
  requireExactCredentialCommand(exactCommand);
  if (context === "bootstrap.passwordFill") requireNoScope(receipt);
  if (context === "timeline.browserPassword") requireExactScope(receipt, "browser:password");
  return exactCommandMatches(receipt, exactCommand) && exactReceiptFactsMatch(receipt, {
      stdout: "",
      stderr: "",
      parsedOutput: null,
      stdoutSha256: EMPTY_SHA256,
      stderrSha256: EMPTY_SHA256,
    }); // no sha256Text call
}

function receiptIntegrityValid(receipt) {
  return secretFreeReceiptIntegrityValid(projectSecretFreeReceipt(receipt));
}

credentialReceiptValidWithoutDigest(
  smoke.bootstrap.passwordFill,
  "bootstrap.passwordFill",
  smoke.commands.passwordFill
);
credentialReceiptValidWithoutDigest(
  timelinePasswordReceipt,
  "timeline.browserPassword",
  smoke.commands.passwordFill
);
```

Delete both string-returning `evidenceAssertionBody` and
`transientAssertionBody` fragment-composition shapes. The final evidence and
transient paths must each select a complete fixed operation through an
exhaustive switch. They may share ordinary non-executable data validators, but
each operation owns a complete static function body. `waitFor`, selectors,
response-path logic, and return-object keys remain repository-owned literals.
Scenario kind selects only a closed enum member; no returned string is inserted
into another source string.

Keep the existing `playwright-cli -s=wf543smoke --raw run-code` transport,
scenario order, exact browser behavior, receipt timeline, screenshot/evidence
schemas, and cleanup. The deterministic encoded payload may alter only the
internal run-code source argument required for this hardening; all expected
command generation and receipt validation must derive from the same safe builder
without accepting arbitrary command text.

The password-fill receipt has two representations and both must be routed by an
explicit trusted context before the generic hasher: nested
`smoke.bootstrap.passwordFill` has no `scope`, while its command-timeline copy
has exact scope `browser:password`. Each path must also match the exact canonical
password-fill command from `smoke.commands.passwordFill`; neither scope alone nor
command text alone is sufficient classification. Both continue to require
success, empty stdout/stderr, null parsed output, and empty-stream digest
constants. Their fields must not flow into `sha256Text` or any replacement fast
digest. All other known secret-free receipt and strict-scan integrity checks
retain exact SHA-256 comparisons.

## Regression-test shape

Add a bounded `--codeql-self-test` branch before the first workflow phase/agent
dispatch. It must run only local pure helpers, print a strict JSON result, make
no network/agent/process mutation, and terminate before the real workflow.

`task543ImplementSecurity.test.ts` must spawn that branch and prove:

- every evidence scenario kind and reset payload round-trips through the exact
  schema and preserves returned browser-visible semantics;
- the four transient scenario kinds each map to one complete fixed operation,
  while clean-close, table-keyboard, and mid-viewport metadata retain their
  exact zero-transient-command result;
- quotes, apostrophes, repeated backticks/backslashes, CR/LF,
  U+2028/U+2029, `</script>`, shell metacharacters, and
  `);globalThis.__wf543Injected=true;//` remain inert data;
- generated sources compile, fake page/locator methods receive byte-identical
  decoded arguments, and no injection sentinel changes;
- unknown operation/kind/key, malformed or noncanonical base64url, invalid
  UTF-8, NUL, and over-budget payloads fail closed before page interaction;
- both the scope-less nested `smoke.bootstrap.passwordFill` receipt and the
  exact-scoped timeline `browser:password` receipt are accepted only with their
  explicit context, exact canonical command, and empty/redacted facts; swapped
  context, missing/wrong scope, or command drift fails closed, and an injected
  digest spy records zero calls for both;
- exercise the actual nested bootstrap validator, successful timeline validator,
  and failure-prefix timeline validator, proving each routes its credential
  receipt before generic integrity hashing rather than only unit-testing the
  credential helper in isolation;
- a normal secret-free evidence receipt records exactly two digest calls, in
  order over the exact stdout and stderr strings, and rejects either digest
  mismatch;
- the script contains no interpolation of a returned evidence or transient
  assertion/body fragment at any sink and the self-test branch precedes
  phase/agent dispatch.

Source assertions must target semantic forbidden shapes, not whitespace or line
numbers. Do not execute the real TASK-543 implementation workflow from the test.

## Security Contract

- **Endpoint visibility/auth/RBAC/CSRF/rate limit/anti-abuse:** no product route,
  request, session, permission, or write-hardening behavior changes.
- Payload schemas are exact-key, bounded, and validated on both sides of the
  encoded channel; unknown scenarios fail before browser interaction.
- Actual credentials stay in the existing environment/shell variable channel
  and are never embedded, hashed with SHA-256, logged, snapshotted, or returned.
- No `eval`, `Function`, scanner suppression/allowlist/dismissal, dependency
  change, raw code-fragment interpolation, or assertion weakening is allowed.

## Validation

```bash
node --check _docs/_workflows/task-543-implement.mjs
node _docs/_workflows/task-543-implement.mjs --codeql-self-test
bun --cwd core lint:types
bun --cwd core lint
bun test tests/unit/workflows/task543ImplementSecurity.test.ts
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten \
  --config p/security-audit --config p/nodejs --config p/typescript \
  _docs/_workflows/task-543-implement.mjs \
  tests/unit/workflows/task543ImplementSecurity.test.ts
wc -l tests/unit/workflows/task543ImplementSecurity.test.ts
git diff --check
```

The focused test must be at most 1,000 physical lines. Re-run a named failure
alone before classifying it. The final combined strict scan belongs to
TASK-546-03-L01; the PR CodeQL rerun is the authoritative closure proof for
#77-#89 and #99.

## Acceptance criteria

- All 14 L02 alerts have structural fixes; no scenario value reaches executable
  text and the hostile corpus stays inert.
- Both explicit password-fill receipt contexts call no fast hash, while
  secret-free evidence integrity remains exact with one digest per stream.
- The pure self-test exits before agent dispatch and the focused regression is
  independently green under Node 26/Bun 1.3.14.
- TASK-543 scenarios, command order, observable browser results, evidence
  cardinality, schemas, screenshots, and cleanup remain unchanged.
- No file outside this leaf's exact ownership changed.
