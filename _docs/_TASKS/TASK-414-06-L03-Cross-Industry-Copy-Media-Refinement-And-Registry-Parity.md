# TASK-414-06-L03: Cross-Industry Copy/Media Refinement Contributions
# FileName: TASK-414-06-L03-Cross-Industry-Copy-Media-Refinement-And-Registry-Parity.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-06
**Priority:** High
**Category:** Agent / Copy / Media / Capability Contributions
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-06-L01; TASK-414-06-L02; TASK-414-06-L04;
TASK-414-06-L05; TASK-414-02-L01; TASK-414-05 terminal; TASK-548 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Add prompt-specific, resource-bounded copy/media refinement and exact
capability contribution descriptors consumed by TASK-414-02-L02's one final
Guide/Agent/Designer compiler/gate. Provider output is
still an untrusted operation/refinement draft. It may propose plain text and
trusted media intent; it cannot emit executable actions, native documents, raw
HTML/CSS/JavaScript, remote URLs, claims of permission, or aggregate site kits.

Cross-industry fixtures prove that copy responds to the user's actual business
facts/tone/offer/proof rather than reusing deterministic generic starter text.
The descriptors and fixtures prove what this leaf contributes; they do not
create a second parity compiler or generated artifact.


## Sub-Tasks

None; this is an executable leaf.
## Exact File Ownership

This leaf is the sole writer for:

- new `core/services/assistant/refinement/copyRefinementContracts.ts`;
- new `core/services/assistant/refinement/copyRefinementService.ts`;
- new `core/services/assistant/refinement/mediaRefinementContracts.ts`;
- new `core/services/assistant/refinement/mediaRefinementService.ts`;
- new `core/services/assistant/refinement/refinementEvidenceProjection.ts`;
- new `core/services/assistant/refinement/copyMediaCapabilityContribution.ts`;
- new `core/admin/ui/assistant/agent/AgentCopyMediaRefinementReview.tsx`;
- new `tests/fixtures/assistant/cross-industry-refinement.ts`;
- new `tests/vitest/assistant/copyRefinementContracts.test.ts`;
- new `tests/vitest/assistant/copyRefinementService.test.ts`;
- new `tests/vitest/assistant/mediaRefinementContracts.test.ts`;
- new `tests/vitest/assistant/mediaRefinementService.test.ts`;
- new `tests/vitest/assistant/copyMediaCapabilityContribution.test.ts`;
- new `tests/vitest/assistant/crossIndustryRefinementFixtures.test.ts`;
- new `tests/vitest/ui/agent-copy-media-refinement-review.test.tsx`;
- new `tests/integration/assistant/agentCopyMediaRefinement.test.ts`;
- a focused fixture handoff consumed read-only by TASK-414-02-L02's final
  parity tests.

Forbidden: L01/L02/L04/L05 capability/native files; TASK-414-02 manifest/docs-coverage
owners; existing oversized action family/type/schema/planner/executor/mapper;
action registry/policies; native Page/Post/entry/Menu/Form/theme/media/booking/
commerce documents/services; provider adapters; TASK-547 package/Designer code;
Guide/TASK-548 files; shared route/Admin mounts; shared docs/tasks/changelog;
and every later leaf file.

The contribution may import stable public types from TASK-414-02-L01 but does
not compile or rewrite them. If an owner lacks a pure descriptor seam, amend its
task before implementation; do not regex-patch generated source or duplicate
action/capability constants here.

## Copy Refinement Contract

```ts
export type CopyRefinementOperationV1 = Readonly<{
  resourceKind: "page" | "post" | "entry" | "menu" | "form" | "commerce-product";
  resourceId: string;
  expectedVersion: number | null;
  expectedUpdatedAt: string;
  target: Readonly<{
    fieldId: string | null;
    sectionId: string | null;
    blockId: string | null;
    nodeId: string | null;
    property: string;
  }>;
  value: StrictNativeTextValueV1;
}>;

export type CopyRefinementDraftV1 = Readonly<{
  operations: readonly CopyRefinementOperationV1[];
  rationale: string;
  factRefs: readonly string[];
}>;
```

