# LLM Guide Acceptance Matrix

**Status:** Active
**Last Updated:** 2026-05-06
**Related Tasks:** TASK-101-09, TASK-170, TASK-171, TASK-172, TASK-173, TASK-173-01, TASK-173-06, TASK-174, TASK-174-05, TASK-174-07, TASK-178, TASK-178-01, TASK-178-02, TASK-178-03, TASK-178-03-01, TASK-178-03-02, TASK-178-03-03, TASK-178-03-04, TASK-178-05, TASK-178-07-01, TASK-178-07-02, TASK-180, TASK-184, TASK-188, TASK-190

---

## Scope

This matrix records the declared `LLM Guide` capability set and the validation lane that owns each contract.

Rules:
- `docs-only` remains read-only and never returns executable action plans.
- `LLM Guide` can only execute strict typed actions through `/assistant/actions/*`.
- Provider/model planning runs through the same `/assistant/actions/plan` route when configured; provider output remains untrusted, operation-draft-only, and must pass strict local policy validation before any reviewable plan is returned.
- Gated packs must return typed `needs_input` plans and must not create resources.
- Docs/corpus pages must describe the supported and gated capability set without implying broad assistant autonomy.

---

## Lane Ownership

| Area | Owner Lane | Reason |
|---|---|---|
| Prompt classification and blueprint plan shape | Vitest | Pure planner/blueprint logic |
| Generic CMS operation draft and target resolution | Vitest | Pure operation draft schema, policy aliases, and target resolver |
| Surface hints and CMS filters | Vitest + Bun live smoke | Draft schema + provider guidance + policy-driven resolver filters for custom screens/pages/forms plus live natural prompts |
| Read-only CMS inspection plans | Vitest | Strict plan schema + admin review UI; no executor path |
| LLM Guide mode route contract | Vitest | UI sends LLM Guide prompts to action planning; docs-only stays on chat |
| Provider CMS operation draft package | Vitest | Fake-provider context coverage with strict operation-draft-only validation |
| Planner response kinds | Vitest | Strict `responseKind` schema + UI behavior for docs/inspection/action/needs-input |
| Generic CMS operation-to-action mapping | Vitest + Bun smoke | Pure mapper coverage plus executor/route smoke through existing typed actions |
| Policy-driven action mapping and safety | Vitest | Generic mapper and provider post-validation guards use action/field/destructive policy metadata |
| Policy engine cutover | Vitest + Bun live smoke | Legacy CMS registry, provider action-array adaptation, and duplicated provider guard lists are removed; remaining orchestration uses policy helpers |
| TASK-189 policy remediation | Vitest + Bun live smoke | Provider `actions[]` are rejected, shared-kind policy resources keep exact identity, and provider-side local-first CMS/admin branches are removed |
| TASK-188 closure | Vitest + Bun live smoke | Final policy cutover validation keeps targeted assistant suites and OpenAI/OpenRouter live matrix green |
| Counted multi-target CMS planning | Vitest | Resolver/mapper coverage for delete/archive/update plus explicit multi-create boundaries |
| Assistant execution cache invalidation | Vitest | Admin client maps successful typed action results to known cache keys; failed/noop results do not broadcast |
| Assistant operation policy metadata | Vitest | Policy schema, lookup, route matrix, gated/read-only state, and redaction metadata coverage |
| Provider guidance from operation policy | Vitest | Provider registry/guidance and CMS operation draft JSON schema enums are derived from `assistantOperationPolicy` |
| OpenRouter live planner smoke | Bun integration opt-in | Uses only `TEST_OPENROUTER_API_KEY` and `TEST_OPENROUTER_MODEL`; skipped when missing |
| Model capability structured output strategy | Vitest + Bun live smoke | Provider/model family resolves generic `cms_operation_draft` response contract for OpenRouter and OpenAI adapters |
| Full Admin UI live coverage matrix | Bun integration opt-in | `tests/integration/assistant-live/*` uses `.env` provider vars plus disposable DB fixtures; coverage map lives in `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` |
| Provider operation draft packaging and rejection | Vitest | Provider prompt package, operation-draft schema, exact policy identity, and provider action-array rejection; fake providers only |
| Assistant review UI | Vitest | Admin React/UI behavior |
| Route permissions and route error mapping | Bun | Route contract and `ApiError` mapping |
| Executor adapters with domain service deps | Bun | Runtime/service orchestration and idempotency behavior |
| DB-backed idempotency and public runtime | Bun | DB/runtime behavior |

---

## Supported Executable Actions

