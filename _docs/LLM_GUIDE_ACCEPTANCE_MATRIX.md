# LLM Guide Acceptance Matrix

**Status:** Active  
**Last Updated:** 2026-04-12  
**Related Tasks:** TASK-101-09, TASK-170, TASK-171, TASK-172, TASK-173, TASK-173-01, TASK-173-06

---

## Scope

This matrix records the declared `LLM Guide` capability set and the validation lane that owns each contract.

Rules:
- `docs-only` remains read-only and never returns executable action plans.
- `LLM Guide` can only execute strict typed actions through `/assistant/actions/*`.
- Provider draft planning is helper-only in this wave; live route/provider wiring remains opt-in future work.
- Gated packs must return typed `needs_input` plans and must not create resources.
- Docs/corpus pages must describe the supported and gated capability set without implying broad assistant autonomy.

---

## Lane Ownership

| Area | Owner Lane | Reason |
|---|---|---|
| Prompt classification and blueprint plan shape | Vitest | Pure planner/blueprint logic |
| Provider draft packaging and repair | Vitest | Pure provider adapter and redaction logic; fake providers only |
| Assistant review UI | Vitest | Admin React/UI behavior |
| Route permissions and route error mapping | Bun | Route contract and `ApiError` mapping |
| Executor adapters with domain service deps | Bun | Runtime/service orchestration and idempotency behavior |
| DB-backed idempotency and public runtime | Bun | DB/runtime behavior |

---

## Supported Executable Actions

| Action Type | Plan Schema | Dry Run | Execute | Route Permissions | Notes |
|---|---|---|---|---|---|
| `content-type.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + DB smoke | `content:read/write` | Existing catalog action |
| `custom-screen.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + DB smoke | `content:read/write` | Existing catalog action |
| `custom-screen.delete` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Deletes catalog-resolved custom screens after review |
| `listing-query.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + DB smoke | `content:read/write` | Existing catalog action |
| `listing-template.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + DB smoke | `content:read/write` | Existing catalog action |
| `page.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + public runtime smoke | `content:read/write/publish` | Supports catalog and simple block-backed page mode |
| `form.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor | `forms:read/write` through per-action permissions when applicable | Public submissions use existing Forms runtime hardening |
| `entry.upsert-draft` | Vitest `action-plan-schema` | Bun executor | Bun executor | `content:read/write` | Draft-only; no publish behavior |
| `menu.item.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor | `menus:read/write` | Safe relative hrefs only |
| `seo.document.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor | `content:read/write` | Explicit `page` / `entry` targets |
| `media.reference.attach` | Vitest `action-plan-schema` | Bun executor | Bun executor | `media:read` + `content:write` | Existing media ids only, entry targets only |
| `listing-query.filters.patch` | Vitest `action-plan-schema` | Bun executor | Bun executor | `content:read/write` | Patches `query.filters` only |
| `listing-template.card.patch` | Vitest `action-plan-schema` | Bun executor | Bun executor | `content:read/write` | Patches `config.card` only |
| `page.widget.patch` | Vitest `action-plan-schema` | Bun executor | Bun executor | `content:read/write` | Top-level `upsert-block` only |
| `form.automation.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor | `forms:read/write` | Safe non-webhook actions only |
| `site-kit.recommend/install/validate` | Vitest + Bun | Bun executor | Bun executor | `solution-kits:read/write` + LLM availability gate | Existing unified site-kit action flow |

---

## Business Blueprint Packs

| Pack | Status | Plan Coverage | Execute Coverage | Runtime Coverage | Notes |
|---|---|---|---|---|---|
| House Projects Catalog | Executable | Vitest planner/catalog blueprint | Bun executor + DB idempotency | Bun public runtime test | Baseline full-stack pack |
| Product Catalog | Executable | Vitest planner/catalog blueprint | Bun executor | Covered by catalog-family executor smoke | No checkout |
| Product Inquiry Catalog | Executable | Vitest planner/catalog blueprint | Bun executor | No dedicated public runtime test yet | Adds public inquiry form |
| Portfolio Case Study | Executable | Vitest planner/catalog blueprint | Catalog-family executor path | No dedicated public runtime test yet | Adds result/testimonial fields |
| Services Directory | Executable | Vitest planner/catalog blueprint | Catalog-family executor path | No dedicated public runtime test yet | Existing generic catalog pack |
| Lead Capture Site | Executable | Vitest planner/blueprint | Bun executor | No dedicated public runtime test yet | Form runtime hardening remains existing Forms contract |
| Editorial Content Hub | Executable | Vitest planner/blueprint | Bun executor | No dedicated public runtime test yet | Uses `posts-feed`; no post mutation |
| Booking Service Business | Gated | Vitest `needs_input` | Not applicable | Not applicable | Requires booking action adapters |
| Product Checkout/Payment | Gated | Vitest `needs_input` | Not applicable | Not applicable | Requires commerce/payment adapters |
| Solution Kit Refinement | Gated | Docs/task audit | Not applicable | Not applicable | Requires server-derived installed-kit context |

---

## Negative Contracts

| Contract | Current Coverage | Lane |
|---|---|---|
| `docs-only` mutation prompts remain read-only | `tests/unit/assistant/assistantService.test.ts` | Bun |
| Unknown action type is rejected as `assistant_action_plan_invalid` | `tests/integration/routes/assistant.test.ts` | Bun |
| Client-supplied resource catalog context is rejected | `tests/integration/routes/assistant.test.ts` | Bun |
| Per-action dry-run/execute permissions are requested | `tests/integration/routes/assistant.test.ts` | Bun |
| Provider unsafe draft actions recover to `needs_input` | `tests/vitest/assistant/provider-planner-fixtures.test.ts` | Vitest |
| Provider prompt package redacts secrets | `tests/vitest/assistant/provider-planning-context.test.ts` and `assistantRedaction.test.ts` | Vitest |
| Preview metadata redacts secret-like fragments | `tests/vitest/assistant/action-diff-service.test.ts` | Vitest |

---

## Known Gaps

These are intentional follow-up capabilities, not current production claims:
- Webhook form automation through `form.automation.upsert`.
- Nested/slot page widget patches.
- `menu.structure.patch`.
- `entry.sample.create`, `entry.bulk-draft.create`, and `entry.field.patch`.
- Booking resource/schedule/reservation assistant actions.
- Checkout/payment assistant actions.
- Solution-kit refinement from server-derived installed-kit resource context.
- Dedicated public runtime acceptance tests for every non-house catalog pack.
