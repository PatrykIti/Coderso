# The AI Assistant

Coderso ships with an in-product assistant that helps operators understand and configure their site. It matters to you as a contributor because it is grounded in our own documentation: the docs you write are the corpus the assistant answers from, and the actions it can take are strictly typed code paths you can extend.

The assistant lives behind a floating panel in the admin UI (`core/admin/ui/assistant/AssistantPanel.tsx`) and runs in two distinct modes.

## Two modes at a glance

| Mode | What it does | Needs an API key? | Can it change your site? |
| --- | --- | --- | --- |
| **Docs Assistant** | Deterministic RAG over the `docs/guide` corpus | No | No — read-only answers |
| **LLM Guide** | Plan, dry-run, review, execute, and validate typed setup actions | Yes (OpenAI / OpenRouter) | Yes — via strict typed actions, RBAC, and review |

The two modes share infrastructure but have very different trust models. Docs Assistant is the safe default that always works; LLM Guide is an opt-in upgrade that requires a configured provider.

## Mode 1: Docs Assistant (deterministic RAG, no key required)

This is the "documentation logic underneath." It runs entirely on the DB-backed corpus and works with no LLM provider configured. The flow is fully deterministic — same corpus and query produce the same answer.

The runtime is split into focused services under `core/services/assistant/`:

| Service file | Responsibility |
| --- | --- |
| `docsIngestService.ts` | Ingests the `docs/guide` corpus into the DB |
| `docsDbRetriever.ts` | DB-backed ranking and search |
| `docsAnswerComposer.ts` | Content-first deterministic answer templates |
| `assistantService.ts` | DB-only assistant runtime (`POST /assistant/chat`) |

A few behaviors worth knowing as a contributor:

- **Retrieval is intent-aware.** It blends BM25 with section/path priors and metadata signals (`productArea`, `title`, `keywords`), plus exact module/screen phrase boosts and cross-area penalties. Confidence factors in domain alignment and query coverage, not just the top score.
- **Answers are doc-first.** The composer picks the dominant document, then the best section. The user-facing `surface` label comes from the canonical doc `title`, not a section heading, and the answer is built from full chunk content rather than the short retrieval snippet.
- **Depth levels:** `basic`, `medium`, `instruction`, `advanced`. Helper guide modes: `troubleshooting`, `decision_guide`, `checklist`, `security` (requested via optional `detailLevel` / `guideMode`). Procedural "how / use" questions prefer `Instruction`; `Basic` / `Medium` are supporting context.
- **It does not hallucinate.** When top docs are ambiguous it returns a `clarifying_question`; with no hit it returns `missing_answer`.
- **It is read-only.** Docs-only answers never return executable action plans.
- **It needs a seeded corpus.** If the DB corpus is empty the runtime returns `not ready` — there is no filesystem fallback.

The `POST /assistant/chat` route requires the `settings:read` permission.

## Mode 2: LLM Guide (provider-backed setup planning)

Plug in an OpenAI or OpenRouter provider to enable typed setup planning. This is **not** raw prompt execution. The flow is:

```
prompt -> typed plan -> dry-run -> review -> execute -> validate
```

Every step operates over a strict, whitelisted action set. The orchestration is split across:

| Service file | Responsibility |
| --- | --- |
| `actionPlannerService.ts` | Turns a prompt into a typed plan |
| `actionPlanSchema.ts` | Strict nested schema validation |
| `actionRegistry.ts` | Whitelisted action handlers |
| `actionExecutorService.ts` | Executes plans by reusing existing domain services |
| `actionExecutionStore.ts` | Replay-safe idempotency results in the DB |

The internal endpoints live under `/admin/api/*`, are session-protected, CSRF-guarded on POST, and behind the `assistant` rate limit:

```
POST /assistant/actions/plan
POST /assistant/actions/dry-run
POST /assistant/actions/execute
```

Planner responses are tagged so the UI can render without parsing prompt text: `docs`, `inspection`, `action_plan`, `needs_input`, or `gated`.

