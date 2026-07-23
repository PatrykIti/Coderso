# TASK-548-02-L02: Playwright CLI Capture, Promotion and Receipts
# FileName: TASK-548-02-L02-Playwright-CLI-Capture-Promotion-And-Receipts.md

**Parent Subtask:** TASK-548-02
**Priority:** Critical
**Category:** Documentation Platform / Playwright / Asset Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-02-L01
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Implement the task-scoped `playwright-cli` runner, visible-effect assertions, bounded capture, strict provenance, PNG sanitizer, review gate, atomic promotion
and receipt. Own `scripts/docs/visual/`, both capture/promotion CLIs, canonical pilot scenarios/assets/receipts, `.gitignore` and focused tests.

Never extend `scripts/playwright-widget-contract-smoke.ts`. Raw captures remain under `.tmp/docs-visuals/<runId>/`; only reviewed images are promoted to
`docs/guide/assets/images/<docId>/<locale>/<visualId>.png`.

## Capture Contract

For every browser command use one full named prefix:

```text
playwright-cli -s=docs548-<bounded-run-id> ...
```

The only supported command surfaces are:

```text
bun run docs:visual:capture --scenario <id>
bun run docs:visual:promote --scenario <id> \
  --run-id <bounded-run-id> \
  --raw-reviewed-sha256 <64-lowercase-hex> \
  --reviewed-by <bounded-id> \
  --confirm-alt-caption
```

The runner resolves the confined scenario and derives `docs548-<run-id>`. The capture CLI accepts one `--scenario` and rejects `--run-id`; it creates
`createDocsVisualRunIdV1({ scope: "cli" })` once and passes it with the exact localized owner. The promotion CLI requires the bounded canonical `runId`
returned by capture plus one scenario/hash/reviewer/confirmation; missing, duplicate and unknown flags fail closed. `captureDocsVisual` is validation-only
for CLI and migration: callers provide full identity/ID and it never rewrites them. L03 uses only the lease-retaining batch API. Runs write below
`.tmp/docs-visuals/<runId>/`; promotion accepts no arbitrary path.

The public CLI emits one bounded canonical JSON object and no unstructured
browser output:

```ts
// scripts/docs/visual/capture/docsVisualCaptureRunV1.ts: sole owner
export type CaptureResult = Readonly<{
  docId: string; locale: string; sectionId: string; visualId: string;
  runId: string; rawPath: string;
  rawReviewedSha256: string;
}>;
type DocsVisualCaptureCliResultV1 = {
  schema: "coderso.docs-visual-capture-result@v1";
  visualId: string; runId: string; rawPath: string; rawReviewedSha256: string;
};
```

`CaptureResult` is the internal producer/CI/migration result: validated localized identity and caller `runId` unchanged, confined raw path and reviewed digest.
Normalization rejects noncanonical input. CLI intentionally projects only the shown fields and never exposes `docId`, `locale`, `sectionId` or extras.

`rawPath` is a normalized repository-relative path confined below the generated run root. The exact generated `runId` is returned unchanged so the review step
can identify staged state without accepting an arbitrary path.
### Exact temporary capture provenance

TASK-548-02-L01's
`scripts/docs/visual/contract/docsVisualSourceHashV1.ts` is the sole owner and
exporter of these exact shared types:

```ts
export type DocsVisualToolVersionsV1 = Readonly<{
  playwrightCli: string; browser: string; pngNormalizer: string;
}>;
export type DocsVisualBrowserContractV1 = Readonly<{
  viewport: { width: number; height: number; deviceScaleFactor: 1 };
  theme: "light" | "dark"; reducedMotion: "reduce" | "no-preference";
  timezone: "UTC";
}>;
```

This leaf imports both names, never redeclares a local alias, and uses them unchanged in `DocsVisualSourceHashInputV1.toolVersions`, the browser-environment
reader result, provenance and the promotion claim. Assignability/same-reference compile tests cover all four consumers so an inline lookalike cannot drift.

This leaf owns
`scripts/docs/visual/capture/docsVisualCaptureProvenanceV1.ts` and the exact
recursively reject-unknown temporary contract:

```ts
import type { DocsVisualBrowserContractV1, DocsVisualToolVersionsV1 } from
  "../contract/docsVisualSourceHashV1";
import type { CaptureResult } from "./docsVisualCaptureRunV1";
export type DocsVisualCaptureIdentityV1 = {
  docId: string; locale: string; sectionId: string; visualId: string; runId: string;
};
export type DocsVisualCaptureProvenanceV1 = {
  schema: "coderso.docs-visual-capture-provenance@v1";
  identity: DocsVisualCaptureIdentityV1;
  rawPng: { path: string; sha256: string; byteLength: number;
    width: number; height: number };
  scenarioSha256: string; sourceHash: string;
  toolVersions: DocsVisualToolVersionsV1;
  browserContract: DocsVisualBrowserContractV1;
  assertionCounts: { declared: number; passed: number };
  errorCounts: { consoleErrors: 0; pageErrors: 0; networkErrors: 0;
    networkPolicyViolations: 0 };
  networkEvidence: { inspected: true; thirdPartyImageResponses: 0 };
  privacyEvidence: { path: string; sha256: string; byteLength: number };
};
type DocsVisualPrivacyTextScanV1 = {
  scanned: true; inspectedUtf8Bytes: number; textSha256: string;
  secretMatches: 0; piiMatches: 0; credentialUrlMatches: 0; realUserContentMatches: 0;
};
export type DocsVisualCapturePrivacyEvidenceV1 = {
  schema: "coderso.docs-visual-capture-privacy@v1";
  binding: DocsVisualCaptureIdentityV1 & {
    scenarioSha256: string; sourceHash: string; rawPngSha256: string };
  syntheticFixture: {
    profileId: string; registryEntrySha256: string;
    fixtureRecoveryIdentitySha256: string; fixtureRecoveryAcquiredRecordSha256: string;
    registrySyntheticOnlyVerified: true; leaseOwnerIdentityVerified: true;
  };
  targetScan: {
    captureTarget: string; domText: DocsVisualPrivacyTextScanV1;
    accessibilityText: DocsVisualPrivacyTextScanV1;
  };
  networkPolicy: {
    inspectedFromBeforeAuthentication: true; policySha256: string;
    allowedOrigins: string[]; observedOrigins: string[];
    observedRequests: Array<{
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
      origin: string; pathSha256: string; resourceType: "document" | "stylesheet"
        | "image" | "media" | "font" | "script" | "texttrack" | "xhr"
        | "fetch" | "eventsource" | "websocket" | "manifest" | "other";
      matchedRuleId: string;
    }>;
    policyViolations: 0; thirdPartyImageResponses: 0;
  };
};
export const DOCS_VISUAL_CAPTURE_PRIVACY_LIMITS_V1 = {
  serializedUtf8Bytes: 131_072, profileIdUtf8Bytes: 128,
  captureTargetUtf8Bytes: 512, inspectedUtf8BytesPerTextChannel: 65_536,
  originCount: 8, originUtf8Bytes: 256, observedRequestCount: 256,
  matchedRuleIdUtf8Bytes: 128,
} as const;
type DocsVisualCaptureReadyV1 = {
  schema: "coderso.docs-visual-capture-ready@v1";
  identity: DocsVisualCaptureIdentityV1; provenanceSha256: string;
  privacyEvidenceSha256: string; rawPngSha256: string;
  fixtureRecoveryAbsentRecordSha256: string;
};
export type VerifiedDocsVisualCaptureEvidenceV1 = {
  provenance: DocsVisualCaptureProvenanceV1;
  privacyEvidence: DocsVisualCapturePrivacyEvidenceV1;
};
export type DocsVisualPromotionInputV1 = {
  visualId: string; runId: string; rawReviewedSha256: string;
  reviewedBy: string; confirmAltCaption: true;
};
export function normalizeDocsVisualCaptureProvenanceV1(value: unknown):
  DocsVisualCaptureProvenanceV1;
export function buildDocsVisualCaptureProvenancePathV1(runId: string): string;
export function buildDocsVisualCapturePrivacyEvidencePathV1(runId: string): string;
export function normalizeDocsVisualCapturePrivacyEvidenceV1(value: unknown):
  DocsVisualCapturePrivacyEvidenceV1;
export function serializeCanonicalDocsVisualCapturePrivacyEvidenceV1(
  value: DocsVisualCapturePrivacyEvidenceV1): Uint8Array;
export async function loadAndVerifyDocsVisualCaptureEvidenceV1(
  captured: CaptureResult): Promise<VerifiedDocsVisualCaptureEvidenceV1>;
export function normalizeDocsVisualPromotionInputV1(value: unknown):
  DocsVisualPromotionInputV1;
```