At most 20 operations/50,000 UTF-8 characters target one bounded resource or
one manifest-declared same-kind batch. The server supplies exact writable text
targets from the native capability pack. Provider `fieldId`/section/block/node/
property values must match that allowlist and current resource ownership.
Provider cannot invent JSON pointers, array indexes, IDs, slugs, status fields,
SEO publication state, formulas, markup, or executable content.

`StrictNativeTextValueV1` is plain text or the owning native rich-text AST built
from an allowlisted text-only intermediate representation. It rejects HTML,
scripts, event handlers, style/CSS, embeds/iframes, data/blob/file URLs,
shortcodes, template expressions, and unknown nodes/marks. Native normalizers
run after patch. Untargeted fields/nodes and unauthored optional values remain
byte-identical. Empty/no-op output is surfaced, not converted into a write.

Provider context includes only redacted user-approved business facts, tone,
audience, offer/proof, exact target labels/current bounded text, locale, length/
claim policy, and terminal capability IDs. Secret-like/private fields, customer/
submission/reservation/order data, credentials, private attachment text not
explicitly selected, and full unrelated documents are excluded.

Potential regulated/medical/legal/financial claims, prices, guarantees,
testimonials, certifications, addresses, and statistics require a user-supplied
fact reference or remain a visible placeholder/needs-input item. Provider text
is never treated as factual proof.

## Media Refinement Contract

Media operations target only exact native media fields/slots exposed by L01 and
contain one authorized Media library ID or curated catalog ID. The server
resolves current L01 provenance/license, Media type/dimensions, target accept
contract, alt/credit requirements, and usage permission before producing the
review diff.

The provider may express semantic intent (`warm clinic team photo`, `product
detail image`) but cannot emit/choose a remote URL, base64/blob, file path,
provider asset ID, private Agent attachment ID, license text, or arbitrary Media
row. Candidate ranking is over a bounded server-owned catalog projection. The
user sees asset thumbnail/identity, source/license/credit, target, replacement,
and public impact before execute.

Unknown provenance, incompatible MIME/dimensions, missing required alt/credit,
changed license/catalog digest, or deleted Media produces an explicit blocked
operation. The service never silently falls back to an unlicensed/random image
or strips attribution.

## Cross-Industry Fixture Matrix

The single typed fixture file covers at least:

- local home services, professional agency, restaurant/hospitality;
- clinic/wellness with regulated-claim constraints;
- nonprofit/community organization;
- editorial/news/content hub;
- property/real-estate style catalog;
- automotive/workshop;
- education/course provider;
- B2B software/service;
- booking-led salon/studio; and
- small commerce catalog.

Each fixture has distinct approved facts, audience, tone, offer/proof, forbidden
claims, current native resource targets, desired copy/media outcome, expected
operation kinds, and unsupported aggregate intent. Assertions pin prompt-
specific fact/tone usage without requiring brittle exact prose. Negative
fixtures remove a fact, inject a secret/PII/raw URL, request unsupported
transaction/full-site work, exceed bounds, or reference a stale target and
require needs-input/Designer/blocked output with zero executable actions.

## Capability Contribution Contract

`copyMediaCapabilityContribution.ts` exports immutable, pure descriptors for:

- copy refinement action/schema/handler/policy/review/error/bounds/test IDs;
- media refinement action/provenance/target/license/review/error/bounds/test IDs;
- each supported resource/target capability and exact native owner reference;
- explicit Guide atomic/workflow section identities from terminal TASK-548;
- Agent support phase and Designer `unsupported` reason for these per-resource
  refinements unless a separate aggregate adapter owns the same behavior; and
- cross-industry fixture/evidence IDs plus exact negative unsupported claims.

Each descriptor must satisfy L01's strict `CmsCapabilitySourceContributionV1` and:

