# TASK-414-06-L01: Content Structure Theme Media And Brand Capability Packs
# FileName: TASK-414-06-L01-Content-Structure-Theme-Media-And-Brand-Capability-Packs.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-06
**Priority:** High
**Category:** Agent / Content Structure / Theme / Media
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-05 terminal; TASK-414-02-L01;
TASK-414-03 terminal, including TASK-414-03-L01's pinned outbound transport;
TASK-414-04-L02 terminal; TASK-547 terminal; TASK-551-03-L02 terminal;
TASK-551-09-L02 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Add per-resource Agent capability packs for Page/Post/entry/Content Type/Menu/
Form structure, Page nested/slot edits, one theme profile's brand tokens, trusted
Media, and bounded refinement of resources installed by a terminal TASK-547 run.

This is not a site builder. A pack receives one server-resolved resource, one
owned nested structure, or one manifest-bounded same-kind batch. Cross-domain or
whole-installed-site work returns the existing Designer handoff with zero
actions.


## Sub-Tasks

None; this is an executable leaf.
## Exact File Ownership

This leaf is the sole TASK-414 writer for:

- new `core/services/assistant/capabilities/contentStructureCapabilityPack.ts`;
- new `core/services/assistant/capabilities/contentStructureActionContracts.ts`;
- new `core/services/assistant/capabilities/contentStructureActionAdapter.ts`;
- new `core/services/assistant/capabilities/installedSiteRefinementContext.ts`;
- new `core/services/assistant/capabilities/brandThemeMediaCapabilityPack.ts`;
- new `core/services/assistant/capabilities/brandThemeActionContracts.ts`;
- new `core/services/assistant/capabilities/brandThemeActionAdapter.ts`;
- new `core/services/assistant/capabilities/trustedMediaProvenance.ts`;
- new `core/services/media/curatedMediaImportTrustService.ts`;
- new
  `core/services/assistant/capabilities/contentMediaDesignerSidecarContributions.ts`
  with pure strict Post/content/Media sidecar descriptors for L08; it does not
  stage/promote or edit TASK-547;
- new `tests/vitest/assistant/contentStructureCapabilityPack.test.ts`;
- new `tests/vitest/assistant/contentStructureActionContracts.test.ts`;
- new `tests/vitest/assistant/brandThemeMediaCapabilityPack.test.ts`;
- new `tests/vitest/assistant/trustedMediaProvenance.test.ts`;
- new `tests/security/curatedMediaImportTrustService.test.ts`;
- new `tests/unit/assistant/contentStructureActionAdapter.test.ts`;
- new `tests/unit/assistant/brandThemeActionAdapter.test.ts`;
- new `tests/integration/assistant/agentContentStructureCapabilities.test.ts`;
- new `tests/integration/assistant/agentBrandThemeMediaCapabilities.test.ts`.

Forbidden: oversized legacy assistant `actionFamilyContracts.ts`,
`actionPlanTypes.ts`, `actionPlanSchema.ts`, `actionPlannerService.ts`,
`actionExecutorService.ts`, and `cmsOperationActionMapper.ts`; action registry;
`postsService.ts`; TASK-414-02 manifest owner; TASK-414-03 persistence/tool/
capability owners; TASK-547 package/install code; Page/Menu/Form document/schema
owners; Media schema/migrations/public URLs; Admin/route mounts; booking/
commerce; shared docs/tasks/changelog; and every other leaf file.

Re-read every terminal native seam before dispatch. This leaf consumes native
mutation/transaction interfaces read-only and implements only new adapters. If
a required native optimistic/tx-aware seam is absent, mark that exact support
phase unavailable and amend the owning dependency task; do not edit a native
service also owned by TASK-414-09-L04 or append to an oversized module.

## Content Structure Pack

The pack reuses current executable actions when their strict contract already
matches and promotes/adds only these bounded contributions through the terminal
TASK-414-02 seam:

- `page.structure.patch` — one Page, expected version/time/digest, at most four
  section operations and eight block/slot operations, stable IDs/paths only;
- `entry.bulk-draft.create` — one Content Type, at most 20 draft entries,
  server-owned field schema, no status/publication field;
- `entry.field.patch` — one entry, at most 20 explicit writable fields,
  expected version/time, no undeclared field/visibility/status/password;
- `menu.structure.patch` — one Menu, at most 50 items/depth 5, stable item IDs,
  no arbitrary href scheme or cross-site target;
- `form.structure.patch` — one Form, at most 50 fields/10 steps, exact field
  types/settings, no submission payload/action secret/publication bypass.