The one committed capture capsule is `.tmp/docs-visuals/<runId>/capture-evidence-v1/`; its files are exactly `capture-provenance-v1.json` and
`capture-privacy-v1.json`, and its sole staging directory is `.tmp/docs-visuals/<runId>/.capture-evidence-v1.tmp/`.
`buildDocsVisualCaptureProvenancePathV1` and `buildDocsVisualCapturePrivacyEvidencePathV1` return those exact final paths. The raw path remains
`.tmp/docs-visuals/<runId>/raw/<visualId>.png`. The exact post-cleanup seal is `.tmp/docs-visuals/<runId>/capture-ready-v1.json`, with sole temp suffix `.tmp`;
the required lifecycle-control file is `.tmp/docs-visuals/<runId>/.capture-owner-v1.lock`. Existing roots, unexpected entries, symlinks, alternate names and
path/envelope mismatches fail closed.

Both temporary records are recursively strict, bounded canonical JSON plus LF. They bind the exact localized identity, raw no-follow bytes/dimensions/hash,
canonical scenario bytes, L01 source hash, observed tool/browser profile and zero-valued gates. Privacy additionally binds L01's stable fixture-recovery
identity and acquired-record hashes, never its refs/token or lease values. Origins are unique/sorted/local-only; requests retain duplicates in canonical tuple
order and persist only method, origin, query-free path digest, resource type and rule ID. Target text, fixture values, URLs, headers, bodies, cookies, secrets
and PII are never serialized.

Collectors start before authentication. While lease/session are live, verify synthetic registry ownership, recovery binding, DOM/accessibility scans and all
allowlisted requests. Only then fsync both evidence files/staging directory, no-replace rename the capsule and fsync the run root. Capsule commit precedes
route/session/fixture teardown. After L01 returns its durable `absent` tombstone, the ready seal binds that record hash plus both evidence/raw hashes.

`loadAndVerifyDocsVisualCaptureEvidenceV1` no-follow reopens the ready seal, capsule, raw bytes and exact L01 recovery prefix; it recomputes every current
binding/hash and requires `absent`. Promotion delegates to this verifier.

Cross-process ownership is one kernel-held exclusive advisory lease on the
exact no-follow regular `.capture-owner-v1.lock`. Under the exact global
`.tmp/docs-visuals/.capture-scan-v1.lock`, registration creates the root and
lock no-replace, acquires the lease before publication, and rejects duplicate
IDs across this complete lifecycle inventory:

| State | Exact root | Required terminal record |
| --- | --- | --- |
| active | `.tmp/docs-visuals/<runId>` | none, or one in-progress intent below |
| failed | `.tmp/docs-visuals/.failed/<runId>` | `capture-failed-v1.json` |
| consumed | `.tmp/docs-visuals/.consumed/<runId>` | `capture-consume-intent-v1.json` |
| discarded | `.tmp/docs-visuals/.discarded/<runId>` | `capture-discard-intent-v1.json` |

The consume/discard intent is strict canonical JSON+LF, written through the
sole `.tmp` sibling and fsynced no-replace in the active root before its
no-replace rename. It binds schema, exact `CaptureResult`, ready/provenance/
privacy/raw hashes and respectively the canonical pair identity+hashes or the
literal reason `ci-terminal-discard` plus CI-owner-marker hash; after rename it
must exist at the exact table path. A terminal root permits only its lock,
named record, CI-owner marker when bound, and bounded
owned cleanup remnants. Active roots permit only the exact raw, evidence,
ready, L01 recovery, optional CI-owner marker and one terminal-intent
inventory. Unexpected entries, links, conflicting intents or partial/cross-run
records always fail closed;
L03 reports/diffs/upload staging live only below its separate strict
`.tmp/docs-visual-ci/<batchId>/<runId>/` root. Any such or other unexpected
entry below a capture lifecycle root is rejected, never ignored or cleaned.

Startup holds the scan lock through sorted enumeration of active, failed,
consumed and discarded roots and nonblocking per-run try-acquisition. Duplicate
IDs, malformed inventory or acquisition ambiguity fail closed. It releases the
scan lock with the acquired leases already held, skips busy runs without
fixture/browser/evidence/pair calls, and dispatches state-specific recovery:

- active: L01 recovery, session/route absence, then ready validation or failed
  quarantine;
- failed: validate the exact failure record and perform cleanup only;
- consumed: validate the consume intent, recover/verify its exact stable pair
  without rewriting receipt time/bytes, then cleanup only;
- discarded: validate the discard intent and bound capture identity, then
  cleanup only, never inspect or change the canonical pair.

