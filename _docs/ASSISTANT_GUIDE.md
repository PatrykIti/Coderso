# Assistant Guide

## AI Site Wizard (Solution Kits)

Location: `Coderso -> Solution Kits`.

Wizard flow:
1. `Business profile` - choose business type, locale, optional site name.
2. `Goals` - select at least one business goal.
3. `Recommendation` - generate and review deterministic kit recommendations.
4. `Plan review` - edit execution scope (`enabledStepIds`) before apply.
5. `Execute` - run `apply`/`dry_run`, then rerun/rollback/clone from timeline.

## Execution model

- Planner endpoint (`POST /admin/api/solution-kits/plan`) is read-only and returns typed plan output.
- Apply endpoint (`POST /admin/api/solution-kits/:id/apply`) accepts optional `plan` payload.
- Backend filters kit resource blueprint by `plan.enabledStepIds` before install run.
- Run metadata stores wizard snapshot in `run.options.wizard`:
  - `enabledStepIds`
  - `settingsPatch`
  - `notes`

This metadata is used by UI actions:
- `Rerun` (replays last wizard plan)
- `Clone as draft` (restores review configuration)

## Security contract

- Visibility: internal (`/admin/api/*` only)
- Auth: admin session + RBAC (`solution-kits:read|write`)
- Mutations: CSRF protected, `admin_write` rate limit bucket
- Safety: no raw prompt execution; typed `plan -> review -> execute` only
