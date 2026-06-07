# TASK-407-05-L05: Follow Up Refinement Target Resolution
# FileName: TASK-407-05-L05-Follow-Up-Refinement-Target-Resolution.md

**Parent Subtask:** TASK-407-05
**Priority:** High
**Category:** Assistant + Follow-Up Resolver
**Estimated Effort:** Large
**Dependencies:** TASK-407-05-L04
**Status:** ✅ Done (2026-06-06)

---

## Overview

Route follow-up prompts such as "change the projects page" into a scoped intake
flow by resolving trusted active resources or server-derived candidates.

## Sub-Tasks

- Resolve targets from active admin surface, current page, content engine,
  listing/detail route, or trusted resource catalog.
- Ask an ambiguity question when multiple trusted candidates match.
- Decide whether the refinement is a static page edit, content-engine update,
  listing/detail update, custom-screen change, or unsupported gate.
- Prevent free text from targeting arbitrary resources.

## Security Contract

- Endpoint visibility: internal assistant action routes only.
- Auth model: existing admin session.
- RBAC: target read permissions plus action-specific write permissions before
  execute.
- CSRF: required for admin POSTs.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: target ids, resource family ids, route ids, and
  refinement answers must resolve from server-derived catalogs.
- Anti-abuse: free-text target names are hints only; mutation targets must come
  from active context or server catalogs.
- Secret handling: resolver diagnostics must not include raw prompts, cookies,
  auth state, provider keys, signed URLs, or secret-like resource data.

## Files To Change

| Area | Files |
|---|---|
| Resolver | `core/services/assistant/assistantSiteBuilderFollowUpResolver.ts`, `core/services/assistant/cmsTargetResolver.ts` |
| Operation policy | `core/services/assistant/operationPolicy/followUpPolicy.ts` if policy changes |
| Tests | `tests/vitest/assistant/assistantSiteBuilderFollowUpResolver.test.ts` |

## Implementation Pseudocode

```ts
export function resolveSiteBuilderFollowUpTarget(input: FollowUpInput) {
  const candidates = collectTrustedCandidates(input.activeSurface, input.resourceCatalog);
  const matches = matchPromptHintToCandidates(input.promptHint, candidates);
  if (matches.length === 0) return needsInput("target_required", candidates);
  if (matches.length > 1) return needsInput("target_ambiguous", matches);
  return buildScopedRefinementFlow(matches[0], input.requestedChange);
}
```

## Data Flow and Error Handling

- Follow-up text becomes a hint; trusted active context/catalogs provide actual
  resource candidates.
- Ambiguous or missing targets return `needs_input`.
- Unknown ids, stale resources, unsupported target families, or permission gaps
  become conflicts/gates before action assembly.

## Testing Requirements

- Tests for active page, content engine, listing/detail, and custom-screen
  target resolution.
- Tests for ambiguous prompt -> target question.
- Tests for free-text resource spoofing and stale/unknown ids.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` for follow-up refinement behavior.

## Acceptance Criteria

- Follow-up refinements are scoped to trusted resources.
- Ambiguous prompts ask a target question.
- Free text alone cannot select mutation targets.

## Completion Notes

- Added `assistantSiteBuilderFollowUpResolver.ts` as a pure site-builder
  follow-up target scoping helper.
- Prompt text is treated only as a target/change hint; actual targets resolve
  through the active admin surface or server-derived resource catalog using the
  existing CMS draft/target resolver path.
- The resolver classifies trusted exact matches into scoped refinement kinds for
  static pages, content-engine pages, listings, detail pages, custom screens,
  and gates other non-site-builder CMS surfaces.
- Ambiguous trusted candidates return `needs_input`; stale, spoofed, unsupported
  resource families, and unsupported operations return `needs_input` or `gated`
  before action assembly.
- Agent read-only drift audit found and the implementation now blocks active
  surface/name-hint conflicts, gates non-site-builder families such as forms,
  and redacts secret-like candidate values before diagnostics.
- `cmsTargetResolver.ts` now carries backend owner metadata needed for this
  classification, including collection page links, custom-screen
  collection/composition metadata, and listing query source ids.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderFollowUpResolver.test.ts`
- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderFollowUpResolver.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  (126 tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