Every branch settles its owned work and releases its lease last; process death
releases the kernel lease. A missing lock is recoverable only for an
under-scan-lock crashed pre-publication claim and is recreated no-replace.
Manual promotion validates the requested `runId`, then under the scan lock
claims exactly that lifecycle root before any evidence read. It never searches
for a run by `visualId` or reviewed digest and never leases/releases
"nonmatches". The claimed lease's `runId`, ready seal, provenance identity,
raw path and digest must all match the request/scenario before sanitization or
pair recovery. A registering/failed/discarded/CI-owned, busy or wrong run fails
closed without consume/discard intent or canonical-pair mutation. Duplicate
otherwise-eligible captures are therefore unambiguous: only the explicitly
selected run can advance and every other run remains byte-identical.

`consumeSelectedDocsVisualCaptureWithDurableIntentV1` keeps the selected `runId`
unchanged through promotion request, claim and kernel-held lease into the exact `CaptureResult` embedded in the
`capture-consume-intent-v1.json` restart journal. Recovery requires that same
run-bound intent before matching-pair cleanup. Stable image/receipt bytes,
`DocsVisualV1`, distribution bundles and the generic image/receipt transaction
journal remain independent of temporary run identity. Busy selected runs return
`docs_visual_run_live`; startup skips promotion/CI-held runs.

`docsVisualCaptureRunV1.ts` is the pre-landed single shared wire-contract owner
for the CI/capture boundary. L03 imports these types, normalizers, serializers
and hashes rather than declaring lookalikes:

```ts
export type DocsVisualCiCaptureRequestV1 = Readonly<DocsVisualCaptureIdentityV1>;
export type DocsVisualCiBatchBindingV1 = Readonly<{
  batchId: string; ownerIntentSha256: string;
}>;
export type DocsVisualCiPreparedBindingV1 = Readonly<{
  request: DocsVisualCiCaptureRequestV1; scenarioSha256: string;
  canonicalPairIdentitySha256: string; preCaptureStalenessSha256: string;
}>;
export type DocsVisualCiRunOwnerMarkerV1 = Readonly<{
  schema: "coderso.docs-visual-ci-run-owner@v1";
  binding: DocsVisualCiBatchBindingV1; request: DocsVisualCiCaptureRequestV1;
}>;
export type DocsVisualCiOwnerIntentRecordV1 = Readonly<{
  schema: "coderso.docs-visual-ci-owner-intent@v1";
  batchId: string; workRoot: string; prepared: readonly DocsVisualCiPreparedBindingV1[];
}>;
export type DocsVisualCiCaptureFailureV1 = Readonly<{
  code: "docs_visual_ci_capture_failed";
  request: DocsVisualCiCaptureRequestV1; causeCodes: readonly string[];
}>;
export type DocsVisualCiPersistedOutcomeV1 =
  | Readonly<{ status: "fulfilled"; result: CaptureResult }>
  | Readonly<{ status: "rejected"; failure: DocsVisualCiCaptureFailureV1 }>;
export type DocsVisualCiCapturesRecordV1 = Readonly<{
  schema: "coderso.docs-visual-ci-captures@v1";
  ownerIntentSha256: string; outcomes: readonly DocsVisualCiPersistedOutcomeV1[];
}>;
export type DocsVisualCiCallbackRecordV1 = Readonly<{
  schema: "coderso.docs-visual-ci-callback@v1";
  capturesSha256: string; mode: "runtime" | "recovery-no-resume";
}>;
export type DocsVisualCiDeliveryRecordV1 =
  | Readonly<{ schema: "coderso.docs-visual-ci-delivery@v1";
      callbackSha256: string; mode: "metadata-only";
      diagnosticSha256s: readonly string[] }>
  | Readonly<{ schema: "coderso.docs-visual-ci-delivery@v1";
      callbackSha256: string; mode: "sealed-pixels";
      manifestSha256s: readonly string[] }>
  | Readonly<{ schema: "coderso.docs-visual-ci-delivery@v1";
      callbackSha256: string; mode: "no-upload" }>;
export type DocsVisualCiDiscardRecordV1 = Readonly<{
  schema: "coderso.docs-visual-ci-discard@v1";
  predecessor: { phase: "callback"; sha256: string }
    | { phase: "delivery"; sha256: string };
  outcome: "external-artifacts-settled";
}>;
```

Every object above has exactly the shown keys, every nested object/union is
recursively reject-unknown, digests are lowercase SHA-256, arrays are bounded
and owner-identity sorted, IDs/paths use their strict canonical validators, and
noncanonical input is rejected rather than rewritten. Canonical serialization
uses the displayed key order, compact UTF-8 JSON plus one LF. The same module
exports `normalize<Type>`, `serializeCanonical<Type>` and `hash<Type>` for all
six persisted records (run-owner marker, owner-intent, captures, callback,
delivery and discard); names are the exact type name plus `V1` convention, for
example `normalizeDocsVisualCiDiscardRecordV1`,
`serializeCanonicalDocsVisualCiDiscardRecordV1` and
`hashDocsVisualCiDiscardRecordV1`. Hashing is exactly
`SHA-256(UTF8(domain) || 0x00 || uint64be(serialized.length) || serialized)`
with these domains:

| Record | Exact domain |
| --- | --- |
| run-owner marker | `coderso.docs-visual-ci-run-owner-hash@v1` |
| owner intent | `coderso.docs-visual-ci-owner-intent-hash@v1` |
| captures | `coderso.docs-visual-ci-captures-hash@v1` |
| callback | `coderso.docs-visual-ci-callback-hash@v1` |
| delivery | `coderso.docs-visual-ci-delivery-hash@v1` |
| discard | `coderso.docs-visual-ci-discard-hash@v1` |

The marker binds the intent hash; captures bind intent; callback binds captures;
delivery binds callback; discard binds callback directly only for a
pre-delivery failure, otherwise delivery. Normal recovery appends
`mode: "recovery-no-resume"` rather than replaying callback/upload. Round-trip,
each-key unknown rejection, key/union/order bounds, cross-domain substitution
and every predecessor/outcome/request tamper are mandatory tests.

Before capture L03 durably creates the external intent and passes only the exact
binding. CI registration is gapless: while holding
`.capture-scan-v1.lock`, create no-replace
`.tmp/docs-visuals/.registering/<runId>/`, create and exclusively lease its
`.capture-owner-v1.lock`, then commit the marker through the sole exact
`.capture-ci-owner-v1.tmp` using write → file fsync → no-replace rename to
`capture-ci-owner-v1.json` → directory fsync. Only then no-replace rename the
complete directory to `.tmp/docs-visuals/<runId>` and fsync
`.tmp/docs-visuals/`; the same lock inode and lease remain held. Thus an active
root is never enumerable without its final marker and no fixture, server,
browser or evidence action begins before publication.

