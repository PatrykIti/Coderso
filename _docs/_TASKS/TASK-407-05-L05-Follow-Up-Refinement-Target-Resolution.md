# TASK-407-05-L05: Follow Up Refinement Target Resolution
# FileName: TASK-407-05-L05-Follow-Up-Refinement-Target-Resolution.md

**Parent Subtask:** TASK-407-05
**Priority:** High
**Category:** Assistant + Follow-Up Resolver
**Estimated Effort:** Large
**Dependencies:** TASK-407-05-L04
**Status:** ⏳ To Do

---

## Overview

Route follow-up prompts such as "change the projects page" into a scoped guided
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
| Resolver | `core/services/assistant/guidedFollowUpResolver.ts`, `core/services/assistant/cmsTargetResolver.ts` |
| Operation policy | `core/services/assistant/operationPolicy/followUpPolicy.ts` if policy changes |
| Tests | `tests/vitest/assistant/guidedFollowUpResolver.test.ts` |

## Implementation Pseudocode

```ts
export function resolveGuidedFollowUpTarget(input: FollowUpInput) {
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
