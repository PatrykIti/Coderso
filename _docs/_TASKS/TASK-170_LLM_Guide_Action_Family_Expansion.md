# TASK-170: LLM Guide Action Family Expansion
# FileName: TASK-170_LLM_Guide_Action_Family_Expansion.md

**Priority:** High  
**Category:** Core/Assistant + Core/Services + Admin Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09  
**Status:** In Progress (2026-04-12)

---

## Overview

`TASK-101-09` zamknal bezpieczny fundament asystenta:
- `docs-only` jest read-only,
- `llm-guide` jest canonical planning mode,
- `/assistant/actions/*` jest jedynym mutation flow,
- planner, strict schema, registry, dry-run, execute, persistent idempotency i pierwsze katalogowe akcje sa gotowe.

Ten umbrella task opisuje kolejna warstwe produktu: rozszerzenie typed action engine o nowe action families dla realnych obszarow CMS. Nie chodzi o dodanie arbitralnej autonomii LLM, tylko o kolejne whitelistowane, schema-first akcje, ktore dalej przechodza przez `plan -> dry-run -> confirm -> execute` i wykorzystuja istniejace serwisy domenowe.

## Goal

Po tej fali `LLM Guide` powinien moc planowac i wykonywac wiecej bezpiecznych zmian administracyjnych niz obecny katalog/site-kit slice, bez tworzenia rownoleglych write paths.

Docelowy rezultat:
- action families sa jawnie zarejestrowane w `core/services/assistant/actionRegistry.ts`,
- kazda akcja ma strict schema i normalizacje w owner module,
- dry-run pokazuje stabilne `changes[]`, `dependencies[]`, `conflicts[]` i warnings,
- execute deleguje do istniejacych serwisow domenowych,
- UI pokazuje plan i rezultat w istniejacym review/confirm flow,
- testy utrzymuja lane split: Vitest dla pure contract/registry/diff, Bun dla route/DB/runtime wykonania.

## Target Capability Areas

Kandydaci do rozpisania na pozniejsze subtaski:
- `entry.*` actions for safe entry scaffolding, sample content, draft updates, and non-destructive bulk setup.
- `menu.*` actions for navigation creation/update through existing menu services.
- `seo.*` actions for metadata setup through existing SEO/settings surfaces.
- `media.*` actions for reference/linking workflows without exposing raw uploads or secrets.
- `form.*` expansion for automations, confirmation copy, and internal/public access hardening.
- `page.*` expansion for additional widget composition patterns beyond the current catalog blocks.
- `listing.*` expansion for fields, filters, card layouts, and existing resource refinement.
- Optional business-domain actions for booking/commerce only after their service contracts are audited.

## Architecture

The new actions must extend the current owner modules instead of creating a second assistant stack:
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionDiffService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/server/routes/assistantRoutes.ts`
- `core/admin/services/assistantClient.ts`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`

Rules:
- route modules stay orchestration-only,
- action input is schema-first and reject-unknown,
- no assistant-only direct DB mutators when a domain service exists,
- no production fallback only to satisfy tests,
- no public write endpoint unless a separate task explicitly justifies it with nonce/HMAC/captcha hardening.

## Pseudocode

```ts
for (const plannedFamily of selectedActionFamilies) {
  const contract = defineStrictActionContract(plannedFamily);
  registerAssistantActionHandler(contract.type, {
    preview: (input) => previewThroughDomainService(contract, input),
    execute: (input, actor) => executeThroughDomainService(contract, input, actor),
  });
}
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionDiffService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/server/routes/assistantRoutes.ts`
- `core/admin/services/assistantClient.ts`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- relevant domain services selected by leaf contracts

## Security Contract

- Visibility: internal only under existing `/admin/api/assistant/actions/*`.
- New public endpoints: none for this umbrella scope.
- Auth model: existing admin session.
- RBAC:
  - `plan` and `dry-run` keep `settings:read` + relevant resource read permissions,
  - `execute` keeps `settings:write` + relevant resource write/publish permissions,
  - new action families must declare additional required permissions in route/domain checks, not only registry metadata.
- CSRF: required for all `POST /assistant/actions/*` calls.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: every new action input must be covered by strict plan schema and per-action normalizers.
- Anti-abuse:
  - no nonce/HMAC/reCAPTCHA because this task keeps endpoints internal-only,
  - if a future leaf adds public writes, it must define nonce + signature/HMAC and optional reCAPTCHA policy in its own Security Contract.
- Idempotency: `execute` continues to require persistent idempotency scoped by actor, plan id, and plan hash.
- Secret handling: action previews, audit metadata, idempotency payloads, and admin UI responses must not include secrets, provider keys, cookies, CSRF tokens, raw session data, raw form submissions, or secret-like settings.

## Sub-Tasks

- `TASK-170-01_Action_Family_Contract_and_Permission_Model.md`
  - `TASK-170-01-01_Entry_Action_Contracts.md`
  - `TASK-170-01-02_Menu_SEO_Media_Action_Contracts.md`
  - `TASK-170-01-03_Form_Page_Listing_Expansion_Contracts.md`
- `TASK-170-02_Registry_Diff_and_Preview_Metadata_Expansion.md`
- `TASK-170-03_Executor_Adapters_and_Domain_Service_Reuse.md`
- `TASK-170-04_Admin_Review_UI_for_Expanded_Actions.md`
- `TASK-170-05_Route_Security_Tests_Docs_and_Closure.md`

## Implementation Order

1. Freeze action contracts and permission model in `TASK-170-01`.
2. Add preview/registry metadata in `TASK-170-02`.
3. Implement executor adapters through existing domain services in `TASK-170-03`.
4. Update review/result UI in `TASK-170-04`.
5. Close with route security, docs, changelog, and validation in `TASK-170-05`.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - action schema/normalizer coverage,
  - registry coverage,
  - diff/conflict/dependency helper coverage,
  - assistant panel/client coverage for new review output when UI shape changes.
- Bun:
  - route validation/error mapping for every new route payload shape,
  - executor tests for DB/runtime-coupled actions,
  - DB-backed replay/conflict tests when action result shapes change persisted idempotency payloads.
- DB tests must load `.env` first when `DATABASE_URL` is required.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md` if site-kit or guided setup action families are extended
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry when each implementation task is completed

## Progress Notes

- 2026-04-12: Completed `TASK-170-01` contract slice with a non-executable action family contract registry for entry, menu, SEO, media, form automation, page widget patch, and listing patch actions.
- 2026-04-12: Completed `TASK-170-02` preview metadata slice with redacted preview strings and contract-only conflict/dependency metadata helpers.
- 2026-04-12: Completed first executor adapter leaf; `entry.upsert-draft` is now executable and remains draft-only.
- 2026-04-12: Completed menu item executor leaf; `menu.item.upsert` now executes through existing menu services and rejects unsafe hrefs.
- 2026-04-12: Completed SEO document executor leaf; `seo.document.upsert` now executes through existing SEO services for page/entry targets.
- 2026-04-12: Completed media reference executor leaf; `media.reference.attach` now attaches existing media to entry targets through existing services.
- 2026-04-12: Completed listing query filter patch leaf; `listing-query.filters.patch` now updates existing query filters without rewriting unrelated query config.
- 2026-04-12: Completed listing template card patch leaf; `listing-template.card.patch` now updates template card config without rewriting unrelated config.
- 2026-04-12: Completed page widget patch leaf; `page.widget.patch` now upserts one top-level widget block with widget validation.
- 2026-04-12: Completed form automation patch leaf; `form.automation.upsert` now upserts safe non-webhook form actions through existing services.