1. use one stable ID and exact native schema/service owner;
2. reference existing terminal TASK-548 section identities, not duplicate prose;
3. enumerate exact Agent schema/handler/policy/permissions/review/errors/bounds;
4. declare no Agent aggregate/site-kit action;
5. use exact modality/provenance requirements with no label/model inference; and
6. carry focused positive/negative evidence IDs.

TASK-414-02-L02 is the sole owner that joins these descriptors with every other
contribution, TASK-548 relations, native registries, and Designer/TASK-547
adapters; generates canonical bytes; and fails CI on drift. This leaf tests only
its own descriptor completeness and must not emit another report/CLI/artifact.

## Security Contract

- **Visibility:** refinement executes through existing internal Agent plan/dry-
  run/execute routes; the contribution is a pure server/build-time descriptor. No public endpoint
  or provider-to-CMS write is added.
- **Auth:** authenticated Admin session for refinement. Actor/site/current
  resource/writable targets/facts/provenance/capabilities are server-resolved;
  final parity compiler reads repository code-owned descriptors only.
- **RBAC:** `assistant:use`, native read for proposal/diff, exact native write
  for execute, and `media:read`/`media:write` for selection/import as applicable.
  Copy/media output never grants permission. Designer permissions remain
  separate.
- **CSRF:** existing internal plan/dry-run/execute mutations stay CSRF protected.
  Pure descriptor loading has no HTTP mutation.
- **Rate limit:** existing `assistant` provider/action budgets plus 20-operation/
  50,000-character, candidate, media, and native domain limits. Failed/blocked
  drafts still count toward provider quota.
- **Validation:** recursive reject-unknown draft/operation/report schemas; exact
  writable target IDs/native text AST; native normalizers; expected state;
  trusted Media provenance/license; strict contribution normalization.
- **Anti-abuse:** no new public write, so nonce/HMAC/reCAPTCHA do not apply.
  Reviewed idempotent actions, optimistic conflict, bounded provider context/
  output, no partial truncation, and contribution fail-closed behavior are mandatory.
- **Secrets/privacy:** no secrets, PII/customer/submission/reservation/order data,
  private attachment evidence, full unrelated documents, raw provider output,
  remote URLs, permission snapshots, or driver errors in provider/browser
  context, cache, logs, audits, screenshots, fixtures, reports, or errors.

## Implementation Pseudocode

```ts
export async function proposeCopyMediaRefinement(
  raw: unknown,
  ctx: AuthorizedAgentContext,
  deps: RefinementDeps
): Promise<ReviewedRefinementProposalV1> {
  const request = normalizeRefinementRequestV1(raw);
  const target = await deps.targets.requireAuthorizedWritableTarget(request, ctx);
  const context = buildRedactedBoundedRefinementContext(request, target);
  const providerDraft = await deps.provider.createRefinementDraft(context);
  const draft = normalizeCopyMediaRefinementDraftV1(providerDraft);
  const resolved = await resolveEveryTargetAndTrustedMedia(draft, target, deps);
  const nativeDiff = simulateNativeRefinement(target, resolved);
  return projectReviewedRefinementProposalV1(nativeDiff);
}

export function getCopyMediaCapabilityContributionsV1():
  readonly CmsCapabilitySourceContributionV1[] {
  return COPY_MEDIA_CAPABILITY_CONTRIBUTIONS_V1;
}
```

## Data Flow

User-approved bounded facts + server-authorized native targets → redacted
provider refinement context → strict untrusted copy/media draft → exact target/
provenance/current-state resolution → native normalization/simulated diff →
reviewed typed per-resource actions → optimistic execute. Separately, this
leaf's strict pure descriptors/fixtures → TASK-414-02-L02's final canonical
compiler/gate; no source mutation or second report.

## Machine-Readable Errors

- `assistant_refinement_invalid`, `assistant_refinement_target_invalid`,
  `assistant_refinement_target_not_found`,
  `assistant_refinement_target_conflict`, `assistant_refinement_limit`;
- `assistant_refinement_fact_required`,
  `assistant_refinement_claim_unsupported`,
  `assistant_refinement_markup_forbidden`;
