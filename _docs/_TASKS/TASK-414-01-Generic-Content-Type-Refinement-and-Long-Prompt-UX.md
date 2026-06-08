# TASK-414-01: Generic Content Type Refinement and Long Prompt UX
# FileName: TASK-414-01-Generic-Content-Type-Refinement-and-Long-Prompt-UX.md

**Parent Task:** TASK-414
**Priority:** High
**Category:** Assistant + Engine + Admin UI + Security + Runtime QA
**Estimated Effort:** Large
**Dependencies:** TASK-414, TASK-407, TASK-410
**Status:** ✅ Done
**Started:** 2026-06-07
**Completed:** 2026-06-07

---

## Overview

LLM Guide must handle ordinary CMS refinement prompts across industries, not
only site-builder starter kits or hard-coded business verticals. A user should
be able to ask the assistant to add fields to an existing Engine Content Type
using natural Polish or English copy, review the generated typed plan, dry-run,
and execute through the existing action flow.

This task repairs the current generic assistant failure where an exact
Content Type target is found, but field-add requests return a generic
unsupported response. It also fixes long prompt handling so large pasted
markdown/specification text is accepted according to the active model/settings
budget instead of a fixed 2,000-character route cap, and it makes long pasted
chat content scrollable inside the assistant panel.

The feature is intentionally generic. It must not encode house projects,
services, commerce, real estate, or any other industry-specific field list.
Industry names may appear only in regression prompts as target labels supplied
by the user. The implementation infers safe field shapes from the labels and
explicit syntax in the prompt.

## Security Contract

- Endpoint visibility: existing internal admin assistant endpoints under
  `/admin/api/assistant/actions/*`; no public write endpoint.
- Auth model: existing authenticated admin session.
- RBAC: planning requires `settings:read` and `content:read`; dry-run reads
  the target Content Type; execute requires `content:write` through the
  assistant action-family contract.
- CSRF: required for all assistant POST routes.
- Rate-limit bucket: existing `assistant` bucket.
- Validation: strict schemas reject unknown route, draft, action, and field
  payload keys. Provider output remains operation-draft-only and cannot submit
  executable action payloads or full Content Type schemas.
- Anti-abuse: prompt text may propose labels only; targets resolve from trusted
  server catalog/active context. Secret-like field names/defaults, destructive
  schema edits, unsupported field kinds, and ambiguous targets fail closed.
- Data safety: schema refinement must merge against a server-hydrated full
  existing schema and preserve unrelated fields. Full schemas used for local
  merge must not be sent to providers or browser localStorage.

## Implementation Pseudocode

1. Add a content-schema helper:
   - `buildContentTypeFieldDefinition(field)` returns a JSON Schema property
     for supported UI field types.
   - `mergeContentTypeFields(existingSchema, addFields)` builds a schema from
     inferred fields, calls the existing schema merge helper, and validates
     with `assertContentSchema`.
   - Supported additions: generic `text`, `richtext`, `number`, `boolean`,
     `select`, `media` fields. Relation requires a trusted target slug and
     remains gated for free-text prompts.
2. Add assistant field inference:
   - Parse bounded label blocks and Markdown-ish lists from Polish/English
     prompts.
   - Generate stable `snake_case` keys from safe labels and reject
     unnormalizable or secret-like labels.
   - Infer `richtext` from description/content/body labels, `number` from
     numeric suffixes such as `_m2`, `_m3`, `_count`, `_spaces`, `price`, and
     `area`, `media` from image/gallery/pdf/file labels, and generic `text`
     otherwise.
   - Reject unsupported object-array/repeater shapes such as nested `rooms[]`
     and `sections[]` until a real typed field/editor/runtime contract exists.
3. Extend generic CMS planning:
   - Add a strict reviewed `content-type.field.add` action family for additive
     schema refinement.
   - Add content-type update policy mapping to `content-type.field.add`.
   - Hydrate full Content Type schema server-side for exact target merge, but
     strip it from provider-facing context.
   - Add a content-type update branch in `cmsOperationActionMapper.ts` that
     emits one reviewed `content-type.field.add` action with existing slug/name
     and supported field additions.
4. Fix prompt limits:
   - Replace the fixed 2,000-character action-plan route cap with a high
     transport cap.
   - Enforce a dynamic prompt budget after route validation from active
     `assistant.llm.maxInputTokens`, output budget, and estimated provider
     package tokens.
   - Return `assistant_prompt_too_large` with HTTP 413 and safe details.
5. Fix assistant UI:
   - Make the composer and long message bubbles internally scrollable.

## Testing Requirements

