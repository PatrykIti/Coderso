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
  --raw-reviewed-sha256 <64-lowercase-hex> \
  --reviewed-by <bounded-id> \
  --confirm-alt-caption
```

The runner resolves the scenario ID from the confined registry and derives the
session exactly as `docs548-<run-id>`. The public CLI accepts only one
`--scenario`; `--run-id`, duplicate and unknown flags fail closed. The CLI
internally creates its ID with
`createDocsVisualRunIdV1({ scope: "cli" })` and passes that exact value to
capture together with the scenario's exact `(docId, locale, sectionId,
visualId)` owner. `captureDocsVisual` is the lower validation-only API: direct
CI and migration callers pass that full localized identity plus their own
generated IDs, and it never calls the generator or replaces caller identity.
Every run writes only below
`.tmp/docs-visuals/<runId>/`. Promotion resolves that staged state and never
accepts an arbitrary source or destination.

The public CLI emits one bounded canonical JSON object and no unstructured
browser output:

```ts
type DocsVisualCaptureCliResultV1 = {
  schema: "coderso.docs-visual-capture-result@v1";
  visualId: string;
  runId: string;
  rawPath: string;
  rawReviewedSha256: string;
};
```

`rawPath` is a normalized repository-relative path confined below the generated
run root. The exact generated `runId` is returned unchanged so the review step
can identify staged state without accepting an arbitrary path.

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
  docId: string;
  locale: string;
  sectionId: string;
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
export async function runDocsVisualCaptureCli(
  argv: readonly string[]
): Promise<DocsVisualCaptureCliResultV1> {
  const visualId = parseExactScenarioOnlyArgs(argv);
  const scenario = await resolveScenarioFromConfinedRegistry(visualId);
  const runId = await createDocsVisualRunIdV1({ scope: "cli" });
  const captured = await captureDocsVisual({
    docId: scenario.docId,
    locale: scenario.locale,
    sectionId: scenario.sectionId,
    visualId: scenario.visualId,
    runId,
  });
  return normalizeDocsVisualCaptureCliResultV1({
    schema: "coderso.docs-visual-capture-result@v1",
    visualId,
    runId,
    rawPath: captured.rawPath,
    rawReviewedSha256: captured.rawReviewedSha256,
  });
}

export async function captureDocsVisual(input: {
  docId: string;
  locale: string;
  sectionId: string;
  visualId: string;
  runId: string;
}): Promise<CaptureResult> {
  const identity = normalizeDocsVisualPairIdentityV1(input);
  const runId = assertBoundedDocsVisualRunId(input.runId);
  const scenario = await resolveScenarioFromConfinedRegistry(
    identity.visualId
  );
  assertScenarioMatchesLocalizedIdentity(scenario, identity);
  const runRoot = await createConfinedRunRoot(`.tmp/docs-visuals/${runId}`);
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
      const rawPath = await captureBoundedTarget(session, scenario, runRoot);
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
  const scenario = await resolveScenarioFromConfinedRegistry(input.visualId);
  const raw = await resolveAndInspectUniqueReviewedCapture({
    visualId: input.visualId,
    rawReviewedSha256: input.rawReviewedSha256,
  });
  assertDigestEquals(raw.sha256, input.rawReviewedSha256);
  assertExplicitReviewer(input.reviewer);
  const canonical = sanitizeAndInspectCanonicalPng(raw.bytes);
  assertDecodedPixelsEqual(raw, canonical);
  const sourceHash = computeDocsVisualSourceHashV1(
    await collectDocsVisualSourceHashInputV1(scenario)
  );
  const receipt = buildDocsVisualReceiptV1({
    ...input,
    docId: scenario.docId,
    locale: scenario.locale,
    sectionId: scenario.sectionId,
    visualId: scenario.visualId,
    sourceHash,
    rawReviewedSha256: raw.sha256,
    canonicalImageSha256: sha256(canonical.bytes),
    width: canonical.width,
    height: canonical.height,
  });
  const receiptBytes = serializeCanonicalDocsVisualReceiptV1(receipt);
  const config = createDocsVisualPairPromotionConfigV1({
    docId: scenario.docId,
    locale: scenario.locale,
    sectionId: scenario.sectionId,
    visualId: scenario.visualId,
    validateStablePair: createDocsVisualStablePairValidatorV1({
      docId: scenario.docId,
      locale: scenario.locale,
      sectionId: scenario.sectionId,
      visualId: scenario.visualId,
    }),
  });
  await recoverDurablePairPromotionV1(config);
  return durablePairPromotionV1({
    config,
    members: [
      {
        memberId: "member-0",
        bytes: canonical.bytes,
      },
      {
        memberId: "member-1",
        bytes: receiptBytes,
      },
    ],
  });
}
```

