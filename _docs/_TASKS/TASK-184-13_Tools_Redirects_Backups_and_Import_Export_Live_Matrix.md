# TASK-184-13: Tools, Redirects, Backups, and Import Export Live Matrix
# FileName: TASK-184-13_Tools_Redirects_Backups_and_Import_Export_Live_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01
**Status:** Done (2026-04-18)

---

## Overview

Add live OpenAI/OpenRouter coverage for Tools navigation surfaces:

- Search
- SEO Manager
- Backups
- Import / Export
- Redirects

SEO document CRUD is covered by TASK-184-08; this leaf covers the broader Tools workflows and safety gates around operational actions.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Search:
  - search across pages/entries/posts/media by unique prefix,
  - verify grouped results and unrelated exclusions.
- SEO Manager:
  - inspect SEO audit status,
  - run/update SEO only through existing typed SEO contracts,
  - verify delete SEO does not delete target resources.
- Backups:
  - inspect backup list/schedule/status,
  - trigger backup only if typed action/route contract supports it,
  - restore prompts must be gated/reviewed and never run broad restore silently.
- Import / Export:
  - inspect exportable resource groups,
  - export dry-run guidance only unless import/export action contract exists,
  - import prompts with arbitrary payloads must be blocked.
- Redirects:
  - create/search/update/delete test-prefixed redirects where supported,
  - block unsafe external or looped redirects.

## Files to Change

- New live test file for tools/redirects/backups/import-export.
- Shared live fixture helper.
- Action family contracts if new operational typed actions are required.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: operational permissions remain authoritative.
- CSRF: preserve route/service ownership.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: import/export/backups/redirect actions must be strict or gated.
- Anti-abuse: restore/import/destructive redirects require explicit reviewed action or `needs_input`.
- Secret handling: no backup payloads, export archives, import contents, provider keys, cookies, CSRF tokens, or privileged settings in prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - safe read-only tool prompts stay read-only,
  - dangerous import/restore prompts are gated,
  - redirects validate safe source/target semantics.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md` if release gate ownership changes
- `_docs/_TASKS/README.md`
- changelog on completion

## Completion Notes (2026-04-18)

- Added `tests/integration/assistant-live/toolsSafetyLiveMatrix.test.ts`.
- OpenAI/OpenRouter live cases cover global search prompts, SEO audit auto-fix prompts, backup restore prompts, import arbitrary JSON prompts, and unsafe external redirect prompts.
- The suite verifies these Tools surfaces do not produce executable action plans without strict typed contracts.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/assistant-live/toolsSafetyLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