Current setup blueprints are deterministic typed scaffolds. For example, an
architecture studio prompt that asks for portfolio, services/offer, and contact
routes to a composed plan with `portfolio-projects`, `services-directory`, and
`lead-capture-site` actions. That creates catalog/admin surfaces, listing
resources, public `/portfolio` and `/uslugi` pages, and a `/kontakt` lead form.
It is not a launch-ready marketing site yet: home/about/process/references
pages, seeded entries, media assets, navigation, and full SEO metadata still
need dedicated typed actions or site-kit coverage before they can be claimed in
acceptance tests.

### RBAC per step

| Step | Required permissions |
| --- | --- |
| `plan` / `dry-run` | `settings:read` + `content:read` |
| `execute` | `settings:write` + `content:write` + `content:publish` |
| Site-kit plan / dry-run | adds `solution-kits:read` |
| Site-kit execute | adds `solution-kits:write` |

Site-kit work additionally requires `llmAvailable=true` — it must never run as a docs-only fallback.

### Safety guarantees

The provider is treated as untrusted. The backend reconstructs any executable plan locally from policy and trusted context:

- **Operation-draft-only output.** Provider-supplied `actions[]`, ids, and executor payloads are rejected or ignored. The generic CMS path makes this explicit: the provider produces only a `CmsOperationDraft`, validated and repaired locally by `cmsOperationDraftSchema.ts`, `assistantOperationPolicy`, and `cmsTargetResolver.ts` before any action runs.
- **Strict schemas** reject unknown fields before persistence, render, or cache. Idempotency is enforced via `actionExecutionStore.ts`.
- **Edits and deletes are reviewed operations** (typed plan + dry-run + conflict-aware execution), never shortcuts. Targets resolve only from active context or server-side catalogs — a browser-supplied `context.resourceCatalog` is not trusted and is only hydrated when `includeResourceCatalog=true`.
- **Gated domains** (booking, checkout/payment, webhook automation, nested page-widget patches, installed solution-kit refinements) return `needs_input` / `gated` with no executable actions until adapters and permissions land.
- **Secrets never leak.** Provider keys, cookies, auth headers, upload bytes, signed URLs, and raw media must not appear in provider packages, diagnostics, cache, or action payloads. Diagnostics log a prompt hash, not prompt text; media is referenced by trusted library id only.

The provider only runs when retrieval returns snippets; a missing or failed provider falls back to `docs-only`. Per-user and optional global limits are enforced by `assistantQuota.ts`, and `assistantMetrics.ts` / `assistantRedaction.ts` record request, error, fallback, no-hit, and latency signals without leaking secrets.

Assistant Settings can ask the backend for OpenRouter model metadata through `POST /assistant/model-metadata`. The provider adapter reads OpenRouter's model list, applies published input/output limits when present, and returns conservative editable defaults when the provider does not publish those values.

## How the corpus is ingested

The source-of-truth root is `docs/guide`. This is hard-coded in two services:

- `docsIngestService.ts`: `const DEFAULT_INTERNAL_DOCS_ROOT = "docs/guide"`
- `assistantService.ts`: `const DEFAULT_ASSISTANT_SOURCE_ROOT = "docs/guide"`

Markdown files under `docs/guide/*.md` are ingested into three DB tables:

| Table | Holds |
| --- | --- |
| `assistant_docs` | Per-document metadata |
| `assistant_doc_chunks` | Retrievable content chunks (queried at runtime) |
| `assistant_doc_ingest_runs` | Ingest run records |

Normal Docker startup runs `core/server/startupAssistantDocs.ts` after migrations and before serving traffic. The helper fingerprints markdown files in `docs/guide`, records the completed image/docs fingerprint in `assistant.docs.startupReindexState`, and skips later starts until the image version or docs fingerprint changes. It can be disabled with `CODERSO_ASSISTANT_DOCS_REINDEX_ON_START=false`; `CODERSO_ASSISTANT_DOCS_SOURCE_ROOT` overrides the source root for controlled deployments.

Manual recovery still runs through `POST /assistant/reindex` (route in `core/server/routes/assistantRoutes.ts`, validated by `assistantReindexSchema`, CSRF protected, and requires `settings:write`). In the admin UI the same operation is kept as **Run support reindex** under `Settings -> Assistant -> Advanced`, not as a routine configuration step.

