# 1113 - TASK-407 reference intake validation policy

Date: 2026-06-05
Version: unreleased
Tasks: TASK-407-04-L03

## Key Changes

### Assistant Site Builder
- Added a deps-injected Advanced reference intake policy for readable
  media-library ids and scanned temporary references.
- Extended `reference-intake` answers with bounded `textBrief`, media asset ids,
  and temporary reference ids as answer-local candidates.
- Kept provider context digest-only for redacted text references with presence
  and `rawIncluded:false`; unvalidated candidate ids do not become provider
  facts.

### Safety
- Gated arbitrary remote media URLs unless a backend-owned trusted adapter owns
  the source.
- Redacted filenames, EXIF/metadata, OCR/extracted text, alt text, signed URLs,
  cookies, tokens, and instruction-like reference text before provider use.
- Preserved the existing planner/executor boundary: no new endpoint, route
  payload, media import path, or provider-authored action path was added.

### QA
- Added `assistantSiteBuilderIntakeReferencePolicy.test.ts`.
- Updated normalizer, registry, redaction, and compiler-adjacent regressions for
  Advanced reference fields and digest-only provider context.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeReferencePolicy.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedOptions.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