- Vitest:
   - field inference and schema merge helper tests,
  - `content-type-field-add.test.ts`,
   - `cms-operation-action-mapper.test.ts`,
   - `actionPlannerService.test.ts`,
  - `operation-policy-cms-resources.test.ts`,
  - `provider-planning-context.test.ts`,
   - `action-plan-schema.test.ts`,
   - assistant panel UI long-paste tests.
- Bun:
  - assistant route tests proving prompts over 2,000 characters are accepted
    when under the active model/settings budget and rejected as
    `assistant_prompt_too_large` when over budget,
  - executor/dry-run tests proving schema merge preserves unrelated fields.
- Validation commands:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted Vitest/Bun suites for touched contracts
  - `bun run precommit`
- Live QA:
  - restart through `coderso-dev-core-host`,
  - Playwright CLI login using `.env` credentials,
  - add fields to an existing Engine Content Type through LLM Guide,
  - paste a long markdown prompt and verify scroll/acceptance behavior.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `docs/develop/assistant.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` plus changelog index

## Completion Notes

- Implemented generic `content-type.field.add` planning, preview, and execute
  behavior for additive Engine Content Type field refinement.
- Added deterministic field-list inference for supported scalar/richtext/number,
  boolean, select, and media additions while gating nested arrays and unsupported
  generic arrays.
- Added generic markdown-brief catalog setup for nontechnical prompts that ask
  for a catalog and paste a field list; the planner derives an industry-neutral
  catalog preset instead of using a fixed business vertical.
- Expanded docs-question classification for natural beginner wording such as
  "do czego jest Engine?" so guidance prompts stay non-mutating.
- Preserved full Content Type schemas server-side and stripped schemas from
  provider-facing planning context.
- Replaced fixed low prompt caps with high transport validation plus
  provider/model/settings-derived prompt budgeting that reserves provider package
  overhead and returns explicit 413 handling when the prompt exceeds the
  configured model capability.
- Added assistant composer and message-bubble vertical scrolling for long pasted
  prompts.
- Kept the implementation industry-neutral; regression prompts use user-supplied
  labels only.
- Updated the LLM Guide acceptance matrix with the new generic Content Type
  field-refinement lane, markdown-brief catalog setup lane, supported action,
  and nested-array known gap.

## Validation

- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts`
  - Passed: 123 tests.
- `bunx vitest run tests/vitest/assistant/content-type-field-add.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - Passed: 2 files, 20 tests.
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant-rate-limit.test.ts`
  - Passed: 3 tests, including `assistant_prompt_too_large` HTTP 413 route
    mapping.
- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/content-type-field-add.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - Passed: 8 files, 239 tests.
- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/content-type-field-add.test.ts tests/vitest/assistant/action-plan-heuristics.test.ts`
  - Passed: 3 files, 136 tests, including beginner Engine docs wording and
    markdown car-catalog setup from pasted fields.
- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-heuristics.test.ts tests/vitest/assistant/content-type-field-add.test.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - Passed: 8 files, 248 tests.
- `bun test tests/unit/assistant/actionExecutorService.test.ts`
  - Passed: 77 tests.
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant-rate-limit.test.ts tests/integration/routes/assistant-openrouter-live.test.ts`
  - Passed: 5 tests, including the real OpenRouter natural CMS prompt matrix,
    generic Content Type field-refinement prompt, and `assistant_prompt_too_large`
    HTTP 413 mapping.
- `set -a && source .env && set +a && bun - <<'TS' ...`
  - Passed real markdown catalog smoke using `TEST_OPENROUTER_API_KEY` and
    `TEST_OPENROUTER_MODEL`: 54,680-character nontechnical car-catalog markdown
    prompt returned `generic-catalog-samochodow`, 7 reviewed actions, zero
    provider calls, and schema fields for brand, mileage, and featured image.
- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `git diff --check`
  - Passed.
- `git diff --check HEAD`
  - Passed.
- `git diff --check --cached`
  - Passed after synchronizing the staged changelog whitespace fix.
- `playwright-cli -s=task414-long-prompt-ui run-code --filename .tmp/task-414-assistant-long-prompt-ui-smoke.js`
  - Passed after starting `coderso-dev-core-host`, logging in with `.env`
    credentials, completing first-run setup on the local helper, and enabling
    assistant OpenRouter settings for the test session. Verified 722 pasted
    textarea lines, `overflowY:auto`, internal scroll, no horizontal overflow,
    and `/admin/api/assistant/actions/plan` HTTP 200 without invalid payload.
- `bun run precommit`
  - Not run because this session is not creating a manual commit and the script
    runs `format:staged` against a mixed staged/unstaged worktree.