`.registering` is part of the scan-lock inventory and its `runId` occupies the
global active/failed/consumed/discarded ID namespace. Its only crash prefixes
are empty, lock-only, lock plus the exact marker temp, or lock plus the final
marker; temp and final may not coexist. After process death, scan-lock recovery
nonblockingly claims the lock when present, no-follow validates this exact
inventory, removes only that unpublished inode-held directory, fsyncs both
parents and releases last. It never publishes or runs fixture/browser recovery.
Busy registration is impossible to observe after acquiring the scan lock;
links, alternate temps, unknown entries, duplicate IDs or malformed complete
markers fail closed in place. CLI/migration registration remains the separate
active-root path and cannot create a CI marker.

The same owner module defines the batch/recovery boundary and opaque
`DocsVisualCiVerifiedDiscardAuthorizationV1`. Its only constructor has this exact
L02-owned signature and no L03/private-type dependency:

```ts
import type { FileHandle } from "node:fs/promises";
export async function verifyDocsVisualCiDiscardAuthorizationV1(input: Readonly<{
  ownerDirectory: FileHandle; binding: DocsVisualCiBatchBindingV1;
}>): Promise<DocsVisualCiVerifiedDiscardAuthorizationV1>;
export type DocsVisualCiCallbackHandoffV1 = Readonly<{
  discardAuthorization: DocsVisualCiVerifiedDiscardAuthorizationV1;
  callbackFailure: { code: "docs_visual_ci_callback_failed"; causeCodes: readonly string[] } | null;
}>;
export type DocsVisualCiCaptureBatchInputV1 = Readonly<{
  binding: DocsVisualCiBatchBindingV1; requests: readonly DocsVisualCiCaptureRequestV1[];
}>;
export type DocsVisualCiRecoveryIntentInputV1 = Readonly<{
  ownerDirectory: FileHandle; binding: DocsVisualCiBatchBindingV1;
  requests: readonly DocsVisualCiCaptureRequestV1[];
}>;
declare const docsVisualCiRecoverySnapshotBrandV1: unique symbol; // private
export type DocsVisualCiRecoverySnapshotV1 = Readonly<{
  binding: DocsVisualCiBatchBindingV1; requests: readonly DocsVisualCiCaptureRequestV1[];
  persistedOutcomes: readonly DocsVisualCiPersistedOutcomeV1[];
  readonly [docsVisualCiRecoverySnapshotBrandV1]: true;
}>;
export type DocsVisualCiRecoveryHandoffV1 = Readonly<{
  snapshot: DocsVisualCiRecoverySnapshotV1; discardAuthorization: DocsVisualCiVerifiedDiscardAuthorizationV1;
}>;
```

The verifier fsyncs/fstats the inode-held directory, no-follow reopens the exact
final chain, rejects temp/unknown entries, rehashes it and binds the batch plus
captures outcomes. Literals, deserialization and casts are not constructors.

`withVerifiedDocsVisualCiCaptureBatchV1` uses concurrency two, settles every
capture and retains successful leases through verification and the awaited
callback. Only matching authorization permits marker/hash-bound discard intent,
rename to `.discarded/<runId>` and deletion. Callback, authorization or external
discard durability failure retains or no-replace quarantines the marker-bound
root intact. L02 releases leases last and combines all failures without masking.

`withReconstructedDocsVisualCiRecoveryV1(input, use)` is the only restart
entrypoint. From the held directory it verifies intent/prefix, then claims every
matching marker-bound run under the capture scan lock without a lease gap. With
leases held it runs L01 recovery, verifies ready evidence and reconstructs one
sorted persisted outcome per request before `use(snapshot)` may add any missing
chain record. Existing captures must be byte-identical for present runs; absent
fulfilled runs require the same already-final discard chain. Absent unstarted
requests become rejected outcomes; unknown/live/ambiguous state skips callback.

The callback returns the identical opaque snapshot plus matching authorization.
Only then may L02 discard ready roots, retain/quarantine unready roots and
release last. A throw/substitution/prefix failure preserves capture bytes for
restart; no boolean, path, earlier phase or caller assertion authorizes deletion.

L03 type-imports shared shapes and value-imports only the constant, verifier and
two entrypoints. L02 imports only platform/L01/L02 modules and compiles before
L03; it never imports L03/private types. L03 never calls raw capture, loader,
lease, discard or quarantine primitives. Exact live shape:

```ts
const batchId = await createDocsVisualCiBatchIdV1();
const workRoot = `.tmp/docs-visual-ci/${batchId}`;
const ownership = await createDocsVisualCiBatchOwnershipIntentV1({
  batchId, workRoot, prepared,
});
return settleDocsVisualCiOwnedBatchV1(ownership, () =>
  withVerifiedDocsVisualCiCaptureBatchV1({
    binding: ownership.captureBinding, requests,
  }, async (outcomes) => {
    const capturedOwnership =
      await bindDocsVisualCiCapturedOutcomesV1({ ownership, outcomes });
    return runDocsVisualCiDiffReportAndAwaitedUploadsV1({
      prepared, outcomes, batchId, workRoot,
      ownership: capturedOwnership,
    });
  })
);
```

The runner restarts the task dev server first, waits for admin and public health
checks, loads `.env` without printing it, authenticates through the real admin
flow, installs console/page/network-error collectors before navigation, executes
manifest actions, and asserts visible effects. It compiles the strict DSL to
owned Playwright code; manifests never supply `run-code`.

Capture the unique semantic `captureTarget` bounding box plus bounded padding.
Reject full-page/unbounded captures, boxes outside the viewport, hidden targets,
transparent/zero-area output, dimensions outside documented caps and files over
the byte limit. Normalize to device scale factor 1.

## Promotion Receipt

```ts
type DocsVisualReceiptV1 = {
  schema: "coderso.docs-visual-receipt@v1";
  docId: string; locale: string; sectionId: string; visualId: string;
  scenarioSha256: string; sourceHash: string; rawReviewedSha256: string;
  canonicalImageSha256: string; width: number; height: number;
  playwrightCliVersion: string; browserVersion: string;
  assertionsPassed: number; consoleErrors: 0;
  reviewedBy: string; reviewedAt: string;
};
```

The receipt is strict and contains no command transcript, cookie, token,
credential, fixture value, absolute path or screenshot bytes. `reviewedAt` is
valid ISO-8601 evidence; deterministic bundle generation treats the checked-in
receipt as source bytes and never injects a new timestamp. The receipt,
`DocsVisualV1` and distribution bundle never contain `runId`; only confined
temporary capture/session/privacy evidence may carry it.
`docId`, canonical BCP-47 `locale`, `sectionId` and bundle-global `visualId`
must equal the strict scenario and the
`assets/{scenarios,images,receipts}/<docId>/<locale>/<visualId>.*` path. The
receipt's localized owner is immutable review evidence, not a second lookup
fallback.

