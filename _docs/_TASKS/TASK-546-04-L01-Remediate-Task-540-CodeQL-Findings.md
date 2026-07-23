# TASK-546-04-L01: Remediate TASK-540 CodeQL Findings

# FileName: TASK-546-04-L01-Remediate-Task-540-CodeQL-Findings.md

**Parent Task:** TASK-546
**Parent Subtask:** TASK-546-04
**Priority:** High
**Category:** Workflow Security / Static Analysis
**Estimated Effort:** Medium
**Dependencies:** TASK-546-02-L01
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Exclusive ownership

This leaf is the sole TASK-546 writer of:

- `_docs/_workflows/task-540-smoke-executor.mjs`;
- only the `FROZEN_SMOKE_EXECUTOR_SHA256` value in
  `_docs/_workflows/task-540-implement.mjs`, after the executor bytes change;
- new `tests/unit/workflows/task540SmokeExecutorSecurity.test.ts`.

It removes CodeQL alerts #30, #90-#98, and #100. Except for the exact frozen
executor SHA value above, it must not edit TASK-540 product/task/changelog files,
another workflow, scanner configuration, the Forms suite, TASK-545 metadata, or
unrelated dirty-tree files. TASK-545 retains future wide modular/convergence
work; this leaf makes only the cohesive alert fixes and the focused regression
needed to prove them.

## Grounded remediation

| Alert | Existing flow | Required change |
|---|---|---|
| #30 | `typeKey...replace("related-failure", "related-failure")` | delete only the no-op call; pin the same resolved capture id |
| #90 | dynamic URL in the generic page-ready run-code | fixed `goto-ready` operation with a URL payload |
| #91-#92 | selector/value in fill run-code | fixed `fill` operation with exact payload schema |
| #93-#94 | selector/value in sequential type run-code | fixed `type` operation with exact payload schema |
| #95-#96 | selector/key in press run-code | fixed `press` operation with exact payload schema |
| #97 | selector in focus run-code | fixed `focus` operation with exact payload schema |
| #98 | dynamic legacy selector in self-test | safe builder negative probe; no raw interpolation exception |
| #100 | `rawUserRow.passwordHash` enters the canonical `bootstrap-restore-input-v1` bridge frame and then `frameSha256`/`hashBytes` | remove the unused frame digest from every bridge projection while preserving the validated canonical frame and exact restoration |
| credential-receipt defence | a `stdoutDiscarded` credential fill still hashes its retained empty stdout/stderr | prove the exact empty/discarded receipt from constants without calling SHA-256; keep this boundary separate from the #100 bridge-frame flow |

Line numbers are advisory anchors from the alert snapshot. Search the current
file by symbol/data flow after earlier shared-tree edits rather than patching by
stale offsets.

## Implementation Pseudocode

