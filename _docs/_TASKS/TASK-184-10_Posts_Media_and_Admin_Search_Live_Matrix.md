# TASK-184-10: Posts, Media, and Admin Search Live Matrix
# FileName: TASK-184-10_Posts_Media_and_Admin_Search_Live_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Main Navigation
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01
**Status:** To Do

---

## Overview

Add live OpenAI/OpenRouter E2E coverage for Main menu surfaces not covered by Pages/CMS entries:

- Posts
- Media
- global Admin Search

The suite should prove that the assistant can find, inspect, and safely plan supported operations on these surfaces, while refusing unsupported destructive or upload-like requests.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Posts:
  - create or seed posts with a test prefix where the action/service contract supports it,
  - search by title/slug/status,
  - update metadata/status where supported,
  - delete only test-prefixed posts where supported,
  - verify unrelated posts are excluded.
- Media:
  - inspect existing fixture media by filename/title/type,
  - attach existing media to supported entry targets via `media.reference.attach`,
  - refuse prompts that imply raw upload bytes or unsafe external fetches.
- Global Admin Search:
  - ask for resources across sections using a unique test prefix,
  - verify grouped results point to the expected section/resource,
  - verify broad search guidance remains read-only.

## Files to Change

- New live test file for posts/media/search.
- Shared live fixture helper.
- Existing assistant resource catalog builders if posts/media/search summaries are missing.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: posts/media/search permissions follow existing route/service contracts.
- CSRF: preserve route/service ownership from harness.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: generated actions must pass strict schemas; unsupported posts/media operations must return `needs_input` or read-only guidance.
- Anti-abuse: no raw upload bytes or external media fetching through assistant prompts.
- Secret handling: no signed media URLs, cookies, CSRF tokens, provider keys, or private media payloads in prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - search results include only expected test-prefixed resources,
  - unsupported media upload prompts are blocked,
  - read-only global search does not expose execute controls.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- changelog on completion
