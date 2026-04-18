# TASK-184-08: Menus, SEO, and Media Live CMS Operation Matrix
# FileName: TASK-184-08_Menus_SEO_and_Media_Live_CMS_Operation_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Menus/SEO/Media
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01, TASK-184-02, TASK-184-03
**Status:** To Do

---

## Overview

Add live OpenAI/OpenRouter E2E coverage for menu items, SEO documents, and media references.

These are related surfaces because they often target pages or entries created by other fixture leaves.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Menus:
  - create safe relative menu links,
  - search by label/href,
  - update label/href/order,
  - delete selected items without changing unrelated tree items.
- SEO:
  - create/upsert SEO document for fixture page and entry,
  - search by slug/title/status,
  - update title/description,
  - delete SEO document without deleting target resource.
- Media reference:
  - attach existing fixture media to an entry field where media fixtures are available,
  - verify no upload bytes are accepted by assistant action.
- Negative:
  - unsafe href blocked,
  - deleting SEO target resource through SEO delete prompt must not happen,
  - media upload prompt returns `needs_input` or unsupported path.

## Files to Change

- New live test file for menus/SEO/media.
- Shared live fixture helper.
- Optional media fixture helper if a stable test media asset exists.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: menu write, content write, media read/content write permissions as existing contracts require.
- CSRF: preserve route/service ownership.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: `menu.item.*`, `seo.document.*`, and `media.reference.attach` actions must pass strict schemas.
- Anti-abuse: only safe relative hrefs; SEO delete must never delete target pages/entries.
- Secret handling: no media signed URLs, upload bytes, provider keys, or SEO secret-like values in prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - menu tree preserves unrelated items,
  - SEO mutation does not mutate page/entry target,
  - media reference uses existing media id only.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- changelog on completion