Existing `content-type.upsert`, `content-type.field.add`, `page.update`,
`entry.upsert-draft`, `menu.*`, `form.*`, `media.reference.attach`, and TASK-414-
05 Post actions stay usable only where the manifest declares exact parity. The
pack does not create duplicate aliases or route around their strict schemas.

Page patch operations are exactly add/move/patch/remove section or block by
stable ID plus named native slot/path. The server rehydrates the complete
current Page, resolves each path against the native section/block schema,
applies operations to an immutable copy, runs the owning Page normalizer, and
persists through the optimistic native service. It rejects missing/duplicate/
ambiguous IDs, stale paths, unsupported block/slot types, unknown props, and
more than the hard limits. Unauthored optional styling remains present-only;
unrelated/no-op documents remain byte-identical.

Entry/Menu/Form/Content Type adapters follow the same pattern: resolve exact
current resource and schema, copy allowlisted fields, apply a bounded patch,
run the native normalizer, compare expected version/`updatedAt`/digest in the
same transaction, persist through the native service, and publish cache events
only after commit. No browser/provider document replaces a native document.

## Installed-Site Refinement Context

`buildInstalledSiteRefinementContextV1` accepts only a trusted actor and an optional
server-resolved terminal TASK-547 run ID. It loads at most 100 ledger items by
stable resource key, projects only resource kind/ID/title-safe label/current
version/ownership/capability IDs, verifies every resource still exists on the
current installation, and excludes snapshot bodies, secrets, private submissions, package
bytes, rollback data, and provider content.

Provider/browser run/resource hints are advisory. The server matches exact
resource keys before proposal. Existing resources are reused; a create request
that would duplicate an installed key returns conflict/needs-input. A request
to refine the complete installed graph, multiple top-level kinds, theme plus
content graph, or an over-limit set becomes the TASK-414-05 Designer handoff
with zero actions.

## Brand Theme And Media Pack

The exact new actions are:

- `theme.profile.patch` — one existing profile, expected `updatedAt`/digest,
  bounded present-only token overrides from the native token registry;
- `theme.profile.activate` — separate high-impact reviewed action, exact profile
  and expected active-profile baseline, native theme permission;
- `media.curated.import` — exact backend curated asset ID only, server-resolved
  source/license/credit, bounded import through Media trust/storage; and
- existing `media.reference.attach` — exact authorized Media library ID into an
  allowlisted native resource field/slot.

Brand colors, typography, spacing, radii, and other tokens use exact native
token IDs/enums/clamps. Arbitrary CSS, selectors, fonts by URL, scripts, raw
theme JSON, provider tokens, and unknown token keys fail. Profile activation is
separate from patch and visibly reviewed as site-wide public impact.

`TrustedMediaProvenanceV1` is one of:

- `owned-upload` — existing authorized Media ID with server/audit evidence that
  it entered through the native upload path and an explicit safe credit value;
- `curated-catalog` — exact immutable curated asset ID, source URL, license name/
  URL, credit, catalog version, and content digest from the code-owned catalog;
  or
- `unsupported` with a machine-readable reason.

Agent accepts no provider/raw remote URL. Curated import resolves the catalog
record server-side and passes only that immutable record to
`curatedMediaImportTrustService.ts`. That service reuses TASK-414-03-L01's
pinned outbound transport: fixed HTTPS host/path purpose, public-IP DNS and
connected-peer verification, proxy bypass, zero redirects, and no caller URL,
headers, resolver, or size override. It streams at most 25 MiB for images or
100 MiB for video, checks the code-owned raw SHA-256, sniffs an allowlisted MIME
from magic bytes independently of headers/extensions, requires an available
clean ClamAV result, then performs bounded canonical decode and re-encode with
pixel/frame/duration/decompression limits. Only the canonical bytes/digest and
verified provenance may reach native Media persistence. Any transport, DNS,
peer, status, length, digest, MIME, scanner, decoder, re-encode, license, or
provenance failure writes zero Media/object/audit/cache row and removes its
attempt-owned temporary bytes.

After complete trust validation, the action persists native Media attribution/
credit and a safe audit provenance reference and returns a Media ID. A
changed/removed license/catalog record blocks new
import. Existing private Agent attachments are not Media and cannot be used by
these actions; an explicit future native Media import workflow would require
`media:write`, fresh scanning, attribution, review, and a separate contract.

## Designer Sidecar Contribution Handoff

