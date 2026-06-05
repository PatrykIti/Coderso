# 1109 - TASK-407 Advanced design preset registry

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-04, TASK-407-04-L01

## Key Changes

### Assistant Advanced Design

- Added backend-owned Advanced `designPresets` for `modern`, `editorial`,
  `retro`, `minimal`, `bold`, `luxury`, and `utilitarian`.
- Mapped each preset to deterministic tone, contrast, density, typography,
  image-treatment, spacing, corner-radius, accent, supported section-role, and
  explicit `theme-application-pending` gap facts.
- Added review-only `themeTokenHints` that validate against the existing
  `DesignTokenOverrides` key contract without applying theme changes during
  intake.
- Added normalized `designPresetId` and copied `designPreset` facts for Advanced
  intake sessions without creating a free-form style execution path.

### Hardening

- Registered `designPresets` in the shared intake option registry and made the
  Advanced `design-preset` step select backend-owned ids.
- Rejected unknown preset ids and unsafe arbitrary design strings containing
  remote URLs, HTML/CSS/script fragments, admin/action ids, or executable style
  directives before review/provider planning.
- Required a selected backend preset whenever design brief, tone, color, or
  layout notes are present, so free-form visual prompts cannot bypass the preset
  registry.
- Added provider-context redaction for `designPresetId` so unnormalized malicious
  ids are dropped before provider packaging.

### QA

- Added Vitest coverage in
  `tests/vitest/assistant/assistantSiteBuilderIntakeDesignPresets.test.ts` and
  updated related registry, normalizer, and redaction suites.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeDesignPresets.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts` (22 tests)
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicDefaults.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicReview.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicSecurity.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeDesignPresets.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts` (222 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