Receipt creation imports L01's exact
`computeDocsVisualSourceHashV1` and records its result unchanged as
`sourceHash`. This leaf owns the real scenario/fixture/document/base/watch/tool
input collector and its CLI/promotion integration, but it must not copy or
modify the sort/hash algorithm. A missing or invalid required input blocks
promotion.

Promotion requires the reviewer to inspect the actual staged image, supply its
observed `rawReviewedSha256` and confirm alt/caption accuracy. The promoter then
strips ancillary PNG text/time/EXIF-like chunks, proves decoded pixel identity,
computes `canonicalImageSha256` over the sanitized bytes, and rechecks
dimensions. `DocsVisualV1.sha256` and the receipt use the canonical hash for the
promoted asset; the raw reviewed hash remains review-chain evidence. No capture
or CI command may auto-approve.

## Recoverable Image/Receipt Promotion

This leaf exclusively owns
`scripts/docs/visual/promotion/docsVisualStablePairValidatorV1.ts` and exports
the exact factory consumed by every visual recovery and hazard path:

```ts
export function createDocsVisualStablePairValidatorV1(
  identity: DocsVisualPairIdentityV1
): DurablePairStablePairValidatorV1;
```

The factory canonicalizes the exact `(docId, locale, sectionId, visualId)`
identity. Its validator accepts both members absent or, for a present pair,
strictly validates PNG safety/hash/dimensions plus the recursively
reject-unknown `DocsVisualReceiptV1`, requiring every identity/path/hash field
to agree. It is the only receipt-semantic validator; callers may not replace it
with an existence-only or image-only check.

This leaf imports, and does not duplicate, TASK-548-01-L02's exact
`durablePairPromotionV1`, `recoverDurablePairPromotionV1`,
`createDocsVisualPairPromotionConfigV1` and
`recoverAllDocsVisualPairPromotionsV1` owners from
`core/services/documentation/artifacts/durablePairPromotionV1.ts` and
`core/services/documentation/artifacts/docsVisualPairPromotionV1.ts`. The
wrapper pre-lands in TASK-548-01-L02 so the initial corpus compiler can call it;
this leaf consumes it and does not reopen either owner module:

```ts
createDocsVisualPairPromotionConfigV1(input: {
  docId: string;
  locale: string;
  sectionId: string;
  visualId: string;
  validateStablePair: DurablePairStablePairValidatorV1;
}): DurablePairPromotionConfigV1;
assertNoDocsVisualPairPromotionHazardsV1(input: {
  validateStablePairForVisual: DocsVisualStablePairValidatorFactoryV1;
}): Promise<void>;
recoverAllDocsVisualPairPromotionsV1(input: {
  validateStablePairForVisual: DocsVisualStablePairValidatorFactoryV1;
}): Promise<DurablePairRecoveryResultV1[]>;
```

The owner config validates `docId`, canonical BCP-47 `locale`, `sectionId` and
bundle-global `visualId`, returns transaction kind
`"docs-visual-image-receipt"`, uses the distinct confined journal path
`.tmp/docs-visuals/transactions/<docId>/<locale>/<visualId>/promotion-transaction-v1.json`,
and allows only `docs/guide/assets/images`,
`docs/guide/assets/receipts`, and that exact localized transaction directory.
Its exact member descriptors are member 0
`docs/guide/assets/images/<docId>/<locale>/<visualId>.png` and member 1
`docs/guide/assets/receipts/<docId>/<locale>/<visualId>.json`. The exact
`createDocsVisualStablePairValidatorV1(identity)` result validates the pair.
The generic durable owner invokes it after durable `preparing` staging
completes, before `prepared`, and after every recovered stable state.

Both `recoverAllDocsVisualPairPromotionsV1` and
`assertNoDocsVisualPairPromotionHazardsV1` receive the same exact
`createDocsVisualStablePairValidatorV1` factory. They walk only the strict
`<docId>/<locale>/<visualId>` transaction layout, recover the `sectionId` from
the matching strict scenario, sort by locale, `docId`, `sectionId`, then
`visualId`, reject symlink/traversal/unknown entries, and semantically validate
each stable pair before a consumer proceeds.
TASK-548-01-L02's compiler `--write`, promotion, and `docs:recover` may use this
path. Compiler `--check` and TASK-548-02-L03 staleness instead call
`assertNoDocsVisualPairPromotionHazardsV1`; a live journal, owned
preparing journal, orphan journal temp, staging/backup artifact or mixed pair returns
`docs_compile_recovery_required` without mutation. No reader may infer safety
from one member, delete an unknown journal, or recover from cached in-memory
phase state.

TASK-548-01-L02's reusable owner supplies the exact durable phase protocol:
the durable `preparing` intent and exact recorded paths land and fsync before
any member temp/staged write; every later phase journal uses temp-write →
temp-file fsync → atomic rename → owning-directory fsync; final/backup renames
also fsync their owning directories. A caught error
or later process restart rereads and validates the durable journal plus current
artifact hashes. Pre-commit recovery restores both prior members or their prior
absence; `verified-commit` retains both new members and retries owned cleanup.
The image/receipt wrapper preserves original, recovery and cleanup diagnostics.

## Security Contract

- **Endpoint visibility:** no new endpoint. Use existing internal admin and
  public read routes only.
- **Auth/RBAC:** authenticate a scenario-specific scoped test account; assert
  the declared permission state. Credentials come from environment/runtime
  fixture setup and never from manifests or receipts.
- **CSRF/rate limit:** real admin writes preserve CSRF and existing buckets.
  No middleware bypass or direct production DB mutation.
- **Validation:** strict scenario/receipt shapes, one-target semantic locator,
  strict recovery/provenance phases, local hosts only, bounded PNG parser,
  allowed PNG chunks, exact hashes, no-follow reopen and confined paths.
- **Anti-abuse:** no public write, nonce/HMAC or CAPTCHA. Cap command time,
  retries, sessions, output, dimensions and file bytes; no arbitrary shell/JS.
- **Privacy:** persist only L01 recovery hashes, never recovery refs/tokens or
  lease values; reject secret/PII content, signed URLs and third-party images.
- **Cleanup:** exact L01 restart recovery precedes route/session absence and
  active/failed/consumed/discarded handling; stop only the task-owned server.

## Implementation Pseudocode