The pure descriptor module registers strict `DesignerSiteBundleV1` sidecar
schemas only for resource families absent from terminal TASK-547 core. At
minimum it covers Posts and private binary Media asset/adoption metadata, and
adds content entries/forms only when the terminal gap inventory proves they are
absent. Each descriptor pins kind, schema/normalizer/serializer IDs, bounds,
stable keys/references, native stage/preview/promote/read-generation adapter
IDs, permissions, and focused evidence. It carries no arbitrary JSON or
runtime function. TASK-414-08-L02 consumes the descriptors to compile/stage;
TASK-414-09 consumes the same IDs to promote/cut over. Agent action adapters
cannot be assigned as Designer sidecar adapters.

## Security Contract

- **Visibility:** service/action contributions only, executed through internal
  Agent plan/dry-run/execute routes. Existing native Admin routes remain
  internal; no public content/theme/media write is added.
- **Auth:** authenticated Admin session. Actor/site/resources/install run/
  fields/slots/tokens/media provenance are server-resolved; browser/provider
  hints are untrusted.
- **RBAC:** `assistant:use` plus exact native read/write permissions:
  `content:*`, forms/menu permissions, `themes:read`/`themes:write`, and
  `media:read`/`media:write` as appropriate. Activation/import reauthorize at
  execute. No one pack's permission grants another.
- **CSRF:** plan/dry-run/execute and native mutations remain CSRF protected.
- **Rate limit:** `assistant` plus native content/theme/media mutation policies;
  action/resource/field/node/media-byte counts are charged before execution.
- **Validation:** recursive reject-unknown pack/actions; stable IDs/paths;
  expected version/time/digest; native document/schema/token/media normalizers;
  exact count/depth/byte/provenance/license allowlists.
- **Anti-abuse:** no new public write, so nonce/HMAC/reCAPTCHA do not apply.
  Idempotency, optimistic CAS/transactions, bounded expansion, trusted Media
  fetch policy, and no partial truncation are mandatory.
- **Secrets/privacy:** no provider output, package/snapshot body, form
  submissions, passwords, private entries/attachments, arbitrary URL,
  credentials, permission snapshot, or driver errors in provider/browser state,
  cache, logs, audits beyond safe IDs/provenance, screenshots, or errors.

## Implementation Pseudocode

```ts
export async function applyPageStructurePatch(
  input: UnknownPageStructurePatch,
  ctx: AuthorizedAgentContext,
  deps: ContentStructureDeps
): Promise<PageMutationResultV1> {
  const patch = normalizePageStructurePatchV1(input);
  return deps.pageService.mutateIfCurrent(
    { id: patch.pageId, expected: patch.expected },
    ctx.actorId,
    async (current) => {
      const next = applyBoundedPageOperations(current, patch.operations);
      const normalized = normalizePageDocumentV2(next);
      assertOnlyDeclaredPageChanges(current, normalized, patch.operations);
      return normalized;
    }
  );
}

export async function buildInstalledSiteRefinementContextV1(
  input: { actorId: string; runId?: string },
  deps: InstalledSiteContextDeps
): Promise<InstalledSiteRefinementContextV1> {
  const run = input.runId
    ? await deps.runs.requireTerminalOwned(input.runId, input.actorId)
    : null;
  const items = run ? await deps.ledger.listBounded(run.id, { limit: 100 }) : [];
  return projectAuthorizedCurrentResources(
    await deps.resources.rehydrateBatch(items),
    await deps.permissions.resolve(input.actorId)
  );
}

export async function importCuratedMedia(
  assetId: CuratedMediaAssetId,
  ctx: AuthorizedAgentContext,
  deps: BrandMediaDeps
): Promise<TrustedMediaResultV1> {
  const provenance = deps.catalog.requireCurrentLicensedAsset(assetId);
  const trusted = await deps.curatedMediaTrust.fetchScanAndCanonicalize({
    provenance,
    actorId: ctx.actorId,
  });
  return deps.media.importCanonicalWithProvenance({
    trusted,
    provenance,
    actorId: ctx.actorId,
  });
}
```

## Data Flow

Provider operation draft → terminal capability/target resolution → leaf-owned
strict per-resource proposal → current native resource/schema/run/provenance
rehydration → bounded dry-run diff → explicit review → optimistic native
transaction/action → post-commit cache/audit → safe result. Aggregate installed-
site intent exits to Designer before any Agent action expansion.

## Machine-Readable Errors

- `assistant_capability_unsupported`, `assistant_resource_scope_unbounded`,
  `assistant_installed_resource_not_found`,
  `assistant_installed_resource_conflict`;