Reindex also prunes orphaned `assistant_docs` whose source file was removed (`pruneStaleAssistantDocs`), so stale DB-only records stop surfacing, and writes a best-effort `assistant.docs.reindex` audit event.

## How to extend the corpus

To teach the assistant about a new screen or workflow, add a doc to the corpus and reindex.

1. **Create a markdown file** under `docs/guide/` in the right subdir — `getting-started/`, `screens/`, `coderso/`, `solution-kits/`, or `playbooks/`. Every major admin route should map to one canonical doc; check `docs/guide/_COVERAGE_MATRIX.md` to find gaps.
2. **Add YAML frontmatter** with the required keys (see `docs/guide/_TEMPLATE.md`):

```yaml
---
title: "Document Title"
audience: "admin"        # admin | editor; use "developer" only when truly needed
productArea: "area-name"
language: "en"
keywords:
  - keyword-one
  - keyword-two
---
```

3. **Author the multi-level sections.** Required: `Basic`, `Medium`, `Instruction`, `Advanced`. Recommended optional: `Troubleshooting`, `Decision Guide`, `Checklist`, `Security`. The legacy pack (`What Is It`, `When To Use`, `Step By Step`, `Examples`, `Common Mistakes`) is still ingest-compatible, but new docs should use the multi-level pack.
4. **Follow the writing rules** (per `docs/guide/README.md`): English, product language over developer shorthand, real route and screen names, practical examples and failure modes — and do not document unshipped roadmap behavior.
5. **Seed the DB corpus.** In Docker deployments this happens on startup when the image/docs fingerprint changes. In local development or support recovery, use `POST /assistant/reindex` or `Settings -> Assistant -> Advanced -> Run support reindex` to seed it into the DB and make it retrievable.

Section selection is deterministic via the intent-to-section mapping in `docs/guide/README.md` — for example "what is this" maps to `Basic`, "how do I configure" maps to `Instruction`, an error or fix maps to `Troubleshooting`, "which option" maps to `Decision Guide`, launch checks map to `Checklist`, and security questions map to `Security`.

> `docs/guide/` is the user-facing product corpus and is intentionally separate from `_docs/`, which holds architecture notes, task tracking, and the changelog.

## Provider keys live in encrypted Integrations

Provider credentials are **not** in env vars or planner code. `providers/index.ts` resolves them at runtime via `getIntegrationRuntimeConfig("openai")` / `getIntegrationRuntimeConfig("openrouter")` from `core/services/integrations/integrationsService.ts`. If no `apiKey` is present, the provider resolves to `null` — LLM Guide is unavailable, but Docs Assistant still works.

Configure providers in the admin UI under `Settings -> Integrations`. Both adapters (`openAiProvider.ts`, `openRouterProvider.ts`) sit behind the same planner contract.

Integration secret fields are encrypted at rest: stored via `encryptSecret` and read via `decryptSecret` / `decryptIntegrationConfig` in `core/services/security/secretStore.ts`, guarded by `hasValidSecretMasterKey()` (which throws `secret_master_key_invalid` if the key is missing). This depends on `MEDIA_SECRET_MASTER_KEY` being set in the environment.

> For automated tests only, the `test:assistant:live:*` lanes read `TEST_OPENAI_API_KEY` / `TEST_OPENROUTER_API_KEY` (and matching `*_MODEL`) from the environment. Production never uses these — see [`./testing.md`](./testing.md).

## Where to go deeper

- [`_docs/ASSISTANT_GUIDE.md`](../../_docs/ASSISTANT_GUIDE.md) — the assistant runtime spec.
- [`_docs/ASSISTANT_SITE_BUILDER.md`](../../_docs/ASSISTANT_SITE_BUILDER.md) — typed actions, RBAC matrix, and site-kit flow.
- [`_docs/BLUEPRINT_COMPOSER.md`](../../_docs/BLUEPRINT_COMPOSER.md) — blueprint and composition internals.
- Sibling pages: [`./content-and-widgets.md`](./content-and-widgets.md), [`./security.md`](./security.md), and [`./testing.md`](./testing.md).