```ts
export async function runDocsVisualCaptureCli(argv: readonly string[]) {
  const scenario = await resolveScenarioFromConfinedRegistry(
    parseExactScenarioOnlyArgs(argv)
  );
  const identity = localizedCaptureIdentity(
    scenario, await createDocsVisualRunIdV1({ scope: "cli" })
  );
  const captured = await captureDocsVisual(identity);
  assertExactCaptureIdentityFields(captured, identity);
  return normalizeDocsVisualCaptureCliResultV1({
    schema: "coderso.docs-visual-capture-result@v1",
    visualId: captured.visualId,
    runId: captured.runId,
    rawPath: captured.rawPath,
    rawReviewedSha256: captured.rawReviewedSha256,
  });
}
declare const docsVisualCaptureRunLeaseBrandV1: unique symbol;
type ClaimedDocsVisualCaptureRunLeaseV1 = {
  runId: string; runRoot: string;
  state:
    | "active" | "failed-cleanup-only"
    | "consumed-cleanup-only" | "discarded-cleanup-only";
  readonly [docsVisualCaptureRunLeaseBrandV1]: true;
};
export const DOCS_VISUAL_CI_CAPTURE_CONCURRENCY_V1 = 2 as const;
export type DocsVisualCiVerifiedCaptureV1 = Readonly<{
  result: CaptureResult; evidence: VerifiedDocsVisualCaptureEvidenceV1;
}>;
export type DocsVisualCiCaptureOutcomeV1 =
  | Readonly<{ status: "fulfilled"; value: DocsVisualCiVerifiedCaptureV1 }>
  | Readonly<{ status: "rejected"; request: DocsVisualCiCaptureRequestV1;
      failure: DocsVisualCiCaptureFailureV1 }>;
type VerifiedDocsVisualCaptureForPromotionV1 = {
  ownership: ClaimedDocsVisualCaptureRunLeaseV1;
  state: "active" | "consumed-cleanup-only";
  provenance: DocsVisualCaptureProvenanceV1;
  rawPng: { bytes: Uint8Array; sha256: string; width: number; height: number };
};
type DocsVisualPromotionClaimInputV1 = {
  visualId: string; runId: string; rawReviewedSha256: string;
  scenario: DocsVisualScenarioV1;
  expectedScenarioSha256: string; expectedSourceHash: string;
  expectedToolVersions: DocsVisualToolVersionsV1;
  expectedBrowserContract: DocsVisualBrowserContractV1;
};
export async function recoverDocsVisualCaptureStartupV1(): Promise<void> {
  const claimed = await withExclusiveDocsVisualCaptureScanLockV1(async () => {
    const inventory = await enumerateStrictDocsVisualLifecycleRootsV1({
      states: ["registering", "active", "failed", "consumed", "discarded"],
    });
    assertUniqueRunIdsAcrossLifecycleInventoryV1(inventory);
    await recoverUnpublishedCiRegistrationsWithoutPublicationV1(inventory);
    return tryAcquireEnumeratedNonCiRunLeasesWithoutGapV1(inventory);
  });
  await recoverEveryClaimedRunByExactStateAllSettledAndReleaseLastV1(claimed);
}
type RetainedVerifiedDocsVisualCaptureV1 = {
  ownership: ClaimedDocsVisualCaptureRunLeaseV1; value: DocsVisualCiVerifiedCaptureV1;
};
async function captureDocsVisualRunRetainingLeaseV1(
  input: DocsVisualCaptureIdentityV1,
  ciBinding?: DocsVisualCiBatchBindingV1
): Promise<RetainedVerifiedDocsVisualCaptureV1> {
  await recoverDocsVisualCaptureStartupV1();
  const identity = normalizeExactDocsVisualCaptureIdentityV1(input);
  assertLocalizedIdentityBytesUnchanged(identity, input);
  const { runId } = identity;
  const scenario = await resolveScenarioFromConfinedRegistry(identity.visualId);
  assertScenarioMatchesLocalizedIdentity(scenario, identity);
  const sourceHashInput = await collectDocsVisualSourceHashInputV1(scenario);
  const environment =
    await resolveExpectedBrowserCaptureEnvironmentV1(scenario);
  assertEnvironmentUsesCanonicalSharedTypesV1(environment, sourceHashInput);
  const scenarioSha256 = sha256(sourceHashInput.scenarioSource.bytes);
  const ownership = ciBinding
    ? await registerAndPublishDocsVisualCiCaptureRunV1({
        identity, binding: ciBinding,
      })
    : await claimNewDocsVisualCaptureRunV1({ runId });
  try {
    const completed = await runOwnedBrowserCaptureWithAllSettledTeardownV1({
      ownership, identity, scenario, scenarioSha256, sourceHashInput,
      expectedToolVersions: environment.toolVersions,
      expectedBrowserContract: environment.browserContract,
    });
    await writeDocsVisualCaptureReadySealV1AtomicNoReplace({
      runRoot: ownership.runRoot,
      provenance: completed.value.provenance,
      privacyEvidence: completed.value.privacyEvidence,
      fixtureRecovery: completed.fixtureRecovery,
    });
    const evidence = await loadAndVerifyCaptureUnderClaimedLeaseV1(
      completed.value.result, ownership
    );
    return { ownership, value: { result: completed.value.result, evidence } };
  } catch (error) {
    const terminal = await settleCleanup(() =>
      recoverAndQuarantineUnreadyDocsVisualCaptureRunV1({
        runId, runRoot: ownership.runRoot, ownership,
      })
    );
    const release = await settleCleanup(() =>
      releaseDocsVisualCaptureRunLeaseLastV1(ownership)
    );
    throw combineCaptureTerminalAndReleaseFailuresV1(error, terminal, release);
  }
}
export async function captureDocsVisual(
  input: DocsVisualCaptureIdentityV1
): Promise<CaptureResult> {
  const retained = await captureDocsVisualRunRetainingLeaseV1(input);
  try {
    return retained.value.result;
  } finally {
    await releaseDocsVisualCaptureRunLeaseLastV1(retained.ownership);
  }
}
export async function withClaimedDocsVisualCaptureForPromotionV1<T>(
  input: DocsVisualPromotionClaimInputV1,
  use: (capture: VerifiedDocsVisualCaptureForPromotionV1) => Promise<T>
): Promise<T> {
  const ownership =
    await claimExactPromotionRunIdUnderCaptureScanLockV1(input.runId);
  try {
    const verified = await verifyClaimedPromotionRunMatchesRequestV1({
      ownership, input,
    });
    assertExactPromotionRunBindingV1({
      requestedRunId: input.runId,
      ownership, provenance: verified.provenance,
    });
    return await use({ ...verified, ownership });
  } finally {
    await releaseDocsVisualCaptureRunLeaseLastV1(ownership);
  }
}
export async function withVerifiedDocsVisualCiCaptureBatchV1(
  input: DocsVisualCiCaptureBatchInputV1,
  use: (outcomes: readonly DocsVisualCiCaptureOutcomeV1[]) =>
    Promise<DocsVisualCiCallbackHandoffV1>
): Promise<void> {
  const exact = normalizeUniqueDocsVisualCiCaptureRequestsV1(input.requests);
  const binding = normalizeDocsVisualCiBatchBindingV1(input.binding);
  const settled = await mapSettledBoundedV1({
    values: exact, concurrency: DOCS_VISUAL_CI_CAPTURE_CONCURRENCY_V1,
    run: (request) => captureDocsVisualRunRetainingLeaseV1(request, binding),
  });
  const retained = collectRetainedCapturesInIdentityOrderNoThrowV1(settled);
  const outcomes = projectSortedBoundedDocsVisualCiOutcomesNoThrowV1(settled);
  const callback = await settleDocsVisualCiCallbackHandoffV1(() => use(outcomes));
  const terminal = await Promise.allSettled(
    retained.map(async ({ ownership, value }) => {
      let primary: unknown; try {
        assertDiscardAuthorizationCoversCaptureV1({
          authorization: callback.value?.discardAuthorization,
          binding, outcomes, result: value.result, ownership,
        });
        await writeAndFsyncExactDiscardIntentV1({
          reason: "ci-terminal-discard", result: value.result, ownership,
          externalDiscardSha256:
            callback.value!.discardAuthorization.discardSha256,
        });
        await renameClaimedRunToDiscardedNoReplaceAndFsyncV1(ownership);
        await deleteExactDiscardedTreeAndFsyncV1(value.result, ownership);
      } catch (error) {
        const preserved = await settleCleanup(() =>
          retainOrQuarantineMarkerBoundCiCaptureWithoutDeletionV1({
            ownership, result: value.result, error,
          }));
        primary = combineCiDiscardAuthorizationAndPreservationFailuresV1(
          error, preserved);
      }
      const release = await settleCleanup(() =>
        releaseDocsVisualCaptureRunLeaseLastV1(ownership));
      throwIfCiTerminalOrReleaseFailedV1(primary, release);
    })
  );
  throwCombinedDocsVisualCiBatchFailuresV1({
    captureFailures: rejectedDocsVisualCiCaptureFailuresV1(outcomes),
    callbackFailure: callback.error ?? callback.value?.callbackFailure,
    terminal,
  });
}
export async function withReconstructedDocsVisualCiRecoveryV1(
  input: DocsVisualCiRecoveryIntentInputV1,
  use: (snapshot: DocsVisualCiRecoverySnapshotV1) =>
    Promise<DocsVisualCiRecoveryHandoffV1>
): Promise<void> {
  const prefix = await loadStrictCiOwnerPrefixFromHeldDirectoryV1(input);
  const owned = await claimExactCiRunsUnderCaptureScanLockV1(input);
  let primary: unknown;
  try {
    const snapshot = await reconstructExactCiOutcomesUnderRunLeasesV1({
      input, prefix, owned,
    });
    const handoff = await use(snapshot);
    assertSameRecoverySnapshotAndAuthorizationV1({ snapshot, handoff, prefix });
    await terminalizeClaimedCiRunsAllSettledV1({ owned, snapshot, handoff });
  } catch (error) {
    const preserve = await preserveClaimedCiRunsWithoutDeletionV1(owned);
    primary = combineCiRecoveryAndPreservationFailuresV1(error, preserve);
  }
  const release = await settleCleanup(() =>
    releaseClaimedCiRunLeasesLastAllSettledV1(owned));
  throwIfCiRecoveryOrReleaseFailedV1(primary, release);
}
export async function runDocsVisualPromotionCli(argv: readonly string[]) {
  return promoteDocsVisual(normalizeDocsVisualPromotionInputV1(
    parseExactDocsVisualPromotionArgs(argv)));
}
export async function promoteDocsVisual(input: DocsVisualPromotionInputV1) {
  const request = normalizeDocsVisualPromotionInputV1(input);
  assertExplicitReviewAndAltCaption(request);
  const scenario = await resolveScenarioFromConfinedRegistry(request.visualId);
  const claim = await buildExactDocsVisualPromotionClaimV1(scenario, request);
  return withClaimedDocsVisualCaptureForPromotionV1(claim, async (capture) => {
    const canonical = sanitizeAndProvePixelIdentityV1(capture.rawPng);
    const config = createDocsVisualPairPromotionConfigV1({
      ...localizedPairIdentity(capture.provenance.identity),
      validateStablePair: createDocsVisualStablePairValidatorV1(
        localizedPairIdentity(capture.provenance.identity)),
    });
    await recoverDurablePairPromotionV1(config);
    const existing = await classifyExistingCanonicalVisualPromotionV1({
      config, provenance: capture.provenance, canonical,
      reviewedBy: request.reviewedBy,
    });
    if (existing.state === "matching") {
      await consumeSelectedDocsVisualCaptureWithDurableIntentV1({
        capture, expectedRunId: request.runId, canonicalPair: existing.promotion });
      return existing.promotion;
    }
    assertNewPromotionAllowed(existing, capture.state);
    const receipt = buildReceiptOnlyFromVerifiedCaptureV1({
      capture, canonical, reviewedBy: request.reviewedBy,
      reviewedAt: currentIso8601(),
    });
    const promotion = await durablePairPromotionV1({
      config, members: [
        { memberId: "member-0", bytes: canonical.bytes },
        { memberId: "member-1",
          bytes: serializeCanonicalDocsVisualReceiptV1(receipt) },
      ],
    });
    await assertPromotedVisualPairMatchesCaptureProvenanceV1({
      config, provenance: capture.provenance, canonical, receipt,
    });
    await consumeSelectedDocsVisualCaptureWithDurableIntentV1({
      capture, expectedRunId: request.runId, canonicalPair: promotion });
    return promotion;
  });
}
```

