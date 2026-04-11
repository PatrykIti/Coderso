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
- long messages stay inside the panel, wrap horizontally, and scroll vertically without covering the composer/send row.
- the user can slightly widen the conversation window, but only within safe viewport limits.

Global assistant configuration remains on `Settings -> Assistant`.
The conversation window does not expose global assistant settings actions.

Knowledge source contract:
- official assistant docs live in root `docs/`,
- official docs become available to runtime only after DB reindex/seeding,
- missing seeded DB corpus means assistant docs are `not ready`, not filesystem fallback.
- `Settings -> Assistant` exposes the operational `Run reindex` action for seeding the corpus into DB.
- reindex also prunes official assistant docs that were removed from the current `docs/` source tree, so stale DB-only records do not keep surfacing in answers.
- legacy `_docs/filesystem` assistant docs mode is no longer an active supported runtime path.

Answer contract:
- assistant returns a product-facing answer built from article content,
- not a list of document locations,
- final answer is built from chunk content, not from the shorter preview snippet used for retrieval/evidence,
- docs answers support explicit depth levels: `basic`, `medium`, `instruction`, `advanced`,
- docs answers support helper guide modes: `troubleshooting`, `decision_guide`, `checklist`, `security`,
- retrieval is intent-aware and prefers exact product/module signals from document metadata (`productArea`, title, keywords) over semantically similar hits from a different area,
- confidence drops when the top hit lacks a strong aligned domain signal or is only marginally better than the next candidate,
- assistant first chooses the most likely document/surface and then the most useful section inside it (`Step By Step`, `What Is It`, `When To Use`) instead of blindly echoing the highest-overlap section,
- the `surface` label shown to the user comes from the canonical document title, not from the chosen section heading,
- procedural `how/use` questions prefer `Step By Step` guidance, while `What Is It` / `When To Use` act as optional supporting context,
- assistant can return follow-up options that move the same topic into deeper or mode-specific guidance (for example `More detail`, `Step-by-step`, `Troubleshooting`),
- when a canonical doc already has a dedicated helper section (`Troubleshooting`, `Decision Guide`, `Checklist`, `Security`), that section should become the primary follow-up body instead of being mixed with redundant default guidance,
- when the docs still point to multiple plausible areas, assistant returns a short clarifying question instead of a high-confidence wrong answer,
- docs-only answers preserve paragraphs and numbered steps so the chat UI can render a readable structure instead of one merged text block,
- sources are treated as secondary evidence and are not shown by default in the user-facing chat UI.

## AI Site Wizard (Solution Kits)

Location: `Coderso -> Solution Kits`.

Wizard flow:
1. `Business profile` - choose business type, locale, optional site name.
2. `Goals` - select at least one business goal.
3. `Recommendation` - generate and review deterministic kit recommendations.
4. `Plan review` - edit execution scope (`enabledStepIds`) before apply.
5. `Execute` - run guided `apply`/`dry_run`, then review validation checks and unresolved items.

## Execution model

- Planner endpoint (`POST /admin/api/assistant/actions/plan`) with `context.siteKit` returns:
  - typed plan output,
  - explicit action map (`step -> target -> resource`),
  - selected module sets (`required/recommended/optional`).
- Dry-run endpoint (`POST /admin/api/assistant/actions/dry-run`) previews `site-kit.*` changes.
- Execute endpoint (`POST /admin/api/assistant/actions/execute`) runs deterministic apply/dry-run through `site-kit.install`.
- Validation is returned in `results[].details.siteKit.validation`; explicit run validation is represented by `site-kit.validate`.
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
- Auth: admin session + RBAC (`settings:*`, `content:*`, and `solution-kits:read|write` when `site-kit.*` actions are present)
- Mutations: CSRF protected
- Rate limits:
  - `assistant` for `plan`, `dry-run`, and `execute`
- Safety: no raw prompt execution; typed `plan -> review -> execute` only