| Action Type | Plan Schema | Dry Run | Execute | Route Permissions | Notes |
|---|---|---|---|---|---|
| `content-type.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + DB smoke | `content:read/write` | Existing catalog action |
| `content-type.delete` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Deletes exact zero-entry content types after review |
| `custom-screen.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + DB smoke | `content:read/write` | Existing catalog action |
| `custom-screen.delete` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Deletes catalog-resolved custom screens after review |
| `custom-screen.update` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Edits active custom screen metadata/sidebar/binding mode |
| `custom-screen.widget.patch` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Patches selected custom screen widget block data paths |
| `listing-query.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + DB smoke | `content:read/write` | Existing catalog action |
| `listing-query.delete` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Deletes exact unreferenced listing queries after review |
| `listing-query.update` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Updates listing query metadata and bounded runtime settings |
| `listing-template.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + DB smoke | `content:read/write` | Existing catalog action |
| `listing-template.delete` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Deletes exact unreferenced listing templates after review |
| `listing-template.update` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Updates listing template metadata/layout/card config |
| `page.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor + public runtime smoke | `content:read/write/publish` | Supports catalog and simple block-backed page mode |
| `form.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor | `forms:read/write` through per-action permissions when applicable | Public submissions use existing Forms runtime hardening |
| `form.delete` | Vitest planner/schema | Bun executor | Bun executor + DB service count | `forms:read/write` | Deletes exact zero-submission forms after review |
| `form.archive` | Vitest planner/schema | Bun executor | Bun executor + DB service count | `forms:read/write` | Archives exact forms while retaining submission history |
| `form.update` | Vitest planner/schema | Bun executor | Bun executor | `forms:read/write` | Updates form metadata/status/access without reading submissions |
| `entry.upsert-draft` | Vitest `action-plan-schema` | Bun executor | Bun executor | `content:read/write` | Draft-only; no publish behavior |
| `entry.delete` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write/publish` | Deletes active-context entries after review |
| `entry.update` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write/publish` | Updates exact entry metadata/data and preserves unrelated fields |
| `menu.item.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor | `menus:read/write` | Safe relative hrefs only |
| `menu.item.delete` | Vitest planner/schema | Bun executor | Bun executor + DB service test | `menus:read/write` | Deletes exact menu items while preserving unrelated tree items |
| `menu.item.update` | Vitest planner/schema | Bun executor | Bun executor | `menus:read/write` | Updates exact menu item fields while preserving unrelated tree items |
| `seo.document.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor | `content:read/write` | Explicit `page` / `entry` targets |
| `seo.document.delete` | Vitest planner/schema | Bun executor | Bun executor + DB service test | `content:read/write` | Deletes exact SEO documents without deleting target resources |
| `seo.document.update` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write` | Updates exact SEO document fields |
| `media.reference.attach` | Vitest `action-plan-schema` | Bun executor | Bun executor | `media:read` + `content:write` | Existing media ids only, entry targets only |
| `listing-query.filters.patch` | Vitest `action-plan-schema` | Bun executor | Bun executor | `content:read/write` | Patches `query.filters` only |
| `listing-template.card.patch` | Vitest `action-plan-schema` | Bun executor | Bun executor | `content:read/write` | Patches `config.card` only |
| `page.update` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write/publish` | Edits active page metadata/settings and preserves page data |
| `page.widget.patch` | Vitest `action-plan-schema` + pure patch helper | Bun executor | Bun executor | `content:read/write` | Top-level `upsert-block` and selected block `patch-data` |
| `page.delete` | Vitest planner/schema | Bun executor | Bun executor | `content:read/write/publish` | Deletes active-context pages after review |
| `widget-template.delete` | Vitest planner/schema | Bun executor | Bun executor | `widgets:read/write` | Deletes active-context reusable widget templates after review |
| `widget-template.update` | Vitest planner/schema | Bun executor | Bun executor | `widgets:read/write` | Edits reusable template metadata/settings |
| `widget-template.block.patch` | Vitest planner/schema | Bun executor | Bun executor | `widgets:read/write` | Patches selected reusable template block data paths |
| `form.automation.upsert` | Vitest `action-plan-schema` | Bun executor | Bun executor | `forms:read/write` | Safe non-webhook actions only |
| `site-kit.recommend/install/validate` | Vitest + Bun | Bun executor | Bun executor | `solution-kits:read/write` + LLM availability gate | Existing unified site-kit action flow |

---

## Supported Read-Only Plans

| Plan Type | Plan Coverage | UI Coverage | Route Permissions | Notes |
|---|---|---|---|---|
| CMS resource inspection/candidates | Vitest operation draft + target resolver | Vitest `ActionPlanReview` | target-family read permissions through resource catalog/active context | Non-mutating; no dry-run/execute controls |

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
| Mixed Blueprint Composition (current packs) | Internal foundation | Vitest capability registry + candidate resolver + graph + assembler | Not user-visible yet | Not applicable yet | Composer helpers exist behind the current single-blueprint planner; shadow/cutover tasks remain |
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
| Ambiguous template-backed page edits ask for page-instance vs reusable-template target confirmation | `tests/vitest/assistant/actionPlannerService.test.ts` | Vitest |

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
