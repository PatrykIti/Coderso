# TASK-226-00: Exhaustive Nextless Occurrence Inventory and Scope Lock
# FileName: TASK-226-00_Exhaustive_Nextless_Occurrence_Inventory_and_Scope_Lock.md

**Priority:** High
**Category:** Branding + Repo Inventory + QA
**Estimated Effort:** Small
**Dependencies:** TASK-226
**Status:** To Do

---

## Overview

Block the Coderso rebrand until every case-insensitive `nextless` occurrence in
the repository is covered by the prepared inventory, classified, and assigned to
an implementation leaf or an explicit temporary allowlist.

The user-observed baseline before this task expansion was about 306 files and
640 findings. The prepared planning inventory now lives in
`TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md` and includes the current
post-planning scan baseline with every matched file classified by category,
owner leaf, and disposition. Counts can drift while this task family is being
edited because the planning docs themselves intentionally mention the legacy
name; implementation must update the inventory deltas, not rediscover the
scope.

This is a blocking scope-lock task. Do not start a rename wave from
TASK-226-01, TASK-226-02, or TASK-226-03 with an unowned row in the inventory.

## Sub-Tasks

- [ ] TASK-226-00-01: Rebrand Occurrence Coverage Table
- [ ] Re-run the full repository scan before implementation starts and compare
  it with TASK-226-00-01.
- [ ] Update only drifted/new inventory rows with category, owner, and
  disposition.
- [ ] Keep every file owned by a TASK-226 implementation leaf or by the final
  residual allowlist in TASK-226-03-02.
- [ ] Re-run the same scan after each implementation wave and update the
  remaining-count notes.

## Required Scan Commands

Use these commands as the baseline unless the implementation branch adds a
better generated/dependency exclusion list. If exclusions change, document the
reason beside the count.

```bash
rg -l -i "nextless" --glob '!node_modules/**' --glob '!core/node_modules/**' --glob '!dist/**' --glob '!core/dist/**' --glob '!coverage/**' --glob '!*.lockb' --glob '!bun.lock' --glob '!package-lock.json' --glob '!_docs/_TASKS/TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md' .
rg -n -i "nextless" --glob '!node_modules/**' --glob '!core/node_modules/**' --glob '!dist/**' --glob '!core/dist/**' --glob '!coverage/**' --glob '!*.lockb' --glob '!bun.lock' --glob '!package-lock.json' --glob '!_docs/_TASKS/TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md' .
rg --count-matches -i "nextless" --glob '!node_modules/**' --glob '!core/node_modules/**' --glob '!dist/**' --glob '!core/dist/**' --glob '!coverage/**' --glob '!*.lockb' --glob '!bun.lock' --glob '!package-lock.json' --glob '!_docs/_TASKS/TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md' .
```

## Coverage Categories

