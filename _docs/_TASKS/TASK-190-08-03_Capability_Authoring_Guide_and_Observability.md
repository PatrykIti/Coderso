# TASK-190-08-03: Capability Authoring Guide and Observability
# FileName: TASK-190-08-03_Capability_Authoring_Guide_and_Observability.md

**Priority:** High
**Category:** Docs + Developer Experience + Observability
**Estimated Effort:** Medium
**Dependencies:** TASK-190-08-01
**Status:** Done (2026-05-10)

---

## Overview

Document how future blueprint capabilities should be authored and add
observability hooks for composition debugging. Without this, the system may drift
back into one-off preset branches as more business modules are added.

## Sub-Tasks

No child task files.

## Business Behavior

Developers should be able to add a new blueprint fragment by following a clear
guide:
- declare capability,
- define provides/requires,
- define resources,
- define page/admin contributions,
- declare gates,
- add fixtures,
- avoid duplicates,
- document security behavior.

Support engineers should be able to inspect why a prompt composed a given plan.

## Files to Change

- Add `_docs/BLUEPRINT_COMPOSER.md`
- Update `_docs/README.md`
- Update `_docs/ASSISTANT_SITE_BUILDER.md`
- Update `_docs/ARCHITECTURE.md`
- Update `_docs/TESTING_STRATEGY.md`
- Add optional `core/services/assistant/blueprints/blueprintCompositionDiagnostics.ts`
- Add tests for diagnostics serialization if runtime code is added.

## Authoring Guide Sections

- Capability id naming.
- Stable resource keys.
- `provides` and `requires` taxonomy.
- Merge policy rules.
- Gated domain rules.
- Page section contribution examples.
- Admin surface contribution examples.
- Test fixture requirements.
- Security checklist.
- Changelog/task checklist.

## Observability Scope

Add or document:
- test-only debug output for candidate scores,
- graph conflict snapshots,
- selected/gated capability ids,
- action assembly trace,
- redacted provider composition draft,
- no-duplicate matcher decisions.

## Pseudocode

```ts
export const buildBlueprintCompositionDiagnostics = (input) => ({
  promptHash: hashPrompt(input.prompt),
  primary: input.graph.primary.id,
  adjuncts: input.graph.adjuncts.map((node) => node.id),
  conflicts: redactConflicts(input.graph.conflicts),
  actionTypes: input.actions.map((action) => action.type),
});
```

## Security Contract

- Visibility: docs and internal diagnostics.
- Auth model: no route changes unless diagnostics endpoint is explicitly added
  in a future task.
- RBAC: diagnostics stay test/internal unless a future admin endpoint defines
  permissions.
- CSRF: not applicable unless future endpoint is added.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: diagnostics schema strict if serialized.
- Anti-abuse: diagnostics must not expose provider raw output or secrets.
- Secret handling: all prompt/provider/resource snippets are redacted or hashed.

## Testing Requirements

- Docs checklist review.
- Diagnostics serialization tests if code is added.
- Secret redaction tests.
- Fixture authoring example compiles/normalizes.

## Documentation Updates Required

- `_docs/BLUEPRINT_COMPOSER.md`
- `_docs/README.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`

## Completion Notes

- Added `_docs/BLUEPRINT_COMPOSER.md` as the capability authoring and
  diagnostics guide for stable capability ids, resource keys,
  `provides`/`requires`, merge policy, gated domains, fixture expectations,
  security rules, and changelog/task closure.
- Added `core/services/assistant/blueprints/blueprintCompositionDiagnostics.ts`
  plus Vitest coverage for prompt hashing, selected/gated capability
  serialization, action assembly traces, no-duplicate matcher summaries, and
  redacted provider-draft diagnostics.
- Updated the docs index, assistant site-builder contract, architecture docs,
  and testing strategy to point at the authoring guide and diagnostics owner
  seam.
