# TASK-414-06-L04: Page Media Composition Capability Pack
# FileName: TASK-414-06-L04-Video-And-Rich-Gallery-Capability-Pack.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-06
**Priority:** High
**Category:** Agent / Designer / Page / Media / Gallery / Video
**Estimated Effort:** Large
**Dependencies:** TASK-414-06-L01 terminal; TASK-414-04-L02 terminal;
TASK-414-05 terminal; TASK-547 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Add one reviewed media-composition capability for an existing Page by composing
the Page domain's already supported, editor-insertable `gallery` and `video`
blocks. An image gallery remains a native Page `gallery`; videos are bounded
sibling Page `video` blocks in the same target section. This leaf does not
invent a mixed-media widget, extend a schema, or create another authoring
surface.

Media may come only from an authorized native Media record, an exact reviewed
repository-owned curated asset, or a Designer-private asset that passed the
shared scan/canonical-adoption pipeline. Agent can propose and execute a
conflict-safe patch on one existing Page. Designer contributes the same native
Page blocks to its private bundle/stage graph and reaches canonical Page data
only through reviewed whole-site promotion.

Historical `core/widgets/*` Gallery Mosaic and its Wizard/Visual/Advanced
editors are compatibility-only under `_docs/WIDGETS.md`. They are expressly
excluded from this task, the capability manifest, Agent action IDs, Designer
package contribution, docs, and new tests. Product Gallery is also out of
scope.

## Verified Existing Page Contract

Implementation preflight must re-read the terminal source and correct this task
before coding if it drifted. At the authoring baseline:

- `core/services/pages/pageDocumentV2.ts` owns strict Page block allowlists,
  `createPageBlockV2`, `normalizePageDocumentV2ForWrite`, and existing
  editor/runtime/assistant capability facts;
- Page `gallery` owns `items`, `layout`, and present-only filter fields; its
  normalized items are image `{ src, alt, caption, category? }` projections;
- Page `video` owns `assetId`, `src`, `title`, `autoplay`, and `muted`; runtime
  already renders controls, and existing defaults are `autoplay:false` and
  `muted:true`;
- Page gallery/video controls and renderers already exist; and
- the relevant Page document, control-registry, renderer, and broad legacy test
  files exceed 1,000 physical lines and therefore must remain untouched here.

If the terminal Page contract cannot express the composition or lacks a native
conflict-safe mutation/stage seam, stop and amend/split the proper Page owner.
Do not extend an oversized Page file, route around its normalizer, or fall back
to Gallery Mosaic.

## Sub-Tasks

None; this is one executable leaf.

## Exact File Ownership

This leaf is the sole writer for:

- `core/services/media/curatedMediaProfiles.ts` as a thin compatibility facade;
- new `core/services/media/curatedMediaCatalogV2.ts`;
- new `core/services/media/curatedMediaContract.ts`;
- new `core/services/assistant/capabilities/pageMediaCompositionCapability.ts`;
- new `core/services/assistant/capabilities/pageMediaCompositionActionContract.ts`;
- new `core/services/assistant/capabilities/pageMediaCompositionActionAdapter.ts`;
- new `core/services/assistant/capabilities/pageMediaCompositionDesignerContribution.ts`;
- new focused tests:
  `tests/vitest/media/curatedMediaV2.test.ts`,
  `tests/vitest/assistant/pageMediaCompositionContract.test.ts`,
  `tests/vitest/assistant/pageMediaCompositionCapability.test.ts`, and
  `tests/integration/assistant/agentPageMediaComposition.test.ts`.

Read-only validation may run the existing focused Page gallery/video suites.
This leaf must not edit `pageDocumentV2.ts`, `pageEditorControlRegistry.ts`,
`pageRendererV2.tsx`, Page editors, broad Page tests, `core/widgets/*`, widget
editors, Product Gallery, native Media upload/storage/schema/routes, Post video
embed behavior, TASK-547, shared Assistant executor/registry, route mounts,
docs/tasks/changelog, or another TASK-414 owner.

## Trusted Media Contract

```ts
type TrustedPageMediaRefV1 =
  | Readonly<{
      source: "media-library";
      mediaId: string;
      expectedDigest: string;
    }>
  | Readonly<{
      source: "curated-catalog";
      assetId: string;
      catalogVersion: string;
      expectedDigest: string;
    }>
  | Readonly<{
      source: "designer-staged";
      stagedAssetKey: string;
      adoptionReceiptDigest: string;
    }>;
```

The server resolves the union to the exact Page/native or staged projection.
Provider/client input never supplies a remote URL, base64/blob/path, Media
delivery URL, provider asset ID, MIME claim, license text, or private object
handle. Native Media resolution checks current actor permission, owner, digest,
kind, canonical MIME, delivery class and bounded dimensions/duration. A
`designer-staged` ref is valid only inside its exact workspace/revision and is
adopted before promotion cutover.

