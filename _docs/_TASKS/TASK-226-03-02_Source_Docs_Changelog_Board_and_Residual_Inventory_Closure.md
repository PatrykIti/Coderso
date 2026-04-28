# TASK-226-03-02: Source Docs, Changelog, Board, and Residual Inventory Closure
# FileName: TASK-226-03-02_Source_Docs_Changelog_Board_and_Residual_Inventory_Closure.md

**Priority:** Medium
**Category:** Docs + Changelog + Task Board
**Estimated Effort:** Small
**Dependencies:** TASK-226-03-01
**Status:** To Do

---

## Overview

Close the task family after implementation and validation. This leaf owns final
source-of-truth docs, changelog entry, task statuses, board statistics, and the
residual inventory of intentional legacy names/paths.

This leaf must close the full repo-wide inventory from
`TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md`. It is not enough to
update the primary source files only. Docs, changelogs, older task evidence,
prototypes, fixtures, package metadata, tests, browser persistence keys, public
selectors, and compatibility headers must all be either renamed, migrated, or
listed in the residual allowlist.

## Sub-Tasks

- [ ] Update product docs to describe `Coderso - The modular CMS platform`.
- [ ] Update Advanced IA docs and route alias docs.
- [ ] Update cache, assistant, security, and widget docs.
- [ ] Add numbered changelog entry for `TASK-226`.
- [ ] Update `_docs/_CHANGELOG/README.md`.
- [ ] Move all `TASK-226*` files to Done with dates after validation passes.
- [ ] Move `TASK-226*` rows from To Do to Done in `_docs/_TASKS/README.md`.
- [ ] Reconcile the final full repo scan against the TASK-226-00 inventory.
- [ ] Attach residual scan evidence and allowlist only intentional compatibility
  or historical terms.

## Files to Change

| File | Required change |
|------|-----------------|
| `_docs/ADMIN_NAVIGATION.md` | Coderso product + Advanced group + legacy route alias contract. |
| `_docs/ARCHITECTURE.md` | Product name, Advanced IA, route/prefetch/assistant architecture. |
| `_docs/CMS_API.md` | Default examples, assistant context examples, webhook/header docs. |
| `_docs/CODERSO_MODULES.md` or renamed equivalent | Advanced module catalog with Coderso product context. |
| `_docs/ADMIN_CACHE.md` | Canonical Advanced prefetch paths and legacy alias proof. |
| `_docs/ADMIN_CACHE_MAP.md` | Route-to-cache map updated to Advanced. |
| `_docs/ASSISTANT_SITE_BUILDER.md` | Product/IA wording updated. |
| `_docs/ASSISTANT_GUIDE.md` | Assistant location/breadcrumb wording updated. |
| `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` | Route matrix updated to Advanced routes. |
| `_docs/SECURITY_SPEC.md` | Coderso webhook headers and legacy Nextless compatibility. |
| `_docs/TESTING_STRATEGY.md` | Product intro updated. |
| `_docs/WIDGETS.md` | Advanced/Widgets surface wording updated. |
| `_docs/_CHANGELOG/{N}-2026-04-27-task-226-coderso-rebrand-advanced-ia.md` | Final changelog with tests and residual notes. |
| `_docs/_CHANGELOG/README.md` | Add new changelog row. |
| `_docs/_TASKS/TASK-226*.md` | Final status/date/progress notes. |
| `_docs/_TASKS/README.md` | Move rows and update counts. |
| `TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md` | Final owner/disposition status for every original scan row. |

## Security Contract

- Visibility: documentation and release audit trail.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: docs must match the actual strict schema behavior.
- Anti-abuse:
  - residual allowlist must not include secrets,
  - compatibility terms must have an owner and removal condition,
  - changelog must not claim skipped live or DB tests as passed.

## Residual Allowlist Template

```md
| Pattern | File(s) | Owner | Reason | Removal condition |
|---------|---------|-------|--------|-------------------|
| `X-Nextless-*` | `core/services/webhooks/deliveryService.ts`, `_docs/SECURITY_SPEC.md` | TASK-226-01-01 | Legacy webhook consumer compatibility | Remove after documented deprecation window. |
| `nextless.*` storage keys | `core/admin/*`, `_docs/*` | TASK-226-01-01 | Legacy localStorage migration read path | Remove after one major release with migration telemetry/no rollback need. |
| Historical `Nextless` evidence | `_docs/_CHANGELOG/**`, older `_docs/_TASKS/**` | TASK-226-03-02 | Historical audit trail that must remain immutable or intentionally traceable | Remove only if project policy allows rewriting historical evidence. |
```

## Closure Scan Contract

The final closure must report three numbers:

| Count | Requirement |
|-------|-------------|
| Initial baseline | File count and match count from TASK-226-00 before implementation. |
| Final raw scan | File count and match count from the same scan command after implementation. |
| Explained residuals | Count of residual matches covered by the allowlist with owner and removal condition. |

Final acceptance requires:

- no unassigned rows left in `TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md`,
- no source/test/docs matches outside the residual allowlist,
- no product-facing docs or prototypes still saying `Nextless` unless the row is
  explicitly historical,
- no `Coderso` IA group usage where the intended label is `Advanced`,
- no `/admin/coderso/*` canonical route usage outside alias tests/docs.

## Testing Requirements

- `git diff --check`
- Re-run the full TASK-226-00 residual scans with the same exclusions, including
  the inventory-file self-exclusion, and record initial/final/explained-residual
  counts.
- Verify `_docs/_TASKS/README.md` statistics match row counts.
- Verify `_docs/_CHANGELOG/README.md` numbering.

## Documentation Updates Required

- This leaf owns final documentation updates.

## Acceptance Criteria

1. Docs describe Coderso as product and Advanced as module group.
2. Changelog lists exact validation commands and residual compatibility notes.
3. Task board and task files are synchronized.
4. Residual scans have no unexplained `Nextless`, `nextless`, `Coderso` group,
   `codersoModule`, or `/coderso/*` matches.
5. Every original TASK-226-00 inventory row is closed as renamed, migrated,
   tested legacy compatibility, or documented historical allowlist.