| Category | Examples / prefixes | Default disposition | Owner |
|----------|---------------------|---------------------|-------|
| Product and package identity | `package.json`, `core/package.json`, `store/package.json`, `.env.example`, `Dockerfile`, `README.md`, `docs/**`, `core/admin/index.html` | Rename to Coderso or document a package-scope compatibility bridge. | TASK-226-01-01 |
| Runtime defaults and integration metadata | `core/services/settings/**`, `core/services/email/**`, `core/services/forms/**`, `core/services/webhooks/**`, import/export defaults | Rename visible product values; preserve signed/webhook compatibility through explicit legacy aliases. | TASK-226-01-01 |
| Browser persistence and DOM identifiers | `core/admin/app/AdminApp.tsx`, `core/admin/ui/**`, `core/widgets/core/**`, `data-nextless-*`, `__nextless*`, `nextless.*` storage keys | Write new Coderso keys/ids and read legacy keys through a documented migration path. | TASK-226-01-01 / TASK-226-01-02 |
| Admin visible copy and starter content | auth, setup, settings, page editor, widget defaults, assistant copy | Rename to Coderso unless the text describes the Advanced module group. | TASK-226-01-02 |
| Advanced IA and route namespace | `core/admin/ui/navigation/**`, `core/admin/utils/adminPaths.ts`, `core/admin/utils/adminPrefetch.ts`, admin route tests | Convert IA-owned Coderso group/paths to Advanced; keep `/admin/coderso/*` only as aliases. | TASK-226-02-* |
| Assistant context and schemas | `core/admin/ui/assistant/**`, `core/services/assistant/**`, `core/server/validation/assistantActionSchemas.ts` | Use Advanced module fields in the canonical schema; accept legacy fields only through a strict adapter. | TASK-226-02-03 |
| Tests and fixtures | `tests/**`, fixture domains, temp paths, package names, selectors | Update expected product copy/routes/selectors; retain legacy assertions only where compatibility is required. | TASK-226-03-01 |
| Source docs and prototypes | `_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`, `_docs/UI/**`, `_docs/_WIDGETS/**`, `docs/**` | Refresh docs/prototypes to Coderso and Advanced. Historical examples need an explicit policy, not silent leftovers. | TASK-226-03-02 |
| Changelog and historical task evidence | `_docs/_CHANGELOG/**`, older `_docs/_TASKS/**`, replay summaries, old command output | Rewrite product-facing docs when practical; otherwise list as historical with owner, reason, and removal condition. | TASK-226-03-02 |
| TASK-226 planning docs | `_docs/_TASKS/TASK-226*.md` | These docs may mention `Nextless` while the task is open; final closure must either neutralize them or exclude them explicitly from the residual scan evidence. | TASK-226-03-02 |

## Prepared Inventory

The coverage table is already prepared in
`TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md`. It includes:

| Column | Requirement |
|--------|-------------|
| File | Repository-relative path. |
| Line | Exact line number from the current checkout scan. |
| Match | The matched token or short context, such as `Nextless`, `nextless.adminThemeTokens`, `X-Nextless-*`, or `data-nextless-*`. |
| Classification | One of the coverage categories above. |
| Owner | Exact TASK-226 leaf that will update or validate the row. |
| Disposition | `rename`, `compat-read`, `compat-alias`, `test-legacy-assertion`, `historical-allowlist`, or `remove`. |
| Notes | Migration detail, downstream compatibility risk, or allowlist removal condition. |

## Security Contract

- Visibility: repository inventory only; no runtime endpoint is introduced.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: the inventory must flag schema/API occurrences
  where a rename could accidentally loosen strict validation.
- Anti-abuse:
  - do not treat signed webhook headers, browser storage keys, debug payloads, or
    public DOM selectors as blind text replacement targets,
  - every legacy compatibility entry must have an owner and removal condition,
  - the scan output must not include secrets from `.env`; use `.env.example`
    only.

## Testing Requirements

- `git diff --check`
- Full `rg` file-count, line-level, and per-file count commands from this task.
- Verify the inventory table row count covers every current scan match or
  explicitly explains grouped rows.
- Verify `_docs/_TASKS/README.md` statistics match row counts after adding this
  task.

## Documentation Updates Required

- `TASK-226_Coderso_Rebrand_and_Advanced_Admin_IA.md`
- `TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md`
- `TASK-226-01_Product_Brand_Rename_Inventory.md`
- `TASK-226-03-02_Source_Docs_Changelog_Board_and_Residual_Inventory_Closure.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Current scan command, timestamp, file count, and match count are recorded in
   TASK-226-00-01.
2. Every `nextless` match from the current scan is covered by a table row or by
   an explicitly documented grouped row.
3. Every row has a category, owner task, and disposition.
4. No implementation task starts with an unexplained `Nextless`/`nextless`
   occurrence outside the scope lock.
5. Final TASK-226 closure can prove zero unexplained residual matches across
   source, tests, docs, changelog, and task files.