Curated entries are immutable code-owned records with stable ID/version, kind,
fixed download origin, expected digest, license/review/provenance facts,
attribution, alt/title intent, role/industry/theme tags, and bounded MIME/size/
dimensions/duration. Import uses the shared outbound policy, digest equality,
ClamAV and canonical Media validation. Scanner unavailable, changed bytes,
invalid license or no semantic match fails closed. Unsupported role/profile
returns `assistant_curated_media_no_match`; it never substitutes unrelated
stock.

Every curated image/video import consumes TASK-414-06-L01's terminal
`curatedMediaImportTrustService.ts` unchanged. This leaf may extend only the
strict catalog records it owns; it cannot implement another fetch, DNS/peer,
redirect, proxy, stream, digest, MIME, scanner, decoder/re-encoder, temporary
storage, or native Media-write path. The action receives only L01's canonical
verified bytes/receipt, and all L01 failure cases still produce zero Media,
object, audit, cache, Page, or staged-resource write.

## Native Page Composition Contract

The exact Agent action ID is `page.media-composition.refine`. Its strict request
targets one existing Page and section with current Page version/updatedAt/
document digest and carries:

- optional existing `galleryBlockId` plus a complete replacement list of at
  most 16 image entries, each using `TrustedPageMediaRefV1`, bounded authored
  alt/caption and optional existing Page category token;
- gallery layout restricted to the Page owner's current allowlist;
- at most four video operations targeting an existing `videoBlockId` or adding
  one sibling video block, with trusted video Media ref and bounded title; and
- explicit remove IDs only for the listed existing gallery/video blocks.

There is no arbitrary block JSON, block type, slot, section creation, Page
creation, raw `src`/`assetId`, playback extension, loop/controls key, CSS/HTML,
or whole-site operation. New videos use only existing Page fields with
`autoplay:false` and `muted:true`; the native renderer continues to own visible
controls. Existing unrelated Page sections, blocks, fields, responsive data and
bytes are preserved. The adapter builds native blocks with the Page owner's
constructors, normalizes the complete document through
`normalizePageDocumentV2ForWrite`, proves untargeted canonical bytes unchanged,
shows the full visible diff for review, and executes through TASK-414-05's
current optimistic/transactional Page mutation and revision seam.

Designer contribution emits the identical existing Page `gallery`/`video`
blocks and trusted staged asset references through TASK-547/Designer symbolic
keys. The Designer compiler normalizes them with the terminal Page owner,
preview resolves only private adopted bindings, and promotion rechecks native
permissions/baseline before one generation cutover. Reject/expiry removes only
private staged data. No normal CMS list/search/public read sees it before
promotion.

## Implementation Pseudocode

```ts
export async function proposePageMediaComposition(
  raw: unknown,
  ctx: AuthorizedAgentContext,
  deps: PageMediaCompositionDeps,
): Promise<ReviewedPageMediaCompositionV1> {
  const request = normalizePageMediaCompositionRequestV1(raw);
  const target = await deps.pages.requireWritablePageSection({
    actorId: ctx.actorId,
    pageId: request.pageId,
    sectionId: request.sectionId,
    expectedVersion: request.expectedVersion,
    expectedUpdatedAt: request.expectedUpdatedAt,
    expectedDocumentDigest: request.expectedDocumentDigest,
  });
  const media = await deps.media.resolveTrustedPageMediaBatch({
    actorId: ctx.actorId,
    imageRefs: request.gallery?.images.map((item) => item.media) ?? [],
    videoRefs: request.videos.map((item) => item.media),
    maximumImages: 16,
    maximumVideos: 4,
  });
  const patched = applyOnlyNativeGalleryAndVideoBlocks({
    document: target.document,
    request,
    media,
    createBlock: deps.pages.createPageBlockV2,
    generatedVideoProps: { autoplay: false, muted: true },
  });
  const normalized = deps.pages.normalizePageDocumentV2ForWrite(patched);
  assertOnlyDeclaredPageMediaCompositionChanged(
    target.document,
    normalized,
    request,
  );
  return buildReviewedPageMediaComposition(target, normalized, media);
}

export async function executeReviewedPageMediaComposition(
  review: ReviewedPageMediaCompositionV1,
  ctx: AuthorizedAgentContext,
  deps: PageMediaCompositionDeps,
): Promise<PageMutationReceiptV1> {
  await deps.authorization.reauthorizeCurrentPageMediaMutation(review, ctx);
  return deps.pages.applyReviewedDocumentMutation(review, {
    expectedVersion: review.expectedVersion,
    expectedUpdatedAt: review.expectedUpdatedAt,
    expectedDocumentDigest: review.expectedDocumentDigest,
    idempotencyKey: review.idempotencyKey,
    createNativeRevision: true,
  });
}
```

Data flow is strict request -> current Page/section authorization -> trusted
Media batch resolution -> native Page gallery/video construction -> complete
Page normalization -> untargeted-byte proof -> visible review -> fresh RBAC/
version/digest recheck -> native Page transaction/revision -> normal cache/audit
publication. Designer uses the same construction only inside its private staged
bundle until promotion.

## Error Contract

