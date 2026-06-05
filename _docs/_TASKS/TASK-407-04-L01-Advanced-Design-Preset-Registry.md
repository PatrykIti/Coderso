# TASK-407-04-L01: Advanced Design Preset Registry
# FileName: TASK-407-04-L01-Advanced-Design-Preset-Registry.md

**Parent Subtask:** TASK-407-04
**Priority:** High
**Category:** Assistant + Advanced Design Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-407-03-L04
**Status:** ✅ Done (2026-06-05)

---

## Overview

Create backend-owned Advanced design preset ids and mappings to existing design
tokens/widget capabilities. Presets must be controlled choices, not free-form
style prompts.

## Sub-Tasks

- Add preset ids such as modern, editorial, retro, minimal, bold, luxury, and
  utilitarian only where they map to supported token/widget capabilities.
- Define preset metadata: tone, contrast, density, typography family, image
  treatment, and supported section families.
- Reject unknown preset ids and unsupported token combinations.
- Update docs/matrix entries for supported presets and explicit gaps.

## Security Contract

- Endpoint visibility: no new endpoint.
- Auth model: unchanged existing admin session.
- RBAC: unchanged until planning/execution.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: design preset ids and token ids must resolve from
  backend-owned registries.
- Anti-abuse: user text cannot define arbitrary CSS, scripts, remote assets, or
  unbounded style directives.
- Secret handling: preset metadata must not include secrets, provider output,
  cookies, auth state, or raw reference text.

## Files To Change

| Area | Files |
|---|---|
| Presets | `core/services/assistant/assistantSiteBuilderIntakeDesignPresets.ts` |
| Facts | `core/services/assistant/assistantSiteBuilderIntakeFacts.ts` |
| Docs | `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if coverage changes |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeDesignPresets.test.ts` |

## Implementation Pseudocode

```ts
export const siteBuilderIntakeDesignPresets = defineSiteBuilderIntakeDesignPresets([
  preset("modern", { tone: "clean", contrast: "medium", density: "balanced" }),
  preset("editorial", { tone: "calm", typography: "serif-accent" }),
  preset("utilitarian", { tone: "work-focused", density: "compact" }),
]);

export function resolveSiteBuilderIntakeDesignPreset(id: string) {
  return getRegistryItem(siteBuilderIntakeDesignPresetRegistry, id, "design_preset_invalid");
}
```

## Data Flow and Error Handling

- Advanced answers reference preset ids; normalizers resolve them to supported
  token/capability facts before review.
- Unknown ids, unsupported token families, or arbitrary style strings fail
  closed.
- Later UI and planner leaves consume preset facts but do not own preset ids.

## Testing Requirements

- Registry tests for unique ids, supported token mappings, and unknown-id
  rejection.
- Tests that preset metadata is deterministic and secret-free.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if preset coverage affects matrices.

## Acceptance Criteria

- Advanced visual style is selected from backend-owned presets.
- Unknown or arbitrary style input fails closed.
- Preset support and gaps are documented.

## Completion Notes

- Added backend-owned `designPresets` ids and option registry coverage for
  `modern`, `editorial`, `retro`, `minimal`, `bold`, `luxury`, and
  `utilitarian`.
- Added deterministic token/section-role facts, copied review facts, explicit
  review-only `themeTokenHints`, `theme-application-pending` gap codes, and
  provider-context `designPresetId` redaction.
- Added Advanced normalizer guards so unknown preset ids and arbitrary
  URL/HTML/CSS/script/admin/action design strings fail closed before review.
- Required a selected backend preset whenever Advanced design notes are present,
  preventing a free-form style-prompt bypass.

## Validation Evidence

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeDesignPresets.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts` (22 tests)
- Full targeted assistant intake batch, lint, typecheck, diff check, precommit,
  and agent drift audit recorded in changelog 1109.