```js
const RUN_CODE_PAYLOAD_MAX_BYTES = 65_536;
const RUN_CODE_OPERATIONS = new Set(["goto-ready", "fill", "type", "press", "focus"]);
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const LF_SHA256 = "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b";

function encodeRunCodePayload(operation, input) {
  requireLiteralOperation(operation, RUN_CODE_OPERATIONS);
  const value = validateExactOperationPayload(operation, input); // exact keys + existing bounds
  const json = canonicalJson(value);
  requireUtf8BytesAtMost(json, RUN_CODE_PAYLOAD_MAX_BYTES);
  const encoded = Buffer.from(json, "utf8").toString("base64url");
  requireCanonicalBase64Url(encoded, { maxLength: 87_384 });
  requireDecodeReencodeIdentity(encoded);
  return encodeCodeQlSafeJavaScriptStringLiteral(encoded);
}

function buildRunCode(operation, input) {
  const encodedLiteral = encodeRunCodePayload(operation, input);
  switch (operation) {
    case "goto-ready":
      return wrapStaticRunCode(`async (page) => {
        const input = decodeAndValidateGotoReady(${encodedLiteral});
        await page.goto(input.url);
        await page.waitForFunction(STATIC_READY_PREDICATE, null, { timeout: 30000 });
        return { ok: true };
      }`);
    case "fill":
      return wrapStaticRunCode(`async (page) => {
        const input = decodeAndValidateFill(${encodedLiteral});
        const locator = page.locator(input.selector);
        await requireOneVisible(locator);
        await locator.fill(input.value);
        return { ok: true };
      }`);
    case "type":
      return wrapStaticRunCode(`async (page) => {
        const input = decodeAndValidateType(${encodedLiteral});
        const locator = page.locator(input.selector);
        await requireOneVisible(locator);
        await locator.pressSequentially(input.value);
        return { ok: true };
      }`);
    case "press":
      return wrapStaticRunCode(`async (page) => {
        const input = decodeAndValidatePress(${encodedLiteral});
        const locator = page.locator(input.selector);
        await requireOneVisible(locator);
        await locator.press(input.key);
        return { ok: true };
      }`);
    case "focus":
      return wrapStaticRunCode(`async (page) => {
        const input = decodeAndValidateFocus(${encodedLiteral});
        const locator = page.locator(input.selector);
        await requireOneVisible(locator);
        await locator.focus();
        return { ok: true };
      }`);
    default:
      throw new Error("wf540_run_code_operation_invalid");
  }
}

function buildUnitRunCodeInvocation(operation, input) {
  const finalArgs = buildRunCode(operation, input); // already returns { ok: true }
  return { args: finalArgs, displayArgs: null, unitResultAlreadyNormalized: true };
}

function prepareBunBridgeDispatch(state, descriptor, input) {
  const frame = encodeBunBridgeInputFrame(state, descriptor, input);
  const projection = {
    envProfileId: descriptor.envProfileId,
    file: descriptor.file,
    frameBytes: frame.length,
    inputSchemaId: descriptor.inputSchemaId,
    operationId: descriptor.operationId,
    outputSchemaId: descriptor.outputSchemaId,
    sourceSha256: descriptor.sourceSha256,
  };
  return Object.freeze({ descriptor, frame, projection: deepFreezeExact(projection) });
}

function buildBrowserReceipt(outcome, invocation) {
  if (invocation.stdoutDiscarded) {
    requireCredentialOperation(invocation);
    requireExactBytes(outcome.stdoutBytes, Buffer.from("\n"));
    requireEmpty(outcome.stderrBytes);
    return credentialReceipt({
      stdoutBytes: 1,
      stderrBytes: 0,
      stdoutSha256: LF_SHA256,
      stderrSha256: EMPTY_SHA256,
      sanitizedOutput: "[discarded]",
    }); // parser still normalizes LF to {"ok":true}\n; no digest call
  }
  return evidenceReceipt({
    stdoutSha256: digestEvidenceBytes(requireSecretFree(outcome.stdoutBytes)),
    stderrSha256: digestEvidenceBytes(requireSecretFree(outcome.stderrBytes)),
  });
}

const captureKey = "content-type-" + camelKeyToKebab(typeKey) + ".id";
```

The real implementation may keep local helper names that better match the large
executor, but it must preserve these boundaries. Dynamic data may be embedded
only as the escaped canonical base64url literal in a fixed operation template.
Do not let a helper return executable fragments for interpolation. Existing
fully static run-code operations may remain static, but any value reaching the
flagged sink must use the data channel.

The safe data-operation builder must emit the complete final `run-code` source,
including the existing `unit` result normalization to `{ ok: true }`. Its
internal `unitResultAlreadyNormalized` marker is consumed before the final
invocation exact-key check. `buildBrowserInvocation` must not interpolate that
returned source into its legacy second unit wrapper. Existing unrelated static
operations may retain their current result adapter, but the five data-bearing
operations pass through exactly one repository-owned source template and expose
the same final invocation keys, output schema, and observable result.

The payload validator and browser-side decoder must both reject the exact
`LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR` before any page interaction. Encoding
must not hide that prohibited selector from the existing `runCode` invariant:
`buildRunCode("focus", { selector: LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR })` and
a crafted otherwise-canonical encoded payload carrying it both fail closed.

There are two distinct credential-taint boundaries. First, the exact
`bootstrap-restore-input-v1` dispatch necessarily carries the stored Argon2
`rawUserRow.passwordHash` so cleanup can restore the row byte-for-byte. Preserve
the existing exact-key validation, canonical frame, bounded stdin dispatch, and
restoration comparison, but remove the unused `frameSha256` projection from all
bridge descriptors; do not replace it with another fast digest. The frame hash
has no runtime consumer, while descriptor source hashes and all non-frame
secret-free file/manifest/receipt integrity checks remain exact.
Second, credential detection occurs before receipt digest construction for the
`stdoutDiscarded` browser fill. That receipt keeps the exact one-LF raw stdout,
empty stderr, discarded marker, safe display command, status, sequence, and
evidence schema, using precomputed LF/empty-stream constants without a digest
call. Its parser must still normalize the LF to the existing `{"ok":true}\n`
success output. Non-secret
file/manifest/screenshot/response integrity remains SHA-256 and must not be
weakened.

## Regression-test shape

`task540SmokeExecutorSecurity.test.ts` must:

- run the existing `node task-540-smoke-executor.mjs --self-test` contract and
  require its structured `{ pass: true }` result;