- `assistant_media_reference_untrusted`,
  `assistant_media_provenance_missing`, `assistant_media_license_invalid`,
  `assistant_media_target_incompatible`;
- `assistant_capability_contribution_invalid`,
  `assistant_capability_evidence_missing`.

Blocked drafts return no executable actions. Contribution diagnostics identify
stable capability/area/owner/evidence IDs and never source secrets or user data.

## Regression-Test Shape

- Strict draft tests mutate every root/target/value/media/rationale/fact key;
  reject unknowns, raw HTML/CSS/JS/templates/URLs/data/blob/file, arbitrary JSON
  pointers/IDs, status/publication fields, secrets/PII, over-limit operations/
  text, and unsupported AST nodes.
- Native patch tests prove exact target ownership/current tokens, no-op behavior,
  unrelated byte identity, present-only fields, native rich-text normalization,
  and one typed conflict under concurrent edit.
- Media tests cover candidate bounds, exact library/curated IDs, provenance/
  license/credit/digest changes, MIME/dimension/slot mismatch, deleted assets,
  private attachments, and no URL fallback.
- Cross-industry media fixtures include both a semantically matched trusted
  asset/gallery case and an unsupported-no-match case that returns an empty
  candidate/action set; unrelated stock is a hard failure.
- Every industry fixture uses its own approved facts/tone/outcome and avoids
  forbidden claims; assertions check semantic fact refs/target operations rather
  than exact provider prose. Missing facts and aggregate intents fail closed.
- Contribution mutation tests remove/change every action/schema/handler/policy/
  permission/review/Guide/evidence member one at a time and require strict
  failure; TASK-414-02-L02 owns cross-product parity mutations.
- Contract-only versus executable states, intentional unsupported reasons, and
  zero Agent `site-kit.*` actions are pinned.
- Serializer tests prove canonical ordering and
  `serialize(parse(serialize(value)))` plus canonical-byte round-trip identity.
- UI tests show exact copy/media diff, claims/fact warnings, provenance/license,
  blocked operations, keyboard/focus, no raw markup, and no auto-execute.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/copyRefinementContracts.test.ts \
  tests/vitest/assistant/copyRefinementService.test.ts \
  tests/vitest/assistant/mediaRefinementContracts.test.ts \
  tests/vitest/assistant/mediaRefinementService.test.ts \
  tests/vitest/assistant/copyMediaCapabilityContribution.test.ts \
  tests/vitest/assistant/crossIndustryRefinementFixtures.test.ts \
  tests/vitest/ui/agent-copy-media-refinement-review.test.tsx
set -a && source .env && set +a
bun test tests/integration/assistant/agentCopyMediaRefinement.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun run scan:security:strict
git diff --check
find core/services/assistant/refinement -type f -name '*.ts' -exec wc -l {} +
wc -l core/services/assistant/refinement/copyMediaCapabilityContribution.ts \
  core/admin/ui/assistant/agent/AgentCopyMediaRefinementReview.tsx \
  tests/fixtures/assistant/cross-industry-refinement.ts \
  tests/vitest/assistant/{copyRefinementContracts,copyRefinementService,mediaRefinementContracts,mediaRefinementService,copyMediaCapabilityContribution,crossIndustryRefinementFixtures}.test.ts \
  tests/vitest/ui/agent-copy-media-refinement-review.test.tsx \
  tests/integration/assistant/agentCopyMediaRefinement.test.ts
```

After TASK-414-09-L03 mounts all contributions, register/run the shared
TASK-414 runtime-smoke fast profile with at least the parent cross-industry
flows. TASK-414-11-L01 owns certification, complete acceptance, docs/status,
and changelog; do not create a task-local browser lifecycle.

## Documentation Updates Required

Hand copy/media policy, cross-industry matrix, registry report/hash, negative
drift, UI, runtime, and contributor-cookbook receipts to TASK-414-11-L01. This
leaf edits no shared docs, capability owners, task board/status, route mount, or
changelog.
