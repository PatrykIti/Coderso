# Assistant Guide

## Floating Assistant Launcher

Location: floating launcher inside admin UI.

Primary purpose:
- conversation-first access to documentation lookup,
- not a full assistant settings screen.

Launcher contract:
- no textual `Assistant` button in the topbar,
- floating message-bubble launcher rendered only when global assistant settings enable it,
- launcher can be repositioned by the user so it does not obscure the current view,
- when launcher avatar is configured in `Settings -> Assistant`, the launcher uses the avatar surface instead of the default message bubble.
- launcher has a visible idle state and a stronger highlighted active state; it should not require hover to reveal its primary affordance.

Conversation window states:
1. `Loading` - runtime shell only, without prompt chips or composer.
2. `Ready` - transcript, starter prompts, and composer.
3. `Docs not ready` - minimalist runtime status copy inside the conversation surface.
4. `Disabled` / `Error` - clear blocking message instead of partial chat UI.

Window behavior:
- the conversation window is anchored to the launcher and visually emerges from it,
- it is not a full-height right-side modal/sheet,
- clicking outside or pressing `Escape` closes the window.

Global assistant configuration remains on `Settings -> Assistant`.
The conversation window does not expose global assistant settings actions.

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
