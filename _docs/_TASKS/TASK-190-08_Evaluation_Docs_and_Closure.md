# TASK-190-08: Evaluation, Docs, and Closure
# FileName: TASK-190-08_Evaluation_Docs_and_Closure.md

**Priority:** High
**Category:** QA + Docs + Assistant Evaluation
**Estimated Effort:** Large
**Dependencies:** TASK-190-01, TASK-190-02, TASK-190-03, TASK-190-04, TASK-190-05, TASK-190-06, TASK-190-07
**Status:** Done (2026-05-11)

---

## Overview

Close TASK-190 by adding composition fixture matrices, red-team cases, docs, and
live provider validation. This task proves that composition does not regress
single-preset behavior or operation policy safety.

Business value:
- Product can confidently expand blueprint fragments after the foundation lands.
- Provider behavior is monitored across OpenAI/OpenRouter.
- Docs clearly explain what the assistant can compose and what remains gated.

## Sub-Tasks

- `TASK-190-08-01_Composition_Fixture_Matrix_and_Red_Team_Corpus.md`
- `TASK-190-08-02_Docs_Changelog_and_Closure.md`
- `TASK-190-08-03_Capability_Authoring_Guide_and_Observability.md`
- `TASK-190-08-04_Live_Provider_Matrix_Approval_and_Rerun.md`

## Architecture

Owner files:

- `tests/vitest/assistant/blueprint-composition-fixtures.test.ts`
- `tests/integration/assistant-live/blueprintCompositionLiveMatrix.test.ts`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/BLUEPRINT_COMPOSER.md`

## Acceptance Criteria

1. The deterministic Vitest fixture matrix covers at least five mixed prompts.
2. The deterministic Vitest fixture matrix keeps at least three single-preset
   regression prompts green.
3. Gated modules are represented but non-executable.
4. The opt-in provider matrix passes for OpenAI/OpenRouter where configured.
5. Docs and changelog are synchronized.
6. Capability authoring guide and diagnostics/redaction rules are documented.

## Security Contract

- Visibility: docs/QA plus internal assistant tests.
- Auth model: no runtime changes.
- RBAC: docs preserve action permission boundaries.
- CSRF: no runtime changes.
- Rate-limit bucket: no runtime changes.
- Reject-unknown validation: fixtures cover invalid provider composition drafts.
- Anti-abuse: red-team corpus covers provider action injection, duplicate
  resource spam, secret-bearing fields, destructive mixed prompts, and route
  collisions.
- Secret handling: no secrets in fixtures or docs.

## Testing Requirements

- Vitest composition fixture matrix.
- Bun live provider matrix when env is available.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/BLUEPRINT_COMPOSER.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Progress Notes

- 2026-05-10: `TASK-190-08-01` landed the deterministic fixture/red-team corpus
  and live-provider composition matrix.
- 2026-05-10: `TASK-190-08-03` landed `_docs/BLUEPRINT_COMPOSER.md`, docs index
  updates, and redacted composition diagnostics serialization before the final
  docs/changelog/gates leaf (`TASK-190-08-02`).
- 2026-05-10: `TASK-190-08-02` synchronized source-of-truth docs, task board,
  changelog, and final validation notes; the TASK-190 evaluation/docs closure is
  complete.
- 2026-05-11: `TASK-190-08-04` recorded the explicit-approval live provider
  rerun after final validation drift fixes and keeps the opt-in OpenAI/OpenRouter
  matrix attached to the TASK-190 evaluation closure.
- 2026-05-11: acceptance wording now keeps the five mixed and three
  single-preset counts on the deterministic Vitest fixture matrix, while the
  live provider matrix remains opt-in smoke/regression coverage.
