# TASK-170-03-02-04: Menu, SEO, and Media Adapters Docs, Tests, and Closure
# FileName: TASK-170-03-02-04_Menu_SEO_Media_Adapters_Docs_Tests_and_Closure.md

**Priority:** High  
**Category:** QA/Assistant + Docs  
**Estimated Effort:** Small  
**Dependencies:** TASK-170-03-02-01, TASK-170-03-02-02, TASK-170-03-02-03  
**Status:** Done (2026-04-12)

---

## Overview

Close the menu/SEO/media adapter wave with docs, route/security notes, task board sync, and changelog.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
assertExecutable("menu.item.upsert");
assertExecutable("seo.document.upsert");
assertExecutable("media.reference.attach");
assertContractOnly("menu.structure.patch");
```

## Files to Change

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog file for `TASK-170-03-02`

## Security Contract

- Visibility: docs/QA closure for internal assistant action endpoints.
- Auth model: admin session.
- RBAC: docs must match menu/SEO/media action permissions.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: docs must describe unsupported fields/target types.
- Anti-abuse: no public write endpoint.
- Idempotency: docs mention no-duplicate upsert behavior.
- Secret handling: docs mention redacted preview/result metadata.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest/Bun targeted suites from the implemented adapter leaves.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-task-170-03-02-menu-seo-media-adapters.md`

## Acceptance Criteria

1. Docs match implemented menu/SEO/media behavior.
2. Task board and changelog are synchronized.
3. `TASK-170-03-02` can be marked Done.

## Completion Notes (2026-04-12)

- Synced architecture, CMS API, and security docs for executable menu, SEO, and entry media-reference actions.
- Synced task board and changelog entries for the menu/SEO/media adapter wave.
- Left `menu.structure.patch` as contract-only for a later implementation slice.