- cover all five data-bearing operations with ordinary round-trip values;
- attack selector/value/URL/key fields with repeated quotes, apostrophes,
  backticks, backslashes, CR/LF, U+2028/U+2029, `</script>`, shell
  metacharacters, and `);globalThis.__wf540Injected=true;//`;
- compile each generated source and execute it with a fake page/locator seam,
  proving the exact decoded argument is observed and the injection sentinel is
  unchanged; invalid/NUL/oversize/noncanonical payloads fail before execution;
- prove the exact legacy runtime-root selector is rejected both before encoding
  and after browser-side decoding, with zero fake-page calls;
- prove credential receipts accept only the exact one-LF stdout, empty stderr,
  and discarded shape, reject any byte/status/command drift, preserve the
  existing normalized success output, and never invoke an injected digest spy;
- dry-dispatch the credential-bearing bootstrap-restoration descriptor and prove
  its validated canonical frame still contains the exact stored Argon2 hash for
  restoration, its projection omits `frameSha256`, frame mutation/invalid input
  fails closed, and an injected digest spy records zero calls;
- prove every secret-free descriptor also omits the unused frame digest while
  retaining exact frame bytes and all other descriptor integrity fields;
- prove no bridge descriptor projects or hashes its canonical input frame,
  while ordinary secret-free receipts still bind the exact stdout/stderr bytes;
- assert the no-op replacement and every flagged raw interpolation shape is
  absent without asserting incidental formatting;
- prove every data-bearing unit invocation contains one complete static wrapper,
  is not reinserted through `invocation.args[sourceIndex]`, returns the exact
  `{ ok: true }` unit shape, and exposes no internal normalization marker;
- hash the final executor bytes and require exact equality with
  `FROZEN_SMOKE_EXECUTOR_SHA256` in `task-540-implement.mjs`, while asserting
  that this is the only changed byte range in that implement workflow.

Add the behavior probes to the executor's existing exported self-test where
private helpers cannot be imported safely; the focused Bun test may invoke that
public self-test and perform source-level invariants. Do not add a production
test bypass or export private credential material.

## Security Contract

- **Endpoint visibility/auth/RBAC/CSRF/rate limit/anti-abuse:** no product route
  or request behavior changes.
- Exact selector/URL/value schemas reject unknown keys and over-budget input.
- Actual credentials stay in the existing environment/argv channel, never in
  generated code, receipts, hashes, diagnostics, snapshots, or thrown errors.
- The stored Argon2 password hash remains confined to the validated bounded
  bootstrap-restoration frame and exact restoration check; it is never logged,
  projected, or sent through `hashBytes`/another fast digest.
- No `eval`, `Function`, scanner suppression, allowlist, dismissal, dependency
  change, or weakened smoke/evidence assertion is allowed.

## Validation

```bash
node --check _docs/_workflows/task-540-smoke-executor.mjs
node --check _docs/_workflows/task-540-implement.mjs
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
bun --cwd core lint:types
bun --cwd core lint
bun test tests/unit/workflows/task540SmokeExecutorSecurity.test.ts
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten \
  --config p/security-audit --config p/nodejs --config p/typescript \
  _docs/_workflows/task-540-smoke-executor.mjs \
  tests/unit/workflows/task540SmokeExecutorSecurity.test.ts
wc -l tests/unit/workflows/task540SmokeExecutorSecurity.test.ts
git diff --check
```

The focused test must be at most 1,000 physical lines. Run the named failing
test once again in isolation before classifying it. The final combined strict
scan belongs to TASK-546-03-L01, while the PR CodeQL rerun is the authoritative
closure proof for #30, #90-#98, and #100.

## File-size classification

The two `_docs/_workflows/` files are internal operational orchestration
artifacts, not product production modules or test modules. The repository's
mandatory 1,000-line production/test gate therefore applies here to the new
focused regression test (and to every touched product module elsewhere), not to
these pre-existing workflow transcripts. This is not a suppression or a waiver:
TASK-545 retains cohesive workflow modularization ownership, while this leaf is
limited to the exact security carveout and frozen-SHA pin.

## Acceptance criteria

- All 11 L01 alerts have structural fixes and the hostile corpus stays inert.
- The canonical TASK-540 self-test, scenarios, command order, output schemas,
  evidence counts, and cleanup behavior remain green.
- The credential-bearing restoration bridge and `stdoutDiscarded` credential
  receipts never call a fast hash; the validated canonical restoration remains
  exact and secret-free evidence hashes still bind exact bytes.
- The no-op replacement is gone with no change to the computed capture key.
- The executor's frozen SHA pin equals its final bytes and no other
  `task-540-implement.mjs` content changed.
- No file outside this leaf's exact ownership changed.