`scripts/docs/capture-visual.ts` canonical-JSON serializes the returned CLI
object with one final LF. It redacts subprocess output and never adds fields.

**Data flow:** public scenario-only argv → strict scenario/localized owner →
internally generated CLI `runId` → validation-only lower capture call; or
direct CI/migration `(docId, locale, sectionId, visualId)` + caller-generated
`runId` → confined registry lookup and exact owner match → strict scenario →
unchanged run ID through scoped fixture/session → owned
action/assertion compiler → bounded byte-identical raw screenshot → non-mutating
PNG/dimension/privacy validation → human/agent pixel review → one promotion-time
sanitization → L01 source-hash input collection/helper → atomic canonical image
and locale-bearing receipt → re-read/hash/identity verification.
Compile the corpus after promotion to prove the visual joins the expected
doc/section. Both promotion members advance through the shared recoverable
transaction or neither does.

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
failure. Reject public `--run-id`, arbitrary scenario paths/URLs and prove the
scenario-only CLI generates exactly one `cli`-scoped ID, returns it in bounded
JSON and passes it unchanged to capture. Prove direct lower calls validate and
preserve supplied localized identities and CI/migration run IDs without
invoking the generator, reject every owner mismatch, and keep every raw path
below `.tmp/docs-visuals/<runId>/`.
Prove raw and canonical hashes are distinct when removable metadata is
present, decoded pixels remain identical, the receipt derives only from
canonical bytes, capture validation does not mutate raw bytes, all
route/session/absence/fixture cleanup steps run despite sibling failures, and
post-write tampering fails. Real pilot smoke asserts
computed style/geometry/ARIA or DOM state, not mere control presence.
Prove promotion imports the L01 helper, supplies the complete exact input and
copies its hash unchanged into the receipt; perturb every source-hash input and
reject missing/empty matches.
Use the same `docId` and `sectionId` in two locale fixtures and prove scenario,
image, receipt, validator factory and compiler joins remain locale-isolated;
reject noncanonical locale and every path/receipt/scenario identity mismatch.
Inject process termination in a real child after every durable journal phase
and both final renames, including every `preparing` journal and recorded member
staging boundary, then recover from a fresh process before a compiler or
staleness read. Prove safe pre-final debris cleanup, old-pair restoration before
commit, new-pair retention
after commit, the exact `verified-commit`-rename-then-helper-throws boundary,
idempotent cleanup retry and fail-closed missing/tampered recovery material.

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

- [ ] Add focused capture/process/session/assertion/PNG/promotion modules, all
  below 1,000 lines.
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
- exact CLI parser tests for required `--scenario`, public `--run-id` rejection,
  ID/hash bounds, bounded JSON result, session derivation, unknown/duplicate
  rejection and arbitrary path/URL refusal; prove the CLI generates one CSPRNG
  ID and the lower capture API receives it unchanged
- promotion integration coverage proving L01's exact source-hash helper output
  becomes the receipt `sourceHash`, plus direct factory tests for absent and
  strict locale-bound present pairs
- fresh-process image/receipt recovery after every journal phase/final rename,
  every preparing/staging boundary, and verified-commit rename followed by
  helper failure and cleanup retry
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