Machine errors are `assistant_page_media_action_invalid`,
`assistant_page_media_target_not_found`, `assistant_page_media_conflict`,
`assistant_page_media_limit`, `assistant_page_media_untrusted`,
`assistant_page_media_incompatible`, `assistant_curated_media_no_match`,
`assistant_curated_media_license_invalid`, and
`assistant_curated_media_scan_failed`. Safe details omit URLs/bytes/private
refs, unpublished Page data, scanner/provider/DB text and stacks.

## Security Contract

| Concern | Contract |
| --- | --- |
| Visibility | Internal Agent reviewed action or private Designer staging only; no public write/import endpoint. |
| Authentication | Admin session and server-derived actor/workspace; opaque Media/staged IDs grant nothing. |
| RBAC | Proposal: `assistant:use`, `content:read`, `media:read`; execute: `content:write`; reviewed curated import additionally requires `media:write`. Designer uses its own write/promote plus native permission union. |
| CSRF | Existing internal Agent execute and Designer writes require shared CSRF before strict body parsing. |
| Rate limit | Existing `assistant`/`designer-generation` buckets plus 16-image, 4-video, byte/fetch/scan/storage/daily curated-import ceilings. |
| Validation | Recursive reject-unknown request/review/contribution, exact IDs/digests/catalog version, trusted MIME/scan/adoption, native Page normalizer and optimistic Page tokens. |
| Anti-abuse | Session, CSRF, RBAC, exact trusted-source resolution, SSRF/scan/digest/license review, visible diff and idempotency; no public nonce/HMAC/reCAPTCHA path. |

## Regression-Test Shape

- Source guards and manifest tests prove zero import/reference/write under
  `core/widgets`, Gallery Mosaic editors, Product Gallery, or the oversized
  Page owner files; historical widget behavior remains read-only compatibility.
- Contract tests recursively reject raw URL/src/assetId, arbitrary block JSON,
  unknown keys/types/layouts, >16 images, >4 videos, cross-owner/stale Media,
  unsupported MIME, stale Page token and mixed target IDs before mutation.
- Trust-service integration tests rerun L01's pinned-host/peer SSRF, size,
  digest/MIME, ClamAV, canonical decode/re-encode, cleanup, and zero-write
  matrix for both curated images and videos; source guards reject any second
  fetch/scanner/storage implementation in this leaf.
- Native composition tests create/replace/reload one image gallery and sibling
  video blocks, pin `autoplay:false`/`muted:true`, existing renderer controls,
  complete Page normalizer acceptance, native revision, and byte identity for
  every untargeted field/block/section.
- Conflict, retry and idempotency tests prove stale review cannot overwrite a
  Page and same request cannot duplicate blocks/revisions.
- Curated profile tests prove semantic matched media and honest unsupported-
  empty output; URL/digest/license/scan failures create zero Media/Page write.
- Designer tests prove private preview, exact staged/adopted bindings, promotion
  through the ordinary Page owner, and full reject/expiry cleanup.
- Existing focused Page gallery/video renderer/editor suites run unchanged;
  runtime smoke asserts visible image gallery/video controls on desktop/mobile,
  light/dark Admin, publish-to-front parity and zero console errors.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/media/curatedMediaV2.test.ts \
  tests/vitest/assistant/pageMediaCompositionContract.test.ts \
  tests/vitest/assistant/pageMediaCompositionCapability.test.ts
set -a && source .env && set +a
bun test tests/integration/assistant/agentPageMediaComposition.test.ts
# Run the terminal focused Page gallery/video suites discovered at implementation preflight.
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
git diff --check
wc -l \
  core/services/media/curatedMediaProfiles.ts \
  core/services/media/curatedMediaCatalogV2.ts \
  core/services/media/curatedMediaContract.ts \
  core/services/assistant/capabilities/pageMediaCompositionCapability.ts \
  core/services/assistant/capabilities/pageMediaCompositionActionContract.ts \
  core/services/assistant/capabilities/pageMediaCompositionActionAdapter.ts \
  core/services/assistant/capabilities/pageMediaCompositionDesignerContribution.ts \
  tests/vitest/media/curatedMediaV2.test.ts \
  tests/vitest/assistant/pageMediaCompositionContract.test.ts \
  tests/vitest/assistant/pageMediaCompositionCapability.test.ts \
  tests/integration/assistant/agentPageMediaComposition.test.ts
```

Every new/touched production or test file must be <=1,000 physical lines. The
existing oversized Page and historical widget files must have zero diff.

## Done Criteria

- Agent and Designer compose only existing native Page gallery/video blocks
  through strict trusted media and reviewed native ownership paths.
- Gallery Mosaic and every historical widget authoring surface remain untouched
  and absent from new capability/docs manifests.
- Matched curated media and honest unsupported-empty behavior both have tests.
- No model-selected remote URL, unscanned byte, schema extension, Page fallback,
  or staged data reaches canonical/public rendering before authorized execute/
  promotion.

## Documentation Updates Required

Provide TASK-414-11-L01 with native Page image-gallery/video composition,
trusted Media/provenance, unsupported-empty, Agent review, Designer staging/
adoption/promotion, widget-exclusion and runtime receipts for
`_docs/MEDIA_SPEC.md`, CMS/assistant docs, Guide corpus and extension cookbook.
This leaf edits no shared docs/tasks/board/changelog.