`scripts/docs/capture-visual.ts` canonical-JSON serializes the returned CLI
object with one final LF. It redacts subprocess output and never adds fields.

**Data flow:** scenario-only CLI/migration/CI identity → caller `runId` → atomic
scan registration + per-run lease → strict scenario/hash → durable acquired
record → fixture/session/actions/assertions → bounded PNG + privacy/network gates
→ capsule → route/session/fixture absence → tombstone absence → ready/verified.
CLI/migration releases for review; CI retains through callback, terminal discard
and release-last. Manual promotion claims the exact reviewed `runId`, preserves
that binding through its lease/consume journal, and holds it through verified
reopen, sanitize, atomic image/receipt and cleanup; both members advance or
neither.

**Error handling:** use `docs_visual_server_unavailable`, `docs_visual_auth_failed`,
`docs_visual_action_failed`, `docs_visual_assertion_failed`,
`docs_visual_console_error`, `docs_visual_capture_invalid`,
`docs_visual_identity_mismatch`, `docs_visual_run_lock_invalid`,
`docs_visual_run_live`, `docs_visual_capture_provenance_invalid`,
`docs_visual_capture_incomplete`, `docs_visual_capture_stale`,
`docs_visual_png_unsafe`, `docs_visual_review_required`,
`docs_visual_digest_mismatch`, `docs_visual_ci_capture_failed`,
`docs_visual_lifecycle_invalid`, `docs_visual_promotion_conflict` and
`docs_visual_promotion_failed`.
Identity/run drift rejects before review; failure never changes the canonical pair.

