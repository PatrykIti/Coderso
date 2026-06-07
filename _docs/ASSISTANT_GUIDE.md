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
- official assistant docs live in root `docs/guide`,
- official docs become available to runtime only after DB reindex/seeding,
- missing seeded DB corpus means assistant docs are `not ready`, not filesystem fallback.
- Docker startup normally seeds the `docs/guide` corpus once per image/docs fingerprint before serving traffic.
- `Settings -> Assistant -> Advanced` keeps a `Run support reindex` action for recovery, not routine configuration.
- reindex also prunes official assistant docs that were removed from the current `docs/guide` source tree, so stale DB-only records do not keep surfacing in answers.
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

## Reviewed LLM Guide Site Builder (Solution Kits)

Location: `Coderso -> Solution Kits`.

Current flow:
1. Review kit cards and selected-kit details as read-only baseline guidance.
2. Use `Open LLM Guide` to start the reviewed site-builder intake.
3. Complete the Basic or Advanced intake steps.
4. Confirm the final review summary and gates.
5. Run dry-run and execute through the standard assistant action engine.

## Execution model

- Planner endpoint (`POST /admin/api/assistant/actions/plan`) accepts stripped
  `context.siteBuilderIntakeState.activeSession` for reviewed site-builder work
  and rejects direct browser/admin `context.siteKit` payloads.
- A reviewed active session can produce:
  - typed plan output,
  - explicit action map (`step -> target -> resource`),
  - selected module sets (`required/recommended/optional`).
- Dry-run endpoint (`POST /admin/api/assistant/actions/dry-run`) previews `site-kit.*` changes.
- Execute endpoint (`POST /admin/api/assistant/actions/execute`) runs deterministic apply/dry-run through `site-kit.install`.
- Validation is returned in `results[].details.siteKit.validation`; explicit run validation is represented by `site-kit.validate`.
- Backend filters kit resource blueprint by `enabledStepIds` before install run.
- Legacy wizard run-management actions (`Rerun`, `Clone as draft`, rollback)
  are not part of the reviewed intake UI. Add a dedicated run-management surface
  only through a separate task with its own permission and warning contract.

## Security contract

- Visibility: internal (`/admin/api/*` only)
- Auth: admin session + RBAC (`settings:*`, `content:*`,
  `solution-kits:read` for reviewed site-builder planning/dry-run, and
  `solution-kits:write` when `site-kit.*` execute actions are present)
- Mutations: CSRF protected
- Rate limits:
  - `assistant` for `plan`, `dry-run`, and `execute`
- Safety: no raw prompt execution; typed `plan -> review -> execute` only
