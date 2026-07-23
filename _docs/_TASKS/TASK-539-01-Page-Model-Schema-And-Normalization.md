# TASK-539-01: Page Model, Schema, and Normalization

# FileName: TASK-539-01-Page-Model-Schema-And-Normalization.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / PageDocumentV2 / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-538; TASK-478 and TASK-481 collision boundary resolved
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Make the PageDocumentV2 owner express the repaired contracts before any renderer,
responsive-CSS, or editor consumer lands: present-key layer merging, strict canonical
gallery items, and present-only effect normalization. Schema version 2 and all existing
Page endpoints remain unchanged.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-01-L01 | Sole `pageDocumentV2.ts` source change | ⏳ To Do |
| TASK-539-01-L02 | Model, strict-write, round-trip, and identity proof | ⏳ To Do |

## Ownership

- `TASK-539-01-L01` is the only TASK-539 writer of
  `core/services/pages/pageDocumentV2.ts` and owns compatibility/changed-behavior
  updates in the three named model Vitest suites before its source gate.
- `TASK-539-01-L02` owns only additive model cases and the existing registered Page
  route suite named in its contract; it reruns L01 assertions read-only and cannot
  re-baseline them.
- Later leaves import the exact owner symbols; they must not duplicate merge,
  gallery, or effect-normalization logic.

## Security Contract

- No route is added or changed. Existing internal Page writes retain session/API-key
  auth, Page RBAC, CSRF for session writes, existing admin rate limits, and the
  PageDocumentV2 strict validation boundary.
- Gallery nested objects reject unknown keys on write. Gallery URLs continue through
  the shared authoring media-URL sanitizer.
- Stored-read adapters are deterministic and non-destructive; they never broaden the
  strict external write shape.
- No nonce/captcha applies because this subtask adds no public write.

## Acceptance

- Preview and public-CSS consumers can import one layer merge helper.
- Canonical gallery writes round-trip without unknown-key loss.
- Legacy gallery aliases remain readable but are never accepted as new writes.
- False spotlight and orphan parallax values normalize away.
- No-effect, no-gallery-change, and no-responsive-layer documents remain byte-identical.

## Validation

Run both leaves' targeted commands, then:

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-document-v2-block-roundtrip.test.ts tests/vitest/pages/task-534-interactivity-model.test.ts
set -a && source .env && set +a && bun test --timeout=15000 tests/integration/routes/pages.test.ts
git diff --check
```
