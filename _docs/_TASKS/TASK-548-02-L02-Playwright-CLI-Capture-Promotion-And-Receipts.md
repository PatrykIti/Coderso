# TASK-548-02-L02: Playwright CLI Capture, Promotion and Receipts
# FileName: TASK-548-02-L02-Playwright-CLI-Capture-Promotion-And-Receipts.md

**Parent Subtask:** TASK-548-02
**Priority:** Critical
**Category:** Documentation Platform / Playwright / Asset Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-02-L01
**Status:** ⏳ To Do

---

## Overview

Implement the task-scoped `playwright-cli` runner, visible-effect assertion
adapter, bounded screenshot capture, safe PNG sanitizer, explicit review gate,
atomic promotion and strict receipt. Own focused modules under
`scripts/docs/visual/`, `scripts/docs/capture-visual.ts`,
`scripts/docs/promote-visual.ts`, canonical pilot scenarios/assets/receipts,
`.gitignore` and focused tests.

Never extend `scripts/playwright-widget-contract-smoke.ts`. Raw captures remain
under `.tmp/docs-visuals/<runId>/`; only reviewed images are promoted to
`docs/guide/assets/images/<docId>/<visualId>.png`.

## Capture Contract

For every browser command use one full named prefix:

```text
playwright-cli -s=docs548-<bounded-run-id> ...
```

The only supported command surfaces are:

```text
bun run docs:visual:capture --scenario <id> --run-id <bounded>
bun run docs:visual:promote --scenario <id> \
  --raw-reviewed-sha256 <64-lowercase-hex> \
  --reviewed-by <bounded-id> \
  --confirm-alt-caption
```

The runner resolves the scenario ID from the confined registry and derives the
session exactly as `docs548-<run-id>`. The run ID is caller-supplied,
lowercase-kebab, length-bounded and collision-checked; it is never a raw path,
URL or shell fragment. Promotion resolves the staged path from scenario/run
state and never accepts an arbitrary destination.

The runner restarts the task dev server first, waits for admin and public health
checks, loads `.env` without printing it, authenticates through the real admin
flow, installs console/page-error collectors before navigation, executes
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
  visualId: string;
  scenarioSha256: string;
  sourceHash: string;
  rawReviewedSha256: string;
  canonicalImageSha256: string;
  width: number;
  height: number;
  playwrightCliVersion: string;
  browserVersion: string;
  assertionsPassed: number;
  consoleErrors: 0;
  reviewedBy: string;
  reviewedAt: string;
};
```

The receipt is strict and contains no command transcript, cookie, token,
credential, fixture value, absolute path or screenshot bytes. `reviewedAt` is
valid ISO-8601 evidence; deterministic bundle generation treats the checked-in
receipt as source bytes and never injects a new timestamp.

Promotion requires the reviewer to inspect the actual staged image, supply its
observed `rawReviewedSha256` and confirm alt/caption accuracy. The promoter then
strips ancillary PNG text/time/EXIF-like chunks, proves decoded pixel identity,
computes `canonicalImageSha256` over the sanitized bytes, and rechecks
dimensions. `DocsVisualV1.sha256` and the receipt use the canonical hash for the
promoted asset; the raw reviewed hash remains review-chain evidence. Image +
receipt are written through temporary siblings, renamed only after both
validate, then read back and hash-verified. No capture or CI command may
auto-approve.

## Security Contract

- **Endpoint visibility:** no new endpoint. Use existing internal admin and
  public read routes only.
- **Auth/RBAC:** authenticate a scenario-specific scoped test account; assert
  the declared permission state. Credentials come from environment/runtime
  fixture setup and never from manifests or receipts.
- **CSRF/rate limit:** real admin writes preserve CSRF and existing buckets.
  No middleware bypass or direct production DB mutation.
- **Validation:** strict scenario/receipt shapes, one-target semantic locator,
  local hosts only, bounded PNG parser, allowed PNG chunks, exact hashes and
  confined paths.
- **Anti-abuse:** no public write, nonce/HMAC or CAPTCHA. Cap command time,
  retries, sessions, output, dimensions and file bytes; no arbitrary shell/JS.
- **Privacy:** only synthetic fixtures; review the pixels; reject metadata
  chunks, secret/PII indicators, real user content, signed URLs and third-party
  image dependencies.
- **Cleanup:** always remove fixtures/routes, close the exact session with full
  prefix, verify session absence and stop only the task-owned server process.

## Implementation Pseudocode

```ts
export async function captureDocsVisual(input: {
  visualId: string;
  runId: string;
}): Promise<CaptureResult> {
  const visualId = assertBoundedVisualId(input.visualId);
  const runId = assertBoundedDocsVisualRunId(input.runId);
  const scenario = await resolveScenarioFromConfinedRegistry(visualId);
  return withDocsFixtureLease(scenario, runId, async (lease) => {
    const session = createBoundedSessionName("docs548", lease.runId);
    let result: CaptureResult | undefined;
    let browserError: unknown;
    try {
      await ensureTaskServerHealthy();
      await openAndAuthenticate(session, lease);
      await installConsoleCollectors(session);
      await executeOwnedActions(session, scenario.actions, lease.values);
      await assertVisibleEffects(session, scenario.assertions);
      await assertZeroConsoleAndPageErrors(session);
      const rawPath = await captureBoundedTarget(session, scenario);
      await inspectRawStagedPngWithoutMutation(rawPath, scenario);
      result = { rawPath, rawReviewedSha256: await sha256File(rawPath) };
    } catch (error) {
      browserError = error;
    }
    const routeCleanup = await settleCleanup(() => clearOwnedRoutes(session));
    const sessionClose = await settleCleanup(() => closeExactSession(session));
    const sessionAbsence = await settleCleanup(() =>
      assertExactSessionAbsent(session)
    );
    const failure = combineCaptureAndCleanupFailures({
      browserError,
      routeCleanup,
      sessionClose,
      sessionAbsence,
    });
    if (failure) throw failure;
    return result as CaptureResult;
  });
}