- `assistant_structure_patch_invalid`, `assistant_structure_patch_limit`,
  `assistant_structure_target_not_found`,
  `assistant_structure_version_conflict`;
- native Page/entry/Content Type/Menu/Form safe validation/conflict codes;
- `assistant_theme_token_invalid`, `assistant_theme_profile_conflict`,
  `assistant_theme_activation_conflict`;
- `assistant_media_reference_untrusted`,
  `assistant_media_provenance_missing`, `assistant_media_license_invalid`,
  `assistant_curated_media_missing`, `assistant_media_import_failed`.

Unsupported/over-limit/provenance failures return 409/422 with zero actions.
Unexpected domain/storage/DB errors are centrally redacted.

## Regression-Test Shape

- Every pack/action strict schema rejects root/nested unknowns, raw documents,
  status/publish/permission fields, arbitrary URLs/CSS/HTML/JS, over-limit
  arrays/depth, duplicate IDs, and stale version/time/digest.
- Page fixtures cover deep sections/blocks, named slots, add/move/patch/remove,
  missing/duplicate/stale IDs, block-type props, present-only no-override byte
  identity, and unrelated byte identity.
- Entry/Content Type/Menu/Form fixtures cover bulk 20/21, fields 20/21, menu
  50/depth 5 and overflow, form 50/steps 10 and overflow, current schema
  validation, transaction conflict, no publication/submission leakage.
- Installed-run fixtures cover exact stable resource reuse/no duplicate,
  deleted/moved/wrong-site/stale resource, >100 ledger items, browser-forged
  run/context, bounded single resource, and whole-graph Designer handoff with
  zero actions.
- Theme tests mutate every token ID/type/clamp, prove patch versus activation
  separation, expected active baseline, one transaction/post-commit cache, and
  no arbitrary CSS/font URL.
- Media tests cover owned and curated provenance, catalog/license/version/digest
  drift, fixed-host pinned-peer SSRF cases, redirect/proxy rejection, 25 MiB/
  100 MiB stream boundaries, digest/header/magic disagreement, EICAR/scanner
  unavailable/timeout, decode bomb/polyglot/malformed media, canonical
  re-encode identity, temporary-byte cleanup, and zero Media/object/audit/cache
  writes on every failure; successful imports retain durable credit/audit
  reference. Tests also cover raw
  remote/provider URL rejection, private attachment rejection, and Media RBAC.
- Native concurrency tests race two patches and require one success/one typed
  conflict with no partial document/structure/activation.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/contentStructureCapabilityPack.test.ts \
  tests/vitest/assistant/contentStructureActionContracts.test.ts \
  tests/vitest/assistant/brandThemeMediaCapabilityPack.test.ts \
  tests/vitest/assistant/trustedMediaProvenance.test.ts
set -a && source .env && set +a
bun test tests/unit/assistant/contentStructureActionAdapter.test.ts \
  tests/unit/assistant/brandThemeActionAdapter.test.ts \
  tests/integration/assistant/agentContentStructureCapabilities.test.ts \
  tests/integration/assistant/agentBrandThemeMediaCapabilities.test.ts
bun test tests/security/curatedMediaImportTrustService.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
git diff --check
find core/services/assistant/capabilities -type f -name '*.ts' -exec wc -l {} +
wc -l core/services/pages/pageService.ts \
  core/services/content/{entryMutationService,typeService}.ts \
  core/services/menus/menuService.ts core/services/forms/formsService.ts \
  core/services/themes/themeProfileService.ts core/services/media/mediaService.ts \
  core/services/media/curatedMediaImportTrustService.ts \
  tests/vitest/assistant/{contentStructureCapabilityPack,contentStructureActionContracts,brandThemeMediaCapabilityPack,trustedMediaProvenance}.test.ts \
  tests/unit/assistant/{contentStructureActionAdapter,brandThemeActionAdapter}.test.ts \
  tests/integration/assistant/{agentContentStructureCapabilities,agentBrandThemeMediaCapabilities}.test.ts
```

Also rerun the exact terminal TASK-551 adoption suites for every native service
actually edited; do not weaken their cache, revision, query, or line-count
contracts.

## Documentation Updates Required

Hand the action matrix, installed-site context, nested/slot bounds, native
conflicts, token/profile, Media provenance/license, and validation receipts to
TASK-414-11-L01. This leaf edits no shared docs, task board/status, TASK-547,
route mount, or changelog.
