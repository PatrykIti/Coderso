# TASK-190-02-02: Provider Context and Structured Composition Draft
# FileName: TASK-190-02-02_Provider_Context_and_Structured_Composition_Draft.md

**Priority:** High
**Category:** Assistant/Core + Provider Planning
**Estimated Effort:** Medium
**Dependencies:** TASK-190-02-01
**Status:** Done (2026-05-06)

---

## Overview

Prepare a provider-side capability context for blueprint/setup prompts and allow
an optional shadow-only capability suggestion draft that uses capability ids
only. Provider output remains untrusted and cannot include actions.

This leaf must not replace the current production `cms_operation_draft`
contract used by generic CMS/admin planning. The existing provider response
contract stays unchanged unless a later cutover task explicitly promotes a
blueprint candidate response path.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintProviderContext.ts`
- Add `core/services/assistant/blueprints/blueprintCompositionDraftSchema.ts`
- Update `core/services/assistant/providerPlanningContext.ts`
- Update `core/services/assistant/actionPlannerService.ts`
- Add `tests/vitest/assistant/blueprint-provider-context.test.ts`

Owner rule:

- `providerPlanningContext.ts` remains the top-level owner of provider prompt
  packaging.
- `blueprintProviderContext.ts` may exist only as a narrow blueprint/setup
  helper consumed by `providerPlanningContext.ts`, not as a second parallel
  prompt-package entry point.

Scope guard:

- production `/assistant/actions/plan` provider routing continues to request
  `cms_operation_draft` for the generic CMS/admin path,
- any provider capability-id suggestion added here is shadow-only or
  blueprint-setup-only behind an explicit allowlist/feature flag,
- no production planner path may silently switch from `cms_operation_draft` to a
  new response contract in this leaf.

Resource catalog packaging contract:

- `providerPlanningContext.ts` must package resource summaries from the
  server-derived admin-context/resource-catalog owners only. The client may set a
  reviewed `includeResourceCatalog` flag, but it must not submit a trusted
  `resourceCatalog` object.
- Catalog-backed LLM Guide planning must keep the current LLM availability gate:
  if catalog context or site-kit planning needs an LLM and the guide is
  unavailable, planning returns the existing unavailable error instead of
  falling back to an under-informed local mutation.
- The provider package must stay bounded/redacted. It may include summaries for
  the resource groups that exist in the current catalog contract, including
  pages, posts, entries, content types, custom screens, listings, forms, menus,
  SEO documents, widgets, media, commerce, solution kits, and detail pages once
  the detail-page owner leaves land. If a group is not ready, omit it with an
  explicit warning/limitation rather than silently pretending the assistant can
  reuse it.
- Media in provider context is metadata only: existing media ids, labels, alt
  text, dimensions/mime/type-like hints, and safe thumbnails when already
  allowed by the media owner. Provider context must not include raw bytes,
  signed/private URLs, upload tokens, or secret storage details.

## Pseudocode

```ts
type ProviderBlueprintCompositionDraft = {
  primaryCapabilityId: string;
  adjunctCapabilityIds: string[];
  gatedCapabilityIds: string[];
  notes?: string[];
};

const normalizeProviderBlueprintCompositionDraft = (value, registry) => {
  const draft = strictNormalize(value);
  assertKnownCapability(draft.primaryCapabilityId);
  draft.adjunctCapabilityIds.forEach(assertKnownCapability);
  return draft;
};
```

## Security Contract

- Visibility: provider planning context.
- Auth model: existing assistant route.
- RBAC: no permission grants.
- CSRF: unchanged.
- Rate-limit bucket: assistant.
- Reject-unknown validation: strict draft schema; unknown ids reject.
- Anti-abuse: provider cannot return actions, payloads, SQL, paths, or resource ids.
- Secret handling: provider context includes redacted manifest summaries only.
- Planner boundary: current generic CMS/admin provider contract stays
  `cms_operation_draft` until a later explicit cutover task.
- Catalog boundary: reject client-authored `context.resourceCatalog`; only the
  server can inject the catalog package after auth/RBAC/LLM availability checks.
- Media boundary: provider may suggest media intent, but it cannot create upload
  payloads or executable media mutations.

## Testing Requirements

- Valid provider draft normalizes.
- Unknown capability id rejects.
- Provider action arrays reject.
- Provider cannot invent page sections.
- Fallback uses deterministic local candidates.
- Generic CMS/admin provider path keeps using `cms_operation_draft`.
- Provider context tests cover server-derived resource catalog packaging for
  media/entries/posts and explicit omission warnings for not-yet-owned groups.
- Request validation rejects client-supplied `context.resourceCatalog`.
- LLM-unavailable tests cover catalog-backed/site-kit planning and do not allow a
  silent local fallback when the prompt requires catalog context.
- Media prompts with attached files produce gated/needs-input media-import
  prerequisites until trusted media-library ids exist.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