**Regression-test shape:** cover fake CLI success/failure/timeout, semantic
actions, real output parsing, browser errors, invalid boxes/PNG/chunks/digests,
missing review, atomic-rename failure and cleanup. Reject capture `--run-id`,
promotion without its required returned `runId`, paths/URLs and identity drift;
prove one CLI CSPRNG ID, unchanged five-field
direct identity, seven-field internal result, redacted four-data-field CLI
projection, confined raw paths and no generator call from CI/migration.
Pin every strict provenance/privacy field, cap/path/hash, synthetic fixture and
local-request proof; reject unknowns, symlinks and tuple/tool/browser drift.

Run overlapping real children: A pauses with its lease/mutable fixture; B
nonblocking-skips it without touching A, then captures its own run. Kill A at
every pre-fixture through post-ready boundary; a fresh process alone recovers.
Seed/kill/restart every active/failed/consumed/discarded phase around intent
fsync/rename; assert exact recovery, stable pairs, no cross-cleanup and
release-last. Duplicate IDs, busy/replaced/malformed/symlink locks and unknown
entries fail closed.

Prove collector/auth/gate/capsule/cleanup/ready order, raw/canonical pixel parity,
no raw mutation, settled cleanup and tamper rejection. Concurrent promoters
serialize through consumed cleanup; startup/promoter never reads the other's
owned run. All live/sanitize/match/pair/cleanup failures release last without
cross-cleanup. Kill after consumed/discarded rename and prove cleanup-only retry,
unchanged receipt and no-clobber. CI proves concurrency two, no lease gap,
callback-held skip, settled-failure callback, external-only artifacts, terminal
discard and sorted combined failures. Cross-run identity never deletes. Pin the
five-field promotion input/L01 hash import and every durable-pair crash outcome.
Create two ready runs with the same visual/hash and prove the requested ID alone
is leased/consumed; after a crash, that run resumes through its exact consume
intent while the duplicate remains unchanged. Wrong/unknown/CI-owned run IDs,
or run/evidence mismatches, must leave both run roots and the canonical pair
untouched; the exact successful ID must promote and clean only itself.
Pilot smoke asserts computed style/geometry/ARIA or DOM effects.

## Pilot Scenario Matrix

This leaf is the single writer for exactly these five scenario/image/receipt
triples under their respective `assets/{scenarios,images,receipts}` roots:

| `docId` | `locale` | `visualId` | Required proof |
| --- | --- | --- | --- |
| `getting-started-admin-orientation` | `en` | `admin-orientation-wide-light` | wide/light navigation |
| `getting-started-admin-orientation` | `en` | `admin-orientation-narrow-dark` | narrow/dark navigation |
| `screens-page-editor-preview-settings-and-history` | `en` | `page-editor-visible-change` | editor control with visible canvas effect |
| `screens-roles-matrix` | `en` | `roles-matrix-restricted` | restricted-permission/disabled state |
| `getting-started-site-setup-and-first-publish` | `en` | `first-publish-public-result` | save/publish-to-visible-result |

Each scenario uses synthetic data, zero console errors, scoped cleanup and a
distinct canonical visual identity. TASK-548-06 owns every other production
scenario/image/receipt file and must preserve these pilot IDs/paths. It expands
coverage without changing the pipeline contract.

## Sub-Tasks

- [ ] Add focused capture/process/session/assertion/provenance/PNG/promotion
  modules, all below 1,000 lines.
- [ ] Reuse `durablePairPromotionV1` plus the pre-landed distinct per-visual
  journal config; own/export the exact locale-aware stable-pair validator
  factory and pass it unchanged to sorted mutating recovery and the read-only
  hazard guard.
- [ ] Add only the scoped `!docs/guide/assets/images/**/*.png` ignore exception;
  keep `.tmp` and all unrelated PNGs ignored.
- [ ] Add at least five reviewed pilot scenario/image/receipt triples and prove
  their compiler joins.
- [ ] Add `tests/unit/documentation/docsVisualCapture.test.ts`,
  `docsVisualPromotion.test.ts` and focused safe PNG fixtures.

## Testing Requirements

- Before runtime smoke: `set -a && source .env && set +a`
- `bun test tests/unit/documentation/docsVisualCapture.test.ts tests/unit/documentation/docsVisualPromotion.test.ts`
- exact CLI parser tests for capture `--run-id` rejection and promotion's required bounded returned `--run-id`; pin ID/hash bounds, duplicate/unknown
  rejection, arbitrary path/URL refusal, one capture CSPRNG ID and unchanged lower-API identity
- exact producer/consumer tests for the seven-field internal `CaptureResult` and schema-tagged four-data-field CLI projection; CI batch and migration fixtures
  independently alter each identity field and fail before use/review
- import/round-trip tests pin L02's six wire records/domains and exact recovery input/snapshot/handoff/verifier signatures; reject every unknown/order/tamper.
  A land-order fixture compiles L02 alone and proves no L03 runtime/private import
- crash registration and intent-only through final-discard recovery at every temp/fsync/rename boundary; prove gapless publication, continuous snapshot leases,
  reconstruction before L03 callback writes, same-snapshot handoff and no deletion until exact authorization. Failures preserve bytes/errors; absent fulfilled
  runs require the already-valid final chain
- strict capsule/process tests pause real child A after lease plus fixture mutation and prove concurrent B skips A without any cross-cleanup; kill A at every
  declared pre-fixture through post-ready boundary, then prove a fresh process alone claims the released kernel lease, performs L01-first recovery, proves
  fixture/session/routes absent and reaches ready or failed exactly once
- exact five-field promotion-input tests proving `runId` is required but no path/provenance/tool/assertion override is accepted; cover duplicate eligible runs,
  wrong/restarted/successful selected runs, consume-journal binding and receipt projection from verified evidence
- promotion integration coverage proving L01's exact source-hash helper output becomes the receipt `sourceHash`, plus direct factory tests for absent and strict
  locale-bound present pairs
- fresh-process image/receipt recovery after every journal phase/final rename, every preparing/staging boundary, and verified-commit rename followed by helper
  failure and cleanup retry
- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-visual-scenario.test.ts`
- five distinct real `playwright-cli -s=docs548-...` flows after server restart,
  with visible effects, zero console/page errors, screenshots and cleanup
- `bun scripts/docs/compile-corpus.ts --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Send exact capture, review, promotion, cleanup and privacy commands to the TASK-548
closure owner; raw/diff images remain temporary evidence.