export async function promoteDocsVisual(input: PromotionInput) {
  const raw = await inspectRawStagedPng(input.stagedPath);
  assertDigestEquals(raw.sha256, input.rawReviewedSha256);
  assertExplicitReviewer(input.reviewer);
  const canonical = sanitizeAndInspectCanonicalPng(raw.bytes);
  assertDecodedPixelsEqual(raw, canonical);
  const receipt = buildDocsVisualReceiptV1({
    ...input,
    rawReviewedSha256: raw.sha256,
    canonicalImageSha256: sha256(canonical.bytes),
    width: canonical.width,
    height: canonical.height,
  });
  const promoted = await atomicPromoteImageAndReceipt(canonical.bytes, receipt);
  await assertPromotedPairMatchesReceipt(promoted, receipt);
}
```

**Data flow:** bounded `visualId` + caller `runId` → confined registry lookup →
strict scenario → unchanged run ID through scoped fixture/session → owned
action/assertion compiler → bounded byte-identical raw screenshot → non-mutating
PNG/dimension/privacy validation → human/agent pixel review → one promotion-time
sanitization → atomic canonical image + receipt → re-read/hash verification.
Compile the corpus after promotion to prove the visual joins the expected
doc/section.

**Error handling:** use `docs_visual_server_unavailable`,
`docs_visual_auth_failed`, `docs_visual_action_failed`,
`docs_visual_assertion_failed`, `docs_visual_console_error`,
`docs_visual_capture_invalid`, `docs_visual_png_unsafe`,
`docs_visual_review_required`, `docs_visual_digest_mismatch` and
`docs_visual_promotion_failed`. Failure never changes the canonical pair.

**Regression-test shape:** fake CLI subprocess success/failure/timeout; semantic
action compilation; real output parsing; console/page error rejection; bad
bounding boxes; oversized/invalid/truncated PNG; forbidden ancillary chunks;
digest mismatch; missing review; atomic rename failure; exact cleanup on every
failure. Reject arbitrary scenario paths/URLs and prove `visualId` plus the
caller run ID resolve the exact registry record/session without replacement.
Prove raw and canonical hashes are distinct when removable metadata is
present, decoded pixels remain identical, the receipt derives only from
canonical bytes, capture validation does not mutate raw bytes, all
route/session/absence/fixture cleanup steps run despite sibling failures, and
post-write tampering fails. Real pilot smoke asserts
computed style/geometry/ARIA or DOM state, not mere control presence.

## Pilot Scenario Matrix

This leaf is the single writer for exactly these five scenario/image/receipt
triples under their respective `assets/{scenarios,images,receipts}` roots:

| `docId` | `visualId` | Required proof |
| --- | --- | --- |
| `getting-started-admin-orientation` | `admin-orientation-wide-light` | wide/light navigation |
| `getting-started-admin-orientation` | `admin-orientation-narrow-dark` | narrow/dark navigation |
| `screens-page-editor-preview-settings-and-history` | `page-editor-visible-change` | editor control with visible canvas effect |
| `screens-roles-matrix` | `roles-matrix-restricted` | restricted-permission/disabled state |
| `getting-started-site-setup-and-first-publish` | `first-publish-public-result` | save/publish-to-visible-result |

Each scenario uses synthetic data, zero console errors, scoped cleanup and a
distinct canonical visual identity. TASK-548-06 owns every other production
scenario/image/receipt file and must preserve these pilot IDs/paths. It expands
coverage without changing the pipeline contract.

## Sub-Tasks

- [ ] Add focused capture/process/session/assertion/PNG/promotion modules, all
  below 1,000 lines.
- [ ] Add only the scoped `!docs/guide/assets/images/**/*.png` ignore exception;
  keep `.tmp` and all unrelated PNGs ignored.
- [ ] Add at least five reviewed pilot scenario/image/receipt triples and prove
  their compiler joins.
- [ ] Add `tests/unit/documentation/docsVisualCapture.test.ts`,
  `docsVisualPromotion.test.ts` and focused safe PNG fixtures.

## Testing Requirements

- Before runtime smoke: `set -a && source .env && set +a`
- `bun test tests/unit/documentation/docsVisualCapture.test.ts tests/unit/documentation/docsVisualPromotion.test.ts`
- exact CLI parser tests for required flags, ID/hash bounds, session derivation,
  unknown/duplicate rejection and arbitrary path/URL refusal
- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-visual-scenario.test.ts`
- five distinct real `playwright-cli -s=docs548-...` flows after server restart,
  with visible effects, zero console/page errors, screenshots and cleanup
- `bun scripts/docs/compile-corpus.ts --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Send exact capture, review, promotion, cleanup and privacy commands to the
TASK-548 closure owner. Raw/diff images remain temporary evidence.
