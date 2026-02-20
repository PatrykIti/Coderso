# Assistant Guide

## AI Site Wizard (Solution Kits)

Location: `Coderso -> Solution Kits`.

Wizard flow:
1. `Business profile` - choose business type, locale, optional site name.
2. `Goals` - select at least one business goal.
3. `Recommendation` - generate and review deterministic kit recommendations.
4. `Plan review` - edit execution scope (`enabledStepIds`) before apply.
5. `Execute` - run guided `apply`/`dry_run`, then review validation checks and unresolved items.

## Execution model

- Planner endpoint (`POST /admin/api/assistant/site-builder/plan`) returns:
  - typed plan output,
  - explicit action map (`step -> target -> resource`),
  - selected module sets (`required/recommended/optional`).
- Execute endpoint (`POST /admin/api/assistant/site-builder/execute`) runs deterministic apply/dry-run.
- Validate endpoint (`POST /admin/api/assistant/site-builder/validate`) returns post-run checks and unresolved items.
- Backend filters kit resource blueprint by `enabledStepIds` before install run.
- Run metadata stores wizard snapshot in `run.options.assistantSiteBuilder`:
  - `selectedKitId`
  - `enabledStepIds`
  - `actions[]`

This metadata is used by UI actions:
- `Rerun` (replays last wizard plan)
- `Clone as draft` (restores review configuration)

## Security contract

- Visibility: internal (`/admin/api/*` only)
- Auth: admin session + RBAC (`solution-kits:read|write`)
- Mutations: CSRF protected
- Rate limits:
  - `admin_read` for `plan` and `validate`
  - `admin_write` for `execute`
- Safety: no raw prompt execution; typed `plan -> review -> execute` only
